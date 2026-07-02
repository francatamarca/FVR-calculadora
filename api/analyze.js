/* ── /api/analyze ───────────────────────────────────────────
   Clasificación arancelaria. REGLA CENTRAL (Fase 2):
   la IA solo INTERPRETA el producto y sugiere un código NCM;
   el % de derecho de importación SIEMPRE se resuelve contra la
   base local (src/lib/tariffEngine.js) — la IA nunca define el arancel.

   Sin ANTHROPIC_API_KEY (estado actual) todo corre con el motor local.
   Respuesta: envelope { content: [{ text: JSON }] } (compat con el front),
   con campos enriquecidos: precision, precisionLabel, dutyType, source,
   sourceDate, warnings, requiresManualValidation. */

import { classifyCode, classifyProduct, toLegacyShape, TARIFF_SOURCE } from "../src/lib/tariffEngine.js";

const send = (res, flat) => res.status(200).json({ content: [{ text: JSON.stringify(flat) }] });

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
    return send(res, toLegacyShape(classifyCode(value)));
  }

  // ── Producto: la IA (si hay key) sugiere el código; el arancel sale de la base local ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000); // Vercel hobby corta a 10s
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Sos clasificador arancelario para importaciones a Argentina (Nomenclador Común del MERCOSUR).
Para el producto: "${value}", devolvé SOLO el código NCM más probable (formato XXXX.XX.XX) y una descripción breve.
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

      // El ARANCEL sale de la base local para el código sugerido — nunca de la IA
      const flat = toLegacyShape(classifyCode(code));
      flat.hsCode = parsed.hsCode;
      if (parsed.description) flat.description = String(parsed.description).slice(0, 200);
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

  return send(res, toLegacyShape(classifyProduct(value)));
}
