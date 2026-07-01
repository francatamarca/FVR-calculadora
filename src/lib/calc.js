/* ── MOTOR DE CÁLCULO (puro, sin React) ─────────────────────
   Extraído de App.jsx para poder testearlo (Vitest) y reutilizarlo
   en el modo interno y el comparador de modalidades.
   NO cambiar fórmulas sin validar contra los tests de tests/calc.test.js. */

export const DEF = {
  airRateUSA: 20, airRateChina: 23, airRateEspana: 23, seaRate: 600, seaMin: 1, seaRateKg: 8,
  insurance: 1, duty: 20, stat: 3, vat: 21,
  addVat: 20, gains: 6, ib: 2.5,
  addVatOn: true, gainsOn: true, ibOn: true,
  pickup: 20, handling: 15, handlingMaxKg: 3, domestic: 15, domesticSea: 0,
  handlingSea: 15, handlingMaxKgSea: 3, domesticSeaKg: 0,
  feeType: "percentage", feePct: 8, feePctSea: 5, feePctKg: 8, feeBase: "fob", feeFixed: 150, feeFixedSea: 150, feeFixedKg: 150,
  validezDias: 7,
  manualDolar: null,
  legal: "Los valores calculados son estimativos y pueden variar según clasificación arancelaria, documentación comercial, tipo de mercadería, canal de importación, cotización del dólar, costos operativos y normativa vigente al momento de la operación.",
};

export const calculate = (d, s) => {
  const fob  = +d.fob || 0;
  const peso = +d.peso || 0;
  const L = +d.largo || 0, W = +d.ancho || 0, H = +d.alto || 0;
  const isAir      = d.tipo === "avion";
  const seaKg      = d.tipo === "barco" && d.seaMode === "kg";   // marítimo por kilo
  const seaM3      = d.tipo === "barco" && !seaKg;               // marítimo por m³
  const byWeight   = isAir || seaKg;                             // se cobra por peso facturable
  const internalTaxes = seaM3;                                   // impuestos internos: solo marítimo m³
  const isPersonal = isAir && d.subTipo === "personal";

  let flete = 0, pVol = 0, pFact = 0, m3 = 0, m3Fact = 0, airRate = 0;
  if (byWeight) {
    if (isAir) {
      // Aéreo: peso facturable = el mayor entre volumétrico y real
      pVol  = (L * W * H) / 5000;
      pFact = Math.max(pVol, peso);
      airRate = d.origenSel === "Estados Unidos (USA)" ? (+s.airRateUSA || 0)
              : d.origenSel === "España"               ? (+s.airRateEspana || 0)
              : (+s.airRateChina || 0);
    } else {
      // Marítimo por kilo: SOLO el peso real (sin volumétrico)
      pVol  = 0;
      pFact = peso;
      airRate = +s.seaRateKg || 0;
    }
    flete = pFact * airRate;
  } else {
    m3     = +d.m3manual || 0;
    m3Fact = Math.max(+s.seaMin || 1, m3);
    flete  = m3Fact * (+s.seaRate || 0);
  }

  const seguro = (fob + flete) * ((+s.insurance || 0) / 100);
  const cif    = fob + flete + seguro;

  // Arancel efectivo: categoría / IA / HS / manual (aiDutyRate) o el default de settings
  const effectiveDutyPct = (d.aiDutyRate !== null && d.aiDutyRate !== undefined)
    ? +d.aiDutyRate : (+s.duty || 0);

  let duty = 0, stat = 0, ivaBase = 0, iva = 0, addVat = 0, gains = 0, ib = 0;
  if (isPersonal) {
    // Franquicia USD 400: derechos solo sobre el excedente, con la tasa del HS code
    const excedentePersonal = Math.max(0, fob - 400);
    duty = excedentePersonal * (effectiveDutyPct / 100);
    // IVA sobre el FOB mas los derechos (= 21% s/400 + 21% s/(excedente + derechos))
    iva  = (fob + duty) * ((+s.vat || 0) / 100);
  } else {
    duty    = cif * (effectiveDutyPct / 100);
    stat    = cif * ((+s.stat || 0) / 100);
    ivaBase = cif + duty + stat;
    iva     = ivaBase * ((+s.vat || 0) / 100);
    addVat  = internalTaxes && s.addVatOn ? ivaBase * ((+s.addVat || 0) / 100) : 0;
    gains   = internalTaxes && s.gainsOn  ? ivaBase * ((+s.gains  || 0) / 100) : 0;
    ib      = internalTaxes && s.ibOn     ? ivaBase * ((+s.ib     || 0) / 100) : 0;
  }

  const pickup     = +s.pickup || 0;
  // Handling con regla de peso (avión y marítimo por kilo): se cobra el valor
  // configurado solo si el peso facturable es menor al umbral; si no, queda en 0.
  // Barco por m³ no tiene handling.
  const hasHandling = isAir || seaKg;
  const handlingMaxA = (s.handlingMaxKg    != null && s.handlingMaxKg    !== "" ? +s.handlingMaxKg    : 3);
  const handlingMaxK = (s.handlingMaxKgSea != null && s.handlingMaxKgSea !== "" ? +s.handlingMaxKgSea : 3);
  const handling   = isAir ? (pFact < handlingMaxA ? (+s.handling || 0) : 0)
                   : seaKg ? (pFact < handlingMaxK ? (+s.handlingSea || 0) : 0)
                   : 0;
  const domestic   = isAir ? (+s.domestic || 0)
                   : seaKg ? (+s.domesticSeaKg || 0)
                   : (+s.domesticSea || 0);
  const baseCost = flete + seguro + duty + stat + iva + addVat + gains + ib + pickup + handling + domestic;

  // Honorarios: % o monto fijo, diferenciado por modalidad (avión / barco m³ / marítimo por kilo).
  // Cada modalidad usa su valor; si no está configurado, cae al de barco y luego al de avión.
  const pick = (k, kSea, kKg) => {
    if (isAir) return +s[k] || 0;
    if (seaKg && s[kKg] != null && s[kKg] !== "") return +s[kKg];
    if (s[kSea] != null && s[kSea] !== "") return +s[kSea];
    return +s[k] || 0;
  };
  const feePctEff   = pick("feePct",   "feePctSea",   "feePctKg");
  const feeFixedEff = pick("feeFixed", "feeFixedSea", "feeFixedKg");
  let fees = 0;
  if (s.feeType === "fixed") {
    fees = feeFixedEff;
  } else if (s.feeBase === "fob") {
    fees = fob * (feePctEff / 100);
  } else {
    fees = baseCost * (feePctEff / 100);
  }

  const totalLog = baseCost + fees;
  const totalGen = fob + totalLog;

  // Precio unitario estimado (si se cargó cantidad)
  const cantidad = +d.cantidad > 0 ? +d.cantidad : null;
  const unitario = cantidad ? totalGen / cantidad : null;

  return {
    fob, isAir, seaKg, seaM3, byWeight, internalTaxes, isPersonal, hasHandling,
    peso, pVol, pFact, m3, m3Fact, airRate,
    flete, seguro, cif, duty, stat, ivaBase, iva,
    addVat, gains, ib, pickup, handling, domestic, fees,
    totalLog, totalGen, effectiveDutyPct, cantidad, unitario,
  };
};

/* ── COMPARADOR DE MODALIDADES ──────────────────────────────
   Calcula las 3 modalidades con los mismos datos (cuando alcanzan)
   y marca la recomendada (la más económica disponible).
   El m³ para barco se estima desde las medidas si no fue cargado
   (L×A×H en cm → m³), multiplicado por bultos si hay. */
export const compareModes = (d, s) => {
  const bultos = +d.bultos > 0 ? +d.bultos : 1;
  const m3Est = d.m3manual && +d.m3manual > 0
    ? +d.m3manual
    : (+d.largo > 0 && +d.ancho > 0 && +d.alto > 0)
      ? (+d.largo * +d.ancho * +d.alto * bultos) / 1000000
      : 0;

  const out = [];
  if (+d.peso > 0 && +d.largo > 0 && +d.ancho > 0 && +d.alto > 0) {
    out.push({ key: "aereo", label: "✈️ Aéreo", nota: "Más rápido",
      r: calculate({ ...d, tipo: "avion", subTipo: d.subTipo === "personal" ? "personal" : "comercial" }, s) });
  }
  if (+d.peso > 0) {
    out.push({ key: "barcoKg", label: "🚢 Barco por kilo", nota: "Ideal bajo peso",
      r: calculate({ ...d, tipo: "barco", seaMode: "kg" }, s) });
  }
  if (m3Est > 0) {
    out.push({ key: "barcoM3", label: "🚢 Barco por m³", nota: "Ideal volumen",
      r: calculate({ ...d, tipo: "barco", seaMode: "m3", m3manual: m3Est }, s), m3Usado: m3Est });
  }
  if (out.length > 1) {
    const min = out.reduce((a, b) => (b.r.totalGen < a.r.totalGen ? b : a));
    min.recomendada = true;
  }
  return out;
};
