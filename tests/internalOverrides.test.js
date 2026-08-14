import { describe, expect, it } from "vitest";
import { DEF, calculate, compareModes } from "../src/lib/calc.js";
import { mergeTemporarySettings, resolveInternalDutyRate } from "../src/lib/internalOverrides.js";

const quote = {
  origenSel: "China",
  subTipo: "comercial",
  fob: 120,
  peso: 65,
  largo: 10,
  ancho: 10,
  alto: 10,
  bultos: 1,
  m3manual: 0.4,
};

describe("ajustes temporales de la calculadora interna", () => {
  it("el derecho temporal prevalece sobre el arancel manual y admite cero", () => {
    expect(resolveInternalDutyRate("18", { duty: "35" })).toBe(35);
    expect(resolveInternalDutyRate("18", { duty: "0" })).toBe(0);
    expect(resolveInternalDutyRate("18", { duty: "" })).toBe(18);
    expect(resolveInternalDutyRate("", {})).toBeNull();
  });

  it("convierte los overrides a números sin modificar la configuración central", () => {
    const central = { ...DEF, seaRate: 450 };
    const temporary = mergeTemporarySettings(central, { seaRate: "444", duty: "35", vat: "" });

    expect(temporary.seaRate).toBe(444);
    expect(temporary.duty).toBe(35);
    expect(temporary.vat).toBe(central.vat);
    expect(central.seaRate).toBe(450);
  });

  it("aplica al instante las tarifas por kilo y volumen en su modalidad", () => {
    const settings = mergeTemporarySettings(DEF, {
      airRateChina: "31",
      seaRateKg: "17",
      seaRate: "444",
      seaMin: "1",
    });

    expect(calculate({ ...quote, tipo: "avion" }, settings).flete).toBeCloseTo(65 * 31);
    expect(calculate({ ...quote, tipo: "barco", seaMode: "kg" }, settings).flete).toBeCloseTo(65 * 17);
    expect(calculate({ ...quote, tipo: "barco", seaMode: "m3" }, settings).flete).toBeCloseTo(444);
  });

  it("aplica la tarifa DHL correspondiente al tramo facturable", () => {
    const high = mergeTemporarySettings(DEF, { dhlRateHigh: "19" });
    const low = mergeTemporarySettings(DEF, { dhlRateLow: "27" });

    expect(calculate({ ...quote, tipo: "dhl" }, high).flete).toBeCloseTo(65 * 19);
    expect(calculate({ ...quote, tipo: "dhl", peso: 20 }, low).flete).toBeCloseTo(20 * 27);
  });

  it("propaga derecho y tarifas temporales a todas las filas del comparador", () => {
    const settings = mergeTemporarySettings(DEF, {
      airRateChina: "31",
      seaRateKg: "17",
      seaRate: "444",
      dhlRateHigh: "19",
    });
    const data = { ...quote, aiDutyRate: resolveInternalDutyRate("18", { duty: "35" }) };
    const modes = compareModes(data, settings);

    expect(modes).toHaveLength(4);
    expect(modes.every(mode => mode.r.effectiveDutyPct === 35)).toBe(true);
    expect(modes.find(mode => mode.key === "aereo").r.airRate).toBe(31);
    expect(modes.find(mode => mode.key === "barcoKg").r.airRate).toBe(17);
    expect(modes.find(mode => mode.key === "barcoM3").r.flete).toBeCloseTo(444);
    expect(modes.find(mode => mode.key === "dhl").r.airRate).toBe(19);
  });
});
