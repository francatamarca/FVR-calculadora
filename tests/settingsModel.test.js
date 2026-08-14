import { describe, expect, it } from "vitest";
import { DEF } from "../src/lib/calc.js";
import { sanitizeSettings } from "../api/settingsModel.js";

describe("validación de configuración central", () => {
  it("acepta una configuración completa y conserva la última tarifa", () => {
    const result = sanitizeSettings({ ...DEF, seaRate: 100, feePctSea: 9 });
    expect(result.seaRate).toBe(100);
    expect(result.feePctSea).toBe(9);
  });

  it("completa claves nuevas con defaults sin aceptar claves extra", () => {
    const result = sanitizeSettings({ ...DEF, legal: "vigente", intruso: 999 });
    expect(result.legal).toBe("vigente");
    expect(result).not.toHaveProperty("intruso");
  });

  it("rechaza tipos o números inválidos", () => {
    expect(sanitizeSettings({ ...DEF, seaRate: "600" })).toBeNull();
    expect(sanitizeSettings({ ...DEF, seaRate: Number.NaN })).toBeNull();
  });
});
