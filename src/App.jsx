import React, { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

const ADMIN_PASS = "fvr2024";
const WA_NUM = "5493885223299";

const DEF = {
  airRate: 25, seaRate: 600, seaMin: 1,
  insurance: 1, duty: 20, stat: 3, vat: 21,
  addVat: 20, gains: 6, ib: 2.5,
  addVatOn: true, gainsOn: true, ibOn: true,
  pickup: 20, handling: 15, domestic: 15,
  feeType: "percentage", feePct: 10, feeBase: "fob", feeFixed: 150,
  manualDolar: null,
  legal: "Los valores calculados son estimativos y pueden variar seg煤n clasificaci贸n arancelaria, documentaci贸n comercial, tipo de mercader铆a, canal de importaci贸n, cotizaci贸n del d贸lar, costos operativos y normativa vigente al momento de la operaci贸n.",
};

const fmt  = (v, d = 2) => Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const USD  = (v) => `USD ${fmt(v)}`;
const ARS  = (v, r) => (r ? `ARS ${fmt(v * r, 0)}` : "鈥�");
const ls   = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const ss   = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* 鈹€鈹€ CALCULATE 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const calculate = (d, s) => {
  const fob  = +d.fob || 0;
  const peso = +d.peso || 0;
  const L = +d.largo || 0, W = +d.ancho || 0, H = +d.alto || 0;
  const isAir      = d.tipo === "avion";
  const isPersonal = isAir && d.subTipo === "personal";

  let flete = 0, pVol = 0, pFact = 0, m3 = 0, m3Fact = 0;
  if (isAir) {
    pVol  = (L * W * H) / 5000;
    pFact = Math.max(pVol, peso);
    flete = pFact * (+s.airRate || 0);
  } else {
    m3     = +d.m3manual || 0;
    m3Fact = Math.max(+s.seaMin || 1, m3);
    flete  = m3Fact * (+s.seaRate || 0);
  }

  const seguro = (fob + flete) * ((+s.insurance || 0) / 100);
  const cif    = fob + flete + seguro;

  // Use AI-suggested duty rate if available, otherwise use settings
  const effectiveDutyPct = (d.aiDutyRate !== null && d.aiDutyRate !== undefined)
    ? +d.aiDutyRate : (+s.duty || 0);

  let duty = 0, stat = 0, ivaBase = 0, iva = 0, addVat = 0, gains = 0, ib = 0;
  if (isPersonal) {
    duty = fob <= 400 ? 0 : (fob - 400) * 0.5;
  } else {
    duty    = cif * (effectiveDutyPct / 100);
    stat    = cif * ((+s.stat || 0) / 100);
    ivaBase = cif + duty + stat;
    iva     = ivaBase * ((+s.vat || 0) / 100);
    addVat  = !isAir && s.addVatOn ? ivaBase * ((+s.addVat || 0) / 100) : 0;
    gains   = !isAir && s.gainsOn  ? ivaBase * ((+s.gains  || 0) / 100) : 0;
    ib      = !isAir && s.ibOn     ? ivaBase * ((+s.ib     || 0) / 100) : 0;
  }

  const pickup   = +s.pickup   || 0;
  const handling = +s.handling || 0;
  const domestic = +s.domestic || 0;
  const baseCost = flete + seguro + duty + stat + iva + addVat + gains + ib + pickup + handling + domestic;

  // Honorarios: 10% sobre FOB por defecto
  let fees = 0;
  if (s.feeType === "fixed") {
    fees = +s.feeFixed || 0;
  } else if (s.feeBase === "fob") {
    fees = fob * ((+s.feePct || 0) / 100);
  } else {
    fees = baseCost * ((+s.feePct || 0) / 100);
  }

  const totalLog = baseCost + fees;
  const totalGen = fob + totalLog;

  return {
    fob, isAir, isPersonal, peso, pVol, pFact, m3, m3Fact,
    flete, seguro, cif, duty, stat, ivaBase, iva,
    addVat, gains, ib, pickup, handling, domestic, fees,
    totalLog, totalGen, effectiveDutyPct,
  };
};

/* 鈹€鈹€ WA MESSAGE 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const buildWAMsg = (d, r, rate, s) => [
  `馃寪 *PRESUPUESTO DE IMPORTACI脫N*`, `*FVR Log铆stica Internacional*`, ``,
  `馃懁 *Cliente:* ${d.nombre}`,
  `馃摫 *WhatsApp:* ${d.whatsapp}`,
  `馃摟 *Email:* ${d.email || "鈥�"}`,
  `馃摝 *Producto:* ${d.producto}`,
  `馃敘 *HS Code:* ${d.hsCode || "No indicado"}`,
  d.aiSuggestion ? `馃 *An谩lisis IA:* ${d.aiSuggestion}` : "",
  ``,
  `馃殌 *Tipo:* ${d.tipo === "avion" ? `鉁堬笍 Avi贸n 鈥� ${d.subTipo === "personal" ? "Env铆o Personal (Franquicia)" : "Env铆o Comercial"}` : "馃殺 Barco"}`,
  `馃挼 *FOB / Valor productos:* ${USD(r.fob)}`,
  r.isAir
    ? `鈿栵笍 Peso real: ${r.peso} kg | Volum茅trico: ${fmt(r.pVol)} kg | Facturable: *${fmt(r.pFact)} kg*`
    : `馃搻 Volumen: ${fmt(r.m3, 3)} m鲁 | Facturable: *${fmt(r.m3Fact, 3)} m鲁*`,
  ``,
  `馃搳 *COSTOS DETALLADOS*`,
  `鈥� Flete internacional: ${USD(r.flete)}`,
  `鈥� Seguro (${s.insurance}%): ${USD(r.seguro)}`,
  `鈥� CIF: ${USD(r.cif)}`,
  r.isPersonal
    ? `鈥� Franquicia personal (50% sobre excedente USD 400): ${USD(r.duty)}`
    : `鈥� Derecho de importaci贸n (${r.effectiveDutyPct}%${d.aiDutyRate !== null ? " 鈥� v铆a IA" : ""}): ${USD(r.duty)}`,
  r.isPersonal ? `鈥� Tasa estad铆stica: No aplica` : `鈥� Tasa estad铆stica (${s.stat}%): ${USD(r.stat)}`,
  r.isPersonal ? `鈥� IVA: No aplica` : `鈥� IVA (${s.vat}%): ${USD(r.iva)}`,
  ...(!r.isAir && !r.isPersonal
    ? [`鈥� IVA adicional (${s.addVat}%): ${USD(r.addVat)}`,
       `鈥� Ganancias (${s.gains}%): ${USD(r.gains)}`,
       `鈥� Ingresos Brutos (${s.ib}%): ${USD(r.ib)}`]
    : []),
  ``,
  `馃殮 *SERVICIOS LOG脥STICOS*`,
  `鈥� Pick up / Retiro: ${USD(r.pickup)}`,
  `鈥� Handling: ${USD(r.handling)}`,
  `鈥� Env铆o nacional: ${USD(r.domestic)}`,
  `鈥� Honorarios de gesti贸n (${s.feeType === "fixed" ? "fijo" : `${s.feePct}% s/${s.feeBase === "fob" ? "FOB" : "costos"}`}): ${USD(r.fees)}`,
  ``,
  `鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺恅,
  `馃搵 Total env铆o (sin producto): *${USD(r.totalLog)}*`,
  `馃挵 *TOTAL GENERAL: ${USD(r.totalGen)}*`,
  rate ? `馃挶 *En pesos: ARS ${fmt(r.totalGen * rate, 0)}* (d贸lar $${fmt(rate)})` : "",
  d.files?.length ? `馃搸 Archivos: ${d.files.join(", ")}` : "",
  ``,
  `_FVR Log铆stica Internacional_`,
  `_Francisco Vega 路 +54 9 3885 223299_`,
  `_www.fvrlogistica.com.ar_`,
].filter(v => v !== undefined && v !== "").join("\n");

/* 鈹€鈹€ PDF HTML 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const generatePDFHTML = (d, r, dolar, s) => {
  const tipo = d.tipo === "avion"
    ? `鉁堬笍 Avi贸n 鈥� ${d.subTipo === "personal" ? "Env铆o Personal (Franquicia)" : "Env铆o Comercial"}`
    : "馃殺 Barco";
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Presupuesto FVR 鈥� ${d.nombre}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:720px;margin:0 auto;padding:24px;font-size:13px}
  .hdr{background:#0d2347;color:white;padding:20px 24px;border-radius:10px;margin-bottom:18px}
  .hdr h1{font-size:20px;margin-bottom:4px}
  .hdr p{font-size:11px;opacity:.8;margin-top:2px}
  .sec{margin-bottom:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .st{background:#f8fafc;padding:8px 14px;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#475569;border-bottom:1px solid #e2e8f0}
  .row{display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .row:last-child{border:0}
  .hi{background:#eff6ff;font-weight:bold;color:#0369a1}
  .na{color:#94a3b8;font-style:italic}
  .tot{background:#0d2347;color:white;padding:18px 22px;border-radius:10px;margin-top:16px}
  .tot .r1{display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px}
  .tot .r2{display:flex;justify-content:space-between;font-size:20px;font-weight:bold}
  .tot .sub{font-size:10px;opacity:.6;margin-top:6px}
  .legal{font-size:10px;color:#94a3b8;margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;line-height:1.5}
  .footer{text-align:center;font-size:11px;color:#64748b;margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:bold}
  @media print{body{padding:10px}}
</style></head><body>
<div class="hdr">
  <h1>FVR Log铆stica Internacional</h1>
  <p>Calculadora de Importaciones 路 www.fvrlogistica.com.ar</p>
  <p>Presupuesto generado: ${new Date().toLocaleDateString("es-AR", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})} 路 ${tipo}</p>
</div>
<div class="sec">
  <div class="st">Datos del cliente</div>
  <div class="row"><span>Nombre</span><span><b>${d.nombre}</b></span></div>
  <div class="row"><span>WhatsApp</span><span>${d.whatsapp}</span></div>
  <div class="row"><span>Email</span><span>${d.email || "鈥�"}</span></div>
  <div class="row"><span>Producto</span><span>${d.producto}</span></div>
  <div class="row"><span>HS Code</span><span>${d.hsCode || "鈥�"}${d.aiDutyRate !== null ? ' <span class="badge">IA</span>' : ""}</span></div>
</div>
<div class="sec">
  <div class="st">Flete Internacional</div>
  <div class="row"><span>FOB / Valor productos</span><span>${USD(r.fob)}</span></div>
  ${r.isAir ? `
  <div class="row"><span>Peso real</span><span>${r.peso} kg</span></div>
  <div class="row"><span>Peso volum茅trico</span><span>${fmt(r.pVol)} kg</span></div>
  <div class="row hi"><span>Peso facturable (mayor)</span><span>${fmt(r.pFact)} kg</span></div>
  <div class="row hi"><span>Tarifa a茅rea (USD ${s.airRate}/kg)</span><span>${USD(r.flete)}</span></div>
  ` : `
  <div class="row"><span>Volumen ingresado</span><span>${fmt(r.m3, 3)} m鲁</span></div>
  <div class="row hi"><span>Volumen facturable (m铆n. ${s.seaMin} m鲁)</span><span>${fmt(r.m3Fact, 3)} m鲁</span></div>
  <div class="row hi"><span>Tarifa mar铆tima (USD ${s.seaRate}/m鲁)</span><span>${USD(r.flete)}</span></div>
  `}
  <div class="row"><span>Seguro (${s.insurance}%)</span><span>${USD(r.seguro)}</span></div>
  <div class="row hi"><span>CIF / Valor en aduana</span><span>${USD(r.cif)}</span></div>
</div>
<div class="sec">
  <div class="st">Tributos Aduaneros</div>
  ${r.isPersonal ? `
  <div class="row"><span>Franquicia personal activa</span><span class="badge">hasta USD 400 libre</span></div>
  <div class="row hi"><span>Derecho de importaci贸n (50% sobre excedente)</span><span>${USD(r.duty)}</span></div>
  <div class="row"><span>Tasa estad铆stica</span><span class="na">No aplica</span></div>
  <div class="row"><span>IVA</span><span class="na">No aplica</span></div>
  ` : `
  <div class="row"><span>Derecho de importaci贸n (${r.effectiveDutyPct}%${d.aiDutyRate !== null ? " 路 detectado por IA" : ""})</span><span>${USD(r.duty)}</span></div>
  <div class="row"><span>Tasa estad铆stica (${s.stat}%)</span><span>${USD(r.stat)}</span></div>
  <div class="row hi"><span>Base imponible IVA</span><span>${USD(r.ivaBase)}</span></div>
  <div class="row"><span>IVA (${s.vat}%)</span><span>${USD(r.iva)}</span></div>
  `}
</div>
${!r.isAir ? `
<div class="sec">
  <div class="st">Impuestos Internos (Barco)</div>
  <div class="row"><span>IVA adicional (${s.addVat}%)</span><span>${USD(r.addVat)}</span></div>
  <div class="row"><span>Ganancias (${s.gains}%)</span><span>${USD(r.gains)}</span></div>
  <div class="row"><span>Ingresos Brutos (${s.ib}%)</span><span>${USD(r.ib)}</span></div>
</div>` : ""}
<div class="sec">
  <div class="st">Servicios Log铆sticos</div>
  <div class="row"><span>Pick up / Retiro en origen</span><span>${USD(r.pickup)}</span></div>
  <div class="row"><span>Handling</span><span>${USD(r.handling)}</span></div>
  <div class="row"><span>Env铆o nacional</span><span>${USD(r.domestic)}</span></div>
  <div class="row hi"><span>Honorarios de gesti贸n</span><span>${USD(r.fees)}</span></div>
</div>
<div class="tot">
  <div class="r1"><span>Total env铆o (sin producto):</span><span>${USD(r.totalLog)}${dolar ? ` 路 ARS ${fmt(r.totalLog * dolar, 0)}` : ""}</span></div>
  <div class="r2"><span>TOTAL GENERAL:</span><span>${USD(r.totalGen)}</span></div>
  ${dolar ? `<div class="r2" style="font-size:15px;margin-top:6px"><span></span><span>ARS ${fmt(r.totalGen * dolar, 0)}</span></div>
  <div class="sub">Conversi贸n al d贸lar oficial $${fmt(dolar)} 路 sujeto a variaci贸n</div>` : ""}
</div>
<div class="legal">${s.legal}</div>
<div class="footer">
  FVR Log铆stica Internacional 路 Francisco Vega<br>
  馃摫 +54 9 3885 223299 路 鉁� frannciissco@gmail.com 路 馃寪 fvrlogistica.com.ar
</div>
</body></html>`;
};

/* 鈹€鈹€ STATUS 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const STATUS_MAP = {
  nuevo:       { label: "Nuevo",       cls: "bg-sky-100 text-sky-700" },
  en_analisis: { label: "En an谩lisis", cls: "bg-amber-100 text-amber-700" },
  respondido:  { label: "Respondido",  cls: "bg-green-100 text-green-700" },
  cerrado:     { label: "Cerrado",     cls: "bg-slate-100 text-slate-500" },
};
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.nuevo;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

/* 鈹€鈹€ WA ICON 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const WAIcon = ({ cls = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={`${cls} fill-current`}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

/* 鈹€鈹€ FLOATING WA 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const WAFloat = () => (
  <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noopener noreferrer"
    style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:"#22c55e", borderRadius:"50%", width:56, height:56,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 4px 24px rgba(0,0,0,0.25)", textDecoration:"none", color:"white" }}>
    <WAIcon />
  </a>
);

/* 鈹€鈹€ HEADER 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const Header = ({ onAdmin, dolar, dolarErr, dolarLoading, onRefreshDolar }) => (
  <header style={{ background: "linear-gradient(135deg,#0a1628 0%,#0d2347 50%,#0a1f42 100%)", color:"white" }}>
    <div style={{ maxWidth:900, margin:"0 auto", padding:"18px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0c2340", fontSize:13 }}>FVR</div>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>FVR Log铆stica Internacional</div>
          <div style={{ color:"#7dd3fc", fontSize:11 }}>Francisco Vega 路 fvrlogistica.com.ar</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ color:"#7dd3fc" }}>D贸lar oficial:</span>
          <span style={{ fontWeight:700 }}>
            {dolarLoading ? "鈥�" : dolarErr ? <span style={{color:"#fcd34d"}}>鈿� Manual</span> : `$${fmt(dolar, 2)}`}
          </span>
          <button onClick={onRefreshDolar} style={{ background:"none", border:"none", color:"#38bdf8", cursor:"pointer", fontSize:14 }}>鈫�</button>
        </div>
        <button onClick={onAdmin} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", color:"white", borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>
          Panel Admin
        </button>
      </div>
    </div>
    <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 16px 32px", textAlign:"center" }}>
      <div style={{ display:"inline-block", background:"rgba(14,165,233,0.2)", border:"1px solid rgba(56,189,248,0.3)", borderRadius:99, padding:"4px 16px", marginBottom:12 }}>
        <span style={{ color:"#7dd3fc", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Calculadora de Importaciones</span>
      </div>
      <h1 style={{ fontSize:32, fontWeight:900, marginBottom:8 }}>Calcul谩 tu importaci贸n en segundos</h1>
      <p style={{ color:"#7dd3fc", fontSize:15 }}>Cotiz谩 tu producto desde origen hasta tu domicilio con FVR Log铆stica Internacional</p>
    </div>
  </header>
);

/* 鈹€鈹€ UI PRIMITIVES 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const Card = ({ icon, title, bg, children }) => (
  <div style={{ background:"white", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", border:"1px solid #f1f5f9", overflow:"hidden", marginBottom:16 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", borderBottom:"1px solid #f1f5f9", background: bg || "#f8fafc" }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:1, color:"#334155" }}>{title}</span>
    </div>
    <div style={{ padding:20 }}>{children}</div>
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>
      {label}{required && <span style={{ color:"#ef4444" }}> *</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{hint}</p>}
  </div>
);

const inputStyle = { width:"100%", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 14px", fontSize:14, color:"#1e293b", background:"#f8fafc", outline:"none", boxSizing:"border-box" };

const Inp = ({ type="text", placeholder, value, onChange, style={}, ...rest }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ ...inputStyle, ...style }} {...rest} />
);

/* 鈹€鈹€ TYPE / SUBTIPO SELECTORS 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
const TypeSel = ({ value, onChange }) => (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
    {[{ v:"avion", icon:"鉁堬笍", label:"Avi贸n" }, { v:"barco", icon:"馃殺", label:"Barco" }].map(({ v, icon, label }) => (
      <button key={v} onClick={() => onChange(v)} type="button"
        style={{ padding:"20px 12px", borderRadius:16, border:`2px solid ${value===v?"#0ea5e9":"#e2e8f0"}`,
          background: value===v ? "#f0f9ff" : "#f8fafc", cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap:6,
          boxShadow: value===v ? "0 2px 12px rgba(14,165,233,0.15)" : "none" }}>
        <span style={{ fontSize:36 }}>{icon}</span>
        <span style={{ fontWeight:700, fontSize:14, color: value===v ? "#0369a1" : "#334155" }}>{label}</span>
      </button>
    ))}
  </div>
);

const SubTipoSel = ({ value, onChange }) => (
  <div style={{ marginTop:16 }}>
    <p style={{ fontSize:11, font
