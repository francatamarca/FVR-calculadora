import { describe, it, expect } from "vitest";
import { classifyCode, classifyProduct, toLegacyShape, TARIFF_SOURCE } from "../src/lib/tariffEngine.js";

describe("classifyCode — precisión por dígitos", () => {
  it("NCM 8 dígitos → precisión alta, DIE extrazona, con fuente y fecha", () => {
    const r = classifyCode("9304.00.90");
    const c = r.selected;
    expect(c.dutyRate).toBe(20);                 // airsoft: AEC extrazona (auditado contra VUCE)
    expect(c.precision).toBe("NCM_8_DIGITS");
    expect(c.confidence).toBe("high");
    expect(c.dutyType).toBe("DIE_EXTRAZONA");
    expect(c.source).toBeTruthy();
    expect(c.sourceDate).toBe(TARIFF_SOURCE.date);
  });
  it("HS 6 dígitos → advertencia de incompleto para Argentina", () => {
    const r = classifyCode("640399");
    expect(r.selected.precision).toBe("HS_6_DIGITS");
    expect(r.selected.warnings.join(" ")).toMatch(/incompleto para Argentina/i);
    expect(r.selected.dutyRate).toBe(20); // calzado post Dec.236/2025
  });
  it("4 dígitos → partida incompleta / referencial", () => {
    const r = classifyCode("6109");
    expect(r.selected.precision).toBe("HS_4_DIGITS");
    expect(r.selected.warnings.join(" ")).toMatch(/referencial/i);
    expect(r.selected.dutyRate).toBe(20); // remeras post Dec.236/2025
  });
  it("partida desconocida → default del capítulo, confianza baja y validación manual", () => {
    const r = classifyCode("8499.99.99"); // partida inexistente del cap. 84
    expect(r.selected.precision).toBe("CHAPTER_DEFAULT");
    expect(r.selected.confidence).toBe("low");
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
    expect(classifyProduct("pistola airsoft").selected.dutyRate).toBe(20);
  });
  it("notebook → 0% (régimen informática)", () => {
    expect(classifyProduct("notebook lenovo").selected.dutyRate).toBe(0);
  });
  it("sinónimo: collar GPS para mascotas resuelve a dispositivo de transmisión (0% BIT)", () => {
    const r = classifyProduct("collar GPS para mascotas");
    expect(r.selected.dutyRate).toBe(0);
  });
  it("sinónimo: inmovilizador de rodilla → artículo ortopédico 9021 (0%)", () => {
    const r = classifyProduct("inmovilizador de rodilla");
    expect(r.selected.dutyRate).toBe(0);
    expect(r.selected.code).toMatch(/^9021/);
  });
  it("herramienta quirúrgica → material médico (6%)", () => {
    expect(classifyProduct("herramienta quirurgica").selected.dutyRate).toBe(6);
  });
  it("silla de ruedas → 8713 (8%)", () => {
    expect(classifyProduct("silla de ruedas").selected.dutyRate).toBe(8);
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
    expect(flat.dutyRate).toBe(20);
    expect(flat.dutyType).toBe("DIE_EXTRAZONA");
    expect(flat.sourceDate).toBeTruthy();
    expect(Array.isArray(flat.warnings)).toBe(true);
  });
});
