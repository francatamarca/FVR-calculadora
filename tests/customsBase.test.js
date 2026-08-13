import { describe, expect, it } from "vitest";
import { DEF, calculate } from "../src/lib/calc.js";

const S = { ...DEF };
const common = {
  origenSel: "China",
  fob: 1000,
  peso: 10,
  largo: 20,
  ancho: 20,
  alto: 20,
  aiDutyRate: 20,
};

const chargedTotal = (r) =>
  r.flete + r.seguro + r.duty + r.stat + r.iva + r.addVat + r.gains +
  r.ib + r.pickup + r.handling + r.domestic + r.fees;

describe("base aduanera separada del flete comercial", () => {
  it.each([
    ["aéreo comercial", { ...common, tipo: "avion", subTipo: "comercial" }, 230, 30],
    ["aéreo personal", { ...common, tipo: "avion", subTipo: "personal", fob: 500 }, 230, 30],
    ["marítimo por kg", { ...common, tipo: "barco", seaMode: "kg" }, 80, 30],
  ])("%s usa USD 3/kg solo para tributos", (_label, data, commercialFreight, customsFreight) => {
    const r = calculate(data, S);

    expect(r.pFact).toBe(10);
    expect(r.flete).toBeCloseTo(commercialFreight);
    expect(r.customsPerUnit).toBe(3);
    expect(r.fleteBase).toBeCloseTo(customsFreight);
    expect(r.seguro).toBeCloseTo((r.fob + customsFreight) * 0.01);
    expect(r.cif).toBeCloseTo(r.fob + customsFreight + r.seguro);
    expect(r.totalLog).toBeCloseTo(chargedTotal(r));
  });

  it("marítimo por m³ usa USD 50/m³ solo para tributos", () => {
    const r = calculate({ ...common, tipo: "barco", seaMode: "m3", m3manual: 2 }, S);

    expect(r.m3Fact).toBe(2);
    expect(r.flete).toBeCloseTo(1200);
    expect(r.customsPerUnit).toBe(50);
    expect(r.fleteBase).toBeCloseTo(100);
    expect(r.seguro).toBeCloseTo(11);
    expect(r.cif).toBeCloseTo(1111);
    expect(r.totalLog).toBeCloseTo(chargedTotal(r));
  });

  it("DHL conserva exactamente el caso del PDF de referencia", () => {
    const r = calculate({
      tipo: "dhl",
      subTipo: "comercial",
      origenSel: "China",
      fob: 500,
      peso: 40,
      largo: 50,
      ancho: 40,
      alto: 30,
      aiDutyRate: 20,
    }, S);

    expect(r.dhlDivisor).toBe(5000);
    expect(r.pVol).toBe(12);
    expect(r.pFact).toBe(40);
    expect(r.airRate).toBe(15);
    expect(r.flete).toBeCloseTo(600);
    expect(r.fleteBase).toBeCloseTo(120);
    expect(r.seguro).toBeCloseTo(6.2);
    expect(r.cif).toBeCloseTo(626.2);
    expect(r.duty).toBeCloseTo(125.24);
    expect(r.stat).toBeCloseTo(18.786);
    expect(r.ivaBase).toBeCloseTo(770.226);
    expect(r.iva).toBeCloseTo(161.74746);
    expect(r.handling).toBeCloseTo(18.15);
    expect(r.totalLog).toBeCloseTo(930.12346);
    expect(r.totalGen).toBeCloseTo(1430.12346);
    expect(r.totalLog).toBeCloseTo(chargedTotal(r));
  });
});
