import { describe, it, expect } from "vitest";
import { DEF, calculate, compareModes } from "../src/lib/calc.js";

// Settings de referencia = defaults del negocio
const S = { ...DEF };

const baseAereo = { tipo: "avion", subTipo: "comercial", origenSel: "China", fob: "1000", peso: "10", largo: "20", ancho: "20", alto: "20", aiDutyRate: 20 };

describe("peso volumétrico y facturable (aéreo)", () => {
  it("volumétrico = L×A×H/5000", () => {
    const r = calculate(baseAereo, S);
    expect(r.pVol).toBeCloseTo((20 * 20 * 20) / 5000, 6); // 1.6 kg
  });
  it("facturable = mayor entre real y volumétrico", () => {
    expect(calculate(baseAereo, S).pFact).toBe(10); // real 10 > vol 1.6
    expect(calculate({ ...baseAereo, peso: "1", largo: "50", ancho: "50", alto: "50" }, S).pFact).toBeCloseTo(25); // vol 25 > real 1
  });
  it("tarifa por país: USA 20, China/otro 23, España propia", () => {
    expect(calculate({ ...baseAereo, origenSel: "Estados Unidos (USA)" }, S).airRate).toBe(20);
    expect(calculate({ ...baseAereo, origenSel: "China" }, S).airRate).toBe(23);
    expect(calculate({ ...baseAereo, origenSel: "" }, S).airRate).toBe(23); // otro país → China
  });
});

describe("aéreo comercial — tributos", () => {
  const r = calculate(baseAereo, S);
  it("CIF = FOB + flete + seguro", () => {
    expect(r.flete).toBeCloseTo(230); // 10 kg × 23
    expect(r.fleteBase).toBeCloseTo(30);
    expect(r.seguro).toBeCloseTo((1000 + 30) * 0.01);
    expect(r.cif).toBeCloseTo(1000 + 30 + 10.3);
  });
  it("derecho s/CIF, tasa s/CIF, IVA s/(CIF+der+tasa), sin impuestos internos", () => {
    expect(r.duty).toBeCloseTo(r.cif * 0.20);
    expect(r.stat).toBeCloseTo(r.cif * 0.03);
    expect(r.iva).toBeCloseTo((r.cif + r.duty + r.stat) * 0.21);
    expect(r.addVat).toBe(0); expect(r.gains).toBe(0); expect(r.ib).toBe(0);
  });
});

describe("franquicia personal (aéreo)", () => {
  it("FOB 500, arancel 20% → derecho 20; IVA 109,20 (regla validada por el dueño)", () => {
    const r = calculate({ ...baseAereo, subTipo: "personal", fob: "500" }, S);
    expect(r.flete).toBeCloseTo(230);
    expect(r.fleteBase).toBeCloseTo(30);
    expect(r.cif).toBeCloseTo(535.3);
    expect(r.duty).toBeCloseTo(27.06);
    expect(r.iva).toBeCloseTo(118.0956);
    expect(r.stat).toBe(0);
  });
  it("FOB ≤ 400 → exento de derechos, IVA sobre FOB", () => {
    const r = calculate({ ...baseAereo, subTipo: "personal", fob: "300" }, S);
    expect(r.duty).toBe(0);
    expect(r.cif).toBeCloseTo(333.3);
    expect(r.iva).toBeCloseTo(69.993);
  });
});

describe("barco por m³ (LCL)", () => {
  const d = { tipo: "barco", seaMode: "m3", fob: "1000", peso: "50", m3manual: "2", aiDutyRate: 20 };
  it("flete = max(m³, mínimo) × tarifa; mínimo facturable aplica", () => {
    const r = calculate(d, S);
    expect(r.flete).toBeCloseTo(1200);
    expect(r.fleteBase).toBeCloseTo(100);
    expect(r.seguro).toBeCloseTo(11);
    expect(r.cif).toBeCloseTo(1111);
    expect(calculate({ ...d, m3manual: "0.4" }, S).m3Fact).toBe(1);        // mínimo 1 m³
    expect(calculate({ ...d, m3manual: "0.4" }, S).flete).toBeCloseTo(600);
    expect(calculate({ ...d, m3manual: "0.4" }, S).fleteBase).toBeCloseTo(50);
  });
  it("tiene impuestos internos y NO handling", () => {
    const r = calculate(d, S);
    expect(r.addVat).toBeGreaterThan(0);
    expect(r.gains).toBeGreaterThan(0);
    expect(r.ib).toBeGreaterThan(0);
    expect(r.handling).toBe(0);
    expect(r.hasHandling).toBe(false);
  });
});

describe("barco por kilo", () => {
  const d = { tipo: "barco", seaMode: "kg", fob: "1000", peso: "2", largo: "50", ancho: "50", alto: "50", aiDutyRate: 20 };
  it("cobra por peso REAL: ignora el volumétrico aunque haya medidas", () => {
    const r = calculate(d, S);
    expect(r.pFact).toBe(2);              // real, NO 25 volumétrico
    expect(r.flete).toBeCloseTo(16);      // 2 kg × 8
  });
  it("tributos de aéreo comercial, SIN impuestos internos", () => {
    const r = calculate(d, S);
    expect(r.stat).toBeGreaterThan(0);
    expect(r.addVat).toBe(0); expect(r.gains).toBe(0); expect(r.ib).toBe(0);
  });
  it("handling con umbral propio sobre peso real (2<3 → cobra; 5≥3 → 0)", () => {
    expect(calculate(d, S).handling).toBe(15);
    expect(calculate({ ...d, peso: "5" }, S).handling).toBe(0);
  });
});

describe("honorarios por modalidad y arancel manual", () => {
  it("avión 8%, barco m³ 5%, barco kg 8% (s/FOB 1000)", () => {
    expect(calculate(baseAereo, S).fees).toBeCloseTo(80);
    expect(calculate({ tipo: "barco", seaMode: "m3", fob: "1000", m3manual: "1", aiDutyRate: 20 }, S).fees).toBeCloseTo(50);
    expect(calculate({ tipo: "barco", seaMode: "kg", fob: "1000", peso: "2", aiDutyRate: 20 }, S).fees).toBeCloseTo(80);
  });
  it("arancel manual (aiDutyRate) pisa el default; sin él usa settings.duty", () => {
    expect(calculate({ ...baseAereo, aiDutyRate: 35 }, S).effectiveDutyPct).toBe(35);
    expect(calculate({ ...baseAereo, aiDutyRate: 0 }, S).effectiveDutyPct).toBe(0); // 0 explícito es válido
    expect(calculate({ ...baseAereo, aiDutyRate: null }, S).effectiveDutyPct).toBe(DEF.duty);
  });
  it("precio unitario = total / cantidad", () => {
    const r = calculate({ ...baseAereo, cantidad: "50" }, S);
    expect(r.unitario).toBeCloseTo(r.totalGen / 50);
    expect(calculate(baseAereo, S).unitario).toBeNull(); // sin cantidad
  });
});

describe("comparador de modalidades", () => {
  it("con peso+medidas compara las 3 y recomienda la más barata", () => {
    const modos = compareModes({ fob: "1000", peso: "2", largo: "30", ancho: "30", alto: "30", bultos: "1", aiDutyRate: 20, subTipo: "comercial" }, S);
    expect(modos.length).toBe(3);
    const rec = modos.find(m => m.recomendada);
    expect(rec).toBeDefined();
    expect(Math.min(...modos.map(m => m.r.totalGen))).toBeCloseTo(rec.r.totalGen);
  });
  it("estima m³ desde medidas×bultos si no hay m3manual", () => {
    const modos = compareModes({ fob: "1000", peso: "10", largo: "100", ancho: "100", alto: "100", bultos: "2", aiDutyRate: 20 }, S);
    const m3 = modos.find(m => m.key === "barcoM3");
    expect(m3.m3Usado).toBeCloseTo(2); // 1 m³ × 2 bultos
  });
});

describe("edge cases", () => {
  it("inputs vacíos no producen NaN", () => {
    const r = calculate({ tipo: "avion", subTipo: "comercial" }, S);
    expect(Number.isFinite(r.totalGen)).toBe(true);
    expect(r.totalGen).toBeGreaterThanOrEqual(0);
  });
});
