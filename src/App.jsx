import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const ADMIN_PASS = "fvr2024";
const WA_NUM = "5493885223299";

const DEF = {
  airRateUSA: 20, airRateChina: 23, airRateEspana: 23, seaRate: 600, seaMin: 1, seaRateKg: 8,
  insurance: 1, duty: 20, stat: 3, vat: 21,
  addVat: 20, gains: 6, ib: 2.5,
  addVatOn: true, gainsOn: true, ibOn: true,
  pickup: 20, handling: 15, handlingMaxKg: 3, domestic: 15, domesticSea: 0,
  feeType: "percentage", feePct: 8, feePctSea: 5, feeBase: "fob", feeFixed: 150, feeFixedSea: 150,
  manualDolar: null,
  legal: "Los valores calculados son estimativos y pueden variar según clasificación arancelaria, documentación comercial, tipo de mercadería, canal de importación, cotización del dólar, costos operativos y normativa vigente al momento de la operación.",
};

/* ── CATEGORÍAS DE PRODUCTO → % DERECHO DE IMPORTACIÓN ──────
   Valores REFERENCIALES según el Nomenclador Común del MERCOSUR (NCM/AEC),
   alineados con la misma tabla que usa la IA. Confirmar el arancel exacto
   por código en VUCE (vuce.gob.ar) o con despachante.
   Si el producto no está en la lista, se deja en blanco y se usa IA / HS Code. */
const CATEGORIES = [
  // Airsoft y aire comprimido (cap. 93 — 20%)
  { label: "Airsoft / réplicas de armas", rate: 20 },
  { label: "Armas de aire comprimido (rifles, pistolas)", rate: 20 },
  { label: "Balines y munición airsoft", rate: 20 },
  // Electrónica, informática y telecom (mayoría 0% por régimen BIT)
  { label: "Teléfonos celulares / smartphones", rate: 0 },
  { label: "Tablets", rate: 0 },
  { label: "Computadoras portátiles / notebooks", rate: 0 },
  { label: "Computadoras de escritorio", rate: 0 },
  { label: "Monitores para PC", rate: 16 },
  { label: "Teclados", rate: 0 },
  { label: "Mouse", rate: 0 },
  { label: "Pendrives y discos externos", rate: 0 },
  { label: "Componentes de PC (placa, GPU, CPU)", rate: 0 },
  { label: "Impresoras y escáneres", rate: 14 },
  { label: "Routers y módems", rate: 0 },
  { label: "Smartwatch / relojes inteligentes", rate: 0 },
  { label: "Consolas de videojuegos", rate: 20 },
  { label: "Videojuegos", rate: 20 },
  { label: "Cámaras fotográficas", rate: 18 },
  { label: "Cámaras de video / GoPro", rate: 18 },
  { label: "Drones", rate: 0 },
  { label: "Proyectores", rate: 16 },
  { label: "Powerbank / baterías portátiles", rate: 14 },
  { label: "Cargadores y adaptadores", rate: 14 },
  { label: "Cables (USB, HDMI)", rate: 12 },
  { label: "Auriculares", rate: 20 },
  { label: "Parlantes y altavoces", rate: 20 },
  { label: "Micrófonos", rate: 20 },
  { label: "Televisores", rate: 16 },
  // Electrodomésticos (20%)
  { label: "Heladeras y freezers", rate: 20 },
  { label: "Lavarropas", rate: 20 },
  { label: "Microondas", rate: 20 },
  { label: "Aspiradoras", rate: 20 },
  { label: "Licuadoras y procesadoras", rate: 20 },
  { label: "Planchas", rate: 20 },
  { label: "Ventiladores", rate: 20 },
  { label: "Aire acondicionado", rate: 20 },
  { label: "Secadores de pelo", rate: 20 },
  { label: "Afeitadoras y depiladoras", rate: 20 },
  { label: "Cafeteras", rate: 20 },
  { label: "Tostadoras y sandwicheras", rate: 20 },
  // Ropa y calzado (20% — Dec. 236/2025)
  { label: "Ropa casual", rate: 20 },
  { label: "Ropa deportiva", rate: 20 },
  { label: "Ropa interior", rate: 20 },
  { label: "Ropa de bebé", rate: 20 },
  { label: "Medias", rate: 20 },
  { label: "Guantes", rate: 20 },
  { label: "Bufandas y pañuelos", rate: 20 },
  { label: "Corbatas", rate: 20 },
  { label: "Trajes de baño y mallas", rate: 20 },
  { label: "Calzado deportivo / zapatillas", rate: 20 },
  { label: "Calzado casual", rate: 20 },
  { label: "Botas", rate: 20 },
  { label: "Sandalias y ojotas", rate: 20 },
  { label: "Sombreros y gorras", rate: 20 },
  // Textil hogar
  { label: "Telas y tejidos", rate: 18 },
  { label: "Ropa de cama y sábanas", rate: 20 },
  { label: "Toallas", rate: 20 },
  { label: "Cortinas", rate: 20 },
  { label: "Alfombras", rate: 20 },
  { label: "Mantas y frazadas", rate: 20 },
  // Marroquinería y accesorios (18%)
  { label: "Carteras y bolsos", rate: 18 },
  { label: "Mochilas", rate: 18 },
  { label: "Billeteras", rate: 18 },
  { label: "Cinturones", rate: 18 },
  { label: "Maletas y equipaje", rate: 18 },
  { label: "Relojes de pulsera", rate: 20 },
  { label: "Gafas de sol", rate: 18 },
  { label: "Anteojos de vista", rate: 18 },
  { label: "Joyas (oro y plata)", rate: 18 },
  { label: "Bijouterie y fantasía", rate: 18 },
  // Cosmética y perfumería (18%)
  { label: "Perfumes", rate: 18 },
  { label: "Maquillaje y cosméticos", rate: 18 },
  { label: "Cremas faciales y corporales", rate: 18 },
  { label: "Productos para el cabello / shampoo", rate: 18 },
  { label: "Desodorantes", rate: 18 },
  // Hogar y muebles (18%)
  { label: "Muebles", rate: 18 },
  { label: "Sillas y sillones", rate: 18 },
  { label: "Mesas y escritorios", rate: 18 },
  { label: "Colchones", rate: 18 },
  { label: "Lámparas y luminarias", rate: 18 },
  { label: "Vajilla", rate: 18 },
  { label: "Utensilios de cocina", rate: 18 },
  { label: "Ollas y sartenes", rate: 18 },
  { label: "Decoración del hogar", rate: 18 },
  // Deportes y aire libre
  { label: "Bicicletas", rate: 20 },
  { label: "Equipamiento de gimnasio", rate: 20 },
  { label: "Pelotas y artículos deportivos", rate: 20 },
  { label: "Camping y carpas", rate: 20 },
  // Juguetes (20%)
  { label: "Juguetes", rate: 20 },
  { label: "Muñecas y peluches", rate: 20 },
  { label: "Juegos de mesa y puzzles", rate: 20 },
  // Herramientas (12%)
  { label: "Herramientas manuales", rate: 12 },
  { label: "Herramientas eléctricas", rate: 12 },
  // Instrumentos musicales (16%)
  { label: "Guitarras e instrumentos de cuerda", rate: 16 },
  { label: "Teclados musicales y sintetizadores", rate: 16 },
  // Salud
  { label: "Suplementos y proteínas", rate: 20 },
  { label: "Material médico", rate: 6 },
  { label: "Productos ortopédicos", rate: 0 },
  { label: "Lentes de contacto", rate: 10 },
  // Bebés
  { label: "Cochecitos y sillas de bebé", rate: 20 },
  // Papelería
  { label: "Libros", rate: 0 },
  { label: "Cuadernos y agendas", rate: 16 },
  { label: "Material de oficina", rate: 18 },
  // Mascotas
  { label: "Alimento para mascotas", rate: 10 },
  { label: "Accesorios para mascotas", rate: 18 },
  // Automotor y motos
  { label: "Autopartes y accesorios", rate: 18 },
  { label: "Cascos y accesorios de moto", rate: 18 },
  { label: "Neumáticos", rate: 14 },
];

const fmt  = (v, d = 2) => Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const USD  = (v) => `USD ${fmt(v)}`;
const ARS  = (v, r) => (r ? `ARS ${fmt(v * r, 0)}` : "—");
const ls   = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const ss   = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── CALCULATE ─────────────────────────────────────────── */
const calculate = (d, s) => {
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
    pVol  = (L * W * H) / 5000;
    pFact = Math.max(pVol, peso);
    if (isAir) {
      // Tarifa aérea según país de origen (USA y España propias; China u otro = China)
      airRate = d.origenSel === "Estados Unidos (USA)" ? (+s.airRateUSA || 0)
              : d.origenSel === "España"               ? (+s.airRateEspana || 0)
              : (+s.airRateChina || 0);
    } else {
      // Marítimo por kilo: tarifa única configurable
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

  // Use AI-suggested duty rate if available, otherwise use settings
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
  // Handling (solo avión): se cobra el valor configurado si el peso facturable
  // es menor al umbral (handlingMaxKg); si lo iguala o supera, queda en 0.
  const handlingMax = (s.handlingMaxKg != null && s.handlingMaxKg !== "" ? +s.handlingMaxKg : 3);
  const handling   = isAir ? (pFact < handlingMax ? (+s.handling || 0) : 0) : 0;
  const domestic   = isAir ? (+s.domestic || 0) : (+s.domesticSea || 0);
  const baseCost = flete + seguro + duty + stat + iva + addVat + gains + ib + pickup + handling + domestic;

  // Honorarios: % o monto fijo, diferenciado por tipo de envío (avión / barco)
  const feePctEff   = isAir ? (+s.feePct || 0)   : (s.feePctSea   != null && s.feePctSea   !== "" ? +s.feePctSea   : (+s.feePct   || 0));
  const feeFixedEff = isAir ? (+s.feeFixed || 0) : (s.feeFixedSea != null && s.feeFixedSea !== "" ? +s.feeFixedSea : (+s.feeFixed || 0));
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

  return {
    fob, isAir, seaKg, seaM3, byWeight, internalTaxes, isPersonal,
    peso, pVol, pFact, m3, m3Fact, airRate,
    flete, seguro, cif, duty, stat, ivaBase, iva,
    addVat, gains, ib, pickup, handling, domestic, fees,
    totalLog, totalGen, effectiveDutyPct,
  };
};

/* ── WA MESSAGE ─────────────────────────────────────────── */
const buildWAMsg = (d, r, rate, s) => {
  const tipo = d.tipo === "avion"
    ? `Avion - ${d.subTipo === "personal" ? "Envio Personal (Franquicia)" : "Envio Comercial"}`
    : (d.seaMode === "kg" ? "Barco - Por kilo" : "Barco - Por m3");
  const lines = [
    "== PRESUPUESTO DE IMPORTACION ==",
    "FVR Logistica Internacional",
    "",
    "CLIENTE: " + d.nombre,
    "WhatsApp: " + d.whatsapp,
    "Email: " + (d.email || "-"),
    "Producto: " + d.producto,
    "Pais de origen: " + (d.paisOrigen || "No indicado"),
    "HS Code: " + (d.hsCode || "No indicado"),
    d.aiSuggestion ? "Analisis IA: " + d.aiSuggestion : "",
    "",
    "TIPO: " + tipo,
    "FOB / Valor productos: " + USD(r.fob),
    r.byWeight
      ? ("Peso real: " + r.peso + " kg | Volumetrico: " + fmt(r.pVol) + " kg | Facturable: " + fmt(r.pFact) + " kg")
      : ("Volumen: " + fmt(r.m3, 3) + " m3 | Facturable: " + fmt(r.m3Fact, 3) + " m3"),
    "",
    "== COSTOS DETALLADOS ==",
    "Flete internacional: " + USD(r.flete),
    "Seguro (" + s.insurance + "%): " + USD(r.seguro),
    "CIF / Valor en aduana: " + USD(r.cif),
    r.isPersonal
      ? ("Derecho de importacion (" + r.effectiveDutyPct + "% s/excedente USD 400" + (d.categoria ? " - cat. " + d.categoria : (d.dutyManual ? " - manual" : (d.aiDutyRate !== null ? " - via IA" : ""))) + "): " + USD(r.duty))
      : ("Derecho de importacion (" + r.effectiveDutyPct + "%" + (d.categoria ? " - cat. " + d.categoria : (d.dutyManual ? " - manual" : (d.aiDutyRate !== null ? " - via IA" : ""))) + "): " + USD(r.duty)),
    r.isPersonal ? "Tasa estadistica: No aplica" : ("Tasa estadistica (" + s.stat + "%): " + USD(r.stat)),
    r.isPersonal ? ("IVA (" + s.vat + "% s/FOB + derechos): " + USD(r.iva)) : ("IVA (" + s.vat + "%): " + USD(r.iva)),
    ...(r.internalTaxes && !r.isPersonal
      ? [
          "IVA adicional (" + s.addVat + "%): " + USD(r.addVat),
          "Ganancias (" + s.gains + "%): " + USD(r.gains),
          "Ingresos Brutos (" + s.ib + "%): " + USD(r.ib),
        ]
      : []),
    "",
    "== SERVICIOS LOGISTICOS ==",
    "Pick up / Retiro: " + USD(r.pickup),
    r.isAir ? ("Handling: " + USD(r.handling)) : "",
    "Envio nacional: " + USD(r.domestic),
    "Honorarios de Gestion: " + USD(r.fees),
    "",
    "================================",
    "Total envio (sin producto): *" + USD(r.totalLog) + "*",
    "*TOTAL GENERAL: " + USD(r.totalGen) + "*",
    rate ? ("En pesos: ARS " + fmt(r.totalGen * rate, 0) + " (dolar $" + fmt(rate) + ")") : "",
    d.files && d.files.length ? ("Archivos adjuntos: " + d.files.join(", ")) : "",
    "",
    "FVR Logistica Internacional",
    "Francisco Vega | +54 9 3885 223299",
    "www.fvrlogistica.com.ar",
  ];
  return lines.filter(v => v !== undefined && v !== "").join("\n");
};

/* ── PDF REAL (vectorial, jsPDF) ─────────────────────────── */
const dutySuffix = (d) => d.categoria ? " · categoría" : (d.dutyManual ? " · manual" : (d.aiDutyRate !== null && d.aiDutyRate !== undefined ? " · IA" : ""));

const generatePDF = async (d, r, dolar, s) => {
  const { jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod.default || autoTableMod.autoTable;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const navy = [13, 35, 71], accent = [3, 105, 161], sky = [56, 189, 248], gray = [100, 116, 139];

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0"), mm = String(now.getMonth() + 1).padStart(2, "0");
  const fechaStr = `${dd}/${mm}/${now.getFullYear()}`;
  const venc = new Date(now.getTime() + 7 * 86400000);
  const validez = `${String(venc.getDate()).padStart(2, "0")}/${String(venc.getMonth() + 1).padStart(2, "0")}/${venc.getFullYear()}`;
  const presNro = `FVR-${now.getFullYear()}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const tipo = d.tipo === "avion"
    ? (d.subTipo === "personal" ? "Avión · Envío Personal (Franquicia)" : "Avión · Envío Comercial")
    : (d.seaMode === "kg" ? "Barco · Por kilo" : "Barco · Por m³");

  // ── Banda superior ──
  doc.setFillColor(...navy); doc.rect(0, 0, W, 32, "F");
  doc.setFillColor(...sky); doc.roundedRect(M, 8, 16, 16, 2, 2, "F");
  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("FVR", M + 8, 18, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("FVR Logística Internacional", M + 21, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
  doc.text("Calculadora de Importaciones · www.fvrlogistica.com.ar", M + 21, 21);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("PRESUPUESTO", W - M, 11, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
  doc.text(`N° ${presNro}`, W - M, 16, { align: "right" });
  doc.text(`Fecha: ${fechaStr}`, W - M, 20.5, { align: "right" });
  doc.text(`Válido hasta: ${validez}`, W - M, 25, { align: "right" });

  // ── Cliente ──
  let y = 41;
  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`Presupuesto para: ${d.nombre}`, M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...gray);
  doc.text(`${d.producto}  ·  ${tipo}`, M, y + 5.5);

  let cursorY = y + 10;
  const section = (title, body) => {
    autoTable(doc, {
      startY: cursorY,
      head: [[{ content: title, colSpan: 2 }]],
      body,
      theme: "grid",
      styles: { lineColor: [226, 232, 240], lineWidth: 0.1, cellPadding: 1.7 },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: (W - 2 * M) * 0.62 }, 1: { halign: "right", cellWidth: (W - 2 * M) * 0.38 } },
      margin: { left: M, right: M },
    });
    cursorY = doc.lastAutoTable.finalY + 3;
  };

  section("DATOS DEL CLIENTE Y PRODUCTO", [
    ["Nombre", d.nombre],
    ["WhatsApp", d.whatsapp],
    ["Email", d.email || "—"],
    ["Producto", d.producto],
    ["País de origen", d.paisOrigen || "—"],
    ["HS Code", d.hsCode || "—"],
    ["Tipo de envío", tipo],
  ]);

  const flete = [["FOB / Valor productos", USD(r.fob)]];
  if (r.byWeight) {
    flete.push(["Peso real", `${r.peso} kg`], ["Peso volumétrico", `${fmt(r.pVol)} kg`],
      ["Peso facturable (el mayor)", `${fmt(r.pFact)} kg`],
      [`${r.seaKg ? "Tarifa marítima" : "Tarifa aérea"} (USD ${r.airRate}/kg)`, USD(r.flete)]);
  } else {
    flete.push(["Volumen ingresado", `${fmt(r.m3, 3)} m³`],
      [`Volumen facturable (mín. ${s.seaMin} m³)`, `${fmt(r.m3Fact, 3)} m³`],
      [`Tarifa marítima (USD ${s.seaRate}/m³)`, USD(r.flete)]);
  }
  flete.push([`Seguro (${s.insurance}%)`, USD(r.seguro)], ["CIF / Valor en aduana", USD(r.cif)]);
  section("FLETE INTERNACIONAL", flete);

  const trib = [];
  if (r.isPersonal) {
    trib.push([`Derecho de importación (${r.effectiveDutyPct}%${dutySuffix(d)})${r.fob <= 400 ? " — exento hasta USD 400" : " sobre excedente de USD 400"}`, USD(r.duty)]);
    trib.push(["Tasa estadística", "No aplica"]);
    trib.push([`IVA (${s.vat}% sobre FOB + derechos)`, USD(r.iva)]);
  } else {
    trib.push([`Derecho de importación (${r.effectiveDutyPct}%${dutySuffix(d)})`, USD(r.duty)]);
    trib.push([`Tasa estadística (${s.stat}%)`, USD(r.stat)]);
    trib.push(["Base imponible IVA", USD(r.ivaBase)]);
    trib.push([`IVA (${s.vat}%)`, USD(r.iva)]);
  }
  section("TRIBUTOS ADUANEROS", trib);

  if (r.internalTaxes) {
    section("IMPUESTOS INTERNOS (BARCO POR M³)", [
      [`IVA adicional (${s.addVat}%)`, USD(r.addVat)],
      [`Ganancias (${s.gains}%)`, USD(r.gains)],
      [`Ingresos Brutos (${s.ib}%)`, USD(r.ib)],
    ]);
  }

  const serv = [["Pick up / Retiro en origen", USD(r.pickup)]];
  if (r.isAir) serv.push(["Handling", USD(r.handling)]);
  serv.push(["Envío nacional", USD(r.domestic)], ["Honorarios de Gestión", USD(r.fees)]);
  section("SERVICIOS LOGÍSTICOS", serv);

  // ── Caja total ──
  const boxY = cursorY + 1;
  doc.setFillColor(...navy); doc.roundedRect(M, boxY, W - 2 * M, 22, 2, 2, "F");
  doc.setTextColor(170, 200, 235); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Total envío (sin producto)", M + 5, boxY + 7);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(USD(r.totalLog), M + 5, boxY + 13.5);
  doc.setTextColor(125, 211, 252); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("TOTAL GENERAL DE IMPORTACIÓN", W - M - 5, boxY + 7, { align: "right" });
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(USD(r.totalGen), W - M - 5, boxY + 14, { align: "right" });
  if (dolar) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
    doc.text(`ARS ${fmt(r.totalGen * dolar, 0)}  ·  dólar oficial $${fmt(dolar)}`, W - M - 5, boxY + 19, { align: "right" });
  }
  cursorY = boxY + 28;

  // ── Legal + footer ──
  doc.setTextColor(...gray); doc.setFont("helvetica", "italic"); doc.setFontSize(7);
  const legalLines = doc.splitTextToSize(s.legal, W - 2 * M);
  doc.text(legalLines, M, cursorY);
  cursorY += legalLines.length * 2.8 + 4;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(M, cursorY, W - M, cursorY);
  cursorY += 5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...navy);
  doc.text("FVR Logística Internacional · Francisco Vega", M, cursorY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...gray);
  doc.text("+54 9 3885 223299   ·   frannciissco@gmail.com   ·   www.fvrlogistica.com.ar", M, cursorY + 4);
  doc.text(`Presupuesto válido hasta el ${validez}. Valores en USD; conversión a ARS al dólar oficial vigente.`, M, cursorY + 8);

  doc.save(`Presupuesto-FVR-${(d.nombre || "cliente").replace(/\s+/g, "-")}.pdf`);
};

/* ── STATUS ──────────────────────────────────────────────── */
const STATUS_MAP = {
  nuevo:       { label: "Nuevo",       cls: "bg-sky-100 text-sky-700" },
  en_analisis: { label: "En análisis", cls: "bg-amber-100 text-amber-700" },
  respondido:  { label: "Respondido",  cls: "bg-green-100 text-green-700" },
  cerrado:     { label: "Cerrado",     cls: "bg-slate-100 text-slate-500" },
};
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.nuevo;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

/* ── WA ICON ─────────────────────────────────────────────── */
const WAIcon = ({ cls = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={`${cls} fill-current`}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

/* ── FLOATING WA ─────────────────────────────────────────── */
const WAFloat = () => (
  <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noopener noreferrer"
    style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:"#22c55e", borderRadius:"50%", width:56, height:56,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 4px 24px rgba(0,0,0,0.25)", textDecoration:"none", color:"white" }}>
    <WAIcon />
  </a>
);

/* ── HEADER ──────────────────────────────────────────────── */
const Header = ({ onAdmin, dolar, dolarErr, dolarLoading, onRefreshDolar }) => (
  <header style={{ background: "linear-gradient(135deg,#0a1628 0%,#0d2347 50%,#0a1f42 100%)", color:"white" }}>
    <div style={{ maxWidth:900, margin:"0 auto", padding:"18px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0c2340", fontSize:13 }}>FVR</div>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>FVR Logística Internacional</div>
          <div style={{ color:"#7dd3fc", fontSize:11 }}>Francisco Vega · fvrlogistica.com.ar</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ color:"#7dd3fc" }}>Dólar oficial:</span>
          <span style={{ fontWeight:700 }}>
            {dolarLoading ? "…" : dolarErr ? <span style={{color:"#fcd34d"}}>⚠ Manual</span> : `$${fmt(dolar, 2)}`}
          </span>
          <button onClick={onRefreshDolar} style={{ background:"none", border:"none", color:"#38bdf8", cursor:"pointer", fontSize:14 }}>↺</button>
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
      <h1 style={{ fontSize:32, fontWeight:900, marginBottom:8 }}>Calculá tu importación en segundos</h1>
      <p style={{ color:"#7dd3fc", fontSize:15 }}>Cotizá tu producto desde origen hasta tu domicilio con FVR Logística Internacional</p>
    </div>
  </header>
);

/* ── UI PRIMITIVES ───────────────────────────────────────── */
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

/* ── TYPE / SUBTIPO SELECTORS ────────────────────────────── */
const TypeSel = ({ value, onChange }) => (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
    {[{ v:"avion", icon:"✈️", label:"Avión" }, { v:"barco", icon:"🚢", label:"Barco" }].map(({ v, icon, label }) => (
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
    <p style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Tipo de envío</p>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      {[{ v:"comercial", icon:"🏢", label:"Envío Comercial" }, { v:"personal", icon:"👤", label:"Envío Personal" }].map(({ v, icon, label }) => (
        <button key={v} onClick={() => onChange(v)} type="button"
          style={{ padding:"14px 12px", borderRadius:14, border:`2px solid ${value===v?"#0ea5e9":"#e2e8f0"}`,
            background: value===v ? "#f0f9ff" : "#f8fafc", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
            boxShadow: value===v ? "0 2px 10px rgba(14,165,233,0.12)" : "none" }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:13, color: value===v ? "#0369a1" : "#334155" }}>{label}</span>
        </button>
      ))}
    </div>
    {value === "personal" && (
      <div style={{ marginTop:10, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:12, fontSize:12, color:"#92400e" }}>
        <strong>🏷️ Franquicia personal:</strong> Exento de derechos de importación hasta USD 400. Sobre el excedente se aplica el <strong>arancel del producto según su HS code</strong>. Tasa estadística <strong>no aplica</strong>. IVA 21% sobre el FOB + los derechos.
      </div>
    )}
  </div>
);

const SeaModeSel = ({ value, onChange }) => (
  <div style={{ marginTop:16 }}>
    <p style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>Modalidad marítima</p>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      {[{ v:"m3", icon:"📦", label:"Por m³" }, { v:"kg", icon:"⚖️", label:"Por kilo" }].map(({ v, icon, label }) => (
        <button key={v} onClick={() => onChange(v)} type="button"
          style={{ padding:"14px 12px", borderRadius:14, border:`2px solid ${value===v?"#0ea5e9":"#e2e8f0"}`,
            background: value===v ? "#f0f9ff" : "#f8fafc", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
            boxShadow: value===v ? "0 2px 10px rgba(14,165,233,0.12)" : "none" }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:13, color: value===v ? "#0369a1" : "#334155" }}>{label}</span>
        </button>
      ))}
    </div>
    {value === "kg" && (
      <div style={{ marginTop:10, background:"#eff6ff", border:"1px solid #bae6fd", borderRadius:12, padding:12, fontSize:12, color:"#0369a1" }}>
        <strong>⚖️ Marítimo por kilo:</strong> se cobra por peso facturable (igual que el aéreo) y se calcula con los <strong>mismos impuestos que un envío aéreo comercial</strong>. Solo cambia la tarifa por kilo.
      </div>
    )}
  </div>
);

/* ── AI ANALYSIS ─────────────────────────────────────────── */
const callAnalyzeAPI = async (type, value) => {
  // cache-buster + no-store para evitar respuestas arancelarias cacheadas
  const res = await fetch(`/api/analyze?t=${encodeURIComponent(value)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ type, value }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

const analyzeProduct = (producto) => callAnalyzeAPI("product", producto);
const analyzeHsCode  = (hsCode)   => callAnalyzeAPI("hsCode",  hsCode);

/* ── CALCULATOR FORM ─────────────────────────────────────── */
const CalculatorForm = ({ settings, onCalculate, onAdminClick, dolar, dolarErr, dolarLoading, onRefresh, onTrackStarted }) => {
  const [form, setForm] = useState({
    nombre:"", whatsapp:"", email:"", producto:"", hsCode:"", paisOrigen:"", origenSel:"", fob:"",
    categoria:"", manualDuty:"", dutyManual:false,
    tipo:"avion", subTipo:"comercial", seaMode:"m3", peso:"", largo:"", ancho:"", alto:"",
    m3manual:"", files:[], aiDutyRate: null, aiSuggestion: ""
  });
  const [errors, setErrors]       = useState({});
  const [fileNames, setFileNames] = useState([]);
  const [touched, setTouched]     = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [catQuery, setCatQuery]   = useState("");
  const [catOpen, setCatOpen]     = useState(false);

  const set = (k, v) => {
    if (!touched) { onTrackStarted(); setTouched(true); }
    setForm(f => ({ ...f, [k]: v }));
  };

  // Selección de país de origen: define la tarifa aérea (USA=20, resto=23 USD/kg)
  const handleOrigen = (sel) => {
    if (!touched) { onTrackStarted(); setTouched(true); }
    setForm(f => ({ ...f, origenSel: sel, paisOrigen: (sel && sel !== "otro") ? sel : "" }));
  };

  // Selección de categoría: setea el % de derecho directamente (sin IA)
  const handleCategoria = (label) => {
    if (!touched) { onTrackStarted(); setTouched(true); }
    const cat = CATEGORIES.find(c => c.label === label);
    setAiResult(null);
    if (cat) {
      setForm(f => ({
        ...f,
        categoria: label,
        aiDutyRate: cat.rate,
        manualDuty: "", dutyManual: false,
        aiSuggestion: `Categoría: ${label} — Derecho de importación ${cat.rate}%`,
      }));
    } else {
      // "Seleccionar…": vuelve a usar IA / HS Code / valor por defecto
      setForm(f => ({ ...f, categoria:"", aiDutyRate: null, aiSuggestion:"" }));
    }
  };

  // Arancel manual: el cliente que ya conoce su derecho de importación lo ingresa directo
  const handleManualDuty = (val) => {
    if (!touched) { onTrackStarted(); setTouched(true); }
    const v = (val || "").toString().replace(/[^0-9.]/g, "");
    if (v === "" || isNaN(+v)) {
      setForm(f => ({ ...f, manualDuty:"", dutyManual:false, aiDutyRate: f.categoria ? f.aiDutyRate : null }));
    } else {
      setCatQuery(""); setAiResult(null);
      setForm(f => ({ ...f, manualDuty: v, dutyManual:true, aiDutyRate: +v, categoria:"", aiSuggestion: `Arancel ingresado manualmente: ${v}%` }));
    }
  };

  const handleAnalyzeProduct = async () => {
    if (!form.producto.trim()) return;
    setAiLoading(true);
    try {
      const result = await analyzeProduct(form.producto);
      setAiResult(result);
      setForm(f => ({
        ...f,
        categoria: "", manualDuty: "", dutyManual: false,
        hsCode: result.hsCode || f.hsCode,
        aiDutyRate: result.dutyRate ?? null,
        aiSuggestion: `${result.description} — Arancel estimado: ${result.dutyRate}% (confianza: ${result.confidence})`
      }));
    } catch (e) {
      setAiResult({ error: true });
    }
    setAiLoading(false);
  };

  const handleAnalyzeHsCode = async () => {
    if (!form.hsCode.trim()) return;
    setAiLoading(true);
    try {
      const result = await analyzeHsCode(form.hsCode);
      setAiResult(r => ({ ...r, ...result }));
      setForm(f => ({
        ...f,
        categoria: "", manualDuty: "", dutyManual: false,
        aiDutyRate: result.dutyRate ?? f.aiDutyRate,
        aiSuggestion: result.description
          ? `${result.description} — Arancel por HS ${f.hsCode}: ${result.dutyRate}% (confianza: ${result.confidence})`
          : f.aiSuggestion,
      }));
    } catch {
      setAiResult({ error: true });
    }
    setAiLoading(false);
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())  e.nombre  = "Requerido";
    if (!form.whatsapp.trim()) e.whatsapp = "Requerido";
    if (!form.producto.trim()) e.producto = "Requerido";
    if (!form.fob || +form.fob <= 0) e.fob = "Ingresá un valor mayor a 0";
    if (!form.peso || +form.peso <= 0) e.peso = "Ingresá el peso total";
    const byWeight = form.tipo === "avion" || (form.tipo === "barco" && form.seaMode === "kg");
    if (byWeight && (!form.largo || !form.ancho || !form.alto)) e.medidas = "Ingresá largo, ancho y alto";
    if (form.tipo === "barco" && form.seaMode !== "kg" && (!form.m3manual || +form.m3manual <= 0)) e.m3manual = "Ingresá los metros cúbicos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFiles = (e) => {
    const names = Array.from(e.target.files).map(f => f.name);
    setFileNames(names);
    setForm(f => ({ ...f, files: names }));
  };

  const byWeight = form.tipo === "avion" || (form.tipo === "barco" && form.seaMode === "kg");
  const seaM3    = form.tipo === "barco" && form.seaMode !== "kg";
  const pVol  = byWeight && form.largo && form.ancho && form.alto
    ? (+form.largo * +form.ancho * +form.alto) / 5000 : 0;
  const pFact = Math.max(pVol, +form.peso || 0);
  const m3p   = +form.m3manual || 0;
  const m3f   = Math.max(+settings.seaMin || 1, m3p);

  const rowS = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8" }}>
      <Header onAdmin={onAdminClick} dolar={dolar} dolarErr={dolarErr} dolarLoading={dolarLoading} onRefreshDolar={onRefresh} />
      <main style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

        <Card icon="👤" title="Datos del cliente" bg="#eff6ff">
          <div style={rowS}>
            <Field label="Nombre completo" required>
              <Inp placeholder="Tu nombre y apellido" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              {errors.nombre && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.nombre}</p>}
            </Field>
            <Field label="WhatsApp" required>
              <Inp placeholder="+54 9 ..." value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
              {errors.whatsapp && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.whatsapp}</p>}
            </Field>
          </div>
          <Field label="Email">
            <Inp type="email" placeholder="tu@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>
        </Card>

        <Card icon="📦" title="Datos del producto">
          <Field label="Producto" required>
            <div style={{ display:"flex", gap:8 }}>
              <Inp placeholder="Descripción del producto" value={form.producto}
                onChange={e => set("producto", e.target.value)} style={{ flex:1 }} />
              <button onClick={handleAnalyzeProduct} disabled={aiLoading || !form.producto.trim()}
                style={{ padding:"0 14px", borderRadius:10, border:"none", background: aiLoading ? "#e2e8f0" : "linear-gradient(135deg,#0369a1,#0ea5e9)",
                  color: aiLoading ? "#94a3b8" : "white", fontWeight:700, fontSize:12, cursor: aiLoading ? "wait" : "pointer", whiteSpace:"nowrap" }}>
                {aiLoading ? "⏳ Analizando…" : "🤖 Analizar IA"}
              </button>
            </div>
            {errors.producto && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.producto}</p>}
          </Field>

          <Field label="Categoría del producto" hint="Escribí tu producto y elegí la categoría de la lista. Si no está, usá '🤖 Analizar IA' o el HS Code. Arancel referencial (AEC extrazona); confirmá el exacto en VUCE o con tu despachante.">
            <div style={{ position:"relative" }}>
              <Inp placeholder="Buscá: zapatilla, celular, perfume, heladera…"
                value={catQuery}
                onChange={e => { setCatQuery(e.target.value); setCatOpen(true); if (!e.target.value.trim()) handleCategoria(""); }}
                onFocus={() => setCatOpen(true)}
                onBlur={() => setTimeout(() => setCatOpen(false), 150)} />
              {catOpen && (() => {
                const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
                const q = norm(catQuery.trim());
                const matches = CATEGORIES.filter(c => !q || norm(c.label).includes(q));
                if (!matches.length) return (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:20, background:"white", border:"1px solid #e2e8f0", borderRadius:12, marginTop:4, padding:"12px 14px", fontSize:12, color:"#94a3b8", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                    No está en la lista — usá <strong>🤖 Analizar IA</strong> o cargá el HS Code.
                  </div>
                );
                return (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:20, background:"white", border:"1px solid #e2e8f0", borderRadius:12, marginTop:4, maxHeight:300, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                    {matches.map(c => (
                      <button key={c.label} type="button"
                        onMouseDown={() => { handleCategoria(c.label); setCatQuery(c.label); setCatOpen(false); }}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", textAlign:"left", padding:"10px 14px", border:"none", borderBottom:"1px solid #f1f5f9", background:"white", cursor:"pointer", fontSize:13, color:"#334155" }}>
                        <span>{c.label}</span>
                        <span style={{ fontWeight:700, color:"#0369a1", fontSize:12, flexShrink:0, marginLeft:10 }}>{c.rate}%</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            {form.categoria && (
              <p style={{ fontSize:12, color:"#15803d", fontWeight:700, marginTop:6 }}>
                ✅ {form.categoria}: derecho de importación {CATEGORIES.find(c => c.label === form.categoria)?.rate}%
              </p>
            )}
          </Field>

          {aiResult && !aiResult.error && (
            <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:10, marginBottom:16, fontSize:12 }}>
              <p style={{ fontWeight:700, color:"#166534", marginBottom:4 }}>✅ Análisis IA completado</p>
              <p style={{ color:"#15803d" }}>📋 {aiResult.description}</p>
              <p style={{ color:"#15803d" }}>🔢 HS Code sugerido: <strong>{aiResult.hsCode}</strong></p>
              <p style={{ color:"#15803d" }}>📊 Arancel estimado: <strong>{aiResult.dutyRate}%</strong> — confianza: {aiResult.confidence}</p>
              <p style={{ color:"#4ade80", fontSize:11, marginTop:4 }}>⚠ Verificar con despachante de aduana antes de operar</p>
            </div>
          )}
          {aiResult?.error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:10, marginBottom:16, fontSize:12, color:"#991b1b" }}>
              No se pudo analizar el producto. Completá el HS Code manualmente.
            </div>
          )}

          <div style={rowS}>
            <Field label="HS Code / Código arancelario" hint="Completá manualmente o detectá con IA">
              <div style={{ display:"flex", gap:6 }}>
                <Inp placeholder="Ej: 8471.30.19" value={form.hsCode} onChange={e => set("hsCode", e.target.value)} style={{ flex:1 }} />
                <button onClick={handleAnalyzeHsCode} disabled={aiLoading || !form.hsCode.trim()} title="Buscar arancel por HS Code"
                  style={{ padding:"0 10px", borderRadius:10, border:"none",
                    background: aiLoading ? "#e2e8f0" : "linear-gradient(135deg,#6d28d9,#7c3aed)",
                    color: aiLoading ? "#94a3b8" : "white", fontWeight:700, fontSize:13,
                    cursor: aiLoading ? "wait" : "pointer", whiteSpace:"nowrap" }}>
                  🔍
                </button>
              </div>
            </Field>
            <Field label="Valor FOB / Valor productos (USD)" required hint="Valor total según factura del proveedor">
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94a3b8", fontWeight:700 }}>USD</span>
                <Inp type="number" placeholder="0.00" value={form.fob} onChange={e => set("fob", e.target.value)} style={{ paddingLeft:48 }} />
              </div>
              {errors.fob && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.fob}</p>}
            </Field>
          </div>

          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
            <Field label="¿Ya conocés tu arancel? Ingresalo directo (%)" hint="Opcional. Si lo completás, se usa este valor y podés omitir la categoría y el HS Code.">
              <div style={{ position:"relative", maxWidth:220 }}>
                <Inp type="number" placeholder="Ej: 20" value={form.manualDuty}
                  onChange={e => handleManualDuty(e.target.value)} min={0} max={100} step="0.5" style={{ paddingRight:32 }} />
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94a3b8", fontWeight:700 }}>%</span>
              </div>
            </Field>
            {form.dutyManual && (
              <p style={{ fontSize:12, color:"#92400e", fontWeight:700, margin:0 }}>✅ Derecho de importación cargado manualmente: {form.manualDuty}%</p>
            )}
          </div>

          <Field label="País de origen">
            <select value={form.origenSel} onChange={e => handleOrigen(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value="">Seleccionar país…</option>
              <option value="China">China</option>
              <option value="Estados Unidos (USA)">Estados Unidos (USA)</option>
              <option value="España">España</option>
              <option value="otro">Otro país (escribir)…</option>
            </select>
            {form.origenSel === "otro" && (
              <Inp placeholder="Escribí el país de origen" value={form.paisOrigen}
                onChange={e => set("paisOrigen", e.target.value)} style={{ marginTop:10 }} />
            )}
          </Field>
        </Card>

        <Card icon="🌐" title="Tipo de importación" bg="#f0f9ff">
          <TypeSel value={form.tipo} onChange={v => set("tipo", v)} />
          {form.tipo === "avion" && <SubTipoSel value={form.subTipo} onChange={v => set("subTipo", v)} />}
          {form.tipo === "barco" && <SeaModeSel value={form.seaMode} onChange={v => set("seaMode", v)} />}
        </Card>

        <Card icon="📐" title="Peso y medidas">
          {byWeight && (
            <>
              <p style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Medidas del paquete para calcular el <strong>peso volumétrico</strong></p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                <Field label="Largo (cm)"><Inp type="number" placeholder="0" value={form.largo} onChange={e => set("largo", e.target.value)} /></Field>
                <Field label="Ancho (cm)"><Inp type="number" placeholder="0" value={form.ancho} onChange={e => set("ancho", e.target.value)} /></Field>
                <Field label="Alto (cm)"><Inp type="number" placeholder="0" value={form.alto}  onChange={e => set("alto",  e.target.value)} /></Field>
              </div>
              {errors.medidas && <p style={{ color:"#ef4444", fontSize:11, marginBottom:12 }}>{errors.medidas}</p>}
            </>
          )}
          {seaM3 && (
            <>
              <p style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Ingresá el <strong>volumen total en m³</strong> del embarque</p>
              <Field label="Metros cúbicos (m³)" required hint={`USD ${settings.seaRate || 600}/m³ · Mín. facturable: ${settings.seaMin || 1} m³`}>
                <div style={{ position:"relative" }}>
                  <Inp type="number" placeholder="Ej: 1.3" value={form.m3manual} step="0.01"
                    onChange={e => set("m3manual", e.target.value)} style={{ paddingRight:40 }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#94a3b8", fontWeight:700 }}>m³</span>
                </div>
                {errors.m3manual && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.m3manual}</p>}
              </Field>
            </>
          )}
          <Field label="Peso real total (kg)" required>
            <div style={{ position:"relative" }}>
              <Inp type="number" placeholder="0.00" value={form.peso} onChange={e => set("peso", e.target.value)} style={{ paddingRight:36 }} />
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#94a3b8" }}>kg</span>
            </div>
            {errors.peso && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.peso}</p>}
          </Field>

          {byWeight && form.largo && form.ancho && form.alto && form.peso && (
            <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:12, padding:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#0369a1", marginBottom:8 }}>Vista previa · {form.tipo === "avion" ? "Avión" : "Marítimo por kilo"}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:12 }}>
                <div><p style={{ color:"#94a3b8" }}>Peso volumétrico</p><p style={{ fontWeight:700 }}>{fmt(pVol)} kg</p></div>
                <div><p style={{ color:"#94a3b8" }}>Peso real</p><p style={{ fontWeight:700 }}>{fmt(+form.peso)} kg</p></div>
                <div><p style={{ color:"#0369a1" }}>Facturable</p><p style={{ fontWeight:700, color:"#0369a1" }}>{fmt(pFact)} kg</p></div>
              </div>
            </div>
          )}
          {seaM3 && m3p > 0 && (
            <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:12, padding:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#0369a1", marginBottom:8 }}>Vista previa · Barco</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:12 }}>
                <div><p style={{ color:"#94a3b8" }}>Vol. ingresado</p><p style={{ fontWeight:700 }}>{fmt(m3p, 3)} m³</p></div>
                <div><p style={{ color:"#94a3b8" }}>Facturable</p><p style={{ fontWeight:700, color:"#0369a1" }}>{fmt(m3f, 3)} m³</p></div>
                <div><p style={{ color:"#94a3b8" }}>Costo flete</p><p style={{ fontWeight:700, color:"#0369a1" }}>{USD(m3f * (+settings.seaRate || 600))}</p></div>
              </div>
              {m3p < 1 && <p style={{ fontSize:11, color:"#d97706", marginTop:6 }}>⚠ Menos de 1 m³ — se cobra tarifa mínima de 1 m³</p>}
            </div>
          )}
        </Card>

        <Card icon="📎" title="Documentos (opcional)">
          <p style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>Adjuntá la <strong>factura proforma</strong> y <strong>packing list</strong> del proveedor.</p>
          <label htmlFor="fvr-upload"
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:20,
              border:"2px dashed #7dd3fc", borderRadius:14, cursor:"pointer", background:"white",
              color:"#0369a1", fontSize:13 }}>
            <span style={{ fontSize:32 }}>📂</span>
            <span style={{ fontWeight:700 }}>Clic aquí para adjuntar archivos</span>
            <span style={{ fontSize:11, color:"#94a3b8" }}>PDF · JPG · PNG · DOC</span>
          </label>
          <input id="fvr-upload" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            style={{ display:"none" }} onChange={handleFiles} />
          {fileNames.length > 0 && (
            <div style={{ marginTop:10 }}>
              {fileNames.map((f, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, background:"#f0fdf4", color:"#166534", padding:"6px 12px", borderRadius:8, marginBottom:4, border:"1px solid #bbf7d0" }}>
                  <span>✅</span><span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:14, marginBottom:20, fontSize:12, color:"#92400e" }}>
          ⚠️ {settings.legal}
        </div>

        <button onClick={() => { if (validate()) onCalculate(form, calculate(form, settings)); }}
          style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none",
            background:"linear-gradient(135deg,#0369a1,#0ea5e9)", color:"white",
            fontSize:18, fontWeight:900, cursor:"pointer", boxShadow:"0 4px 20px rgba(3,105,161,0.35)" }}>
          Calcular mi importación →
        </button>
        <p style={{ textAlign:"center", fontSize:12, color:"#94a3b8", marginTop:12 }}>Valores en USD · Conversión automática a ARS</p>
      </main>

      <footer style={{ textAlign:"center", padding:"24px 16px", fontSize:12, color:"#94a3b8", borderTop:"1px solid #e2e8f0", marginTop:16 }}>
        <p style={{ fontWeight:700, color:"#475569", marginBottom:4 }}>FVR Logística Internacional</p>
        <p>Francisco Vega · frannciissco@gmail.com · +54 9 3885 223299</p>
        <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:8 }}>
          <a href="https://www.fvrlogistica.com.ar" target="_blank" rel="noreferrer" style={{ color:"#0ea5e9" }}>🌐 fvrlogistica.com.ar</a>
          <a href="https://linktr.ee/FVRcomex" target="_blank" rel="noreferrer" style={{ color:"#0ea5e9" }}>🔗 Linktree</a>
        </div>
      </footer>
      <WAFloat />
    </div>
  );
};

/* ── ROW ─────────────────────────────────────────────────── */
const Row = ({ label, usd, dolar, hi, na, note }) => (
  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
    padding:"10px 16px", borderBottom:"1px solid #f1f5f9",
    background: hi ? "#eff6ff" : "transparent" }}>
    <div>
      <span style={{ fontSize:13, fontWeight: hi ? 700 : 400, color: hi ? "#0369a1" : "#334155" }}>{label}</span>
      {note && <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{note}</p>}
    </div>
    {na
      ? <span style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic", flexShrink:0, marginLeft:12 }}>No aplica</span>
      : <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color: hi ? "#0369a1" : "#1e293b" }}>{USD(usd)}</div>
          {dolar && <div style={{ fontSize:11, color:"#94a3b8" }}>{ARS(usd, dolar)}</div>}
        </div>
    }
  </div>
);

/* ── RESULTS VIEW ────────────────────────────────────────── */
const ResultsView = ({ formData: d, results: r, dolar, settings: s, onBack, onWhatsApp }) => {
  const tipoLabel = d.tipo === "avion"
    ? (d.subTipo === "personal" ? "Avión - Envío Personal (Franquicia)" : "Avión - Envío Comercial")
    : (d.seaMode === "kg" ? "Barco - Por kilo" : "Barco - Por m³");

  const [pdfLoading, setPdfLoading] = useState(false);
  const handleDownloadPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await generatePDF(d, r, dolar, s);
    } catch (e) {
      alert("No se pudo generar el PDF. Probá de nuevo en un momento.");
    }
    setPdfLoading(false);
  };

  const handleWA = () => {
    const msg = buildWAMsg(d, r, dolar, s);
    const url = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8" }}>
      <Header onAdmin={() => {}} dolar={dolar} dolarErr={false} dolarLoading={false} onRefreshDolar={() => {}} />
      <main style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

        {/* Hero */}
        <div style={{ background:"linear-gradient(135deg,#0d2347 0%,#0369a1 100%)", borderRadius:20, padding:20, marginBottom:20, color:"white", boxShadow:"0 4px 24px rgba(13,35,71,0.35)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <p style={{ fontSize:11, color:"#7dd3fc", textTransform:"uppercase", letterSpacing:2, marginBottom:4 }}>Presupuesto para</p>
              <h2 style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>{d.nombre}</h2>
              <p style={{ fontSize:13, color:"#93c5fd" }}>{d.producto} · {tipoLabel}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"#7dd3fc" }}>Total General</p>
              <p style={{ fontSize:26, fontWeight:900 }}>{USD(r.totalGen)}</p>
              {dolar && <p style={{ fontSize:13, color:"#93c5fd" }}>{ARS(r.totalGen, dolar)}</p>}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:14 }}>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#7dd3fc" }}>FOB / Valor prod.</p>
              <p style={{ fontWeight:700, fontSize:14 }}>{USD(r.fob)}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#7dd3fc" }}>Envío total</p>
              <p style={{ fontWeight:700, fontSize:14 }}>{USD(r.totalLog)}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#7dd3fc" }}>{r.byWeight ? "Kg facturable" : "M³ facturable"}</p>
              <p style={{ fontWeight:700, fontSize:14 }}>{r.byWeight ? `${fmt(r.pFact)} kg` : `${fmt(r.m3Fact, 3)} m³`}</p>
            </div>
          </div>
        </div>

        {r.isPersonal && (
          <div style={{ background:"#fffbeb", border:"1px solid #fbbf24", borderRadius:14, padding:"12px 16px", marginBottom:16, display:"flex", gap:10 }}>
            <span style={{ fontSize:20 }}>🏷️</span>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>Franquicia de envío personal activa</p>
              <p style={{ fontSize:12, color:"#b45309" }}>
                {r.fob <= 400 ? "FOB ≤ USD 400 — Exento de derechos de importación." : `Excedente de USD 400: ${USD(r.fob - 400)}. Derechos al ${r.effectiveDutyPct}% (HS code) sobre el excedente.`}
                {" "}Tasa estadística y demás impuestos no aplican. IVA {s.vat}% sobre FOB + derechos.
              </p>
            </div>
          </div>
        )}

        {d.aiDutyRate !== null && d.aiDutyRate !== undefined && (
          <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:14, padding:"10px 16px", marginBottom:16, display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:20 }}>{d.categoria ? "🏷️" : (d.dutyManual ? "✍️" : "🤖")}</span>
            <p style={{ fontSize:12, color:"#166534" }}>
              {d.categoria
                ? <><strong>Categoría seleccionada:</strong> {d.categoria} — derecho de importación <strong>{d.aiDutyRate}%</strong>. Verificar con despachante.</>
                : d.dutyManual
                  ? <><strong>Arancel manual:</strong> Derecho de importación cargado por el cliente al <strong>{d.aiDutyRate}%</strong>.</>
                  : <><strong>Análisis IA:</strong> Derecho de importación calculado al <strong>{d.aiDutyRate}%</strong> según tipo de producto detectado. Verificar con despachante.</>}
            </p>
          </div>
        )}

        <Card icon="🌐" title="Flete internacional">
          <Row label="FOB / Valor productos" usd={r.fob} dolar={dolar} />
          {r.byWeight ? (<>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #f1f5f9", fontSize:13 }}>
              <span style={{ color:"#334155" }}>Peso real total</span><span style={{ fontWeight:600 }}>{fmt(r.peso)} kg</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #f1f5f9", fontSize:13 }}>
              <span style={{ color:"#334155" }}>Peso volumétrico (L×A×H / 5.000)</span><span style={{ fontWeight:600 }}>{fmt(r.pVol)} kg</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #f1f5f9", fontSize:13, background:"#eff6ff" }}>
              <span style={{ fontWeight:700, color:"#0369a1" }}>Peso facturable (el mayor)</span><span style={{ fontWeight:700, color:"#0369a1" }}>{fmt(r.pFact)} kg</span>
            </div>
            <Row label={`${r.seaKg ? "Tarifa marítima" : "Tarifa aérea"} (USD ${r.airRate}/kg)`} usd={r.flete} dolar={dolar} />
          </>) : (<>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #f1f5f9", fontSize:13 }}>
              <span style={{ color:"#334155" }}>Volumen ingresado</span><span style={{ fontWeight:600 }}>{fmt(r.m3, 3)} m³</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #f1f5f9", fontSize:13, background:"#eff6ff" }}>
              <span style={{ fontWeight:700, color:"#0369a1" }}>Volumen facturable (mín. {s.seaMin} m³)</span><span style={{ fontWeight:700, color:"#0369a1" }}>{fmt(r.m3Fact, 3)} m³</span>
            </div>
            <Row label={`Tarifa marítima (USD ${s.seaRate}/m³)`} usd={r.flete} dolar={dolar} />
          </>)}
        </Card>

        <Card icon="🛡️" title="Seguro y valor CIF">
          <Row label={`Seguro (${s.insurance}% sobre FOB + flete)`} usd={r.seguro} dolar={dolar} />
          <Row label="CIF = FOB + Flete + Seguro" usd={r.cif} dolar={dolar} hi />
        </Card>

        <Card icon="🏛️" title="Tributos aduaneros">
          {r.isPersonal ? (<>
            <Row label={`Derecho de importación (${r.effectiveDutyPct}%)`} usd={r.duty} dolar={dolar}
              note={r.fob <= 400 ? "FOB ≤ USD 400 — Exento" : `${r.effectiveDutyPct}% sobre USD ${fmt(r.fob - 400)} de excedente`} />
            <Row label={`IVA (${s.vat}% sobre FOB + derechos)`} usd={r.iva} dolar={dolar} />
          </>) : (<>
            <Row label={`Derecho de importación (${r.effectiveDutyPct}%${d.categoria ? " · categoría" : (d.dutyManual ? " · manual" : (d.aiDutyRate !== null ? " · IA" : ""))})`} usd={r.duty} dolar={dolar} />
            <Row label={`Tasa estadística (${s.stat}%)`} usd={r.stat} dolar={dolar} />
            <Row label="Base imponible IVA" usd={r.ivaBase} dolar={dolar} hi />
            <Row label={`IVA (${s.vat}%)`} usd={r.iva} dolar={dolar} />
          </>)}
        </Card>

        <Card icon="📊" title="Impuestos internos">
          {r.internalTaxes
            ? (<>
                <Row label={`IVA adicional (${s.addVat}%)`} usd={r.addVat} dolar={dolar} />
                <Row label={`Ganancias (${s.gains}%)`} usd={r.gains} dolar={dolar} />
                <Row label={`Ingresos Brutos (${s.ib}%)`} usd={r.ib} dolar={dolar} />
              </>)
            : <div style={{ textAlign:"center", padding:"20px 0" }}>
                <p style={{ fontSize:32, marginBottom:8 }}>{r.isAir ? "✈️" : "🚢"}</p>
                <p style={{ fontSize:13, color:"#64748b" }}>
                  {r.seaKg
                    ? "En la modalidad marítima por kilo no se aplican impuestos internos (se calcula como el aéreo comercial)."
                    : "Los impuestos internos no aplican para importación por avión."}
                </p>
              </div>
          }
        </Card>

        <Card icon="🚚" title="Servicios logísticos">
          <Row label="Pick up / Retiro en origen" usd={r.pickup} dolar={dolar} />
          {r.isAir && <Row label="Handling" usd={r.handling} dolar={dolar} />}
          <Row label="Envío nacional" usd={r.domestic} dolar={dolar} />
          <Row label="Honorarios de Gestión" usd={r.fees} dolar={dolar} hi />
        </Card>

        {/* Totales */}
        <div style={{ background:"#0d2347", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 24px rgba(13,35,71,0.35)", marginBottom:20 }}>
          <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ fontSize:11, color:"white", fontWeight:700, textTransform:"uppercase", letterSpacing:2 }}>Resumen final</p>
          </div>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:11, color:"#7dd3fc", marginBottom:4 }}>Total envío (sin producto)</p>
              <p style={{ fontSize:20, fontWeight:700, color:"white" }}>{USD(r.totalLog)}</p>
            </div>
            {dolar && <p style={{ fontSize:14, color:"#93c5fd", fontWeight:600 }}>{ARS(r.totalLog, dolar)}</p>}
          </div>
          <div style={{ padding:"20px", background:"rgba(14,165,233,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:11, color:"#93c5fd", marginBottom:4 }}>TOTAL GENERAL DE IMPORTACIÓN</p>
              <p style={{ fontSize:28, fontWeight:900, color:"white" }}>{USD(r.totalGen)}</p>
            </div>
            {dolar && <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"#7dd3fc" }}>Al dólar oficial ${fmt(dolar)}</p>
              <p style={{ fontSize:18, fontWeight:700, color:"white" }}>{ARS(r.totalGen, dolar)}</p>
            </div>}
          </div>
        </div>

        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:14, marginBottom:20, fontSize:12, color:"#92400e" }}>⚠️ {s.legal}</div>

        {/* ACTION BUTTONS */}
        <div style={{ marginBottom:32 }}>
          {/* WhatsApp */}
          <button onClick={handleWA}
            style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none",
              background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white",
              fontSize:17, fontWeight:900, cursor:"pointer", marginBottom:12,
              display:"flex", alignItems:"center", justifyContent:"center", gap:12,
              boxShadow:"0 4px 20px rgba(22,163,74,0.35)" }}>
            <WAIcon cls="w-6 h-6" />
            Enviar presupuesto por WhatsApp
          </button>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {/* PDF Download */}
            <button onClick={handleDownloadPDF} disabled={pdfLoading}
              style={{ padding:"14px 0", borderRadius:14, border:"2px solid #bae6fd",
                background: pdfLoading ? "#f1f5f9" : "white", color:"#0369a1", fontSize:14, fontWeight:700,
                cursor: pdfLoading ? "wait" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {pdfLoading ? "⏳ Generando…" : "📄 Descargar PDF"}
            </button>
            {/* Back */}
            <button onClick={onBack}
              style={{ padding:"14px 0", borderRadius:14, border:"2px solid #e2e8f0",
                background:"white", color:"#475569", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              ← Nueva consulta
            </button>
          </div>
          <p style={{ textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:8 }}>
            Se descarga un PDF listo para abrir y compartir con tu cliente
          </p>
        </div>
      </main>
      <WAFloat />
    </div>
  );
};

/* ── ADMIN LOGIN ─────────────────────────────────────────── */
const AdminLogin = ({ onLogin, onBack }) => {
  const [pass, setPass] = useState(""); const [err, setErr] = useState(false);
  const go = () => { if (pass === ADMIN_PASS) { setErr(false); onLogin(); } else setErr(true); };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f4f8" }}>
      <div style={{ background:"white", borderRadius:20, boxShadow:"0 4px 32px rgba(0,0,0,0.12)", padding:36, width:"100%", maxWidth:360 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#0369a1,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"white", fontSize:18, margin:"0 auto 12px" }}>FVR</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1e293b" }}>Panel Administrador</h2>
          <p style={{ fontSize:13, color:"#64748b" }}>FVR Logística Internacional</p>
        </div>
        <Field label="Contraseña">
          <Inp type="password" placeholder="Ingresá la contraseña" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
        </Field>
        {err && <p style={{ color:"#ef4444", textAlign:"center", marginBottom:12, fontSize:13 }}>Contraseña incorrecta</p>}
        <button onClick={go} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:"linear-gradient(135deg,#0369a1,#0ea5e9)", color:"white", fontWeight:700, fontSize:15, cursor:"pointer" }}>Ingresar</button>
        <button onClick={onBack} style={{ width:"100%", marginTop:12, background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer" }}>← Volver a la calculadora</button>
      </div>
    </div>
  );
};

/* ── QUOTE CARD ──────────────────────────────────────────── */
const QuoteCard = ({ q, dolar, onStatusChange }) => {
  const [open, setOpen] = useState(false); const r = q.results;
  return (
    <div style={{ background:"white", borderRadius:16, border:"1px solid #f1f5f9", overflow:"hidden", marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:16, cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>{q.importType === "avion" ? "✈️" : "🚢"}</span>
          <div>
            <p style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>{q.client}</p>
            <p style={{ fontSize:12, color:"#64748b" }}>{q.product} · {new Date(q.date).toLocaleDateString("es-AR")}</p>
            {q.formData?.subTipo === "personal" && <span style={{ fontSize:11, background:"#fef3c7", color:"#92400e", padding:"2px 8px", borderRadius:99, fontWeight:700 }}>Envío personal</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#0369a1" }}>{USD(r?.totalGen)}</p>
            {dolar && <p style={{ fontSize:11, color:"#94a3b8" }}>{ARS(r?.totalGen || 0, dolar)}</p>}
          </div>
          <Badge status={q.status} />
          <span style={{ color:"#94a3b8", fontSize:13 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:"1px solid #f1f5f9", padding:16 }}>
          {/* Datos del cliente */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14, fontSize:13 }}>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>WhatsApp</p>
              <a href={`https://wa.me/${(q.whatsapp||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ fontWeight:700, color:"#16a34a" }}>{q.whatsapp}</a>
            </div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>Email</p><p style={{ fontWeight:700 }}>{q.email || "—"}</p></div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>HS Code</p><p style={{ fontWeight:700 }}>{q.hsCode || "—"}</p></div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>País de origen</p><p style={{ fontWeight:700 }}>{q.formData?.paisOrigen || "—"}</p></div>
            <div style={{ gridColumn:"1/-1" }}><p style={{ fontSize:11, color:"#94a3b8" }}>Archivos</p><p style={{ fontSize:12 }}>{q.formData?.files?.length ? q.formData.files.join(", ") : "Ninguno"}</p></div>
          </div>

          {/* Detalle de la cotización */}
          {r && (
            <div style={{ background:"#f8fafc", borderRadius:12, padding:12, marginBottom:14, border:"1px solid #e2e8f0" }}>
              <p style={{ fontWeight:700, color:"#334155", marginBottom:10, fontSize:11, textTransform:"uppercase", letterSpacing:.5 }}>Detalle de la cotización</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"4px 12px", fontSize:12 }}>
                <span style={{ color:"#64748b" }}>FOB / Valor productos</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.fob)}</span>
                <span style={{ color:"#64748b" }}>Flete internacional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.flete)}</span>
                <span style={{ color:"#64748b" }}>Seguro</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.seguro)}</span>
                <span style={{ color:"#0369a1", fontWeight:700 }}>CIF / Valor en aduana</span><span style={{ fontWeight:700, color:"#0369a1", textAlign:"right" }}>{USD(r.cif)}</span>
                <span style={{ color:"#64748b" }}>Derecho importación</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.duty)}</span>
                {!r.isPersonal && <><span style={{ color:"#64748b" }}>Tasa estadística</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.stat)}</span></>}
                <span style={{ color:"#64748b" }}>IVA</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.iva)}</span>
                {(r.internalTaxes ?? !r.isAir) && !r.isPersonal && <>
                  <span style={{ color:"#64748b" }}>IVA adicional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.addVat)}</span>
                  <span style={{ color:"#64748b" }}>Ganancias</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.gains)}</span>
                  <span style={{ color:"#64748b" }}>Ingresos Brutos</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.ib)}</span>
                </>}
                <span style={{ color:"#64748b" }}>Pick up</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.pickup)}</span>
                {r.isAir && <><span style={{ color:"#64748b" }}>Handling</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.handling)}</span></>}
                <span style={{ color:"#64748b" }}>Envío nacional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.domestic)}</span>
                <span style={{ color:"#64748b" }}>Honorarios de Gestión</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.fees)}</span>
                <span style={{ color:"#475569", fontWeight:700, borderTop:"1px solid #e2e8f0", paddingTop:6, marginTop:2 }}>Total envío</span><span style={{ fontWeight:700, color:"#0369a1", textAlign:"right", borderTop:"1px solid #e2e8f0", paddingTop:6, marginTop:2 }}>{USD(r.totalLog)}</span>
                <span style={{ color:"#0d2347", fontWeight:900, fontSize:13 }}>TOTAL GENERAL</span><span style={{ fontWeight:900, color:"#0d2347", textAlign:"right", fontSize:13 }}>{USD(r.totalGen)}</span>
              </div>
              {q.formData?.aiSuggestion && (
                <p style={{ marginTop:8, fontSize:11, color:"#166534", background:"#f0fdf4", padding:"6px 10px", borderRadius:8, border:"1px solid #86efac" }}>
                  🤖 {q.formData.aiSuggestion}
                </p>
              )}
            </div>
          )}

          {/* Estado */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#64748b", fontWeight:700 }}>Estado:</span>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <button key={k} onClick={() => onStatusChange(q.id, k)}
                style={{ fontSize:12, padding:"4px 10px", borderRadius:99, border:`2px solid ${q.status===k?"#0ea5e9":"#e2e8f0"}`,
                  background: q.status===k ? "#eff6ff" : "white", color: q.status===k ? "#0369a1" : "#64748b",
                  fontWeight:700, cursor:"pointer" }}>{v.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── ADMIN PANEL ─────────────────────────────────────────── */
const AdminPanel = ({ settings, saveSettings, quotes, updateQuoteStatus, metrics, dolar, fetchDolar, onLogout }) => {
  const [tab, setTab]   = useState("dashboard");
  const [s, setS]       = useState({ ...DEF, ...settings });
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState({ status:"", tipo:"", q:"" });

  const save = () => { saveSettings(s); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const SF = ({ label, k, min, max, step="0.01" }) => (
    <Field label={label}>
      <Inp type="number" min={min} max={max} step={step} value={s[k]} onChange={e => setS(p => ({ ...p, [k]: +e.target.value }))} />
    </Field>
  );
  const Toggle = ({ label, k }) => (
    <label style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", cursor:"pointer" }}>
      <span style={{ fontSize:13, color:"#334155" }}>{label}</span>
      <button onClick={() => setS(p => ({ ...p, [k]: !p[k] }))}
        style={{ width:44, height:24, borderRadius:99, background: s[k] ? "#0ea5e9" : "#cbd5e1", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
        <span style={{ position:"absolute", top:2, width:20, height:20, background:"white", borderRadius:"50%", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s", left: s[k] ? 22 : 2 }} />
      </button>
    </label>
  );

  const fq = quotes.filter(q => {
    if (filter.status && q.status !== filter.status) return false;
    if (filter.tipo && q.importType !== filter.tipo) return false;
    if (filter.q && !q.client?.toLowerCase().includes(filter.q.toLowerCase()) && !q.product?.toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const H = ["Fecha","Cliente","WhatsApp","Email","Producto","HS Code","Tipo","SubTipo","FOB","Total Envío","Total General","Estado"];
    const R = quotes.map(q => [new Date(q.date).toLocaleDateString("es-AR"),q.client,q.whatsapp,q.email,q.product,q.hsCode,q.importType,q.formData?.subTipo||"—",q.results?.fob,q.results?.totalLog,q.results?.totalGen,q.status]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+[H,...R].map(r=>r.join(",")).join("\n")],{type:"text/csv;charset=utf-8;"}));
    a.download = "fvr_presupuestos.csv"; a.click();
  };

  const last7 = Array.from({length:7},(_,i)=>{ const dt=new Date(); dt.setDate(dt.getDate()-(6-i)); const ds=dt.toLocaleDateString("es-AR"); return {day:dt.toLocaleDateString("es-AR",{weekday:"short"}),count:quotes.filter(q=>new Date(q.date).toLocaleDateString("es-AR")===ds).length}; });
  const sdData = Object.entries(quotes.reduce((a,q)=>{a[q.status||"nuevo"]=(a[q.status||"nuevo"]||0)+1;return a;},{})).map(([n,v])=>({name:STATUS_MAP[n]?.label||n,value:v}));
  const CLR = ["#0ea5e9","#f59e0b","#22c55e","#94a3b8"];

  const navStyle = (id) => ({
    display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:12,
    border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
    background: tab===id ? "#0ea5e9" : "transparent",
    color: tab===id ? "white" : "#475569",
    boxShadow: tab===id ? "0 2px 8px rgba(14,165,233,0.3)" : "none",
  });

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8" }}>
      <div style={{ background:"linear-gradient(135deg,#0a1628,#0d2347)", color:"white", padding:"14px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0c2340", fontSize:12 }}>FVR</div>
            <div><p style={{ fontWeight:700, fontSize:14 }}>Panel Administrador</p><p style={{ fontSize:11, color:"#7dd3fc" }}>FVR Logística Internacional</p></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:"#7dd3fc" }}>
            <span>Dólar: ${fmt(dolar)}</span>
            <button onClick={fetchDolar} style={{ background:"none", border:"none", color:"#38bdf8", cursor:"pointer", fontSize:16 }}>↺</button>
            <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"white", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:12 }}>Cerrar sesión</button>
          </div>
        </div>
      </div>
      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"8px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", gap:8, overflowX:"auto" }}>
          <button style={navStyle("dashboard")} onClick={() => setTab("dashboard")}>📊 Dashboard</button>
          <button style={navStyle("quotes")} onClick={() => setTab("quotes")}>📋 Presupuestos ({quotes.length})</button>
          <button style={navStyle("settings")} onClick={() => setTab("settings")}>⚙️ Configuración</button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:24 }}>

        {tab === "dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
              {[{l:"Visitas",v:metrics.visits,i:"👁️"},{l:"Empezaron",v:metrics.started,i:"📝"},{l:"Presupuestos",v:metrics.generated,i:"📋"},{l:"Enviados WA",v:metrics.sentWhatsapp,i:"💬"}].map(({l,v,i})=>(
                <div key={l} style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #f1f5f9" }}>
                  <p style={{ fontSize:24, marginBottom:4 }}>{i}</p>
                  <p style={{ fontSize:28, fontWeight:900, color:"#1e293b" }}>{v}</p>
                  <p style={{ fontSize:12, color:"#64748b" }}>{l}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
              <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9" }}>
                <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:12 }}>Últimos 7 días</p>
                <ResponsiveContainer width="100%" height={140}><BarChart data={last7}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#0ea5e9" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
              </div>
              <div style={{ background:"white", borderRadius:16, padding:20, border:"1px solid #f1f5f9" }}>
                <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:12 }}>Por estado</p>
                {sdData.length > 0
                  ? <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={sdData} cx="50%" cy="50%" innerRadius={30} outerRadius={58} dataKey="value" label={({name,value})=>`${name}:${value}`} labelLine={false} fontSize={10}>{sdData.map((_,i)=><Cell key={i} fill={CLR[i%CLR.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
                  : <div style={{ height:140, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>Sin datos</div>}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #f1f5f9" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Total cotizado USD</p><p style={{ fontSize:20, fontWeight:900, color:"#0369a1" }}>{USD(quotes.reduce((s,q)=>s+(q.results?.totalGen||0),0))}</p></div>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #f1f5f9" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Promedio</p><p style={{ fontSize:20, fontWeight:900, color:"#0369a1" }}>{quotes.length?USD(quotes.reduce((s,q)=>s+(q.results?.totalGen||0),0)/quotes.length):USD(0)}</p></div>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #f1f5f9" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Tipo más elegido</p><p style={{ fontSize:20, fontWeight:900, color:"#0369a1" }}>{quotes.filter(q=>q.importType==="avion").length>=quotes.filter(q=>q.importType==="barco").length?"✈️ Avión":"Barco"}</p></div>
            </div>
          </div>
        )}

        {tab === "quotes" && (
          <div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
              <input placeholder="Buscar..." value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))} style={{ ...inputStyle, flex:1, minWidth:180 }} />
              <select value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))} style={{ ...inputStyle, width:"auto" }}>
                <option value="">Todos los estados</option>{Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filter.tipo} onChange={e=>setFilter(f=>({...f,tipo:e.target.value}))} style={{ ...inputStyle, width:"auto" }}>
                <option value="">Todos los tipos</option><option value="avion">✈️ Avión</option><option value="barco">🚢 Barco</option>
              </select>
              <button onClick={exportCSV} style={{ padding:"10px 16px", borderRadius:12, border:"none", background:"#22c55e", color:"white", fontWeight:700, cursor:"pointer", fontSize:13 }}>📥 Exportar CSV</button>
            </div>
            {fq.length === 0
              ? <div style={{ background:"white", borderRadius:16, padding:48, textAlign:"center", color:"#94a3b8" }}><p style={{ fontSize:40, marginBottom:12 }}>📋</p><p>Sin presupuestos</p></div>
              : fq.map(q => <QuoteCard key={q.id} q={q} dolar={dolar} onStatusChange={updateQuoteStatus}/>)
            }
          </div>
        )}

        {tab === "settings" && (
          <div>
            <Card icon="✈️" title="Flete aéreo (USD / kg) por país de origen">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                <SF label="🇺🇸 Estados Unidos" k="airRateUSA"/>
                <SF label="🇨🇳 China" k="airRateChina"/>
                <SF label="🇪🇸 España" k="airRateEspana"/>
              </div>
              <p style={{ fontSize:11, color:"#64748b", marginTop:8 }}>La tarifa es fija por kg (no varía con el peso). Cualquier otro país de origen usa la tarifa de China.</p>
            </Card>
            <Card icon="🚢" title="Flete marítimo">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <SF label="Tarifa por m³ (USD / m³)" k="seaRate"/><SF label="Mínimo facturable (m³)" k="seaMin"/>
              </div>
              <SF label="⚖️ Tarifa por kilo (USD / kg)" k="seaRateKg"/>
              <p style={{ fontSize:11, color:"#64748b", marginTop:4 }}>La modalidad marítima "por kilo" se calcula con los mismos impuestos que el aéreo comercial; lo único que cambia es esta tarifa por kg.</p>
            </Card>
            <Card icon="🛡️" title="Seguro y aduana">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                <SF label="Seguro (%)" k="insurance" min={0} max={10}/>
                <SF label="Derecho importación (%)" k="duty" min={0} max={50}/>
                <SF label="Tasa estadística (%)" k="stat" min={0} max={5}/>
              </div>
              <Field label="IVA">
                <select value={s.vat} onChange={e=>setS(p=>({...p,vat:+e.target.value}))} style={inputStyle}>
                  <option value={21}>21%</option><option value={10.5}>10,5%</option>
                </select>
              </Field>
            </Card>
            <Card icon="📊" title="Impuestos internos (barco)">
              <Toggle label="IVA adicional activo" k="addVatOn"/><SF label="IVA adicional (%)" k="addVat" min={0} max={50}/>
              <Toggle label="Ganancias activo" k="gainsOn"/><SF label="Ganancias (%)" k="gains" min={0} max={20}/>
              <Toggle label="Ingresos Brutos activo" k="ibOn"/><SF label="Ingresos Brutos (%)" k="ib" min={0} max={10}/>
            </Card>
            <Card icon="🚚" title="Servicios logísticos">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                <SF label="Pick up (USD)" k="pickup"/><SF label="Handling -avión- (USD)" k="handling"/><SF label="Envío nacional -avión- (USD)" k="domestic"/><SF label="Envío nacional -barco- (USD)" k="domesticSea"/>
              </div>
              <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:12, padding:"12px 14px", marginTop:4, marginBottom:4 }}>
                <p style={{ fontSize:12, color:"#0369a1", fontWeight:700, marginBottom:8 }}>✈️ Regla del Handling (avión)</p>
                <SF label="Cobrar handling solo si peso facturable es menor a (kg)" k="handlingMaxKg" min={0} step="0.1"/>
                <p style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Si el peso facturable iguala o supera este valor, el handling pasa a USD 0 automáticamente.</p>
              </div>
              <Field label="Tipo de honorarios">
                <div style={{ display:"flex", gap:12 }}>
                  {["fixed","percentage"].map(t=>(
                    <button key={t} onClick={()=>setS(p=>({...p,feeType:t}))}
                      style={{ flex:1, padding:"10px 0", borderRadius:12, border:`2px solid ${s.feeType===t?"#0ea5e9":"#e2e8f0"}`,
                        background: s.feeType===t ? "#eff6ff" : "white", color: s.feeType===t ? "#0369a1" : "#475569",
                        fontWeight:700, fontSize:13, cursor:"pointer" }}>
                      {t==="fixed"?"💵 Monto fijo USD":"📊 Porcentaje %"}
                    </button>
                  ))}
                </div>
              </Field>
              {s.feeType==="fixed"
                ? <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <SF label="✈️ Honorarios fijos avión (USD)" k="feeFixed"/>
                    <SF label="🚢 Honorarios fijos barco (USD)" k="feeFixedSea"/>
                  </div>
                : <>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <SF label="✈️ Honorarios avión (%)" k="feePct" min={0} max={30}/>
                      <SF label="🚢 Honorarios barco (%)" k="feePctSea" min={0} max={30}/>
                    </div>
                    <Field label="Calcular % sobre">
                      <select value={s.feeBase||"fob"} onChange={e=>setS(p=>({...p,feeBase:e.target.value}))} style={inputStyle}>
                        <option value="fob">FOB (valor del producto)</option>
                        <option value="costs">Total de costos</option>
                      </select>
                    </Field>
                  </>
              }
            </Card>
            <Card icon="💱" title="Dólar oficial">
              <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"center" }}>
                <div style={{ flex:1, background:"#f0f9ff", borderRadius:12, padding:12, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"#64748b" }}>Valor actual (automático)</p>
                  <p style={{ fontSize:22, fontWeight:900, color:"#0369a1" }}>${fmt(dolar)}</p>
                </div>
                <button onClick={fetchDolar} style={{ padding:"10px 18px", borderRadius:12, background:"#e0f2fe", color:"#0369a1", border:"none", fontWeight:700, fontSize:13, cursor:"pointer" }}>↺ Actualizar</button>
              </div>
              <Field label="Carga manual (opcional)" hint="Si se ingresa, reemplaza al valor automático.">
                <Inp type="number" placeholder="Ej: 1420.00" value={s.manualDolar||""} onChange={e=>setS(p=>({...p,manualDolar:e.target.value?+e.target.value:null}))}/>
              </Field>
            </Card>
            <Card icon="⚖️" title="Texto legal">
              <Field label="Aclaración para el cliente">
                <textarea rows={3} value={s.legal} onChange={e=>setS(p=>({...p,legal:e.target.value}))}
                  style={{ ...inputStyle, resize:"none", height:72, fontFamily:"inherit" }}/>
              </Field>
            </Card>
            <button onClick={save}
              style={{ width:"100%", padding:16, borderRadius:16, border:"none",
                background: saved ? "#22c55e" : "linear-gradient(135deg,#0369a1,#0ea5e9)",
                color:"white", fontWeight:900, fontSize:16, cursor:"pointer", marginBottom:12 }}>
              {saved ? "✓ Cambios guardados" : "Guardar configuración"}
            </button>
            <div style={{ background:"#f1f5f9", borderRadius:12, padding:14, fontSize:12, color:"#64748b" }}>
              <strong>Contraseña de administrador:</strong> fvr2024
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── ROOT ────────────────────────────────────────────────── */
export default function App() {
  const [view,       setView]      = useState("calc");
  const [settings,   setSettings]  = useState(() => ({ ...DEF, ...ls("fvr_cfg", DEF) }));
  const [quotes,     setQuotes]    = useState(() => ls("fvr_quotes",  []));
  const [metrics,    setMetrics]   = useState(() => ls("fvr_metrics", { visits:0, started:0, generated:0, sentWhatsapp:0 }));
  const [dolar,      setDolar]     = useState(null);
  const [dolarErr,   setDolarErr]  = useState(false);
  const [dolarLoad,  setDolarLoad] = useState(false);
  const [formData,   setFormData]  = useState(null);
  const [results,    setResults]   = useState(null);
  const [adminAuth,  setAdminAuth] = useState(false);

  const fetchDolar = async () => {
    const cfg = ls("fvr_cfg", DEF);
    if (cfg.manualDolar) { setDolar(cfg.manualDolar); return; }
    setDolarLoad(true);
    // 1) CriptoYa — dólar oficial Banco Nación venta (mismo valor que DolarHoy)
    try {
      const res = await fetch("https://criptoya.com/api/dolar");
      const d   = await res.json();
      const venta = d?.oficial?.ask ?? d?.oficial?.price;
      if (venta) { setDolar(venta); setDolarErr(false); setDolarLoad(false); return; }
      throw new Error();
    } catch {}
    // 2) dolarapi (respaldo)
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares/oficial");
      const d   = await res.json();
      if (d.venta) { setDolar(d.venta); setDolarErr(false); setDolarLoad(false); return; }
      throw new Error();
    } catch {}
    // 3) bluelytics (respaldo)
    try {
      const res2 = await fetch("https://api.bluelytics.com.ar/v2/latest");
      const d2   = await res2.json();
      if (d2?.oficial?.value_sell) { setDolar(d2.oficial.value_sell); setDolarErr(false); setDolarLoad(false); return; }
      throw new Error();
    } catch {
      setDolarErr(true); setDolar(1450);
    }
    setDolarLoad(false);
  };

  useEffect(() => {
    fetchDolar();
    const m = { ...metrics, visits: metrics.visits + 1 };
    setMetrics(m); ss("fvr_metrics", m);
  }, []);

  const saveSettings  = (s) => { setSettings(s); ss("fvr_cfg", s); };
  const saveQuote     = (q) => { const qs = [q,...quotes]; setQuotes(qs); ss("fvr_quotes", qs); };
  const updateStatus  = (id, status) => { const qs = quotes.map(q=>q.id===id?{...q,status}:q); setQuotes(qs); ss("fvr_quotes", qs); };
  const track         = (k) => { const m = {...metrics,[k]:metrics[k]+1}; setMetrics(m); ss("fvr_metrics",m); };

  const handleCalculate = (d, r) => {
    setFormData(d); setResults(r); setView("results"); track("generated");
    saveQuote({ id:uid(), date:new Date().toISOString(), client:d.nombre, whatsapp:d.whatsapp, email:d.email, product:d.producto, hsCode:d.hsCode, importType:d.tipo, formData:d, results:r, status:"nuevo" });
  };

  const handleWhatsApp = () => {
    if (!results || !formData) return;
    track("sentWhatsapp");
    const msg = buildWAMsg(formData, results, dolar, settings);
    window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (view === "admin-login") return <AdminLogin onLogin={() => { setAdminAuth(true); setView("admin"); }} onBack={() => setView("calc")} />;
  if (view === "admin" && adminAuth) return <AdminPanel settings={settings} saveSettings={saveSettings} quotes={quotes} updateQuoteStatus={updateStatus} metrics={metrics} dolar={dolar} fetchDolar={fetchDolar} onLogout={() => { setAdminAuth(false); setView("calc"); }} />;
  if (view === "results" && results) return <ResultsView formData={formData} results={results} dolar={dolar} settings={settings} onBack={() => setView("calc")} onWhatsApp={handleWhatsApp} />;
  return <CalculatorForm settings={settings} onCalculate={handleCalculate} onAdminClick={() => setView("admin-login")} dolar={dolar} dolarErr={dolarErr} dolarLoading={dolarLoad} onRefresh={fetchDolar} onTrackStarted={() => track("started")} />;
}
