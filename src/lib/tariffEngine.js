/* Motor arancelario FVR.
   Para NCM existentes prevalece el DIE del Arancel Integrado ARCA.
   Los códigos incompletos y las familias usan estimaciones derivadas
   de esa misma base; nunca se presentan como posiciones exactas.
   La IA interpreta la descripción y no genera porcentajes.
   Actualización: scripts/update-tariff-base.mjs + workflow tariff-update. */

import { NCM_RATES, CHAPTER_DESC, CHAPTER_RATES, KEYWORD_RULES } from "./tariffData.js";
import { NCM8, BIT_SET, NCM_MIXED } from "../data/ncm8.js";
import { argExceptionFor, DEC236, ARG_EXCEPTIONS_META } from "../data/argExceptions.js";
import { tokenize, phraseMatch } from "./textNorm.js";
import { detectFamily, familyEstimate } from "./families.js";
import { TARIFF_META } from "../data/tariffMeta.js";

export const TARIFF_SOURCE = {
  name: TARIFF_META.source,      // "Arancel Integrado ARCA — DIE extrazona consolidado"
  shortName: "DIE oficial ARCA",
  date: TARIFF_META.baseDate,    // fecha del nomenclador — la actualiza el pipeline
  exceptionsDate: ARG_EXCEPTIONS_META.date,
  dutyType: "DIE_EXTRAZONA",     // lo que paga origen China/USA (NO el DII intrazona Mercosur)
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Sinónimos frecuentes → término canónico que sí matchea en las reglas.
   Frases evaluadas por palabra completa (tokens consecutivos). */
const SYNONYMS = [
  { from: ["collar gps", "rastreador gps", "tracker gps", "gps para mascotas", "collar rastreador"], to: "reloj inteligente" }, // 8517.62 dispositivos de transmisión — mismo tratamiento BIT
  { from: ["cerradura inteligente", "smart lock", "cerradura wifi", "cerradura digital"], to: "cerradura electronica" },
  { from: ["interruptor wifi", "smart switch", "interruptor inteligente", "domotica"], to: "router" }, // aparatos de red/transmisión
  { from: ["inmovilizador de rodilla", "ferula", "cabestrillo", "faja ortopedica"], to: "producto ortopedico" },
  { from: ["herramienta quirurgica", "instrumental quirurgico", "producto medico clase i", "producto medico clase 1", "producto medico"], to: "material medico" },
  { from: ["repuesto para maquina", "repuesto industrial", "pieza de maquina"], to: "repuesto maquina" },
  { from: ["silla de ruedas"], to: "silla de ruedas ortopedica" },
];

/* Reglas extra que no están en KEYWORD_RULES (van primero: más específicas) */
const EXTRA_RULES = [
  { k: ["cerradura electronica", "cerradura", "candado"], hs: "8301.40.00", rate: NCM_RATES["8301"], desc: "Cerraduras y candados" },
  { k: ["producto ortopedico", "ortopedia", "protesis"], hs: "9021.10.10", rate: 12.6, desc: "Artículos ortopédicos (cap. 90.21)" },
  { k: ["silla de ruedas ortopedica"], hs: "8713.10.00", rate: 10.8, desc: "Sillas de ruedas" },
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
  const p8 = digits.slice(0, 8);
  const prec = precisionFor(digits.length);
  const descCap = CHAPTER_DESC[p2] ? `Mercadería del capítulo ${p2}: ${CHAPTER_DESC[p2]}` : "Mercadería clasificada en el NCM";

  // ── CAPA 3: DIE argentino oficial a 8 dígitos (Arancel Integrado ARCA,
  //    consolidado con toda la normativa vigente — ver scripts/update-tariff-base.mjs) ──
  if (digits.length >= 8 && NCM8[p8] !== undefined) {
    const esBIT = BIT_SET.has(p8);
    result.productDescription = descCap;
    result.candidates.push(baseCandidate({
      code: String(raw), description: descCap, dutyRate: NCM8[p8],
      precision: "NCM_8_OFICIAL", precisionLabel: "NCM 8 dígitos · DIE oficial ARCA",
      confidence: NCM_MIXED[p8] ? "medium" : "high",
      source: "DIE oficial ARCA (Arancel Integrado, TEC/AEC + normativa argentina consolidada)",
      warnings: NCM_MIXED[p8] ? [`El arancel depende de la apertura SIM: ${NCM_MIXED[p8].join("%, ")}% posibles. Se muestra una referencia; confirmar el sufijo exacto.`] : esBIT && NCM8[p8] > 0
        ? ["Posición del régimen de informática/telecom (BIT): Argentina suele aplicar 0% — verificar la excepción vigente."]
        : [],
    }));
    result.selected = result.candidates[0];
    return result;
  }

  if (digits.length === 4 || digits.length === 6) {
    const positions = Object.keys(NCM8).filter(c => c.startsWith(digits));
    if (positions.length) {
      const rates = positions.map(c => NCM8[c]).sort((a,b)=>a-b);
      const middle = Math.floor(rates.length/2);
      const reference = rates.length % 2 ? rates[middle] : (rates[middle-1]+rates[middle])/2;
      result.candidates.push(baseCandidate({code:String(raw),description:descCap,dutyRate:reference,
        precision:prec.precision,precisionLabel:prec.label,confidence:"medium",
        source:`Mediana de ${positions.length} posiciones oficiales ARCA`,
        warnings:[...prec.warnings,"Estimación referencial por código incompleto; indicá el NCM de 8 dígitos y su apertura SIM."]}));
      result.selected=result.candidates[0];
    }
    result.requiresManualValidation=true;
    return result;
  }

  // Un código NCM inexistente nunca debe convertirse en un porcentaje
  // estimado por capítulo conservando apariencia de código exacto.
  if (digits.length >= 8) {
    result.requiresManualValidation = true;
    return result;
  }

  // ── CAPA 1: excepciones nacionales argentinas verificadas ──
  const ov = argExceptionFor(digits);
  if (ov) {
    result.productDescription = descCap;
    result.candidates.push(baseCandidate({
      code: String(raw), description: descCap, dutyRate: ov.rate,
      precision: digits.length >= 8 ? "NCM_8_OFICIAL" : prec.precision,
      precisionLabel: digits.length >= 8 ? "NCM 8 dígitos · excepción argentina" : prec.label,
      confidence: "high",
      source: "Excepción nacional argentina", norma: ov.norma,
      warnings: [ov.motivo, ...prec.warnings],
    }));
    result.selected = result.candidates[0];
    return result;
  }

  // ── CAPA 2: Dec. 236/2025 (textil/calzado) — manda la tabla argentina auditada ──
  if (DEC236.active && DEC236.chapters.has(p2) && NCM_RATES[p4] !== undefined) {
    result.productDescription = descCap;
    result.candidates.push(baseCandidate({
      code: String(raw), description: descCap, dutyRate: NCM_RATES[p4],
      precision: prec.precision, precisionLabel: prec.label, confidence: digits.length >= 8 ? "high" : prec.confidence,
      source: "Dec. 236/2025 (excepción argentina textil/calzado)", norma: DEC236.norma,
      warnings: [DEC236.motivo, ...prec.warnings],
    }));
    result.selected = result.candidates[0];
    return result;
  }

  // ── CAPA 4: tabla interna auditada por partida (4 dígitos) ──
  // Solo llega acá un código sin posición oficial de 8 dígitos.
  if (digits.length >= 4 && NCM_RATES[p4] !== undefined) {
    result.productDescription = descCap;
    result.candidates.push(baseCandidate({
      code: raw && String(raw).length > 4 ? String(raw) : p4,
      description: descCap,
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

/* ── Match de reglas por palabra completa (con guards negativos) ── */
const matchRule = (tokens, rules) => {
  for (const rule of rules) {
    if (rule.not && rule.not.some((n) => phraseMatch(tokens, n))) continue;
    if (rule.k.some((kw) => phraseMatch(tokens, kw))) return rule;
  }
  return null;
};

/* ── Clasificación por descripción de producto (Fase 5) ────────
   Jerarquía: regla exacta → familia comercial → genérico 16%. */
export function classifyProduct(text) {
  let t = String(text || "");
  let tokens = tokenize(t);

  // Sinónimos: si una frase matchea (por palabra completa), reemplaza la consulta
  for (const syn of SYNONYMS) {
    if (syn.from.some((f) => phraseMatch(tokens, f))) { t = syn.to; tokens = tokenize(t); break; }
  }

  const result = {
    input: String(text || ""),
    normalizedCode: "",
    productDescription: "",
    candidates: [],
    selected: null,
    requiresManualValidation: false,
  };

  // ── NIVEL 1: regla exacta (EXTRA_RULES primero: más específicas) ──
  const rule = matchRule(tokens, [...EXTRA_RULES, ...KEYWORD_RULES]);
  if (rule && classifyCode(rule.hs).selected) {
    // El % se re-resuelve contra la base oficial/excepciones para el NCM de la
    // regla; el rate manual queda como fallback si la posición no existe.
    const official = classifyCode(rule.hs);
    const oc = official.selected;
    const useOfficial = !!oc;
    result.productDescription = rule.desc;
    result.normalizedCode = clean(rule.hs);
    result.candidates.push(baseCandidate({
      code: rule.hs,
      description: rule.desc,
      dutyRate: useOfficial ? oc.dutyRate : rule.rate,
      precision: "KEYWORD_MATCH", specific:!!rule.specific,
      precisionLabel: "Detección por tipo de producto (referencial)",
      confidence: "medium",
      source: useOfficial ? oc.source : TARIFF_SOURCE.shortName,
      warnings: [...(oc?.warnings || []), "Clasificación por descripción: confirmar la posición NCM exacta antes de operar."],
    }));
    result.selected = result.candidates[0];
    return result;
  }

  // ── NIVEL 2: familia comercial (término amplio) — estimación determinística ──
  const fam = detectFamily(t);
  if (fam) {
    const est = familyEstimate(fam);
    if (est) {
      result.productDescription = fam.label;
      result.normalizedCode = clean(fam.hsRef);
      result.candidates.push(baseCandidate({
        code: `${fam.hsRef} (familia)`,
        description: `${fam.label} — estimación por categoría comercial`,
        dutyRate: est.rate,
        precision: "FAMILY_ESTIMATE",
        precisionLabel: "Estimación por categoría",
        confidence: "low",
        source: `Mediana de ${est.positions} posiciones oficiales de la familia`,
        warnings: [
          `"${fam.label}" abarca varias posiciones NCM con aranceles distintos: el ${est.rate}% es la mediana de las ${est.positions} posiciones oficiales de la familia.`,
          "Para el arancel exacto indicá el producto puntual o el código NCM.",
        ],
      }));
      result.selected = result.candidates[0];
      result.requiresManualValidation = true;
      return result;
    }
  }

  // ── NIVEL 3: genérico 16% — ÚLTIMA alternativa, nunca se elimina ──
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
  result.selected = result.candidates[0];
  return result;
}

/* Compat: forma plana que espera el front actual (hsCode/dutyRate/description/confidence)
   enriquecida con precisión, fuente y warnings del motor. */
export function toLegacyShape(engineResult) {
  const c = engineResult.selected || {};
  return {
    hsCode: c.code || engineResult.input || "—",
    dutyRate: typeof c.dutyRate === "number" ? c.dutyRate : null,
    description: c.description || engineResult.productDescription || "",
    confidence: c.confidence === "high" ? "alta" : c.confidence === "low" ? "baja" : "media",
    precision: c.precision || "GENERIC_FALLBACK",
    precisionLabel: c.precisionLabel || "", specific:!!c.specific,
    dutyType: c.dutyType || TARIFF_SOURCE.dutyType,
    source: c.source || TARIFF_SOURCE.shortName,
    sourceDate: c.sourceDate || TARIFF_SOURCE.date,
    warnings: c.warnings || [],
    requiresManualValidation: !!engineResult.requiresManualValidation,
  };
}
