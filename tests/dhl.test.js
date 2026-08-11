/* ── PRUEBAS OBLIGATORIAS DHL EXPRESS ───────────────────────
   Casos numéricos del prompt de implementación (sección 5) + límites
   de tramo + elegibilidad + bultos múltiples + código postal + la
   REGRESIÓN CONGELADA de la modalidad aérea actual (no puede cambiar). */

import { describe, it, expect } from "vitest";
import { DEF, calculate, calculateDhl, dhlEligibility, packTotals } from "../src/lib/calc.js";
import { normalizeCP, remoteStatus, deliveryEstimate } from "../src/lib/dhlZones.js";

const S = { ...DEF }; // config por defecto (dhlRateLow 20, dhlRateHigh 15, etc.)
const near = (a, b, dec = 6) => expect(a).toBeCloseTo(b, dec);

describe("DHL — Caso A obligatorio (10 kg, FOB 1.000, derecho 20%)", () => {
  const d = { tipo: "dhl", fob: 1000, peso: 10, largo: 20, ancho: 20, alto: 20, aiDutyRate: 20, origenSel: "China", subTipo: "comercial" };
  const r = calculateDhl(d, S);
  it("peso volumétrico < peso real → facturable 10 kg", () => {
    expect(r.pVol).toBeCloseTo(8000 / 5000, 6); // 1,6 kg (divisor 5.000, igual al aéreo)
    expect(r.pFact).toBe(10);
  });
  it("flete base aduanera USD 30,00 (NO se cobra)", () => near(r.fleteBase, 30));
  it("seguro USD 10,30", () => near(r.seguro, 10.30));
  it("CIF USD 1.040,30", () => near(r.cif, 1040.30));
  it("derecho USD 208,06", () => near(r.duty, 208.06));
  it("tasa estadística USD 31,209", () => near(r.stat, 31.209));
  it("base imponible IVA USD 1.279,569", () => near(r.ivaBase, 1279.569));
  it("IVA USD 268,70949", () => near(r.iva, 268.70949));
  it("flete internacional cobrado USD 200,00 (10 kg × 20)", () => near(r.flete, 200));
  it("handling DHL USD 18,15", () => near(r.handling, 18.15));
  it("total servicio USD 736,42849 (sin duplicar flete aduanero)", () => near(r.totalLog, 736.42849));
  it("total general USD 1.736,42849", () => near(r.totalGen, 1736.42849));
  it("sin honorarios, sin pickup, sin envío nacional, sin internos", () => {
    expect(r.fees).toBe(0); expect(r.pickup).toBe(0); expect(r.domestic).toBe(0);
    expect(r.addVat + r.gains + r.ib).toBe(0);
  });
});

describe("DHL — Caso B obligatorio (58,824 kg, FOB 1.810, derecho 18,5%)", () => {
  const d = { tipo: "dhl", fob: 1810, peso: 58.824, largo: 10, ancho: 10, alto: 10, aiDutyRate: 18.5, origenSel: "China" };
  const r = calculateDhl(d, S);
  it("facturable 58,824 kg → tarifa alta 15/kg", () => { expect(r.pFact).toBeCloseTo(58.824, 6); expect(r.airRate).toBe(15); });
  it("flete base aduanera USD 176,472", () => near(r.fleteBase, 176.472));
  it("seguro USD 19,86472", () => near(r.seguro, 19.86472));
  it("CIF USD 2.006,33672", () => near(r.cif, 2006.33672));
  it("derecho USD 371,1722932", () => near(r.duty, 371.1722932));
  it("tasa USD 60,1901016", () => near(r.stat, 60.1901016));
  it("base IVA USD 2.437,6991148", () => near(r.ivaBase, 2437.6991148));
  it("IVA USD 511,916814108", () => near(r.iva, 511.916814108));
  it("flete internacional USD 882,36", () => near(r.flete, 882.36));
  it("total servicio USD 1.863,653928908", () => near(r.totalLog, 1863.653928908));
  it("total general USD 3.673,653928908", () => near(r.totalGen, 3673.653928908));
});

describe("DHL — límites de tramo sin errores de borde", () => {
  const base = { tipo: "dhl", fob: 100, largo: 1, ancho: 1, alto: 1, aiDutyRate: 0 };
  it("10,000 kg usa USD 20/kg", () => expect(calculateDhl({ ...base, peso: 10 }, S).airRate).toBe(20));
  it("29,999 kg usa USD 20/kg", () => expect(calculateDhl({ ...base, peso: 29.999 }, S).airRate).toBe(20));
  it("30,000 kg usa USD 15/kg", () => expect(calculateDhl({ ...base, peso: 30 }, S).airRate).toBe(15));
  it("el peso facturable puede venir del volumétrico (divisor 5.000, igual al aéreo)", () => {
    // 50×40×60 = 120.000 cm³ / 5.000 = 24 kg volumétrico vs 5 kg reales → tramo bajo
    const r = calculateDhl({ ...base, peso: 5, largo: 50, ancho: 40, alto: 60 }, S);
    expect(r.pVol).toBe(24); expect(r.pFact).toBe(24); expect(r.airRate).toBe(20);
    // 50×50×60 = 150.000 cm³ / 5.000 = 30 kg volumétrico → cruza al tramo de 15/kg
    const r2 = calculateDhl({ ...base, peso: 5, largo: 50, ancho: 50, alto: 60 }, S);
    expect(r2.pVol).toBe(30); expect(r2.pFact).toBe(30); expect(r2.airRate).toBe(15);
  });
});

describe("DHL — elegibilidad (China + comercial + ≥10 kg)", () => {
  const ok = { fob: 500, peso: 12, largo: 10, ancho: 10, alto: 10, tipo: "avion", subTipo: "comercial", origenSel: "China" };
  it("China + comercial + 12 kg → elegible", () => expect(dhlEligibility(ok, S).ok).toBe(true));
  it("origen sin elegir (default China de FVR) → elegible", () => expect(dhlEligibility({ ...ok, origenSel: "" }, S).ok).toBe(true));
  it("Estados Unidos → NO", () => expect(dhlEligibility({ ...ok, origenSel: "Estados Unidos (USA)" }, S)).toMatchObject({ ok: false, reason: "origen" }));
  it("España → NO", () => expect(dhlEligibility({ ...ok, origenSel: "España" }, S).ok).toBe(false));
  it("envío personal → NO (franquicia intacta)", () => expect(dhlEligibility({ ...ok, subTipo: "personal" }, S)).toMatchObject({ ok: false, reason: "personal" }));
  it("menos de 10 kg facturables → NO, con motivo 'peso'", () => {
    const e = dhlEligibility({ ...ok, peso: 4 }, S);
    expect(e).toMatchObject({ ok: false, reason: "peso" });
  });
  it("9 kg reales pero volumétrico 12,8 kg → SÍ elegible (facturable manda)", () => {
    expect(dhlEligibility({ ...ok, peso: 9, largo: 40, ancho: 40, alto: 40 }, S).ok).toBe(true); // 64.000/5.000 = 12,8
  });
  it("dhlActive false → NO", () => expect(dhlEligibility(ok, { ...S, dhlActive: false }).ok).toBe(false));
});

describe("Bultos múltiples — Σ(cant × L×A×H) para todas las modalidades", () => {
  const grupos = { packageGroups: [
    { cant: 2, largo: 50, ancho: 40, alto: 30, pesoCaja: 8 },   // 2×60.000 = 120.000 cm³, 16 kg
    { cant: 1, largo: 20, ancho: 20, alto: 20, pesoCaja: 4 },   // 8.000 cm³, 4 kg
  ] };
  it("volumen y peso agregados", () => {
    const t = packTotals(grupos);
    expect(t.volCm3).toBe(128000);
    expect(t.pesoGrupos).toBe(20);
  });
  it("DHL usa divisor 5.000 sobre el total (igual al aéreo)", () => {
    const r = calculateDhl({ tipo: "dhl", fob: 100, peso: 20, ...grupos, aiDutyRate: 0 }, S);
    expect(r.pVol).toBeCloseTo(25.6, 6); expect(r.pFact).toBeCloseTo(25.6, 6);
  });
  it("aéreo usa divisor 5.000 sobre el mismo total", () => {
    const r = calculate({ tipo: "avion", subTipo: "comercial", fob: 100, peso: 20, ...grupos, aiDutyRate: 0 }, S);
    expect(r.pVol).toBeCloseTo(25.6, 6);
  });
  it("compatibilidad: sin packageGroups se usa largo/ancho/alto × bultos", () => {
    const t = packTotals({ largo: 10, ancho: 10, alto: 10, bultos: 3 });
    expect(t.volCm3).toBe(3000);
  });
});

describe("Código postal — normalización y estado de zona", () => {
  it("acepta numérico, prefijo provincial y CPA completo", () => {
    expect(normalizeCP("4600").num).toBe("4600");
    expect(normalizeCP("Y4600").num).toBe("4600");
    expect(normalizeCP(" y 4600 abc ").num).toBe("4600");
    expect(normalizeCP("Y4600ABC").num).toBe("4600");
  });
  it("conserva el valor original para mostrar", () => {
    expect(normalizeCP("Y4600ABC").original).toBe("Y4600ABC");
  });
  it("CP sin parte numérica → unknown y plazo estándar 5-7", () => {
    expect(remoteStatus("ABCD")).toBe("unknown");
    const e = deliveryEstimate("ABCD", S);
    expect(e.min).toBe(5); expect(e.max).toBe(7); expect(e.remote).toBe(false);
  });
  it("lista oficial DHL (vigencia 04/01/2026): remotos y no remotos reales", () => {
    expect(remoteStatus("1633")).toBe("remote");     // primer rango del PDF (1633-1634)
    expect(remoteStatus("Y4600ABC")).toBe("remote"); // Jujuy — figura en la lista
    expect(remoteStatus("9410")).toBe("remote");     // Ushuaia
    expect(remoteStatus("1000")).toBe("not_remote"); // CABA no figura
    expect(remoteStatus("1414")).toBe("not_remote");
    const e = deliveryEstimate("4600", S);
    expect(e.remote).toBe(true); expect(e.min).toBe(9); expect(e.max).toBe(11);
  });
});

describe("REGRESIÓN CONGELADA — presupuesto aéreo de referencia (no puede cambiar)", () => {
  // Producto herramientas · FOB 999 · 1 kg · 10×10×10 · tarifa China 25 ·
  // seguro 1% · derecho 18% · tasa 3% · IVA 21% · handling 20 · nacional 15 · honorarios 9% FOB
  const s = { ...DEF, airRateChina: 25, handling: 20, handlingMaxKg: 3, domestic: 15, feePct: 9, feeType: "percentage", feeBase: "fob", pickup: 0 };
  const d = { tipo: "avion", subTipo: "comercial", fob: 999, peso: 1, largo: 10, ancho: 10, alto: 10, aiDutyRate: 18, origenSel: "China" };
  const r = calculate(d, s);
  it("peso volumétrico 0,20 kg / facturable 1 kg", () => { near(r.pVol, 0.2); expect(r.pFact).toBe(1); });
  it("flete aéreo USD 25,00", () => near(r.flete, 25, 2));
  it("flete base aduanera USD 3,00 (NO se cobra)", () => near(r.fleteBase, 3, 2));
  it("seguro USD 10,02", () => near(r.seguro, 10.02, 2));
  it("CIF USD 1.012,02", () => near(r.cif, 1012.02, 2));
  it("derecho USD 182,16", () => near(r.duty, 182.16, 2));
  it("tasa estadística USD 30,36", () => near(r.stat, 30.36, 2));
  it("base imponible IVA USD 1.224,54", () => near(r.ivaBase, 1224.54, 2));
  it("IVA USD 257,15", () => near(r.iva, 257.15, 2));
  it("honorarios USD 89,91", () => near(r.fees, 89.91, 2));
  it("total servicio USD 629,61", () => near(r.totalLog, 629.61, 2));
  it("total general USD 1.628,61", () => near(r.totalGen, 1628.61, 2));
  it("agregar DHL no toca la fórmula aérea: mismos resultados con dhl config presente", () => {
    const r2 = calculate(d, { ...s, dhlActive: true, dhlPublic: true });
    expect(r2.totalGen).toBe(r.totalGen);
  });
});
