/* ── MOTOR ARANCELARIO FVR ──────────────────────────────────
   Única fuente de verdad para derechos de importación.
   Regla central: la IA puede INTERPRETAR productos y SUGERIR códigos,
   pero el % de derecho SIEMPRE sale de la base local (tariffData.js),
   de una fuente oficial futura, o de carga manual confirmada.
   NUNCA de texto libre de un modelo.

   Precisión según dígitos ingresados:
   - 4 dígitos  → partida incompleta (referencial)
   - 6 dígitos  → subpartida HS internacional (incompleta para Argentina)
   - 8+ dígitos → NCM (mejor precisión disponible en la base local, que
                  resuelve por prefijo de 4 dígitos; los sufijos SIM se
                  aceptan pero no cambian el resultado por ahora)

   Para actualizar la base: editar src/lib/tariffData.js (o reemplazarla
   por un JSON importado / API oficial) y actualizar TARIFF_SOURCE. */

import { NCM_RATES, CHAPTER_DESC, CHAPTER_RATES, KEYWORD_RULES } from "./tariffData.js";

export const TARIFF_SOURCE = {
  name: "Tabla NCM/AEC interna FVR (auditada contra Dec. 557/2023, Dec. 236/2025 y AEC Mercosur)",
  shortName: "Tabla NCM/AEC interna",
  date: "2026-06-18",
  dutyType: "DIE_EXTRAZONA", // derecho extrazona: lo que paga origen China/USA (NO el DII intrazona Mercosur)
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Sinónimos frecuentes → término canónico que sí matchea en KEYWORD_RULES */
const SYNONYMS = [
  { from: ["collar gps", "rastreador gps", "tracker gps", "gps para mascotas", "collar rastreador"], to: "reloj inteligente" }, // 8517.62 dispositivos de transmisión — mismo tratamiento BIT
  { from: ["cerradura inteligente", "smart lock", "cerradura wifi", "cerradura digital"], to: "cerradura electronica" },
  { from: ["interruptor wifi", "smart switch", "interruptor inteligente", "domotica"], to: "router" }, // aparatos de red/transmisión
  { from: ["inmovilizador de rodilla", "ferula", "cabestrillo", "faja ortopedica"], to: "producto ortopedico" },
  { from: ["herramienta quirurgica", "instrumental quirurgico", "producto medico clase i", "producto medico clase 1", "producto medico"], to: "material medico" },
  { from: ["repuesto para maquina", "repuesto industrial", "pieza de maquina"], to: "repuesto maquina" },
  { from: ["silla de ruedas"], to: "silla de ruedas ortopedica" },
];

/* Reglas extra que no estaban en KEYWORD_RULES (con NCM y arancel de la base) */
const EXTRA_RULES = [
  { k: ["cerradura electronica", "cerradura", "candado"], hs: "8301.40.00", rate: NCM_RATES["8301"], desc: "Cerraduras y candados" },
  { k: ["producto ortopedico", "ortopedia", "protesis"], hs: "9021.10.10", rate: NCM_RATES["9021"], desc: "Artículos ortopédicos (cap. 90.21)" },
  { k: ["silla de ruedas ortopedica"], hs: "8713.10.00", rate: NCM_RATES["8713"], desc: "Sillas de ruedas" },
  { k: ["repuesto maquina"], hs: "8487.90.00", rate: NCM_RATES["8485"] ?? CHAPTER_RATES["84"], desc: "Partes de máquinas (cap. 84) — clasificar por la máquina a la que pertenece" },
];

const clean = (raw) => String(raw || "").replace(/[^0-9]/g, "");

const precisionFor = (digits) => {
  if (digits >= 8) return { precision: "NCM_8_DIGITS", label: "NCM (8 dígitos)", confidence: "high", warnings: [] };
  if (digits >= 6) return { precision: "HS_6_DIGITS", label: "HS internacional (6 dígitos)", confidence: "medium",
    warnings: ["HS de 6 dígitos: incompleto para Argentina — el NCM de 8 dígitos puede tener otro arancel."] };
  return { precision: "HS_4_DIGITS", label: "Partida (4 dígitos)", confidence: "medium",
    warnings: ["Partida de 4 dígitos incompleta: resultado referencial — dentro de la partida hay subpartidas con aranceles distintos."] };
};

const baseCandidate = (over) => ({
  dutyType: TARIFF_SOURCE.dutyType,
  originApplied: "Extrazona (China / USA / otros no-Mercosur)",
  source: TARIFF_SOURCE.shortName,
  sourceDate: TARIFF_SOURCE.date,
  ...over,
});

/* ── Clasificación por código HS/NCM ──────────────────────── */
export function classifyCode(raw) {
  const digits = clean(raw);
  const result = {
    input: String(raw || ""),
    normalizedCode: digits,
    productDescription: "",
    candidates: [],
    selected: null,
    requiresManualValidation: false,
  };
  if (digits.length < 2) {
    result.requiresManualValidation = true;
    result.candidates = [];
    return result;
  }

  const p4 = digits.slice(0, 4);
  const p2 = digits.slice(0, 2);
  const prec = precisionFor(digits.length);

  if (digits.length >= 4 && NCM_RATES[p4] !== undefined) {
    const desc = CHAPTER_DESC[p2] ? `Mercadería del capítulo ${p2}: ${CHAPTER_DESC[p2]}` : "Mercadería clasificada en el NCM";
    result.productDescription = desc;
    result.candidates.push(baseCandidate({
      code: raw && String(raw).length > 4 ? String(raw) : p4,
      description: desc,
      dutyRate: NCM_RATES[p4],
      precision: prec.precision,
      precisionLabel: prec.label,
      confidence: prec.confidence,
      warnings: [...prec.warnings],
    }));
  } else if (CHAPTER_RATES[p2] !== undefined) {
    const desc = CHAPTER_DESC[p2] ? `Capítulo NCM ${p2}: ${CHAPTER_DESC[p2]}` : "Clasificación estimada por capítulo NCM";
    result.productDescription = desc;
    result.candidates.push(baseCandidate({
      code: String(raw),
      description: desc,
      dutyRate: CHAPTER_RATES[p2],
      precision: "CHAPTER_DEFAULT",
      precisionLabel: "Promedio del capítulo (muy referencial)",
      confidence: "low",
      warnings: ["La partida no está en la base local: se usa el arancel típico del capítulo. Verificar posición exacta en VUCE o con despachante."],
    }));
    result.requiresManualValidation = true;
  }

  if (!result.candidates.length) {
    result.requiresManualValidation = true;
  } else {
    result.selected = result.candidates[0];
  }
  return result;
}

/* ── Clasificación por descripción de producto ────────────── */
export function classifyProduct(text) {
  let t = norm(text).replace(/[^a-z0-9 ]/g, " ");
  for (const syn of SYNONYMS) {
    if (syn.from.some((f) => t.includes(norm(f)))) { t = norm(syn.to); break; }
  }

  const result = {
    input: String(text || ""),
    normalizedCode: "",
    productDescription: "",
    candidates: [],
    selected: null,
    requiresManualValidation: false,
  };

  // Las reglas específicas (EXTRA_RULES) van PRIMERO: "silla de ruedas" debe
  // matchear 8713 (8%) antes de que la regla genérica "silla" (muebles 18%) la capture.
  const allRules = [...EXTRA_RULES, ...KEYWORD_RULES];
  for (const rule of allRules) {
    if (rule.k.some((kw) => t.includes(norm(kw).replace(/[^a-z0-9 ]/g, " ")))) {
      result.productDescription = rule.desc;
      result.normalizedCode = clean(rule.hs);
      result.candidates.push(baseCandidate({
        code: rule.hs,
        description: rule.desc,
        dutyRate: rule.rate,
        precision: "KEYWORD_MATCH",
        precisionLabel: "Detección por tipo de producto (referencial)",
        confidence: "medium",
        warnings: ["Clasificación por descripción: confirmar la posición NCM exacta antes de operar."],
      }));
      break;
    }
  }

  if (!result.candidates.length) {
    // Sin match: NO inventar — devolver referencial genérico con advertencia fuerte
    result.productDescription = "Producto sin clasificación automática";
    result.candidates.push(baseCandidate({
      code: "—",
      description: "Producto general — se requiere clasificación arancelaria precisa",
      dutyRate: 16,
      precision: "GENERIC_FALLBACK",
      precisionLabel: "Genérico (solo estimación)",
      confidence: "low",
      warnings: ["No se pudo clasificar el producto: el 16% es un valor genérico de estimación. Cargá el HS/NCM, elegí una categoría o ingresá el arancel manualmente."],
    }));
    result.requiresManualValidation = true;
  }

  result.selected = result.candidates[0];
  return result;
}

/* Compat: forma plana que espera el front actual (hsCode/dutyRate/description/confidence)
   enriquecida con precisión, fuente y warnings del motor. */
export function toLegacyShape(engineResult) {
  const c = engineResult.selected || {};
  return {
    hsCode: c.code || engineResult.input || "—",
    dutyRate: typeof c.dutyRate === "number" ? c.dutyRate : 16,
    description: c.description || engineResult.productDescription || "",
    confidence: c.confidence === "high" ? "alta" : c.confidence === "low" ? "baja" : "media",
    precision: c.precision || "GENERIC_FALLBACK",
    precisionLabel: c.precisionLabel || "",
    dutyType: c.dutyType || TARIFF_SOURCE.dutyType,
    source: c.source || TARIFF_SOURCE.shortName,
    sourceDate: c.sourceDate || TARIFF_SOURCE.date,
    warnings: c.warnings || [],
    requiresManualValidation: !!engineResult.requiresManualValidation,
  };
}
