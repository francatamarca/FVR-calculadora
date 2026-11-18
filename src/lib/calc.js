/* ── MOTOR DE CÁLCULO (puro, sin React) ─────────────────────
   Extraído de App.jsx para poder testearlo (Vitest) y reutilizarlo
   en el modo interno y el comparador de modalidades.
   NO cambiar fórmulas sin validar contra los tests de tests/calc.test.js. */

export const DEF = {
  airRateUSA: 20, airRateChina: 23, seaRate: 600, seaMin: 1,
  airCustomsPerKg: 3, seaCustomsPerM3: 50,
  insurance: 1, duty: 20, stat: 3, vat: 21,
  addVat: 20, gains: 6, ib: 2.5,
  addVatOn: true, gainsOn: true, ibOn: true,
  pickup: 20, pickupSea: 0, handling: 15, handlingMaxKg: 3, domestic: 15, domesticSea: 0,
  feeType: "percentage", feePct: 8, feePctSea: 5, feeBase: "fob", feeFixed: 150, feeFixedSea: 150,
  // ── DHL Express (China → Argentina, solo comercial) ──
  // dhlActive: modalidad habilitada (interno siempre la ve si está activa).
  // dhlPublic: visible para clientes en la calculadora pública (feature flag).
  // ACTIVADO públicamente el 30/07/2026 tras validación de Francisco en el interno.
  dhlActive: true, dhlPublic: true,
  dhlMinKg: 10,            // peso facturable mínimo para ofrecer DHL
  dhlDivisor: 5000,        // divisor volumétrico DHL (igual al aéreo — corregido 31/07/2026)
  dhlRateBreak: 30,        // desde este peso aplica la tarifa alta
  dhlRateLow: 20,          // USD/kg desde 10 kg y menos de 30 kg
  dhlRateHigh: 15,         // USD/kg desde 30 kg
  dhlCustomsPerKg: 3,      // flete ESTIMADO solo para base aduanera (no se cobra)
  dhlHandling: 18.15,      // único cargo fijo por operación (USD 15 + IVA)
  dhlDeliveryMin: 5, dhlDeliveryMax: 7,   // demora estándar (días hábiles)
  dhlRemoteMin: 9, dhlRemoteMax: 11,      // demora zona remota
  validezDias: 7,
  manualDolar: null,
  legal: "Los valores calculados son estimativos y pueden variar según clasificación arancelaria, documentación comercial, tipo de mercadería, canal de importación, cotización del dólar, costos operativos y normativa vigente al momento de la operación.",
};

// Sólo conservar parámetros de las modalidades vigentes, también al cargar
// configuraciones antiguas del navegador o de la base central.
export const currentSettings = (input = {}) => Object.fromEntries(
  Object.entries(input).filter(([key]) => Object.prototype.hasOwnProperty.call(DEF, key)),
);

export const originAllowed = (origin) => !/^(espa[nñ]a|spain)$/i.test(String(origin || "").trim());

export const assertCurrentMode = (d) => {
  if (![d.origenSel, d.paisOrigen].every(originAllowed)) {
    throw new Error("Origen no disponible.");
  }
  if (d.tipo !== "barco" && d.subTipo && d.subTipo !== "comercial") {
    throw new Error("Modalidad no disponible. El envío aéreo es únicamente comercial.");
  }
  if (d.tipo === "barco" && d.seaMode && d.seaMode !== "m3") {
    throw new Error("Modalidad no disponible. Elegí marítimo por m³ y cargá el volumen.");
  }
};

/* ── BULTOS MÚLTIPLES ───────────────────────────────────────
   Fuente única del volumen para TODAS las modalidades:
   - Si hay `packageGroups` (estructura nueva), volumen = Σ cant×L×A×H.
   - Si no (formularios/presupuestos viejos), se construye un único grupo
     desde largo/ancho/alto × bultos — compatibilidad total hacia atrás. */
export const packGroups = (d) => {
  if (Array.isArray(d.packageGroups) && d.packageGroups.length) {
    return d.packageGroups.map((g) => ({
      cant: +g.cant > 0 ? +g.cant : 1,
      largo: +g.largo || 0, ancho: +g.ancho || 0, alto: +g.alto || 0,
      pesoCaja: +g.pesoCaja || 0,
    }));
  }
  return [{ cant: +d.bultos > 0 ? +d.bultos : 1, largo: +d.largo || 0, ancho: +d.ancho || 0, alto: +d.alto || 0, pesoCaja: 0 }];
};

export const packTotals = (d) => {
  const gs = packGroups(d);
  const measuredVolume = gs.reduce((sum, g) => sum + g.cant * g.largo * g.ancho * g.alto, 0);
  return {
    // Adaptador por lote: volumen TOTAL declarado, sin inventar dimensiones.
    // Las medidas reales, cuando existen, siguen siendo la fuente prioritaria.
    volCm3: measuredVolume || (+d.totalVolumeM3 > 0 ? +d.totalVolumeM3 * 1e6 : 0),
    pesoGrupos: gs.reduce((sum, g) => sum + g.cant * (g.pesoCaja || 0), 0),
    grupos: gs,
  };
};

/* ── DHL EXPRESS (motor independiente — no toca la fórmula aérea) ──
   Solo China + envío comercial + peso facturable ≥ dhlMinKg.
   Particularidades (ver docs/IMPLEMENTACION_DHL_FVR.md):
   - Divisor volumétrico 5.000 (igual al aéreo; configurable).
   - "Flete estimado para base aduanera" (USD 3/kg): SOLO forma seguro,
     CIF y tributos — NO se cobra ni se suma al total.
   - "Flete internacional" cobrado: tarifa 20/kg (10–<30 kg) o 15/kg (≥30).
   - Único cargo logístico: Handling DHL fijo. Sin honorarios, sin pick up,
     sin envío nacional, sin handling aéreo. */
export const calculateDhl = (d, s) => {
  assertCurrentMode({ ...d, tipo:"dhl" });
  const fob  = +d.fob || 0;
  const peso = +d.peso || 0;
  const { volCm3 } = packTotals(d);
  const divisor = +s.dhlDivisor > 0 ? +s.dhlDivisor : 5000;
  const pVol  = volCm3 / divisor;
  const pFact = Math.max(peso, pVol);

  const rateBreak = +s.dhlRateBreak > 0 ? +s.dhlRateBreak : 30;
  const airRate = pFact < rateBreak ? (+s.dhlRateLow || 0) : (+s.dhlRateHigh || 0);
  const flete = pFact * airRate; // Flete internacional COBRADO al cliente

  // Base aduanera: override total (solo interno) o peso facturable × USD/kg
  const customsPerKg = +s.dhlCustomsPerKg || 0;
  const hasOverride = d.dhlCustomsOverride != null && d.dhlCustomsOverride !== "" && !isNaN(+d.dhlCustomsOverride);
  const fleteBase = hasOverride ? +d.dhlCustomsOverride : pFact * customsPerKg;

  const seguro = (fob + fleteBase) * ((+s.insurance || 0) / 100);
  const cif    = fob + fleteBase + seguro;
  const effectiveDutyPct = (d.aiDutyRate !== null && d.aiDutyRate !== undefined)
    ? +d.aiDutyRate : (+s.duty || 0);
  const duty    = cif * (effectiveDutyPct / 100);
  const stat    = cif * ((+s.stat || 0) / 100);
  const ivaBase = cif + duty + stat;
  const iva     = ivaBase * ((+s.vat || 0) / 100);

  const handling = +s.dhlHandling || 0; // único cargo, una sola vez
  const totalLog = flete + seguro + duty + stat + iva + handling;
  const totalGen = fob + totalLog;
  const cantidad = +d.cantidad > 0 ? +d.cantidad : null;

  return {
    isDhl: true, isAir: false, seaM3: false, byWeight: true,
    internalTaxes: false, hasHandling: true,
    fob, peso, pVol, pFact, m3: 0, m3Fact: 0, airRate,
    flete, fleteBase, customsPerKg, customsOverride: hasOverride,
    seguro, cif, duty, stat, ivaBase, iva,
    addVat: 0, gains: 0, ib: 0, pickup: 0, handling, domestic: 0, fees: 0,
    totalLog, totalGen, effectiveDutyPct, cantidad,
    unitario: cantidad ? totalGen / cantidad : null,
    dhlDivisor: divisor,
  };
};

/* Elegibilidad DHL: China (u origen sin elegir — el default comercial de FVR
   es China en toda la app) + comercial + peso facturable ≥ mínimo. */
export const dhlEligibility = (d, s) => {
  if (!s.dhlActive) return { ok: false, reason: "off" };
  try { assertCurrentMode({ ...d, tipo:"dhl" }); }
  catch { return { ok:false, reason:"modalidad" }; }
  const origen = d.origenSel || "";
  if (origen !== "" && origen !== "China") return { ok: false, reason: "origen" };
  const r = calculateDhl(d, s);
  const min = s.dhlMinKg != null && s.dhlMinKg !== "" ? +s.dhlMinKg : 10;
  if (!(r.pFact >= min)) return { ok: false, reason: "peso", pFact: r.pFact, min };
  return { ok: true, r, min };
};

export const calculate = (d, s) => {
  assertCurrentMode(d);
  if (d.tipo === "dhl") return calculateDhl(d, s); // modalidad independiente
  const fob  = +d.fob || 0;
  const peso = +d.peso || 0;
  const { volCm3 } = packTotals(d); // volumen total (multi-bulto o legacy)
  const isAir      = d.tipo === "avion";
  const seaM3      = d.tipo === "barco";
  const byWeight   = isAir;
  const internalTaxes = seaM3;                                   // impuestos internos: solo marítimo m³

  let flete = 0, pVol = 0, pFact = 0, m3 = 0, m3Fact = 0, airRate = 0;
  if (isAir) {
      // Aéreo: peso facturable = el mayor entre volumétrico y real.
      // Volumen = Σ de todos los bultos (packageGroups o legacy L×A×H×bultos).
      pVol  = volCm3 / 5000;
      pFact = Math.max(pVol, peso);
      airRate = d.origenSel === "Estados Unidos (USA)" ? (+s.airRateUSA || 0)
              : (+s.airRateChina || 0);
    flete = pFact * airRate;
  } else {
    m3     = +d.m3manual || 0;
    m3Fact = Math.max(+s.seaMin || 1, m3);
    flete  = m3Fact * (+s.seaRate || 0);
  }

  /* La tarifa comercial de transporte y el flete usado para valorar en
     Aduana son conceptos distintos. El primero se cobra al cliente; el
     segundo solo forma seguro, CIF y tributos y nunca se duplica en el total.

     - Aereo comercial: peso facturable x USD 3/kg.
     - Maritimo por m3: volumen facturable x USD 50/m3. */
  const customsPerUnit = isAir ? (+s.airCustomsPerKg || 0)
    : seaM3 ? (+s.seaCustomsPerM3 || 0)
    : null;
  const fleteBase = isAir ? pFact * customsPerUnit
    : seaM3 ? m3Fact * customsPerUnit
    : flete;

  const seguro = (fob + fleteBase) * ((+s.insurance || 0) / 100);
  const cif    = fob + fleteBase + seguro;

  // Arancel efectivo: categoría / IA / HS / manual (aiDutyRate) o el default de settings
  const effectiveDutyPct = (d.aiDutyRate !== null && d.aiDutyRate !== undefined)
    ? +d.aiDutyRate : (+s.duty || 0);

  let duty = 0, stat = 0, ivaBase = 0, iva = 0, addVat = 0, gains = 0, ib = 0;
    duty    = cif * (effectiveDutyPct / 100);
    stat    = cif * ((+s.stat || 0) / 100);
    ivaBase = cif + duty + stat;
    iva     = ivaBase * ((+s.vat || 0) / 100);
    addVat  = internalTaxes && s.addVatOn ? ivaBase * ((+s.addVat || 0) / 100) : 0;
    gains   = internalTaxes && s.gainsOn  ? ivaBase * ((+s.gains  || 0) / 100) : 0;
    ib      = internalTaxes && s.ibOn     ? ivaBase * ((+s.ib     || 0) / 100) : 0;
  const pickup     = isAir ? (+s.pickup || 0) : (+s.pickupSea || 0);
  // Barco por m³ no tiene handling; el aéreo conserva su regla por peso.
  const hasHandling = isAir;
  const handlingMaxA = (s.handlingMaxKg    != null && s.handlingMaxKg    !== "" ? +s.handlingMaxKg    : 3);
  const handling   = isAir ? (pFact < handlingMaxA ? (+s.handling || 0) : 0)
                   : 0;
  const domestic   = isAir ? (+s.domestic || 0)
                   : (+s.domesticSea || 0);
  const baseCost = flete + seguro + duty + stat + iva + addVat + gains + ib + pickup + handling + domestic;

  // Honorarios: % o monto fijo, diferenciado entre avión y barco por m³.
  const pick = (k, kSea) => {
    if (isAir) return +s[k] || 0;
    if (s[kSea] != null && s[kSea] !== "") return +s[kSea];
    return +s[k] || 0;
  };
  const feePctEff   = pick("feePct",   "feePctSea");
  const feeFixedEff = pick("feeFixed", "feeFixedSea");
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
    fob, isAir, seaM3, byWeight, internalTaxes, hasHandling,
    peso, pVol, pFact, m3, m3Fact, airRate,
    flete, fleteBase, customsPerUnit, seguro, cif, duty, stat, ivaBase, iva,
    addVat, gains, ib, pickup, handling, domestic, fees,
    totalLog, totalGen, effectiveDutyPct, cantidad, unitario,
  };
};

/* ── COMPARADOR DE MODALIDADES ──────────────────────────────
   Compara aéreo, DHL y marítimo por m³ con los mismos datos (cuando alcanzan)
   y marca la recomendada (la más económica disponible).
   El m³ para barco se estima desde las medidas si no fue cargado
   (L×A×H en cm → m³), multiplicado por bultos si hay. */
export const compareModes = (d, s) => {
  try { assertCurrentMode(d); } catch { return []; }
  const { volCm3 } = packTotals(d);
  const m3Est = d.m3manual && +d.m3manual > 0 ? +d.m3manual : volCm3 / 1000000;

  const out = [];
  if (+d.peso > 0 && volCm3 > 0) {
    const data = { ...d, tipo: "avion", subTipo: "comercial" };
    out.push({ key: "aereo", label: "✈️ Aéreo", nota: "Más rápido",
      d: data, r: calculate(data, s) });
  }
  // DHL: solo China + comercial + ≥ mínimo (el flag público no aplica acá —
  // el comparador lo usa la calculadora interna)
  const dhlE = dhlEligibility(d, s);
  if (dhlE.ok) {
    out.push({ key: "dhl", label: "⚡ DHL Express", nota: "Más rápido", d: { ...d, tipo: "dhl", subTipo: "comercial" }, r: dhlE.r });
  }
  if (m3Est > 0) {
    const data = { ...d, tipo: "barco", seaMode: "m3", m3manual: m3Est };
    out.push({ key: "barcoM3", label: "🚢 Barco por m³", nota: "Ideal volumen",
      d: data, r: calculate(data, s), m3Usado: m3Est });
  }
  if (out.length > 1) {
    const min = out.reduce((a, b) => (b.r.totalGen < a.r.totalGen ? b : a));
    min.recomendada = true;
  }
  return out;
};
