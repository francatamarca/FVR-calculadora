import {rateByCode} from "./tariffReference.js";
import { describe, it, expect } from "vitest";
import { classifyCode, classifyProduct, toLegacyShape, TARIFF_SOURCE } from "../src/lib/tariffEngine.js";

describe("classifyCode — precisión por dígitos", () => {
  it("NCM 8 dígitos → resuelve por el DIE OFICIAL de ARCA (Arancel Integrado)", () => {
    const r = classifyCode("9304.00.90");
    const c = r.selected;
    expect(c.dutyRate).toBe(rateByCode("9304.00.90"));                 // airsoft: DIE extrazona vigente
    expect(c.precision).toBe("NCM_8_OFICIAL");
    expect(c.confidence).toBe("high");
    expect(c.dutyType).toBe("DIE_EXTRAZONA");
    expect(c.source).toMatch(/DIE oficial ARCA/i);
    expect(c.sourceDate).toBe(TARIFF_SOURCE.date);
  });
  it("capa 1 — excepciones argentinas: celulares 0%, autos 35%; notebooks 16% (ARCA)", () => {
    expect(classifyCode("8517.13.00").selected.dutyRate).toBe(rateByCode("8517.13.00"));   // celulares Dec.333/2025 (0% desde 15/01/2026)
    expect(classifyCode("8471.30.12").selected.dutyRate).toBe(rateByCode("8471.30.12"));  // notebooks: DIE real ARCA 13/07/2026 (el 0% BIT no está vigente)
    expect(classifyCode("8703.23.10").selected.dutyRate).toBe(rateByCode("8703.23.10"));  // autos: régimen automotor
    expect(classifyCode("8703.23.10").selected.source).toMatch(/argentina/i);
  });
  it("capa 2 — Dec. 236/2025: remeras a 20% aunque el AEC oficial diga 35%", () => {
    const r = classifyCode("6109.10.00");
    expect(r.selected.dutyRate).toBe(rateByCode("6109.10.00"));
    expect(r.selected.source).toMatch(/DIE oficial ARCA/);
  });
  it("posición de informática conserva el DIE consolidado de ARCA", () => {
    expect(classifyCode("8471.60.52").selected.dutyRate).toBe(rateByCode("8471.60.52"));
  });
  it("capa 3 — posición solo-dataset (no está en la tabla de 4 dígitos interna)", () => {
    const r = classifyCode("2916.12.30"); // éster químico: cap 29 existe pero valor exacto viene del dataset
    expect(r.selected.precision).toBe("NCM_8_OFICIAL");
    expect(typeof r.selected.dutyRate).toBe("number");
  });
  it("HS 6 dígitos → advertencia de incompleto para Argentina", () => {
    const r = classifyCode("640399");
    expect(r.selected.precision).toBe("HS_6_DIGITS");
    expect(r.selected.warnings.join(" ")).toMatch(/incompleto para Argentina/i);
    expect(r.selected.dutyRate).toBe(rateByCode("640399")); // calzado post Dec.236/2025
  });
  it("4 dígitos → partida incompleta / referencial", () => {
    const r = classifyCode("6109");
    expect(r.selected.precision).toBe("HS_4_DIGITS");
    expect(r.selected.warnings.join(" ")).toMatch(/referencial/i);
    expect(r.selected.dutyRate).toBe(rateByCode("6109")); // remeras post Dec.236/2025
  });
  it("NCM inexistente → sin porcentaje y validación manual", () => {
    const r = classifyCode("8499.99.99"); // partida inexistente del cap. 84
    expect(r.selected).toBeNull();
    expect(toLegacyShape(r).dutyRate).toBeNull();
    expect(r.requiresManualValidation).toBe(true);
  });
  it("input basura → requiere validación manual, sin inventar", () => {
    const r = classifyCode("abc");
    expect(r.candidates.length).toBe(0);
    expect(r.requiresManualValidation).toBe(true);
  });
});

describe("classifyProduct — matching y sinónimos", () => {
  it("airsoft → cap. 93, 20%", () => {
    expect(classifyProduct("pistola airsoft").selected.dutyRate).toBe(rateByCode(classifyProduct("pistola airsoft").selected.code));
  });
  it("notebook → 16% (DIE real ARCA — el 0% informática no está vigente en aduana)", () => {
    expect(classifyProduct("notebook lenovo").selected.dutyRate).toBe(rateByCode(classifyProduct("notebook lenovo").selected.code));
  });
  it("sinónimo: collar GPS para mascotas resuelve a dispositivo de transmisión (0% BIT)", () => {
    const r = classifyProduct("collar GPS para mascotas");
    expect(r.selected.dutyRate).toBe(rateByCode(r.selected.code));
  });
  it("sinónimo: inmovilizador de rodilla → artículo ortopédico 9021 (12.6% DIE ARCA)", () => {
    const r = classifyProduct("inmovilizador de rodilla");
    expect(r.selected.dutyRate).toBe(rateByCode(r.selected.code)); // DIE oficial ARCA 9021.10.10 (corrige el 0% de la tabla manual)
    expect(r.selected.code).toMatch(/^9021/);
  });
  it("material médico amplio no reutiliza el NCM inexistente ni el viejo 6%", () => {
    const result=classifyProduct("herramienta quirurgica");
    expect(result.selected.code).not.toBe("9018.90.90");
    expect(result.requiresManualValidation).toBe(true);
  });
  it("silla de ruedas → 8713 (10.8% DIE ARCA)", () => {
    expect(classifyProduct("silla de ruedas").selected.dutyRate).toBe(rateByCode(classifyProduct("silla de ruedas").selected.code)); // DIE oficial ARCA 8713.10.00
  });
  it("producto irreconocible → fallback genérico con advertencia y validación manual", () => {
    const r = classifyProduct("xyzzy frobnicator cuántico");
    expect(r.selected.precision).toBe("GENERIC_FALLBACK");
    expect(r.selected.confidence).toBe("low");
    expect(r.requiresManualValidation).toBe(true);
    expect(r.selected.warnings.length).toBeGreaterThan(0);
  });
});

describe("toLegacyShape — contrato con el front", () => {
  it("mapea confidence a español y conserva metadata del motor", () => {
    const flat = toLegacyShape(classifyCode("9304.00.90"));
    expect(flat.confidence).toBe("alta");
    expect(flat.dutyRate).toBe(rateByCode("9304.00.90"));
    expect(flat.dutyType).toBe("DIE_EXTRAZONA");
    expect(flat.sourceDate).toBeTruthy();
    expect(Array.isArray(flat.warnings)).toBe(true);
  });
});
