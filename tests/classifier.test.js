/* ── FASE 9: batería del clasificador híbrido ────────────────
   Cada caso registra: código esperado (o conjunto aceptable), %
   esperado contra el DIE oficial ARCA (nomenclador 13/07/2026),
   nivel de confianza y capa que debe resolverlo.
   Los casos de REGRESIÓN aseguran que los falsos positivos por
   substring ("control remoto"→moto) no vuelvan nunca. */

import { describe, it, expect } from "vitest";
import { classifyProduct, classifyCode } from "../src/lib/tariffEngine.js";
import { tokenize, phraseMatch, stemEs } from "../src/lib/textNorm.js";
import { detectFamily, familyEstimate } from "../src/lib/families.js";
import { buildIndex } from "../src/lib/ncmSearch.js";
import { NCM_DESC } from "../src/data/ncmDescriptions.js";

const sel = (txt) => classifyProduct(txt).selected;

describe("Fase 9 — casos requeridos (capa local determinística)", () => {
  // [entrada, código esperado (prefijo), % esperado, precisión esperada]
  const CASOS = [
    ["control remoto",            "8526.92", 18,   "KEYWORD_MATCH"],   // radiotelemando — NUNCA motocicleta
    ["motosierra",                "8467.81", 9,    "KEYWORD_MATCH"],   // sierra de cadena — NUNCA motocicleta
    ["martillo",                  "8205",    18,   "KEYWORD_MATCH"],   // DIE ARCA 8205.59.00
    ["termo de acero inoxidable", "9617",    18,   "KEYWORD_MATCH"],   // termos — NUNCA lingotes de acero
    ["termo de mate",             "9617",    18,   "KEYWORD_MATCH"],
    ["sombrero",                  "6505",    20,   "KEYWORD_MATCH"],
    ["reloj despertador",         "9105",    20,   "KEYWORD_MATCH"],   // NUNCA reloj pulsera
    ["celular",                   "8517.12", 0,    "KEYWORD_MATCH"],   // Dec. 333/2025
    ["zapatillas",                "6402",    20,   "KEYWORD_MATCH"],   // Dec. 236/2025
    ["camara wifi",               "8525.89", 2,    "KEYWORD_MATCH"],   // DIE real ARCA: 2% (la TEC decía 20)
    ["microfono inalambrico",     "8518.10", 20,   "KEYWORD_MATCH"],
    ["filtro de agua",            "8421.21", 12.6, "KEYWORD_MATCH"],
    ["compresor de aire",         "8414.80", 12.6, "KEYWORD_MATCH"],
    ["skimmer para acuario",      "8421.21", 12.6, "KEYWORD_MATCH"],
    ["caloventor",                "8516.29", 20,   "KEYWORD_MATCH"],
    ["cabeza de cilindro",        "8409.91", 16,   "KEYWORD_MATCH"],
    ["camara de bicicleta",       "4013",    16,   "KEYWORD_MATCH"],   // cámara de caucho — NUNCA bicicleta 8712
  ];
  for (const [txt, code, rate, prec] of CASOS) {
    it(`${txt} → ${code} (${rate}%)`, () => {
      const s = sel(txt);
      expect(s.code.replace(/[^0-9.]/g, "").startsWith(code.replace(/[^0-9.]/g, "").slice(0, 6))).toBe(true);
      expect(s.dutyRate).toBe(rate);
      expect(s.precision).toBe(prec);
    });
  }

  it("notebook → 16% (DIE real ARCA vigente)", () => {
    expect(sel("notebook").dutyRate).toBe(16);
  });
});

describe("Fase 9 — regresión: los falsos positivos por substring no vuelven", () => {
  it("'control remoto' NO matchea 'moto' (motocicleta)", () => {
    expect(sel("control remoto").description).not.toMatch(/motocicleta/i);
  });
  it("'motosierra' NO matchea 'moto'", () => {
    expect(sel("motosierra").description).not.toMatch(/motocicleta/i);
  });
  it("'anillo de goma industrial' NO es bisutería (guard negativo)", () => {
    expect(sel("anillo de goma industrial").description).not.toMatch(/bisuter/i);
  });
  it("'aro metalico' sigue siendo bisutería (el guard no rompe el caso normal)", () => {
    expect(sel("aro metalico").description).toMatch(/bisuter/i);
  });
  it("'perfumero de vidrio' NO es perfume", () => {
    expect(sel("perfumero de vidrio").description).not.toMatch(/perfume o agua/i);
  });
  it("phraseMatch exige palabras completas y consecutivas", () => {
    expect(phraseMatch(tokenize("control remoto universal"), "moto")).toBe(false);
    expect(phraseMatch(tokenize("una moto nueva"), "moto")).toBe(true);
    expect(phraseMatch(tokenize("camara de bicicleta rodado 29"), "camara de bicicleta")).toBe(true);
  });
});

describe("Fase 9 — entradas amplias (jerarquía de familias)", () => {
  it("'herramientas' → estimación por categoría (mediana de posiciones oficiales), confianza baja", () => {
    const s = sel("herramientas");
    expect(s.precision).toBe("FAMILY_ESTIMATE");
    expect(s.confidence).toBe("low");
    expect(s.dutyRate).toBeGreaterThan(0);
    expect(s.warnings.join(" ")).toMatch(/mediana/i);
  });
  it("'ropa' resuelve (regla o familia) al 20% del Dec. 236/2025", () => {
    expect(sel("ropa").dutyRate).toBe(20);
  });
  it("'tela de algodon' → familia telas al 18% (Dec. 236 aplicado a la mediana)", () => {
    const s = sel("tela de algodon");
    expect(s.precision).toBe("FAMILY_ESTIMATE");
    expect(s.dutyRate).toBe(18);
  });
  it("'repuesto de maquinaria' → familia con estimación", () => {
    expect(sel("repuesto de maquinaria").precision).toBe("FAMILY_ESTIMATE");
  });
  it("la estimación de familia es determinística (misma entrada → mismo resultado)", () => {
    const fam = detectFamily("herramientas");
    expect(familyEstimate(fam)).toEqual(familyEstimate(fam));
  });
});

describe("Fase 9 — el 16% genérico queda como ÚLTIMA alternativa", () => {
  it("producto irreconocible → 16% con validación manual", () => {
    const s = classifyProduct("xyzzy frobnicator cuántico");
    expect(s.selected.dutyRate).toBe(16);
    expect(s.selected.precision).toBe("GENERIC_FALLBACK");
    expect(s.requiresManualValidation).toBe(true);
  });
  it("un producto con regla NUNCA cae al 16% genérico", () => {
    expect(sel("martillo").precision).not.toBe("GENERIC_FALLBACK");
  });
});

describe("Fase 9 — normalización (Capa A)", () => {
  it("plurales: martillos/relojes/lapices → singular", () => {
    expect(stemEs("martillos")).toBe("martillo");
    expect(stemEs("relojes")).toBe("reloj");
    expect(stemEs("lapices")).toBe("lapiz");
  });
  it("acentos y stopwords: 'cámaras de seguridad' ≡ 'camara seguridad'", () => {
    expect(tokenize("cámaras de seguridad")).toEqual(tokenize("camara seguridad"));
  });
  it("alias comercial: goma → caucho (como la nomenclatura)", () => {
    expect(tokenize("goma")).toEqual(["caucho"]);
  });
});

describe("Fase 9 — búsqueda de candidatos reales (Capa B)", () => {
  const entries = Object.entries(NCM_DESC).slice(0, 12000).map(([code, full]) => {
    const cut = full.indexOf(" — ");
    return cut > 0 ? { code, desc: full.slice(0, cut), path: full.slice(cut + 3) } : { code, desc: full };
  });
  const idx = buildIndex(entries);

  it("el índice cubre la base oficial completa", () => {
    expect(idx.size).toBeGreaterThan(9000);
  });
  it("typo leve: 'martilo' encuentra 'Martillos y mazas' (fuzzy por trigramas)", () => {
    const top = idx.search("martilo", 5);
    expect(top.some((h) => h.code.startsWith("8205"))).toBe(true);
  });
  it("'reloj despertador' rankea posiciones de despertadores (91.03/91.05)", () => {
    const top = idx.search("reloj despertador", 5);
    expect(top.some((h) => h.code.startsWith("9103") || h.code.startsWith("9105"))).toBe(true);
  });
  it("los candidatos son SIEMPRE códigos existentes de la base", () => {
    for (const h of idx.search("bomba de agua", 15)) expect(NCM_DESC[h.code]).toBeDefined();
  });
});

describe("Fase 9 — capas del código (Fase 7)", () => {
  it("la tabla de 4 dígitos NO pisa una posición oficial de 8 dígitos", () => {
    // 8471 (tabla 4 díg) = 0, pero la posición oficial 8471.30.19 = 16
    expect(classifyCode("8471.30.19").selected.dutyRate).toBe(16);
    expect(classifyCode("8471.30.19").selected.precision).toBe("NCM_8_OFICIAL");
  });
  it("código de 4 dígitos → tabla auditada con warning de precisión", () => {
    const s = classifyCode("6109").selected;
    expect(s.dutyRate).toBe(20);
    expect(s.warnings.join(" ")).toMatch(/referencial/i);
  });
});
