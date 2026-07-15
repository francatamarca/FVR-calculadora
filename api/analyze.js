/* ── /api/analyze v2 ────────────────────────────────────────
   Clasificación arancelaria. REGLA CENTRAL (sin cambios):
   la IA solo INTERPRETA el producto; el % de derecho SIEMPRE se
   resuelve contra la base local (tariffEngine) — nunca lo decide la IA.

   NUEVO (Fase 4 — clasificador híbrido):
   La IA ya no inventa códigos de memoria. El flujo para "product" es:
     B. Buscar 5-15 candidatos REALES: regla curada (palabra completa)
        + BM25/fuzzy sobre las descripciones oficiales de la nomenclatura.
     C. Claude solo puede ELEGIR entre esos candidatos (o "ninguno"),
        con confianza, motivo y alternativas.
     D. Validación inversa: si Claude marca incompatibilidad o elige un
        código fuera de la lista, se descarta y se cae al siguiente
        candidato o a la jerarquía local (regla → familia → 16%).
   El % del código elegido sale de classifyCode (excepciones argentinas
   incluidas). Sin API key o sin candidatos, todo degrada limpio al
   motor local.

   Respuesta: envelope { content: [{ text: JSON }] } (compat con el front)
   + campos nuevos: officialDesc, alternatives[], method, baseDate. */

import { classifyCode, classifyProduct, toLegacyShape, TARIFF_SOURCE } from "../src/lib/tariffEngine.js";
import { buildIndex } from "../src/lib/ncmSearch.js";
import { NCM_DESC, NCM_DESC_META } from "../src/data/ncmDescriptions.js";
import { NCM8 } from "../src/data/ncm8.js";

const send = (res, flat) => res.status(200).json({ content: [{ text: JSON.stringify(flat) }] });

// Índice BM25 sobre descripciones oficiales — se construye una vez por
// instancia (cold start) y se reusa entre invocaciones calientes.
let INDEX = null;
const getIndex = () => {
  if (INDEX) return INDEX;
  // NCM_DESC viene como "descripción específica — ENCABEZADO DE PARTIDA":
  // la parte específica pesa doble en el índice (ver buildIndex).
  const entries = Object.entries(NCM_DESC).map(([code, full]) => {
    const cut = full.indexOf(" — ");
    return cut > 0
      ? { code, desc: full.slice(0, cut), path: full.slice(cut + 3) }
      : { code, desc: full };
  });
  INDEX = entries.length ? buildIndex(entries) : { size: 0, search: () => [] };
  return INDEX;
};

// Rate limiting simple por IP (en memoria de la instancia): protege la API key
// de Anthropic contra abuso. 40 consultas / 10 min alcanzan de sobra para uso real.
const hits = new Map();
const rateLimited = (req, max = 40, windowMs = 10 * 60 * 1000) => {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t0 > windowMs) { hits.set(ip, { t0: now, n: 1 }); return false; }
  h.n++;
  if (hits.size > 5000) hits.clear(); // tope de memoria
  return h.n > max;
};

const fmtCode = (c) => c.length === 8 ? `${c.slice(0, 4)}.${c.slice(4, 6)}.${c.slice(6, 8)}` : c;

/* Candidatos reales para la IA: regla curada + BM25 sobre descripciones
   oficiales. Devuelve [{code8, desc, rate}] — solo posiciones que existen. */
const buildCandidates = (value, localFlat) => {
  const out = [];
  const seen = new Set();
  const push = (code8, desc) => {
    if (!code8 || seen.has(code8) || NCM8[code8] === undefined) return;
    seen.add(code8);
    const rated = toLegacyShape(classifyCode(code8));
    out.push({ code8, desc: (desc || NCM_DESC[code8] || "").slice(0, 160), rate: rated.dutyRate });
  };
  // 1. La regla curada (si matcheó) va primera: es de alta precisión
  if (localFlat.precision === "KEYWORD_MATCH") {
    push(String(localFlat.hsCode).replace(/[^0-9]/g, "").slice(0, 8), localFlat.description);
  }
  // 2. BM25 + fuzzy sobre descripciones oficiales
  for (const hit of getIndex().search(value, 14)) push(hit.code, hit.desc);
  return out.slice(0, 15);
};

/* Alternativas ÚTILES: máximo una por partida (las hermanas de una misma
   partida sin descripción específica se ven idénticas y no aportan nada)
   y distintas de la partida elegida cuando hay opciones de sobra. */
const buildAlternatives = (candidates, chosenCode, max = 3) => {
  const chosenP4 = (chosenCode || "").slice(0, 4);
  const seenP4 = new Set();
  const out = [];
  // primera pasada: partidas distintas a la elegida
  for (const c of candidates) {
    if (c.code8 === chosenCode) continue;
    const p4 = c.code8.slice(0, 4);
    if (p4 === chosenP4 || seenP4.has(p4)) continue;
    seenP4.add(p4);
    out.push(c);
    if (out.length >= max) break;
  }
  // segunda pasada: si faltan, aceptar hermanas de la elegida (una sola)
  if (out.length < max) {
    for (const c of candidates) {
      if (c.code8 === chosenCode || out.includes(c)) continue;
      const p4 = c.code8.slice(0, 4);
      if (seenP4.has(p4)) continue;
      seenP4.add(p4);
      out.push(c);
      if (out.length >= max) break;
    }
  }
  return out.map((c) => ({ hsCode: fmtCode(c.code8), description: c.desc, dutyRate: c.rate }));
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  if (rateLimited(req)) return res.status(429).json({ error: "Demasiadas consultas seguidas — esperá unos minutos." });

  const { type } = req.body || {};
  let { value } = req.body || {};
  if (!value || typeof value !== "string") return res.status(400).json({ error: "Falta el valor a analizar" });
  value = value.trim().slice(0, 300); // límite defensivo: evita token-wastage y payloads absurdos

  // ── HS/NCM: resolución 100% local, con precisión por dígitos ──
  if (type === "hsCode") {
    const flat = toLegacyShape(classifyCode(value));
    const c8 = value.replace(/[^0-9]/g, "").slice(0, 8);
    if (NCM_DESC[c8]) flat.officialDesc = NCM_DESC[c8];
    flat.baseDate = NCM_DESC_META.date || TARIFF_SOURCE.date;
    return send(res, flat);
  }

  // ── Producto: jerarquía local + candidatos reales + IA restringida ──
  const localFlat = toLegacyShape(classifyProduct(value));
  const candidates = buildCandidates(value, localFlat);
  localFlat.baseDate = NCM_DESC_META.date || TARIFF_SOURCE.date;
  localFlat.method = "local";
  if (candidates.length) localFlat.alternatives = buildAlternatives(candidates, null);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && candidates.length) {
    // ── Capa C: Claude elige SOLO entre candidatos reales ──
    try {
      const lista = candidates.map((c, i) =>
        `${i + 1}. NCM ${fmtCode(c.code8)} — ${c.desc || "(sin descripción)"} — derecho ${c.rate}%`).join("\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000); // Vercel hobby corta a 10s
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{
            role: "user",
            content: `Sos clasificador arancelario NCM para importaciones a Argentina.
Producto del cliente: "${value}"

Posiciones NCM candidatas (ÚNICAS opciones válidas — vienen de la nomenclatura oficial):
${lista}

TAREA:
1. Elegí el número de la posición cuya DESCRIPCIÓN OFICIAL sea compatible con el producto (función principal, material, uso comercial).
2. VALIDACIÓN INVERSA: si la descripción oficial contradice el producto (ej.: capacidades, tamaños o usos incompatibles), NO la elijas.
3. Si NINGUNA es compatible, respondé eleccion:0.
4. NO inventes códigos. NO devuelvas porcentajes propios.

Respondé ÚNICAMENTE JSON sin markdown:
{"eleccion":N,"confianza":"alta|media|baja","motivo":"máx 15 palabras","alternativas":[N,N]}`,
          }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`Anthropic ${response.status}`);
      const data = await response.json();
      const text = data?.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const idx = Number(parsed.eleccion);

      if (Number.isInteger(idx) && idx >= 1 && idx <= candidates.length) {
        const chosen = candidates[idx - 1];
        // ── El ARANCEL sale de la base local para el código elegido — nunca de la IA ──
        const flat = toLegacyShape(classifyCode(chosen.code8));
        flat.hsCode = fmtCode(chosen.code8);
        flat.description = chosen.desc || flat.description;
        flat.officialDesc = NCM_DESC[chosen.code8] || chosen.desc || "";
        flat.confidence = parsed.confianza === "alta" ? "alta" : parsed.confianza === "baja" ? "baja" : "media";
        flat.method = "ia-candidatos";
        flat.baseDate = NCM_DESC_META.date || TARIFF_SOURCE.date;
        flat.source = `Clasificación IA entre ${candidates.length} posiciones oficiales + arancel de ${TARIFF_SOURCE.shortName}`;
        flat.motivo = String(parsed.motivo || "").slice(0, 120);
        // Alternativas: las que priorizó la IA primero, el resto de candidatos
        // después — TODAS pasan por el dedupe por partida (sin triplicados
        // idénticos de posiciones hermanas sin descripción propia)
        const altIdx = Array.isArray(parsed.alternativas) ? parsed.alternativas : [];
        const iaAlts = altIdx.filter((n) => Number.isInteger(n) && n >= 1 && n <= candidates.length && n !== idx)
          .map((n) => candidates[n - 1]);
        const resto = candidates.filter((c) => !iaAlts.includes(c));
        flat.alternatives = buildAlternatives([...iaAlts, ...resto], chosen.code8);
        flat.warnings = [
          "Posición elegida por IA entre candidatos de la nomenclatura oficial — confirmar con despachante.",
          ...flat.warnings,
        ];
        return send(res, flat);
      }
      // eleccion:0 → ningún candidato compatible: jerarquía local (familia/16%)
      localFlat.method = "local-ia-rechazo";
      localFlat.warnings = ["La IA no encontró una posición compatible entre los candidatos — resultado por jerarquía local.", ...localFlat.warnings];
      return send(res, localFlat);
    } catch {
      // caída limpia al clasificador local
    }
  }

  // ── Modo legacy: IA sin candidatos (dataset de descripciones aún no cargado) ──
  if (apiKey && !candidates.length) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Sos clasificador arancelario para importaciones a Argentina (Nomenclador Común del MERCOSUR).
Para el producto: "${value}", devolvé SOLO el código NCM más probable (formato XXXX.XX.XX, 8 dígitos) y una descripción breve.
NO incluyas porcentajes de arancel: eso lo resuelve otra capa contra la base oficial.
Si el producto es ambiguo, elegí el código más probable e indicá "ambiguo":true.
Respondé ÚNICAMENTE JSON sin markdown: {"hsCode":"XXXX.XX.XX","description":"...","ambiguo":false}`,
          }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`Anthropic ${response.status}`);
      const data = await response.json();
      const text = data?.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const code = String(parsed.hsCode || "").replace(/[^0-9.]/g, "");
      if (!/^\d{4}/.test(code.replace(/\./g, ""))) throw new Error("código IA inválido");
      const c8 = code.replace(/\./g, "").slice(0, 8);
      // Validación: el código debe existir en la base oficial; si no, se degrada
      if (NCM8[c8] === undefined && localFlat.precision !== "GENERIC_FALLBACK") return send(res, localFlat);
      const flat = toLegacyShape(classifyCode(code));
      flat.hsCode = parsed.hsCode;
      if (parsed.description) flat.description = String(parsed.description).slice(0, 200);
      flat.method = "ia-legacy";
      flat.baseDate = NCM_DESC_META.date || TARIFF_SOURCE.date;
      flat.source = `Clasificación IA + arancel de ${TARIFF_SOURCE.shortName}`;
      flat.warnings = [
        "Código NCM sugerido por IA a partir de la descripción — confirmar con despachante.",
        ...(parsed.ambiguo ? ["El producto es ambiguo: revisá la clasificación o cargá más detalle."] : []),
        ...flat.warnings,
      ];
      return send(res, flat);
    } catch {
      // caída limpia al clasificador local
    }
  }

  return send(res, localFlat);
}
