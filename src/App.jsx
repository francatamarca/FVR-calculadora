import { useState, useEffect, lazy, Suspense } from "react";
import { DEF, calculate, compareModes } from "./lib/calc.js";
// Meta de la base arancelaria (archivo chico generado por el pipeline —
// NO importa la base completa al cliente, solo fecha/fuente)
import { TARIFF_META } from "./data/tariffMeta.js";

// Charts del admin en chunk aparte: los clientes no descargan recharts (~250 KB)
const AdminCharts = lazy(() => import("./AdminCharts.jsx"));

const ADMIN_PASS = "fvr2024";
const WA_NUM = "5493883372745";

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
    r.isAir
      ? ("Peso real: " + r.peso + " kg | Volumetrico: " + fmt(r.pVol) + " kg | Facturable: " + fmt(r.pFact) + " kg")
      : r.seaKg
        ? ("Peso real: " + r.peso + " kg")
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
    r.hasHandling ? ("Handling: " + USD(r.handling)) : "",
    "Envio nacional: " + USD(r.domestic),
    "Honorarios de Gestion: " + USD(r.fees),
    "",
    "================================",
    "Total envio (sin producto): *" + USD(r.totalLog) + "*",
    "*TOTAL GENERAL: " + USD(r.totalGen) + "*",
    r.unitario ? ("Precio unitario (" + r.cantidad + " u.): " + USD(r.unitario)) : "",
    rate ? ("En pesos: ARS " + fmt(r.totalGen * rate, 0) + " (dolar $" + fmt(rate) + ")") : "",
    d.files && d.files.length ? ("Archivos adjuntos: " + d.files.join(", ")) : "",
    "",
    "FVR Logistica Internacional",
    "Francisco Vega | +54 9 3883372745",
    "www.fvrlogistica.com.ar",
  ];
  return lines.filter(v => v !== undefined && v !== "").join("\n");
};

/* ── RESUMEN CORTO (para reenviar al cliente) ──────────────
   Texto comercial breve: total, modalidad y observación clave.
   Lo usa el botón "Copiar resumen" en resultados y en el modo interno. */
const buildShortSummary = (d, r, rate) => {
  const tipo = d.tipo === "avion"
    ? (d.subTipo === "personal" ? "Aéreo (envío personal)" : "Aéreo")
    : (d.seaMode === "kg" ? "Marítimo por kilo" : "Marítimo por m³");
  const lines = [
    `*Cotización de importación — FVR Logística*`,
    ``,
    `📦 ${d.producto || "Producto"}${d.paisOrigen ? ` (desde ${d.paisOrigen})` : ""}`,
    `🚚 Modalidad: ${tipo}`,
    r.byWeight ? `⚖️ Peso: ${fmt(r.isAir ? r.pFact : r.peso)} kg` : `📐 Volumen: ${fmt(r.m3Fact, 2)} m³`,
    ``,
    `💵 *Total general: ${USD(r.totalGen)}*`,
    rate ? `🇦🇷 En pesos: ARS ${fmt(r.totalGen * rate, 0)}` : null,
    r.unitario ? `🔢 Por unidad (${r.cantidad} u.): ${USD(r.unitario)}` : null,
    ``,
    `Incluye flete internacional, impuestos y gestión. Sujeto a validación final según documentación y clasificación arancelaria.`,
    `FVR Logística Internacional · +54 9 3883372745`,
  ];
  return lines.filter(v => v !== null && v !== undefined).join("\n");
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
  const navy = [11, 47, 82], accent = [24, 84, 138], sky = [242, 108, 30], gray = [100, 116, 139];

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0"), mm = String(now.getMonth() + 1).padStart(2, "0");
  const fechaStr = `${dd}/${mm}/${now.getFullYear()}`;
  const venc = new Date(now.getTime() + (+s.validezDias > 0 ? +s.validezDias : 7) * 86400000);
  const validez = `${String(venc.getDate()).padStart(2, "0")}/${String(venc.getMonth() + 1).padStart(2, "0")}/${venc.getFullYear()}`;
  const presNro = `FVR-${now.getFullYear()}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const tipo = d.tipo === "avion"
    ? (d.subTipo === "personal" ? "Avión · Envío Personal (Franquicia)" : "Avión · Envío Comercial")
    : (d.seaMode === "kg" ? "Barco · Por kilo" : "Barco · Por m³");

  // Logo (dataURL) — opcional, si falla se usa el texto "FVR"
  let logoData = null;
  try {
    logoData = await fetch("/logo-fvr.jpg").then(res => res.blob()).then(b => new Promise((ok, no) => {
      const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b);
    }));
  } catch {}
  // Dólar oficial: si no vino, lo busco al vuelo para mostrar el valor en ARS
  if (!dolar) {
    try {
      const dj = await fetch("https://criptoya.com/api/dolar").then(res => res.json());
      dolar = dj?.oficial?.ask ?? dj?.oficial?.price ?? null;
    } catch {}
  }

  // ── Banda superior ──
  doc.setFillColor(...navy); doc.rect(0, 0, W, 32, "F");
  doc.setFillColor(255, 255, 255); doc.roundedRect(M, 6, 20, 20, 2.5, 2.5, "F");
  if (logoData) {
    doc.addImage(logoData, "JPEG", M + 1, 7, 18, 18);
  } else {
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("FVR", M + 10, 18, { align: "center" });
  }
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("FVR Logística Internacional", M + 25, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
  doc.text("Calculadora de Importaciones · www.fvrlogistica.com.ar", M + 25, 21);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("PRESUPUESTO", W - M, 11, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
  doc.text(`N° ${presNro}`, W - M, 16, { align: "right" });
  doc.text(`Fecha: ${fechaStr}`, W - M, 20.5, { align: "right" });
  doc.text(`Válido hasta: ${validez}`, W - M, 25, { align: "right" });

  // ── Cliente ──
  let y = 41;
  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`Presupuesto para: ${(d.nombre || "").slice(0, 60)}`, M, y);
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
  if (r.isAir) {
    flete.push(["Peso real", `${r.peso} kg`], ["Peso volumétrico", `${fmt(r.pVol)} kg`],
      ["Peso facturable (el mayor)", `${fmt(r.pFact)} kg`],
      [`Tarifa aérea (USD ${r.airRate}/kg)`, USD(r.flete)]);
  } else if (r.seaKg) {
    flete.push(["Peso real", `${r.peso} kg`],
      [`Tarifa marítima (USD ${r.airRate}/kg)`, USD(r.flete)]);
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
  if (r.hasHandling) serv.push(["Handling", USD(r.handling)]);
  serv.push(["Envío nacional", USD(r.domestic)], ["Honorarios de Gestión", USD(r.fees)]);
  section("SERVICIOS LOGÍSTICOS", serv);

  // ── Caja total ──
  const boxY = cursorY + 1;
  const boxH = 27;
  doc.setFillColor(...navy); doc.roundedRect(M, boxY, W - 2 * M, boxH, 2, 2, "F");
  // Izquierda: total envío (USD + ARS)
  doc.setTextColor(170, 200, 235); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Total envío (sin producto)", M + 5, boxY + 7);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(USD(r.totalLog), M + 5, boxY + 13.5);
  if (dolar) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(170, 200, 235);
    doc.text(`ARS ${fmt(r.totalLog * dolar, 0)}`, M + 5, boxY + 19.5);
  }
  // Derecha: total general (USD grande + ARS destacado)
  doc.setTextColor(125, 211, 252); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("TOTAL GENERAL DE IMPORTACIÓN", W - M - 5, boxY + 7, { align: "right" });
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(USD(r.totalGen), W - M - 5, boxY + 14.5, { align: "right" });
  if (dolar) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(125, 211, 252);
    doc.text(`ARS ${fmt(r.totalGen * dolar, 0)}`, W - M - 5, boxY + 22, { align: "right" });
  }
  cursorY = boxY + boxH + 5;
  if (r.unitario) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...accent);
    doc.text(`Precio unitario (${r.cantidad} unidades): ${USD(r.unitario)}${dolar ? `  ·  ARS ${fmt(r.unitario * dolar, 0)}` : ""}`, M, cursorY);
    cursorY += 5;
  }
  if (dolar) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text(`Conversión al dólar oficial $${fmt(dolar)} del ${fechaStr} · sujeto a variación.`, M, cursorY);
    cursorY += 4;
  }

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
  doc.text("+54 9 3883372745   ·   francisco@fvrlogistica.com   ·   www.fvrlogistica.com.ar", M, cursorY + 4);
  doc.text(`Presupuesto válido hasta el ${validez}. Valores en USD con su equivalente en ARS al dólar oficial.`, M, cursorY + 8);

  const safeName = (d.nombre || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-") || "cliente";
  doc.save(`Presupuesto-FVR-${safeName}.pdf`);
};

/* ── STATUS ──────────────────────────────────────────────── */
const STATUS_MAP = {
  nuevo:       { label: "Nuevo",       bg: "#dbe8f6", fg: "#0f3d68" },
  en_analisis: { label: "En análisis", bg: "#fef3c7", fg: "#b45309" },
  respondido:  { label: "Respondido",  bg: "#dcfce7", fg: "#15803d" },
  cerrado:     { label: "Cerrado",     bg: "#eef2f7", fg: "#64748b" },
};
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.nuevo;
  return <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99, background:s.bg, color:s.fg, whiteSpace:"nowrap" }}>{s.label}</span>;
};

/* ── WA ICON ─────────────────────────────────────────────── */
const WAIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ fill: "currentColor", flexShrink: 0 }} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

/* ── FLOATING WA ─────────────────────────────────────────── */
const WAFloat = () => (
  <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noopener noreferrer"
    style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:"#25d366", borderRadius:"50%", width:56, height:56,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 4px 24px rgba(0,0,0,0.25)", textDecoration:"none", color:"white" }}>
    <WAIcon />
  </a>
);

/* ── HEADER (hero integrado — la calculadora ES la página principal) ── */
const Header = ({ onAdmin, dolar, dolarErr, dolarLoading, onRefreshDolar, compact }) => (
  <header style={{ background: "linear-gradient(150deg,#0b2f52 0%,#0f3d68 55%,#18548a 100%)", color:"white" }}>
    <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <img src="/logo-fvr.jpg" alt="FVR Logística Internacional" style={{ width:46, height:46, borderRadius:12, background:"white", padding:3, objectFit:"contain", boxShadow:"0 2px 12px rgba(0,0,0,0.3)" }} />
        <div>
          <div style={{ fontWeight:800, fontSize:15, letterSpacing:.2 }}>FVR Logística Internacional</div>
          <div style={{ color:"#b9cee2", fontSize:11 }}>Importaciones a Argentina · fvrlogistica.com.ar</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 12px", fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ color:"#b9cee2" }}>Dólar oficial:</span>
          <span style={{ fontWeight:700 }}>
            {dolarLoading ? "…" : dolarErr ? <span style={{color:"#fcd34d"}} title="Sin conexión con las fuentes de cotización — se usa la última conocida">{`$${fmt(dolar, 2)} ⚠`}</span> : `$${fmt(dolar, 2)}`}
          </span>
          <button onClick={onRefreshDolar} aria-label="Actualizar cotización del dólar" style={{ background:"none", border:"none", color:"#b9cee2", cursor:"pointer", fontSize:14 }}>↺</button>
        </div>
        <button onClick={onAdmin} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", color:"white", borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>
          Panel Admin
        </button>
      </div>
    </div>
    {!compact && (
      <div style={{ maxWidth:900, margin:"0 auto", padding:"18px 16px 34px", textAlign:"center" }}>
        <div style={{ display:"inline-block", background:"rgba(242,108,30,0.18)", border:"1px solid rgba(251,146,60,0.4)", borderRadius:99, padding:"4px 16px", marginBottom:14 }}>
          <span style={{ color:"#ffb27a", fontSize:11, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>Cotizador de importaciones</span>
        </div>
        <h1 style={{ fontSize:"clamp(26px, 5.5vw, 36px)", fontWeight:900, marginBottom:10, lineHeight:1.2 }}>
          Cotizá tu importación de <span style={{ color:"#ffb27a" }}>China</span> a Argentina
        </h1>
        <p style={{ color:"#dbe8f6", fontSize:15, maxWidth:560, margin:"0 auto", lineHeight:1.5 }}>
          Aéreo y marítimo, con impuestos, flete y logística calculados al instante. Tu cotización lista en PDF o WhatsApp.
        </p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap", marginTop:16 }}>
          {["✈️ Aéreo y marítimo", "🏛️ Impuestos incluidos", "📄 Subí tu factura y listo"].map(c => (
            <span key={c} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:99, padding:"5px 14px", fontSize:12, color:"#dbe8f6", fontWeight:600 }}>{c}</span>
          ))}
        </div>
      </div>
    )}
  </header>
);

/* ── UI PRIMITIVES ───────────────────────────────────────── */
const Card = ({ icon, title, bg, children }) => (
  <div style={{ background:"white", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", border:"1px solid #eef2f7", overflow:"hidden", marginBottom:16 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", borderBottom:"1px solid #eef2f7", background: bg || "#f8fafc" }}>
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

const inputStyle = { width:"100%", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 14px", fontSize:14, color:"#15233b", background:"#f8fafc", outline:"none", boxSizing:"border-box" };

const Inp = ({ type="text", placeholder, value, onChange, style={}, ...rest }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ ...inputStyle, ...style }} {...rest} />
);

/* ── TYPE / SUBTIPO SELECTORS ────────────────────────────── */
const TypeSel = ({ value, onChange }) => (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
    {[{ v:"avion", icon:"✈️", label:"Avión" }, { v:"barco", icon:"🚢", label:"Barco" }].map(({ v, icon, label }) => (
      <button key={v} onClick={() => onChange(v)} type="button"
        style={{ padding:"20px 12px", borderRadius:16, border:`2px solid ${value===v?"#18548a":"#e2e8f0"}`,
          background: value===v ? "#eef5fb" : "#f8fafc", cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap:6,
          boxShadow: value===v ? "0 2px 12px rgba(24,84,138,0.15)" : "none" }}>
        <span style={{ fontSize:36 }}>{icon}</span>
        <span style={{ fontWeight:700, fontSize:14, color: value===v ? "#0f3d68" : "#334155" }}>{label}</span>
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
          style={{ padding:"14px 12px", borderRadius:14, border:`2px solid ${value===v?"#18548a":"#e2e8f0"}`,
            background: value===v ? "#eef5fb" : "#f8fafc", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
            boxShadow: value===v ? "0 2px 10px rgba(24,84,138,0.12)" : "none" }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:13, color: value===v ? "#0f3d68" : "#334155" }}>{label}</span>
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
          style={{ padding:"14px 12px", borderRadius:14, border:`2px solid ${value===v?"#18548a":"#e2e8f0"}`,
            background: value===v ? "#eef5fb" : "#f8fafc", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
            boxShadow: value===v ? "0 2px 10px rgba(24,84,138,0.12)" : "none" }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:13, color: value===v ? "#0f3d68" : "#334155" }}>{label}</span>
        </button>
      ))}
    </div>
    {value === "kg" && (
      <div style={{ marginTop:10, background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:12, fontSize:12, color:"#0f3d68" }}>
        <strong>⚖️ Marítimo por kilo:</strong> se cobra por el <strong>peso real</strong> (no se usan medidas ni peso volumétrico).
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

/* ── MARCA FVR ───────────────────────────────────────────────
   Colores tomados del logo: naranja (carrito/tipografía), azul
   (globo/avión), verde (continentes). Se usan en el header integrado
   de la calculadora — que ES la página principal, sin landing previa. */
const BRAND = { orange: "#f26c1e", orangeSoft: "#fff2e9", blue: "#18548a", blueDark: "#0b2f52", green: "#16a34a" };

/* ── CALCULATOR FORM ─────────────────────────────────────── */
const CalculatorForm = ({ settings, onCalculate, onAdminClick, dolar, dolarErr, dolarLoading, onRefresh, onTrackStarted }) => {
  const [form, setForm] = useState({
    nombre:"", whatsapp:"", email:"", producto:"", hsCode:"", paisOrigen:"", origenSel:"", fob:"",
    categoria:"", manualDuty:"", dutyManual:false,
    tipo:"avion", subTipo:"comercial", seaMode:"m3", peso:"", largo:"", ancho:"", alto:"",
    m3manual:"", cantidad:"", bultos:"", files:[], aiDutyRate: null, aiSuggestion: "", aiTelemetry: null
  });
  const [errors, setErrors]       = useState({});
  const [fileNames, setFileNames] = useState([]);
  const [fileObjs, setFileObjs]   = useState([]);
  const [docX, setDocX]           = useState({}); // extracción IA: {loading|data|arancel|faltantes|error|applied}
  const [touched, setTouched]     = useState(false);
  const [aiLoading, setAiLoading] = useState(null); // null | "product" | "hs"
  const [aiResult, setAiResult]   = useState(null);
  const [altOpen, setAltOpen]     = useState(false); // "Ver alternativas" del clasificador
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
        aiTelemetry: f.aiTelemetry ? { ...f.aiTelemetry, corrected: true, correctedTo: `categoria:${label}` } : f.aiTelemetry,
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
      setForm(f => ({ ...f, manualDuty: v, dutyManual:true, aiDutyRate: +v, categoria:"", aiSuggestion: `Arancel ingresado manualmente: ${v}%`,
        // telemetría: el cliente pisó el resultado del clasificador con un % manual
        aiTelemetry: f.aiTelemetry ? { ...f.aiTelemetry, corrected: true, correctedTo: `manual:${v}%` } : f.aiTelemetry }));
    }
  };

  // El cliente eligió una de las alternativas sugeridas: se aplica ese código
  // (queda registrado en telemetría como corrección manual del resultado IA)
  const applyAlternative = (alt) => {
    setAiResult(r => ({ ...r, hsCode: alt.hsCode, dutyRate: alt.dutyRate, description: alt.description || r.description, officialDesc: alt.description, motivo: null, confidence: "media" }));
    setAltOpen(false);
    setForm(f => ({
      ...f, hsCode: alt.hsCode, aiDutyRate: alt.dutyRate, categoria: "", manualDuty: "", dutyManual: false,
      aiSuggestion: `${alt.description || alt.hsCode} — Derecho de importación: ${alt.dutyRate}% (alternativa elegida por el cliente)`,
      aiTelemetry: f.aiTelemetry ? { ...f.aiTelemetry, corrected: true, correctedTo: alt.hsCode } : f.aiTelemetry,
    }));
  };

  const handleAnalyzeProduct = async () => {
    if (!form.producto.trim() || aiLoading) return;
    setAiLoading("product");
    setAltOpen(false);
    try {
      const result = await analyzeProduct(form.producto);
      setAiResult(result);
      setForm(f => ({
        ...f,
        categoria: "", manualDuty: "", dutyManual: false,
        hsCode: result.hsCode || f.hsCode,
        aiDutyRate: result.dutyRate ?? null,
        aiSuggestion: `${result.description} — Derecho de importación: ${result.dutyRate}% (confianza: ${result.confidence})`,
        // Telemetría del clasificador (Fase 10): viaja con el lead, sin datos sensibles
        aiTelemetry: {
          query: f.producto.slice(0, 120), method: result.method || null, chosen: result.hsCode,
          confidence: result.confidence, precision: result.precision, source: (result.source || "").slice(0, 90),
          generic16: result.precision === "GENERIC_FALLBACK", alternativesShown: (result.alternatives || []).length,
          ts: Date.now(), corrected: false,
        },
      }));
    } catch (e) {
      setAiResult({ error: true });
    }
    setAiLoading(null);
  };

  const handleAnalyzeHsCode = async () => {
    if (!form.hsCode.trim() || aiLoading) return;
    setAiLoading("hs");
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
    setAiLoading(null);
  };

  const validate = () => {
    const e = {};
    // Nombre y WhatsApp son obligatorios ANTES de calcular (seguimiento comercial)
    if (!form.nombre.trim())  e.nombre  = "Ingresá tu nombre";
    if (!form.whatsapp.trim()) e.whatsapp = "Ingresá tu WhatsApp";
    else if (form.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = "Ingresá un número de WhatsApp válido";
    if (!form.producto.trim()) e.producto = "Requerido";
    if (!form.fob || +form.fob <= 0) e.fob = "Ingresá un valor mayor a 0";
    else if (+form.fob > 10000000) e.fob = "Valor demasiado alto — revisalo";
    if (!form.peso || +form.peso <= 0) e.peso = "Ingresá el peso total";
    if (form.tipo === "avion" && (!form.largo || !form.ancho || !form.alto)) e.medidas = "Ingresá largo, ancho y alto";
    if (form.tipo === "barco" && form.seaMode !== "kg" && (!form.m3manual || +form.m3manual <= 0)) e.m3manual = "Ingresá los metros cúbicos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFiles = (e) => {
    const arr = Array.from(e.target.files);
    setFileObjs(arr);
    const names = arr.map(f => f.name);
    setFileNames(names);
    setForm(f => ({ ...f, files: names }));
  };

  // ── Extracción automática de factura + packing list (IA) ────
  // MULTI-DOCUMENTO: cada archivo leído se FUSIONA con lo ya detectado
  // (la factura aporta producto/valores; el packing aporta pesos/medidas).
  // Nada se pierde al leer el segundo archivo.
  const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  const mergeExtract = (prev, nuevo) => {
    const out = { ...(prev || {}) };
    for (const [k, v] of Object.entries(nuevo || {})) {
      if (v !== null && v !== undefined && v !== "") out[k] = v; // el dato nuevo completa/actualiza
    }
    return out;
  };

  const faltantesDe = (x) => {
    const f = [];
    if (!x?.valorTotal && !x?.precioUnitario) f.push("valor FOB");
    if (!x?.pesoBrutoKg && !x?.pesoNetoKg) f.push("peso");
    if (!x?.cbmTotal && !(x?.largoCm && x?.anchoCm && x?.altoCm)) f.push("medidas o CBM");
    return f;
  };

  const extractDoc = async (file) => {
    if (docX.loading) return;
    if (!DOC_TYPES.includes(file.type)) { setDocX(p => ({ ...p, loading: null, error: "Para la lectura automática subí PDF, JPG o PNG. (Los demás formatos se adjuntan igual a la consulta.)" })); return; }
    if (file.size > 3 * 1024 * 1024) { setDocX(p => ({ ...p, loading: null, error: "Archivo muy grande para lectura automática (máx. 3 MB)." })); return; }
    setDocX(p => ({ ...p, loading: file.name, error: null, applied: false }));
    try {
      const dataBase64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(",")[1]);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const resp = await fetch("/api/document-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ mimeType: file.type, dataBase64, filename: file.name }),
      });
      const j = await resp.json();
      if (!resp.ok) { setDocX(p => ({ ...p, loading: null, error: j.error || "No se pudo leer el documento." })); return; }
      setDocX(p => {
        const merged = mergeExtract(p.data, j.extracted);
        return {
          ...p,
          loading: null,
          data: merged,
          arancel: j.arancel || p.arancel, // el arancel nuevo pisa; si este doc no trajo, se conserva el anterior
          faltantes: faltantesDe(merged),
          processed: [...(p.processed || []), file.name],
          docUrls: j.docUrl ? [...(p.docUrls || []), j.docUrl] : (p.docUrls || []),
          error: null,
        };
      });
    } catch {
      setDocX(p => ({ ...p, loading: null, error: "No se pudo procesar el documento. Cargá los datos manualmente." }));
    }
  };

  // Lee TODOS los archivos elegibles, uno tras otro, fusionando resultados
  const extractAll = async () => {
    for (const f of fileObjs) {
      if (DOC_TYPES.includes(f.type) && f.size <= 3 * 1024 * 1024) {
        await extractDoc(f);
        await new Promise(r => setTimeout(r, 150)); // respiro entre requests
      }
    }
  };

  // Aplica al formulario lo extraído (revisado/editado por el usuario)
  const applyExtracted = () => {
    const x = docX.data; if (!x) return;
    const fobVal = x.valorTotal ?? (x.precioUnitario && x.cantidad ? x.precioUnitario * x.cantidad : null);
    const origen = ["China", "Estados Unidos (USA)", "España"].find(o => (x.paisOrigen || "").toLowerCase().includes(o.split(" ")[0].toLowerCase()));
    setForm(f => ({
      ...f,
      producto: x.producto || f.producto,
      cantidad: x.cantidad ?? f.cantidad,
      fob: fobVal ?? f.fob,
      peso: x.pesoBrutoKg ?? x.pesoNetoKg ?? f.peso,
      bultos: x.bultos ?? f.bultos,
      largo: x.largoCm ?? f.largo, ancho: x.anchoCm ?? f.ancho, alto: x.altoCm ?? f.alto,
      m3manual: x.cbmTotal ?? f.m3manual,
      origenSel: origen || (x.paisOrigen ? "otro" : f.origenSel),
      paisOrigen: origen || x.paisOrigen || f.paisOrigen,
      hsCode: x.hsDeclaradoProveedor || f.hsCode,
      docUrls: docX.docUrls || f.docUrls || [],
      ...(docX.arancel && typeof docX.arancel.dutyRate === "number"
        ? { aiDutyRate: docX.arancel.dutyRate, categoria: "", manualDuty: "", dutyManual: false,
            aiSuggestion: `${docX.arancel.description} — Arancel ${docX.arancel.dutyRate}% (${docX.arancel.source})` }
        : {}),
    }));
    if (docX.arancel) setAiResult(docX.arancel);
    setDocX(p => ({ ...p, data: null, applied: true })); // conserva procesados y docUrls
  };

  const seaKg    = form.tipo === "barco" && form.seaMode === "kg";
  const byWeight = form.tipo === "avion" || seaKg;
  const seaM3    = form.tipo === "barco" && !seaKg;
  const pVol  = byWeight && form.largo && form.ancho && form.alto
    ? (+form.largo * +form.ancho * +form.alto) / 5000 : 0;
  const pFact = Math.max(pVol, +form.peso || 0);
  const m3p   = +form.m3manual || 0;
  const m3f   = Math.max(+settings.seaMin || 1, m3p);

  const rowS = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 };

  return (
    <div style={{ minHeight:"100vh", background:"#f4f7fb" }}>
      <Header onAdmin={onAdminClick} dolar={dolar} dolarErr={dolarErr} dolarLoading={dolarLoading} onRefreshDolar={onRefresh} />
      <main style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

        <Card icon="👤" title="1 · Tus datos" bg="#eef5fb">
          <div style={rowS}>
            <Field label="Nombre y apellido" required>
              <Inp placeholder="Tu nombre y apellido" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              {errors.nombre && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.nombre}</p>}
            </Field>
            <Field label="WhatsApp" required>
              <Inp placeholder="+54 9 ..." value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
              {errors.whatsapp && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.whatsapp}</p>}
            </Field>
          </div>
          <Field label="Email (opcional)">
            <Inp type="email" placeholder="tu@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>
        </Card>

        <Card icon="⚡" title="2 · La forma más rápida: subí tus documentos" bg="#fff2e9">
          <p style={{ fontSize:13, color:"#475569", marginBottom:12, lineHeight:1.5 }}>
            ¿Tenés la <strong>factura proforma</strong> o el <strong>packing list</strong> del proveedor?
            Subilos y <strong style={{ color:"#f26c1e" }}>completamos los datos por vos</strong> — sin tipear nada.
            Si no los tenés, cargá los datos a mano en el paso 3.
          </p>
          <label htmlFor="fvr-upload"
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:22,
              border:"2px dashed #f2741b", borderRadius:14, cursor:"pointer", background:"white",
              color:"#f26c1e", fontSize:13 }}>
            <span style={{ fontSize:32 }}>📂</span>
            <span style={{ fontWeight:800 }}>Tocá acá para subir factura y/o packing list</span>
            <span style={{ fontSize:11, color:"#94a3b8" }}>PDF · JPG · PNG — podés subir los dos juntos</span>
          </label>
          <input id="fvr-upload" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            style={{ display:"none" }} onChange={handleFiles} />
          {fileNames.length > 0 && (
            <div style={{ marginTop:10 }}>
              {fileObjs.map((f, i) => {
                const leido = (docX.processed || []).includes(f.name);
                const leyendo = docX.loading === f.name;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, fontSize:12, background: leido ? "#f0fdf4" : "#f8fafc", color: leido ? "#166534" : "#475569", padding:"7px 12px", borderRadius:10, marginBottom:5, border:`1px solid ${leido ? "#86efac" : "#e2e8f0"}`, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600 }}>{leido ? "✅" : "📄"} {f.name} {leido && <span style={{ fontSize:10, background:"#dcfce7", color:"#15803d", padding:"1px 8px", borderRadius:99, fontWeight:800 }}>LEÍDO</span>}</span>
                    <button onClick={() => extractDoc(f)} disabled={!!docX.loading}
                      style={{ padding:"5px 12px", borderRadius:8, border:"none", background: leyendo ? "#e2e8f0" : leido ? "#eef2f7" : "linear-gradient(135deg,#18548a,#1e6fb0)", color: leyendo ? "#94a3b8" : leido ? "#64748b" : "white", fontWeight:700, fontSize:11, cursor: docX.loading ? "wait" : "pointer" }}>
                      {leyendo ? "⏳ Leyendo…" : leido ? "↺ Releer" : "🤖 Leer datos"}
                    </button>
                  </div>
                );
              })}
              {fileObjs.filter(f => DOC_TYPES.includes(f.type)).length > 1 && (
                <button onClick={extractAll} disabled={!!docX.loading}
                  style={{ width:"100%", marginTop:6, padding:"12px 0", borderRadius:12, border:"none",
                    background: docX.loading ? "#e2e8f0" : "linear-gradient(135deg,#18548a,#1e6fb0)",
                    color: docX.loading ? "#94a3b8" : "white", fontWeight:800, fontSize:13, cursor: docX.loading ? "wait" : "pointer" }}>
                  {docX.loading ? `⏳ Leyendo ${docX.loading}…` : "🤖 Leer TODOS los documentos y completar datos"}
                </button>
              )}
            </div>
          )}

          {docX.error && (
            <div style={{ marginTop:10, background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:10, fontSize:12, color:"#991b1b" }}>{docX.error}</div>
          )}
          {docX.applied && (
            <div style={{ marginTop:10, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:10, fontSize:12, color:"#166534" }}>✅ Datos aplicados al formulario — revisalos antes de calcular.</div>
          )}

          {/* Tabla editable con lo detectado: NADA se aplica sin revisión del usuario */}
          {docX.data && (
            <div style={{ marginTop:12, background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:12 }}>
              <p style={{ fontWeight:800, fontSize:13, color:"#0f3d68", marginBottom:8 }}>🤖 Datos detectados — revisá y editá antes de aplicar</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:8 }}>
                {[["producto","Producto","text"],["cantidad","Cantidad","number"],["precioUnitario","Precio unit. USD","number"],["valorTotal","Valor total USD","number"],
                  ["pesoBrutoKg","Peso bruto kg","number"],["pesoNetoKg","Peso neto kg","number"],["bultos","Bultos","number"],
                  ["largoCm","Largo cm","number"],["anchoCm","Ancho cm","number"],["altoCm","Alto cm","number"],["cbmTotal","CBM total","number"],
                  ["paisOrigen","País origen","text"],["hsDeclaradoProveedor","HS declarado","text"],["proveedor","Proveedor","text"]].map(([k, label, t]) => (
                  <div key={k}>
                    <label style={{ fontSize:10, fontWeight:700, color:"#18548a", display:"block", marginBottom:2 }}>{label}</label>
                    <Inp type={t} value={docX.data[k] ?? ""} onChange={e => setDocX(p => ({ ...p, data: { ...p.data, [k]: e.target.value === "" ? null : (t === "number" ? +e.target.value : e.target.value) } }))}
                      style={{ padding:"7px 9px", fontSize:12 }} />
                  </div>
                ))}
              </div>
              {docX.data.hsDeclaradoProveedor && (
                <p style={{ fontSize:11, color:"#b45309", marginTop:8 }}>⚠ El HS Code lo declaró el <strong>proveedor</strong> — suele venir incorrecto; se valida contra la base arancelaria al aplicar.</p>
              )}
              {docX.arancel && (
                <p style={{ fontSize:11, color:"#0f3d68", marginTop:4 }}>📊 Arancel sugerido: <strong>{docX.arancel.dutyRate}%</strong> ({docX.arancel.source}){(docX.arancel.warnings || [])[0] ? ` — ${docX.arancel.warnings[0]}` : ""}</p>
              )}
              {docX.faltantes?.length > 0 && (
                <p style={{ fontSize:11, color:"#b45309", marginTop:4 }}>✍️ Faltan en el documento (cargalos a mano): {docX.faltantes.join(", ")}.</p>
              )}
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={applyExtracted}
                  style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#18548a,#1e6fb0)", color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                  ✓ Aplicar al formulario
                </button>
                <button onClick={() => setDocX({})}
                  style={{ padding:"11px 16px", borderRadius:10, border:"2px solid #e2e8f0", background:"white", color:"#64748b", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  Descartar
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card icon="📦" title="3 · Datos del producto">
          <Field label="Producto" required>
            <div style={{ display:"flex", gap:8 }}>
              <Inp placeholder="Descripción del producto" value={form.producto}
                onChange={e => set("producto", e.target.value)} style={{ flex:1 }} />
              <button onClick={handleAnalyzeProduct} disabled={aiLoading === "product" || !form.producto.trim()} aria-label="Analizar producto con IA"
                style={{ padding:"0 14px", borderRadius:10, border:"none", background: aiLoading === "product" ? "#e2e8f0" : "linear-gradient(135deg,#0f3d68,#18548a)",
                  color: aiLoading === "product" ? "#94a3b8" : "white", fontWeight:700, fontSize:12, cursor: aiLoading === "product" ? "wait" : "pointer", whiteSpace:"nowrap" }}>
                {aiLoading === "product" ? "⏳ Analizando…" : "🤖 Analizar IA"}
              </button>
            </div>
            {errors.producto && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.producto}</p>}
          </Field>

          <Field label="Categoría del producto" hint="Escribí tu producto y elegí la categoría de la lista. Si no está, usá '🤖 Analizar IA' o el HS Code. Arancel referencial (AEC extrazona); confirmá el exacto en VUCE o con tu despachante.">
            <div style={{ position:"relative" }}>
              <Inp placeholder="Buscá: zapatilla, celular, perfume, heladera…"
                value={catQuery}
                onChange={e => { const v = e.target.value; setCatQuery(v); setCatOpen(true); if (!v.trim() || (form.categoria && v !== form.categoria)) handleCategoria(""); }}
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
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", textAlign:"left", padding:"10px 14px", border:"none", borderBottom:"1px solid #eef2f7", background:"white", cursor:"pointer", fontSize:13, color:"#334155" }}>
                        <span>{c.label}</span>
                        <span style={{ fontWeight:700, color:"#0f3d68", fontSize:12, flexShrink:0, marginLeft:10 }}>{c.rate}%</span>
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
              <p style={{ fontWeight:700, color:"#166534", marginBottom:4 }}>✅ Clasificación arancelaria</p>
              <p style={{ color:"#15803d" }}>📋 {aiResult.description}</p>
              {aiResult.officialDesc && aiResult.officialDesc !== aiResult.description && (
                <p style={{ color:"#15803d", fontSize:11 }}>📖 Descripción oficial: {aiResult.officialDesc.length > 140 ? aiResult.officialDesc.slice(0, 140) + "…" : aiResult.officialDesc}</p>
              )}
              <p style={{ color:"#15803d" }}>🔢 NCM probable: <strong>{aiResult.hsCode}</strong>{aiResult.precisionLabel ? <span style={{ color:"#64748b" }}> · {aiResult.precisionLabel}</span> : null}</p>
              <p style={{ color:"#15803d" }}>📊 Derecho de importación: <strong>{aiResult.dutyRate}%</strong> — precisión: {aiResult.precision === "FAMILY_ESTIMATE" ? "estimación por categoría" : aiResult.precision === "GENERIC_FALLBACK" ? "genérica" : aiResult.confidence}</p>
              {aiResult.motivo && <p style={{ fontSize:11, color:"#64748b" }}>💬 {aiResult.motivo}</p>}
              <p style={{ fontSize:11, color:"#64748b", marginTop:4 }}>
                🏷️ {aiResult.dutyType === "DIE_EXTRAZONA" ? "Derecho EXTRAZONA (aplica a China/USA — no es el intrazona Mercosur)" : ""}
                {aiResult.source ? ` · Fuente: ${aiResult.source}` : ""} · Base arancelaria actualizada al {(aiResult.baseDate || aiResult.sourceDate || "").split("-").reverse().join("/")}
              </p>
              {(aiResult.alternatives || []).length > 0 && (
                <div style={{ marginTop:6 }}>
                  <button onClick={() => setAltOpen(o => !o)}
                    style={{ background:"none", border:"1px solid #86efac", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#166534", cursor:"pointer" }}>
                    {altOpen ? "▲ Ocultar alternativas" : `▼ Ver alternativas (${aiResult.alternatives.length})`}
                  </button>
                  {altOpen && aiResult.alternatives.map((alt, i) => (
                    <button key={i} onClick={() => applyAlternative(alt)}
                      style={{ display:"flex", justifyContent:"space-between", gap:8, width:"100%", textAlign:"left", marginTop:6, background:"white", border:"1px solid #dbe8f6", borderRadius:8, padding:"6px 10px", fontSize:11, cursor:"pointer", color:"#334155" }}>
                      <span><strong>{alt.hsCode}</strong> — {(alt.description || "").slice(0, 90)}</span>
                      <span style={{ fontWeight:800, color:"#0f3d68", flexShrink:0 }}>{alt.dutyRate}%</span>
                    </button>
                  ))}
                </div>
              )}
              {(aiResult.warnings || []).map((w, i) => (
                <p key={i} style={{ fontSize:11, color:"#b45309", marginTop:4 }}>⚠ {w}</p>
              ))}
              {!(aiResult.warnings || []).length && (
                <p style={{ color:"#4ade80", fontSize:11, marginTop:4 }}>⚠ Verificar con despachante de aduana antes de operar</p>
              )}
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
                <button onClick={handleAnalyzeHsCode} disabled={aiLoading === "hs" || !form.hsCode.trim()} title="Buscar arancel por HS Code" aria-label="Buscar arancel por HS Code"
                  style={{ padding:"0 10px", borderRadius:10, border:"none",
                    background: aiLoading === "hs" ? "#e2e8f0" : "linear-gradient(135deg,#18548a,#1e6fb0)",
                    color: aiLoading === "hs" ? "#94a3b8" : "white", fontWeight:700, fontSize:13,
                    cursor: aiLoading === "hs" ? "wait" : "pointer", whiteSpace:"nowrap" }}>
                  {aiLoading === "hs" ? "⏳" : "🔍"}
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

          <Field label="Cantidad de unidades" hint="Opcional — sirve para calcular el precio unitario final de cada producto.">
            <div style={{ position:"relative", maxWidth:220 }}>
              <Inp type="number" placeholder="Ej: 50" value={form.cantidad} onChange={e => set("cantidad", e.target.value)} min={1} style={{ paddingRight:36 }} />
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#94a3b8" }}>u.</span>
            </div>
          </Field>

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

        <Card icon="🌐" title="4 · Tipo de importación" bg="#eef5fb">
          <TypeSel value={form.tipo} onChange={v => set("tipo", v)} />
          {form.tipo === "avion" && <SubTipoSel value={form.subTipo} onChange={v => set("subTipo", v)} />}
          {form.tipo === "barco" && <SeaModeSel value={form.seaMode} onChange={v => set("seaMode", v)} />}
        </Card>

        <Card icon="📐" title="5 · Peso y medidas">
          {form.tipo === "avion" && (
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
          <div style={rowS}>
            <Field label="Peso real total (kg)" required>
              <div style={{ position:"relative" }}>
                <Inp type="number" placeholder="0.00" value={form.peso} onChange={e => set("peso", e.target.value)} style={{ paddingRight:36 }} />
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#94a3b8" }}>kg</span>
              </div>
              {errors.peso && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>{errors.peso}</p>}
            </Field>
            <Field label="Cantidad de bultos" hint="Opcional — mejora la estimación de volumen al comparar modalidades.">
              <Inp type="number" placeholder="Ej: 1" value={form.bultos} onChange={e => set("bultos", e.target.value)} min={1} />
            </Field>
          </div>

          {form.tipo === "avion" && form.largo && form.ancho && form.alto && form.peso && (
            <div style={{ background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#0f3d68", marginBottom:8 }}>Vista previa · Avión</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:12 }}>
                <div><p style={{ color:"#94a3b8" }}>Peso volumétrico</p><p style={{ fontWeight:700 }}>{fmt(pVol)} kg</p></div>
                <div><p style={{ color:"#94a3b8" }}>Peso real</p><p style={{ fontWeight:700 }}>{fmt(+form.peso)} kg</p></div>
                <div><p style={{ color:"#0f3d68" }}>Facturable</p><p style={{ fontWeight:700, color:"#0f3d68" }}>{fmt(pFact)} kg</p></div>
              </div>
            </div>
          )}
          {seaM3 && m3p > 0 && (
            <div style={{ background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#0f3d68", marginBottom:8 }}>Vista previa · Barco</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:12 }}>
                <div><p style={{ color:"#94a3b8" }}>Vol. ingresado</p><p style={{ fontWeight:700 }}>{fmt(m3p, 3)} m³</p></div>
                <div><p style={{ color:"#94a3b8" }}>Facturable</p><p style={{ fontWeight:700, color:"#0f3d68" }}>{fmt(m3f, 3)} m³</p></div>
                <div><p style={{ color:"#94a3b8" }}>Costo flete</p><p style={{ fontWeight:700, color:"#0f3d68" }}>{USD(m3f * (+settings.seaRate || 600))}</p></div>
              </div>
              {m3p < 1 && <p style={{ fontSize:11, color:"#d97706", marginTop:6 }}>⚠ Menos de 1 m³ — se cobra tarifa mínima de 1 m³</p>}
            </div>
          )}
        </Card>



        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:14, marginBottom:20, fontSize:12, color:"#92400e" }}>
          ⚠️ {settings.legal}
        </div>

        <button onClick={() => { if (validate()) onCalculate(form, calculate(form, settings)); }}
          style={{ width:"100%", padding:"17px 0", borderRadius:16, border:"none",
            background:"linear-gradient(135deg,#f26c1e 0%,#f2741b 55%,#fdb813 130%)", color:"white",
            fontSize:18, fontWeight:900, cursor:"pointer", boxShadow:"0 6px 24px rgba(242,108,30,0.4)" }}>
          Calcular mi importación →
        </button>
        <p style={{ textAlign:"center", fontSize:12, color:"#94a3b8", marginTop:12 }}>Cotización al instante · Valores en USD y pesos argentinos</p>
      </main>

      <footer style={{ textAlign:"center", padding:"28px 16px 96px", fontSize:12, color:"#94a3b8", borderTop:"1px solid #e2e8f0", marginTop:16, background:"white" }}>
        <img src="/logo-fvr.jpg" alt="" style={{ width:44, height:44, borderRadius:10, objectFit:"contain", marginBottom:8 }} />
        <p style={{ fontWeight:800, color:"#0b2f52", marginBottom:4 }}>FVR Logística Internacional</p>
        <p>Francisco Vega · francisco@fvrlogistica.com · +54 9 3883372745</p>
        <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:8 }}>
          <a href="https://www.fvrlogistica.com.ar" target="_blank" rel="noreferrer" style={{ color:"#18548a" }}>🌐 fvrlogistica.com.ar</a>
          <a href="https://linktr.ee/FVRcomex" target="_blank" rel="noreferrer" style={{ color:"#18548a" }}>🔗 Linktree</a>
        </div>
        {TARIFF_META.baseDate && (
          <p style={{ fontSize:11, color:"#b0bccb", marginTop:10 }}>
            Base arancelaria oficial (ARCA) actualizada al {TARIFF_META.baseDate.split("-").reverse().join("/")}
          </p>
        )}
      </footer>
      <WAFloat />
    </div>
  );
};

/* ── ROW ─────────────────────────────────────────────────── */
const Row = ({ label, usd, dolar, hi, na, note }) => (
  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
    padding:"10px 16px", borderBottom:"1px solid #eef2f7",
    background: hi ? "#eef5fb" : "transparent" }}>
    <div>
      <span style={{ fontSize:13, fontWeight: hi ? 700 : 400, color: hi ? "#0f3d68" : "#334155" }}>{label}</span>
      {note && <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{note}</p>}
    </div>
    {na
      ? <span style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic", flexShrink:0, marginLeft:12 }}>No aplica</span>
      : <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
          <div style={{ fontSize:13, fontWeight:600, color: hi ? "#0f3d68" : "#15233b" }}>{USD(usd)}</div>
          {dolar && <div style={{ fontSize:11, color:"#94a3b8" }}>{ARS(usd, dolar)}</div>}
        </div>
    }
  </div>
);

/* ── RESULTS VIEW ────────────────────────────────────────── */
const ResultsView = ({ formData: d0, results: r0, dolar, settings: s, onBack, onWhatsApp }) => {
  // ── Modalidades conmutables (igual que la calculadora interna) ──
  // Con los mismos datos el cliente alterna entre aéreo comercial, marítimo
  // por kilo y marítimo por m³ — este último solo si hay volumen calculable
  // (m³ manual o medidas L×A×H, multiplicado por bultos). Envío personal
  // queda aparte (otra lógica, sin comparador).
  const esPersonal = d0.tipo === "avion" && d0.subTipo === "personal";
  const bultos = +d0.bultos > 0 ? +d0.bultos : 1;
  const m3Est = +d0.m3manual > 0
    ? +d0.m3manual
    : (+d0.largo > 0 && +d0.ancho > 0 && +d0.alto > 0)
      ? (+d0.largo * +d0.ancho * +d0.alto * bultos) / 1000000
      : 0;
  const baseKey = d0.tipo === "avion" ? "air" : (d0.seaMode === "kg" ? "seaKg" : "seaM3");
  const MODES = esPersonal ? [] : [
    +d0.peso > 0 && { key: "air",   label: "✈️ Aéreo comercial",  pdf: "aéreo",        d: { ...d0, tipo: "avion", subTipo: "comercial" } },
    +d0.peso > 0 && { key: "seaKg", label: "🚢 Marítimo por kilo", pdf: "marítimo kg",  d: { ...d0, tipo: "barco", seaMode: "kg" } },
    m3Est > 0    && { key: "seaM3", label: "🚢 Marítimo por m³",   pdf: "marítimo m³",  d: { ...d0, tipo: "barco", seaMode: "m3", m3manual: m3Est } },
  ].filter(Boolean).map(m => ({ ...m, r: m.key === baseKey ? r0 : calculate(m.d, s) }));

  const [modeKey, setModeKey] = useState(baseKey);
  const active = MODES.find(m => m.key === modeKey)
    || { key: baseKey, d: d0, r: r0, pdf: esPersonal ? "personal" : (d0.tipo === "avion" ? "aéreo" : (d0.seaMode === "kg" ? "marítimo kg" : "marítimo m³")) };
  const d = active.d, r = active.r;
  const hayComparador = MODES.length > 1;
  const sinMedidas = modeKey === "air" && !(+d0.largo > 0 && +d0.ancho > 0 && +d0.alto > 0);

  const tipoLabel = d.tipo === "avion"
    ? (d.subTipo === "personal" ? "Aéreo · Envío Personal (Franquicia)" : "Aéreo Comercial")
    : (d.seaMode === "kg" ? "Marítimo por kilo" : "Marítimo por m³");

  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const doPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await generatePDF(d, r, dolar, s); // PDF de la modalidad ACTIVA (permite bajar ambas alternando)
    } catch (e) {
      alert("No se pudo generar el PDF. Probá de nuevo en un momento.");
    }
    setPdfLoading(false);
  };

  const copyResumen = async () => {
    try {
      await navigator.clipboard.writeText(buildShortSummary(d, r, dolar));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { alert("No se pudo copiar — seleccioná y copiá el texto manualmente."); }
  };

  const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div style={{ minHeight:"100vh", background:"#f4f7fb" }}>
      <Header onAdmin={() => {}} dolar={dolar} dolarErr={false} dolarLoading={false} onRefreshDolar={() => {}} />
      {/* paddingBottom extra: que el botón flotante de WhatsApp no tape los botones de acción en mobile */}
      <main style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px 96px" }}>

        {/* Selector de modalidad: las 3 opciones con los mismos datos (como la interna) */}
        {hayComparador && (
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${MODES.length}, 1fr)`, gap:8, marginBottom:14 }}>
            {MODES.map(m => { const on = modeKey === m.key; return (
              <button key={m.key} onClick={() => setModeKey(m.key)}
                style={{ padding:"12px 6px", borderRadius:14, cursor:"pointer",
                  border:`2px solid ${on ? "#f26c1e" : "#e2e8f0"}`,
                  background: on ? "#fff2e9" : "white",
                  boxShadow: on ? "0 2px 12px rgba(242,108,30,0.15)" : "none" }}>
                <p style={{ fontWeight:800, fontSize:12, color: on ? "#d9590f" : "#64748b" }}>{m.label}</p>
                <p style={{ fontWeight:900, fontSize:15, color: on ? "#15233b" : "#94a3b8" }}>{USD(m.r.totalGen)}</p>
              </button>
            ); })}
          </div>
        )}
        {sinMedidas && baseKey !== "air" && (
          <p style={{ fontSize:11, color:"#b45309", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"8px 12px", marginBottom:14 }}>
            ℹ️ Para el cálculo aéreo no se cargaron medidas: no se consideró el peso volumétrico. Agregalas en el formulario si el paquete es voluminoso.
          </p>
        )}

        {/* Card principal — Tu cotización de importación */}
        <div style={{ background:"linear-gradient(135deg,#0b2f52 0%,#18548a 100%)", borderRadius:20, padding:20, marginBottom:20, color:"white", boxShadow:"0 4px 24px rgba(11,47,82,0.35)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div>
              <p style={{ fontSize:11, color:"#b9cee2", textTransform:"uppercase", letterSpacing:2, marginBottom:4 }}>Tu cotización de importación</p>
              <h2 style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>{d.nombre}</h2>
              <p style={{ fontSize:13, color:"#b9cee2" }}>{d.producto} · <strong style={{ color:"#ffb27a" }}>{tipoLabel}</strong></p>
              {dolar && <p style={{ fontSize:11, color:"#b9cee2", marginTop:4 }}>Dólar oficial usado: ${fmt(dolar)}</p>}
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"#b9cee2" }}>Total general</p>
              <p style={{ fontSize:28, fontWeight:900 }}>{USD(r.totalGen)}</p>
              {dolar && <p style={{ fontSize:14, color:"#dbe8f6", fontWeight:700 }}>{ARS(r.totalGen, dolar)}</p>}
              {r.unitario && <p style={{ fontSize:12, color:"#b9cee2", marginTop:2 }}>{USD(r.unitario)} por unidad ({r.cantidad} u.)</p>}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:14 }}>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#b9cee2" }}>FOB / Valor prod.</p>
              <p style={{ fontWeight:700, fontSize:14 }}>{USD(r.fob)}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#b9cee2" }}>Envío total</p>
              <p style={{ fontWeight:700, fontSize:14 }}>{USD(r.totalLog)}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#b9cee2" }}>{r.isAir ? "Kg facturable" : (r.seaKg ? "Peso (kg)" : "M³ facturable")}</p>
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
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #eef2f7", fontSize:13, background: r.seaKg ? "#eef5fb" : "transparent" }}>
              <span style={{ color: r.seaKg ? "#0f3d68" : "#334155", fontWeight: r.seaKg ? 700 : 400 }}>{r.seaKg ? "Peso real" : "Peso real total"}</span><span style={{ fontWeight: r.seaKg ? 700 : 600, color: r.seaKg ? "#0f3d68" : "#15233b" }}>{fmt(r.peso)} kg</span>
            </div>
            {r.isAir && (<>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #eef2f7", fontSize:13 }}>
                <span style={{ color:"#334155" }}>Peso volumétrico (L×A×H / 5.000)</span><span style={{ fontWeight:600 }}>{fmt(r.pVol)} kg</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #eef2f7", fontSize:13, background:"#eef5fb" }}>
                <span style={{ fontWeight:700, color:"#0f3d68" }}>Peso facturable (el mayor)</span><span style={{ fontWeight:700, color:"#0f3d68" }}>{fmt(r.pFact)} kg</span>
              </div>
            </>)}
            <Row label={`${r.seaKg ? "Tarifa marítima" : "Tarifa aérea"} (USD ${r.airRate}/kg)`} usd={r.flete} dolar={dolar} />
          </>) : (<>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #eef2f7", fontSize:13 }}>
              <span style={{ color:"#334155" }}>Volumen ingresado</span><span style={{ fontWeight:600 }}>{fmt(r.m3, 3)} m³</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #eef2f7", fontSize:13, background:"#eef5fb" }}>
              <span style={{ fontWeight:700, color:"#0f3d68" }}>Volumen facturable (mín. {s.seaMin} m³)</span><span style={{ fontWeight:700, color:"#0f3d68" }}>{fmt(r.m3Fact, 3)} m³</span>
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
          {r.hasHandling && <Row label="Handling" usd={r.handling} dolar={dolar}
            note={r.handling === 0 ? `No aplica: el peso supera el umbral de ${(d.tipo === "avion" ? s.handlingMaxKg : s.handlingMaxKgSea) ?? 3} kg` : undefined} />}
          <Row label="Envío nacional" usd={r.domestic} dolar={dolar} />
          <Row label="Honorarios de Gestión" usd={r.fees} dolar={dolar} hi />
        </Card>

        {/* Resumen final — presupuesto FVR con desglose explicado */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", border:"1px solid #e6ebf2", boxShadow:"0 8px 30px -12px rgba(22,36,58,0.25)", marginBottom:20 }}>
          {/* Banda de marca */}
          <div style={{ background:"linear-gradient(135deg,#0b2f52,#0f3d68 60%,#18548a)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#f26c1e,#fdb813)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"white", fontSize:11, flexShrink:0 }}>FVR</div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:"white" }}>Resumen de tu cotización</p>
                <p style={{ fontSize:11, color:"#b9cee2" }}>{d.producto} · {tipoLabel}</p>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"#b9cee2" }}>{hoy}</p>
              <p style={{ fontSize:11, color:"#ffb27a", fontWeight:700 }}>Validez: {s.validezDias || 7} días</p>
            </div>
          </div>

          {/* Desglose con explicación de cada concepto */}
          <div style={{ padding:"8px 20px" }}>
            {[
              ["📦", "Valor de tu mercadería", "FOB declarado según factura del proveedor", r.fob],
              [r.isAir ? "✈️" : "🚢", "Transporte internacional", "Flete y seguro desde origen hasta Argentina", r.flete + r.seguro],
              ["🏛️", "Impuestos y tributos", r.internalTaxes ? "Derechos, tasa estadística, IVA e impuestos internos" : (r.isPersonal ? "Derechos de importación e IVA (régimen personal)" : "Derechos de importación, tasa estadística e IVA"), r.duty + r.stat + r.iva + r.addVat + r.gains + r.ib],
              ["🚚", "Logística puerta a puerta", "Retiro en origen, handling y envío nacional", r.pickup + r.handling + r.domestic],
              ["🤝", "Gestión FVR", "Seguimiento y coordinación integral de tu importación", r.fees],
            ].map(([icon, label, desc, val]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"1px solid #eef2f7" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"#eef5fb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#15233b" }}>{label}</p>
                  <p style={{ fontSize:11, color:"#6b7a90" }}>{desc}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:800, color:"#0f3d68" }}>{USD(val)}</p>
                  {dolar && <p style={{ fontSize:10.5, color:"#94a3b8" }}>{ARS(val, dolar)}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal del servicio */}
          <div style={{ background:"#f4f7fb", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#475569" }}>Costo del servicio completo (sin tu mercadería)</p>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:16, fontWeight:800, color:"#15233b" }}>{USD(r.totalLog)}</p>
              {dolar && <p style={{ fontSize:11, color:"#6b7a90" }}>{ARS(r.totalLog, dolar)}</p>}
            </div>
          </div>

          {/* Total en gradiente firma FVR */}
          <div style={{ background:"linear-gradient(135deg,#f26c1e 0%,#f2741b 55%,#fdb813 130%)", padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.9)", fontWeight:800, letterSpacing:1.5, marginBottom:2 }}>TOTAL FINAL DE TU IMPORTACIÓN</p>
              <p style={{ fontSize:30, fontWeight:900, color:"white", lineHeight:1.1 }}>{USD(r.totalGen)}</p>
              {r.unitario && <p style={{ fontSize:12, color:"rgba(255,255,255,0.92)", marginTop:3, fontWeight:600 }}>{USD(r.unitario)} por unidad ({r.cantidad} u.)</p>}
            </div>
            {dolar && <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.9)" }}>En pesos, al dólar oficial ${fmt(dolar)}</p>
              <p style={{ fontSize:19, fontWeight:800, color:"white" }}>{ARS(r.totalGen, dolar)}</p>
            </div>}
          </div>

          <p style={{ padding:"10px 20px", fontSize:11, color:"#6b7a90", textAlign:"center" }}>
            Incluye impuestos, transporte internacional y la gestión integral de <strong style={{ color:"#0f3d68" }}>FVR Logística Internacional</strong>.
          </p>
        </div>

        {/* Aclaración única y discreta (sin repetir "estimado" por todos lados) */}
        <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", margin:"0 4px 20px", lineHeight:1.5 }}>
          Valores sujetos a validación final según documentación, clasificación arancelaria, peso/volumen real y tipo de cambio vigente.
        </p>

        {/* ACCIONES — Cotización lista para compartir */}
        <div style={{ marginBottom:32 }}>
          <button onClick={() => onWhatsApp(d, r)}
            style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none",
              background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white",
              fontSize:17, fontWeight:900, cursor:"pointer", marginBottom:12,
              display:"flex", alignItems:"center", justifyContent:"center", gap:12,
              boxShadow:"0 4px 20px rgba(22,163,74,0.35)" }}>
            <WAIcon size={24} />
            Enviar presupuesto por WhatsApp
          </button>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12 }}>
            <button onClick={doPDF} disabled={pdfLoading}
              style={{ padding:"14px 0", borderRadius:14, border:"2px solid #b9cee2",
                background: pdfLoading ? "#eef2f7" : "white", color:"#0f3d68", fontSize:14, fontWeight:700,
                cursor: pdfLoading ? "wait" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {pdfLoading ? "⏳ Generando…" : `📄 PDF ${active.pdf}`}
            </button>
            <button onClick={copyResumen}
              style={{ padding:"14px 0", borderRadius:14, border:"2px solid #ffb27a",
                background: copied ? "#f0fdf4" : "white", color: copied ? "#15803d" : "#f26c1e", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              {copied ? "✓ Copiado" : "📋 Copiar resumen"}
            </button>
            <button onClick={onBack}
              style={{ padding:"14px 0", borderRadius:14, border:"2px solid #e2e8f0",
                background:"white", color:"#475569", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              ← Nueva consulta
            </button>
          </div>
          {hayComparador && (
            <p style={{ textAlign:"center", fontSize:11, color:"#94a3b8", marginTop:8 }}>
              💡 Cambiá de modalidad arriba y descargá el PDF de cada una — sin volver a cargar los datos.
            </p>
          )}
        </div>
      </main>
      <WAFloat />
    </div>
  );
};

/* ── ADMIN LOGIN ─────────────────────────────────────────── */
const AdminLogin = ({ onLogin, onBack, titulo = "Panel Administrador" }) => {
  const [pass, setPass] = useState(""); const [err, setErr] = useState(false);
  const go = () => {
    if (pass === ADMIN_PASS) {
      setErr(false);
      try { sessionStorage.setItem("fvr_admin_key", pass); } catch {} // clave para leer los leads del backend
      onLogin();
    } else setErr(true);
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f4f7fb" }}>
      <div style={{ background:"white", borderRadius:20, boxShadow:"0 4px 32px rgba(0,0,0,0.12)", padding:36, width:"100%", maxWidth:360 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#0f3d68,#18548a)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"white", fontSize:18, margin:"0 auto 12px" }}>FVR</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#15233b" }}>{titulo}</h2>
          <p style={{ fontSize:13, color:"#64748b" }}>FVR Logística Internacional</p>
        </div>
        <Field label="Contraseña">
          <Inp type="password" placeholder="Ingresá la contraseña" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
        </Field>
        {err && <p style={{ color:"#ef4444", textAlign:"center", marginBottom:12, fontSize:13 }}>Contraseña incorrecta</p>}
        <button onClick={go} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:"linear-gradient(135deg,#0f3d68,#18548a)", color:"white", fontWeight:700, fontSize:15, cursor:"pointer" }}>Ingresar</button>
        <button onClick={onBack} style={{ width:"100%", marginTop:12, background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer" }}>← Volver a la calculadora</button>
      </div>
    </div>
  );
};

/* ── QUOTE CARD ──────────────────────────────────────────── */
const QuoteCard = ({ q, dolar, onStatusChange }) => {
  const [open, setOpen] = useState(false); const r = q.results;
  return (
    <div style={{ background:"white", borderRadius:16, border:"1px solid #eef2f7", overflow:"hidden", marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:16, cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>{q.importType === "avion" ? "✈️" : "🚢"}</span>
          <div>
            <p style={{ fontWeight:700, fontSize:14, color:"#15233b" }}>{q.client}</p>
            <p style={{ fontSize:12, color:"#64748b" }}>{q.product} · {new Date(q.date).toLocaleDateString("es-AR")}</p>
            {q.formData?.subTipo === "personal" && <span style={{ fontSize:11, background:"#fef3c7", color:"#92400e", padding:"2px 8px", borderRadius:99, fontWeight:700 }}>Envío personal</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#0f3d68" }}>{USD(r?.totalGen)}</p>
            {dolar && <p style={{ fontSize:11, color:"#94a3b8" }}>{ARS(r?.totalGen || 0, dolar)}</p>}
          </div>
          <Badge status={q.status} />
          <span style={{ color:"#94a3b8", fontSize:13 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop:"1px solid #eef2f7", padding:16 }}>
          {/* Datos del cliente */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14, fontSize:13 }}>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>WhatsApp</p>
              <a href={`https://wa.me/${(q.whatsapp||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ fontWeight:700, color:"#16a34a" }}>{q.whatsapp}</a>
            </div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>Email</p><p style={{ fontWeight:700 }}>{q.email || "—"}</p></div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>HS Code</p><p style={{ fontWeight:700 }}>{q.hsCode || "—"}</p></div>
            <div><p style={{ fontSize:11, color:"#94a3b8" }}>País de origen</p><p style={{ fontWeight:700 }}>{q.formData?.paisOrigen || "—"}</p></div>
            <div style={{ gridColumn:"1/-1" }}>
              <p style={{ fontSize:11, color:"#94a3b8" }}>Documentos</p>
              {q.formData?.docUrls?.length
                ? q.formData.docUrls.map((u, i) => (
                    <a key={i} href={`/api/doc?u=${encodeURIComponent(u)}&k=${encodeURIComponent(sessionStorage.getItem("fvr_admin_key") || "")}`}
                      target="_blank" rel="noreferrer"
                      style={{ display:"inline-block", fontSize:12, color:"#0f3d68", fontWeight:700, marginRight:12 }}>
                      📎 {q.formData?.files?.[i] || `Documento ${i + 1}`}
                    </a>
                  ))
                : <p style={{ fontSize:12 }}>{q.formData?.files?.length ? q.formData.files.join(", ") + " (no guardados)" : "Ninguno"}</p>}
            </div>
          </div>

          {/* Detalle de la cotización */}
          {r && (
            <div style={{ background:"#f8fafc", borderRadius:12, padding:12, marginBottom:14, border:"1px solid #e2e8f0" }}>
              <p style={{ fontWeight:700, color:"#334155", marginBottom:10, fontSize:11, textTransform:"uppercase", letterSpacing:.5 }}>Detalle de la cotización</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"4px 12px", fontSize:12 }}>
                <span style={{ color:"#64748b" }}>FOB / Valor productos</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.fob)}</span>
                <span style={{ color:"#64748b" }}>Flete internacional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.flete)}</span>
                <span style={{ color:"#64748b" }}>Seguro</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.seguro)}</span>
                <span style={{ color:"#0f3d68", fontWeight:700 }}>CIF / Valor en aduana</span><span style={{ fontWeight:700, color:"#0f3d68", textAlign:"right" }}>{USD(r.cif)}</span>
                <span style={{ color:"#64748b" }}>Derecho importación</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.duty)}</span>
                {!r.isPersonal && <><span style={{ color:"#64748b" }}>Tasa estadística</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.stat)}</span></>}
                <span style={{ color:"#64748b" }}>IVA</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.iva)}</span>
                {(r.internalTaxes ?? !r.isAir) && !r.isPersonal && <>
                  <span style={{ color:"#64748b" }}>IVA adicional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.addVat)}</span>
                  <span style={{ color:"#64748b" }}>Ganancias</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.gains)}</span>
                  <span style={{ color:"#64748b" }}>Ingresos Brutos</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.ib)}</span>
                </>}
                <span style={{ color:"#64748b" }}>Pick up</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.pickup)}</span>
                {(r.hasHandling ?? r.isAir) && <><span style={{ color:"#64748b" }}>Handling</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.handling)}</span></>}
                <span style={{ color:"#64748b" }}>Envío nacional</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.domestic)}</span>
                <span style={{ color:"#64748b" }}>Honorarios de Gestión</span><span style={{ fontWeight:700, textAlign:"right" }}>{USD(r.fees)}</span>
                <span style={{ color:"#475569", fontWeight:700, borderTop:"1px solid #e2e8f0", paddingTop:6, marginTop:2 }}>Total envío</span><span style={{ fontWeight:700, color:"#0f3d68", textAlign:"right", borderTop:"1px solid #e2e8f0", paddingTop:6, marginTop:2 }}>{USD(r.totalLog)}</span>
                <span style={{ color:"#0b2f52", fontWeight:900, fontSize:13 }}>TOTAL GENERAL</span><span style={{ fontWeight:900, color:"#0b2f52", textAlign:"right", fontSize:13 }}>{USD(r.totalGen)}</span>
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
                style={{ fontSize:12, padding:"4px 10px", borderRadius:99, border:`2px solid ${q.status===k?"#18548a":"#e2e8f0"}`,
                  background: q.status===k ? "#eef5fb" : "white", color: q.status===k ? "#0f3d68" : "#64748b",
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
// SettingField/SettingToggle viven FUERA de AdminPanel a propósito: si se
// definen dentro del render, React los ve como un tipo nuevo en cada tecla
// y desmonta/remonta el input → el campo pierde el foco al tipear.
const SettingField = ({ s, setS, label, k, min, max, step = "0.01" }) => (
  <Field label={label}>
    <Inp type="number" min={min} max={max} step={step} value={s[k]} onChange={e => setS(p => ({ ...p, [k]: +e.target.value }))} />
  </Field>
);
const SettingToggle = ({ s, setS, label, k }) => (
  <label style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", cursor:"pointer" }}>
    <span style={{ fontSize:13, color:"#334155" }}>{label}</span>
    <button onClick={() => setS(p => ({ ...p, [k]: !p[k] }))}
      style={{ width:44, height:24, borderRadius:99, background: s[k] ? "#18548a" : "#cbd5e1", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
      <span style={{ position:"absolute", top:2, width:20, height:20, background:"white", borderRadius:"50%", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s", left: s[k] ? 22 : 2 }} />
    </button>
  </label>
);

const AdminPanel = ({ settings, saveSettings, quotes, updateQuoteStatus, metrics, dolar, fetchDolar, onLogout }) => {
  const [tab, setTab]   = useState("dashboard");
  const [s, setS]       = useState({ ...DEF, ...settings });
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState({ status:"", tipo:"", q:"" });

  // Al guardar, refrescar el dólar por si cambió la carga manual (el Header lo muestra en vivo)
  const save = () => { saveSettings(s); fetchDolar(); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const fq = quotes.filter(q => {
    if (filter.status && q.status !== filter.status) return false;
    if (filter.tipo && q.importType !== filter.tipo) return false;
    if (filter.q && !q.client?.toLowerCase().includes(filter.q.toLowerCase()) && !q.product?.toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    // Celda CSV segura: escapa comillas/comas/saltos y neutraliza fórmulas (=,+,-,@)
    // para que Excel no ejecute contenido ingresado por clientes (CSV injection).
    const cell = (v) => {
      let x = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
      return /[",;\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    const H = ["Fecha","Cliente","WhatsApp","Email","Producto","HS Code","Tipo","SubTipo","FOB","Total Envío","Total General","Estado"];
    const R = quotes.map(q => [new Date(q.date).toISOString().slice(0,10),q.client,q.whatsapp,q.email,q.product,q.hsCode,q.importType,q.formData?.subTipo||"—",q.results?.fob,q.results?.totalLog,q.results?.totalGen,q.status]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+[H,...R].map(r=>r.map(cell).join(",")).join("\n")],{type:"text/csv;charset=utf-8;"}));
    a.download = "fvr_presupuestos.csv"; a.click();
  };

  const last7 = Array.from({length:7},(_,i)=>{ const dt=new Date(); dt.setDate(dt.getDate()-(6-i)); const ds=dt.toLocaleDateString("es-AR"); return {day:dt.toLocaleDateString("es-AR",{weekday:"short"}),count:quotes.filter(q=>new Date(q.date).toLocaleDateString("es-AR")===ds).length}; });
  const sdData = Object.entries(quotes.reduce((a,q)=>{a[q.status||"nuevo"]=(a[q.status||"nuevo"]||0)+1;return a;},{})).map(([n,v])=>({name:STATUS_MAP[n]?.label||n,value:v}));

  const navStyle = (id) => ({
    display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:12,
    border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
    background: tab===id ? "#18548a" : "transparent",
    color: tab===id ? "white" : "#475569",
    boxShadow: tab===id ? "0 2px 8px rgba(24,84,138,0.3)" : "none",
  });

  return (
    <div style={{ minHeight:"100vh", background:"#f4f7fb" }}>
      <div style={{ background:"linear-gradient(135deg,#0b2f52,#0f3d68)", color:"white", padding:"14px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#b9cee2,#18548a)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0b2f52", fontSize:12 }}>FVR</div>
            <div><p style={{ fontWeight:700, fontSize:14 }}>Panel Administrador</p><p style={{ fontSize:11, color:"#b9cee2" }}>FVR Logística Internacional</p></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:"#b9cee2" }}>
            <span>Dólar: ${fmt(dolar)}</span>
            <button onClick={fetchDolar} aria-label="Actualizar cotización del dólar" style={{ background:"none", border:"none", color:"#b9cee2", cursor:"pointer", fontSize:16 }}>↺</button>
            <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"white", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:12 }}>Cerrar sesión</button>
          </div>
        </div>
      </div>
      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"8px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", gap:8, overflowX:"auto" }}>
          <button style={navStyle("dashboard")} onClick={() => setTab("dashboard")}>📊 Dashboard</button>
          <button style={navStyle("quotes")} onClick={() => setTab("quotes")}>📋 Presupuestos ({quotes.length})</button>
          <button style={navStyle("interna")} onClick={() => setTab("interna")}>🧮 Calculadora interna</button>
          <button style={navStyle("settings")} onClick={() => setTab("settings")}>⚙️ Configuración</button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:24 }}>

        {tab === "dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:16, marginBottom:24 }}>
              {[{l:"Visitas",v:metrics.visits,i:"👁️"},{l:"Empezaron",v:metrics.started,i:"📝"},{l:"Presupuestos",v:metrics.generated,i:"📋"},{l:"Enviados WA",v:metrics.sentWhatsapp,i:"💬"}].map(({l,v,i})=>(
                <div key={l} style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #eef2f7" }}>
                  <p style={{ fontSize:24, marginBottom:4 }}>{i}</p>
                  <p style={{ fontSize:28, fontWeight:900, color:"#15233b" }}>{v}</p>
                  <p style={{ fontSize:12, color:"#64748b" }}>{l}</p>
                </div>
              ))}
            </div>
            <Suspense fallback={<div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8", fontSize:13 }}>Cargando gráficos…</div>}>
              <AdminCharts last7={last7} sdData={sdData} />
            </Suspense>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16 }}>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #eef2f7" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Total cotizado USD</p><p style={{ fontSize:20, fontWeight:900, color:"#0f3d68" }}>{USD(quotes.reduce((s,q)=>s+(q.results?.totalGen||0),0))}</p></div>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #eef2f7" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Promedio</p><p style={{ fontSize:20, fontWeight:900, color:"#0f3d68" }}>{quotes.length?USD(quotes.reduce((s,q)=>s+(q.results?.totalGen||0),0)/quotes.length):USD(0)}</p></div>
              <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #eef2f7" }}><p style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Tipo más elegido</p><p style={{ fontSize:20, fontWeight:900, color:"#0f3d68" }}>{quotes.filter(q=>q.importType==="avion").length>=quotes.filter(q=>q.importType==="barco").length?"✈️ Avión":"Barco"}</p></div>
            </div>

            {/* Telemetría del clasificador arancelario (Fase 10): detecta dónde
                falla — productos que caen al 16%, correcciones del cliente, etc. */}
            {(() => {
              const tel = quotes.map(q => q.formData?.aiTelemetry).filter(Boolean);
              if (!tel.length) return null;
              const g16 = tel.filter(t => t.generic16);
              const corr = tel.filter(t => t.corrected);
              return (
                <div style={{ background:"white", borderRadius:16, padding:16, border:"1px solid #eef2f7", marginBottom:24 }}>
                  <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:10 }}>🤖 Clasificador arancelario ({tel.length} análisis en leads)</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12, fontSize:12 }}>
                    <div><p style={{ color:"#64748b" }}>Cayeron al 16% genérico</p><p style={{ fontWeight:900, fontSize:18, color: g16.length ? "#b45309" : "#15803d" }}>{g16.length} ({Math.round(g16.length/tel.length*100)}%)</p></div>
                    <div><p style={{ color:"#64748b" }}>Corregidos por el cliente</p><p style={{ fontWeight:900, fontSize:18, color:"#0f3d68" }}>{corr.length}</p></div>
                    <div><p style={{ color:"#64748b" }}>Vía IA + candidatos</p><p style={{ fontWeight:900, fontSize:18, color:"#0f3d68" }}>{tel.filter(t=>t.method==="ia-candidatos").length}</p></div>
                  </div>
                  {g16.length > 0 && (
                    <p style={{ fontSize:11, color:"#b45309", marginTop:10 }}>
                      Sin clasificar (candidatos a nuevas reglas): {[...new Set(g16.map(t=>t.query))].slice(0,8).join(" · ")}
                    </p>
                  )}
                  {corr.length > 0 && (
                    <p style={{ fontSize:11, color:"#64748b", marginTop:6 }}>
                      Correcciones: {corr.slice(0,5).map(t=>`"${t.query}" → ${t.correctedTo}`).join(" · ")}
                    </p>
                  )}
                </div>
              );
            })()}
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

        {tab === "interna" && (
          <div style={{ margin:"-24px -24px 0", borderRadius:16, overflow:"hidden" }}>
            <InternoView settings={settings} saveSettings={saveSettings} dolar={dolar} fetchDolar={fetchDolar} embedded />
          </div>
        )}

        {tab === "settings" && (
          <div>
            <Card icon="✈️" title="Flete aéreo (USD / kg) por país de origen">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16 }}>
                <SettingField s={s} setS={setS} label="🇺🇸 Estados Unidos" k="airRateUSA"/>
                <SettingField s={s} setS={setS} label="🇨🇳 China" k="airRateChina"/>
                <SettingField s={s} setS={setS} label="🇪🇸 España" k="airRateEspana"/>
              </div>
              <p style={{ fontSize:11, color:"#64748b", marginTop:8 }}>La tarifa es fija por kg (no varía con el peso). Cualquier otro país de origen usa la tarifa de China.</p>
            </Card>
            <Card icon="🚢" title="Flete marítimo">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <SettingField s={s} setS={setS} label="Tarifa por m³ (USD / m³)" k="seaRate"/><SettingField s={s} setS={setS} label="Mínimo facturable (m³)" k="seaMin"/>
              </div>
              <SettingField s={s} setS={setS} label="⚖️ Tarifa por kilo (USD / kg)" k="seaRateKg"/>
              <p style={{ fontSize:11, color:"#64748b", marginTop:4 }}>La modalidad marítima "por kilo" se calcula con los mismos impuestos que el aéreo comercial; lo único que cambia es esta tarifa por kg.</p>
            </Card>
            <Card icon="🛡️" title="Seguro y aduana">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16 }}>
                <SettingField s={s} setS={setS} label="Seguro (%)" k="insurance" min={0} max={10}/>
                <SettingField s={s} setS={setS} label="Derecho importación (%)" k="duty" min={0} max={50}/>
                <SettingField s={s} setS={setS} label="Tasa estadística (%)" k="stat" min={0} max={5}/>
              </div>
              <Field label="IVA">
                <select value={s.vat} onChange={e=>setS(p=>({...p,vat:+e.target.value}))} style={inputStyle}>
                  <option value={21}>21%</option><option value={10.5}>10,5%</option>
                </select>
              </Field>
            </Card>
            <Card icon="📊" title="Impuestos internos (barco)">
              <SettingToggle s={s} setS={setS} label="IVA adicional activo" k="addVatOn"/><SettingField s={s} setS={setS} label="IVA adicional (%)" k="addVat" min={0} max={50}/>
              <SettingToggle s={s} setS={setS} label="Ganancias activo" k="gainsOn"/><SettingField s={s} setS={setS} label="Ganancias (%)" k="gains" min={0} max={20}/>
              <SettingToggle s={s} setS={setS} label="Ingresos Brutos activo" k="ibOn"/><SettingField s={s} setS={setS} label="Ingresos Brutos (%)" k="ib" min={0} max={10}/>
            </Card>
            <Card icon="🚚" title="Servicios logísticos">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
                <SettingField s={s} setS={setS} label="Pick up / Retiro en origen (USD)" k="pickup"/>
                <SettingField s={s} setS={setS} label="Envío nacional -barco m³- (USD)" k="domesticSea"/>
              </div>
              <div style={{ background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:"12px 14px", marginTop:4, marginBottom:4 }}>
                <p style={{ fontSize:12, color:"#0f3d68", fontWeight:700, marginBottom:8 }}>✈️ Avión</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <SettingField s={s} setS={setS} label="Handling (USD)" k="handling"/>
                  <SettingField s={s} setS={setS} label="Envío nacional (USD)" k="domestic"/>
                </div>
                <SettingField s={s} setS={setS} label="Cobrar handling solo si peso facturable es menor a (kg)" k="handlingMaxKg" min={0} step="0.1"/>
                <p style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Si el peso facturable iguala o supera ese valor, el handling pasa a USD 0 automáticamente.</p>
              </div>
              <div style={{ background:"#eef5fb", border:"1px solid #b9cee2", borderRadius:12, padding:"12px 14px", marginTop:4, marginBottom:4 }}>
                <p style={{ fontSize:12, color:"#0f3d68", fontWeight:700, marginBottom:8 }}>⚖️ Marítimo por kilo</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <SettingField s={s} setS={setS} label="Handling (USD)" k="handlingSea"/>
                  <SettingField s={s} setS={setS} label="Envío nacional (USD)" k="domesticSeaKg"/>
                </div>
                <SettingField s={s} setS={setS} label="Cobrar handling solo si peso real es menor a (kg)" k="handlingMaxKgSea" min={0} step="0.1"/>
                <p style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Si el peso real iguala o supera ese valor, el handling pasa a USD 0 automáticamente.</p>
              </div>
              <Field label="Tipo de honorarios">
                <div style={{ display:"flex", gap:12 }}>
                  {["fixed","percentage"].map(t=>(
                    <button key={t} onClick={()=>setS(p=>({...p,feeType:t}))}
                      style={{ flex:1, padding:"10px 0", borderRadius:12, border:`2px solid ${s.feeType===t?"#18548a":"#e2e8f0"}`,
                        background: s.feeType===t ? "#eef5fb" : "white", color: s.feeType===t ? "#0f3d68" : "#475569",
                        fontWeight:700, fontSize:13, cursor:"pointer" }}>
                      {t==="fixed"?"💵 Monto fijo USD":"📊 Porcentaje %"}
                    </button>
                  ))}
                </div>
              </Field>
              {s.feeType==="fixed"
                ? <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16 }}>
                    <SettingField s={s} setS={setS} label="✈️ Avión (USD)" k="feeFixed"/>
                    <SettingField s={s} setS={setS} label="🚢 Barco m³ (USD)" k="feeFixedSea"/>
                    <SettingField s={s} setS={setS} label="⚖️ Marítimo kg (USD)" k="feeFixedKg"/>
                  </div>
                : <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16 }}>
                      <SettingField s={s} setS={setS} label="✈️ Avión (%)" k="feePct" min={0} max={30}/>
                      <SettingField s={s} setS={setS} label="🚢 Barco m³ (%)" k="feePctSea" min={0} max={30}/>
                      <SettingField s={s} setS={setS} label="⚖️ Marítimo kg (%)" k="feePctKg" min={0} max={30}/>
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
                <div style={{ flex:1, background:"#eef5fb", borderRadius:12, padding:12, textAlign:"center" }}>
                  <p style={{ fontSize:11, color:"#64748b" }}>Valor actual (automático)</p>
                  <p style={{ fontSize:22, fontWeight:900, color:"#0f3d68" }}>${fmt(dolar)}</p>
                </div>
                <button onClick={fetchDolar} style={{ padding:"10px 18px", borderRadius:12, background:"#dbe8f6", color:"#0f3d68", border:"none", fontWeight:700, fontSize:13, cursor:"pointer" }}>↺ Actualizar</button>
              </div>
              <Field label="Carga manual (opcional)" hint="Si se ingresa, reemplaza al valor automático.">
                <Inp type="number" placeholder="Ej: 1420.00" value={s.manualDolar||""} onChange={e=>setS(p=>({...p,manualDolar:e.target.value?+e.target.value:null}))}/>
              </Field>
            </Card>
            <Card icon="📅" title="Validez de la cotización">
              <SettingField s={s} setS={setS} label="Días de validez del presupuesto (PDF)" k="validezDias" min={1} step="1"/>
            </Card>
            <Card icon="⚖️" title="Texto legal">
              <Field label="Aclaración para el cliente">
                <textarea rows={3} value={s.legal} onChange={e=>setS(p=>({...p,legal:e.target.value}))}
                  style={{ ...inputStyle, resize:"none", height:72, fontFamily:"inherit" }}/>
              </Field>
            </Card>
            <button onClick={save}
              style={{ width:"100%", padding:16, borderRadius:16, border:"none",
                background: saved ? "#22c55e" : "linear-gradient(135deg,#0f3d68,#18548a)",
                color:"white", fontWeight:900, fontSize:16, cursor:"pointer", marginBottom:12 }}>
              {saved ? "✓ Cambios guardados" : "Guardar configuración"}
            </button>
            <div style={{ background:"#eef2f7", borderRadius:12, padding:14, fontSize:12, color:"#64748b" }}>
              <strong>Contraseña de administrador:</strong> fvr2024
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── MODO INTERNO (/interno) ─────────────────────────────────
   Cotizador rápido exclusivo del dueño. Sin datos de cliente, sin
   guardado automático, sin métricas públicas. Todos los valores
   comerciales son EDITABLES por cotización (overrides temporales):
   no hace falta tocar la configuración global para un caso puntual.
   "Guardar como configuración global" persiste los overrides si se quiere. */
const OV_FIELDS = [
  ["duty", "Derecho importación (%)"], ["stat", "Tasa estadística (%)"], ["vat", "IVA (%)"],
  ["insurance", "Seguro (%)"], ["airRateChina", "Aéreo China (USD/kg)"], ["airRateUSA", "Aéreo USA (USD/kg)"],
  ["airRateEspana", "Aéreo España (USD/kg)"], ["seaRateKg", "Marítimo (USD/kg)"], ["seaRate", "Marítimo (USD/m³)"],
  ["seaMin", "Mínimo marítimo (m³)"], ["feePct", "Honorarios avión (%)"], ["feePctSea", "Honorarios barco m³ (%)"],
  ["feePctKg", "Honorarios barco kg (%)"], ["pickup", "Pick up (USD)"], ["handling", "Handling avión (USD)"],
  ["handlingSea", "Handling marítimo kg (USD)"],
  ["handlingMaxKg", "Umbral handling avión (se cobra si peso < kg)"],
  ["handlingMaxKgSea", "Umbral handling marítimo (se cobra si peso < kg)"],
  ["domestic", "Envío nac. avión (USD)"],
  ["domesticSeaKg", "Envío nac. barco kg (USD)"], ["domesticSea", "Envío nac. barco m³ (USD)"],
];

const InternoView = ({ settings, saveSettings, dolar, fetchDolar, embedded = false }) => {
  const blank = { producto: "", nombre: "", cantidad: "", fob: "", peso: "", largo: "", ancho: "", alto: "", m3manual: "", bultos: "",
    origenSel: "China", tipo: "avion", subTipo: "comercial", seaMode: "kg", manualDuty: "", aiDutyRate: null };
  const [d, setD] = useState(blank);
  const [ov, setOv] = useState({});           // overrides temporales de settings (solo esta cotización)
  const [dolarOv, setDolarOv] = useState(""); // tipo de cambio manual de esta cotización
  const [showRates, setShowRates] = useState(false);
  const [copied, setCopied] = useState("");
  const [savedGlobal, setSavedGlobal] = useState(false);

  const s = { ...settings, ...Object.fromEntries(Object.entries(ov).filter(([, v]) => v !== "" && v !== null)) };
  const rate = dolarOv !== "" && +dolarOv > 0 ? +dolarOv : dolar;
  const dd = { ...d, aiDutyRate: d.manualDuty !== "" && !isNaN(+d.manualDuty) ? +d.manualDuty : null, paisOrigen: d.origenSel };
  const r = calculate(dd, s);            // cálculo automático en cada cambio
  const modos = compareModes(dd, s);
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const copy = async (texto, tag) => {
    try { await navigator.clipboard.writeText(texto); setCopied(tag); setTimeout(() => setCopied(""), 2000); }
    catch { alert("No se pudo copiar."); }
  };

  // PDF de la modalidad activa (cambiando modalidad se descarga la otra al toque)
  const [pdfLoading, setPdfLoading] = useState(false);
  const doPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await generatePDF({ ...dd, nombre: d.nombre || "Cotización interna", whatsapp: d.whatsapp || "—" }, r, rate, s);
    } catch { alert("No se pudo generar el PDF."); }
    setPdfLoading(false);
  };

  const detalleTecnico = () => [
    `COTIZACIÓN INTERNA FVR — ${d.producto || "sin producto"}`,
    `Modalidad: ${d.tipo === "avion" ? "Aéreo" : d.seaMode === "kg" ? "Marítimo kg" : "Marítimo m³"} · Origen: ${d.origenSel}`,
    `FOB ${USD(r.fob)} · ${r.byWeight ? `Peso fact. ${fmt(r.pFact)} kg × ${r.airRate}/kg` : `Vol ${fmt(r.m3Fact, 2)} m³ × ${s.seaRate}/m³`}`,
    `Flete ${USD(r.flete)} · Seguro ${USD(r.seguro)} · CIF ${USD(r.cif)}`,
    `Derecho ${r.effectiveDutyPct}% ${USD(r.duty)} · Tasa est. ${USD(r.stat)} · IVA ${USD(r.iva)}`,
    r.internalTaxes ? `IVA adic. ${USD(r.addVat)} · Ganancias ${USD(r.gains)} · IIBB ${USD(r.ib)}` : null,
    `Pickup ${USD(r.pickup)} · Handling ${USD(r.handling)} · Envío nac. ${USD(r.domestic)} · Honorarios ${USD(r.fees)}`,
    `TOTAL LOGÍSTICA ${USD(r.totalLog)} · TOTAL GENERAL ${USD(r.totalGen)}${rate ? ` · ARS ${fmt(r.totalGen * rate, 0)}` : ""}`,
    r.unitario ? `Unitario (${r.cantidad} u.): ${USD(r.unitario)}` : null,
    `Dólar: $${fmt(rate || 0)}${dolarOv ? " (manual de esta cotización)" : ""}`,
  ].filter(Boolean).join("\n");

  const inputMini = { ...inputStyle, padding: "8px 10px", fontSize: 13 };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", paddingBottom: 40 }}>
      <div style={{ background: "linear-gradient(135deg,#0b2f52,#0f3d68)", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo-fvr.jpg" alt="" style={{ width: 38, height: 38, borderRadius: 10, background: "white", padding: 2, objectFit: "contain" }} />
            <div><p style={{ fontWeight: 800, fontSize: 15 }}>⚡ Cotizador interno</p><p style={{ fontSize: 11, color: "#b9cee2" }}>Sin registro de leads · cálculo instantáneo</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#b9cee2", flexWrap: "wrap" }}>
            <span>Dólar: ${fmt(rate || 0)}{dolarOv ? " ✍️" : ""}</span>
            <input placeholder="TC manual" value={dolarOv} onChange={e => setDolarOv(e.target.value.replace(/[^0-9.]/g, ""))}
              style={{ width: 90, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: 12 }} />
            <button onClick={fetchDolar} aria-label="Actualizar dólar" style={{ background: "none", border: "none", color: "#b9cee2", cursor: "pointer", fontSize: 15 }}>↺</button>
            <button onClick={() => { setD(blank); setOv({}); setDolarOv(""); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🔄 Reset</button>
            {!embedded && <a href="/" style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none" }}>← Sitio público</a>}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        {/* Columna datos */}
        <div style={{ background: "white", borderRadius: 16, padding: 18, color: "#15233b" }}>
          <p style={{ fontWeight: 800, fontSize: 13, color: "#0b2f52", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>📦 Datos</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}><Inp placeholder="Producto" value={d.producto} onChange={e => set("producto", e.target.value)} style={inputMini} /></div>
            <div style={{ gridColumn: "1/-1" }}><Inp placeholder="Cliente (opcional — aparece en el PDF)" value={d.nombre} onChange={e => set("nombre", e.target.value)} style={inputMini} /></div>
            <Inp type="number" placeholder="FOB total USD" value={d.fob} onChange={e => set("fob", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Cantidad (u.)" value={d.cantidad} onChange={e => set("cantidad", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Peso real kg" value={d.peso} onChange={e => set("peso", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Bultos" value={d.bultos} onChange={e => set("bultos", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Largo cm" value={d.largo} onChange={e => set("largo", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Ancho cm" value={d.ancho} onChange={e => set("ancho", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="Alto cm" value={d.alto} onChange={e => set("alto", e.target.value)} style={inputMini} />
            <Inp type="number" placeholder="m³ (directo)" value={d.m3manual} onChange={e => set("m3manual", e.target.value)} style={inputMini} />
            <select value={d.origenSel} onChange={e => set("origenSel", e.target.value)} style={{ ...inputMini, cursor: "pointer" }}>
              <option>China</option><option>Estados Unidos (USA)</option><option>España</option><option value="otro">Otro</option>
            </select>
            <Inp type="number" placeholder="Arancel % (manual)" value={d.manualDuty} onChange={e => set("manualDuty", e.target.value)} style={inputMini} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[["avion", "✈️ Aéreo"], ["barco-kg", "🚢 Kg"], ["barco-m3", "🚢 m³"]].map(([v, l]) => {
              const activo = v === "avion" ? d.tipo === "avion" : d.tipo === "barco" && (v === "barco-kg" ? d.seaMode === "kg" : d.seaMode === "m3");
              return (
                <button key={v} onClick={() => v === "avion" ? set("tipo", "avion") : setD(p => ({ ...p, tipo: "barco", seaMode: v === "barco-kg" ? "kg" : "m3" }))}
                  style={{ flex: 1, minWidth: 80, padding: "10px 0", borderRadius: 10, border: `2px solid ${activo ? "#18548a" : "#e2e8f0"}`, background: activo ? "#eef5fb" : "white", color: activo ? "#0f3d68" : "#64748b", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  {l}
                </button>
              );
            })}
          </div>
          {d.tipo === "avion" && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[["comercial", "🏢 Comercial"], ["personal", "👤 Personal"]].map(([v, l]) => (
                <button key={v} onClick={() => set("subTipo", v)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `2px solid ${d.subTipo === v ? "#18548a" : "#e2e8f0"}`, background: d.subTipo === v ? "#eef5fb" : "white", color: d.subTipo === v ? "#0f3d68" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          )}

          {/* Tarifas de esta cotización (overrides temporales) */}
          <button onClick={() => setShowRates(v => !v)}
            style={{ width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 10, border: "1px dashed #cbd5e1", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {showRates ? "▲ Ocultar tarifas de esta cotización" : `▼ Ajustar tarifas SOLO para esta cotización${Object.keys(ov).filter(k => ov[k] !== "").length ? ` (${Object.keys(ov).filter(k => ov[k] !== "").length} modificadas)` : ""}`}
          </button>
          {showRates && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Vacío = usa la configuración global. Lo que cargues acá aplica solo a esta simulación.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {OV_FIELDS.map(([k, label]) => (
                  <div key={k}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 2 }}>{label} <span style={{ color: "#cbd5e1" }}>(global: {settings[k]})</span></label>
                    <Inp type="number" placeholder={String(settings[k] ?? "")} value={ov[k] ?? ""} onChange={e => setOv(p => ({ ...p, [k]: e.target.value }))} style={{ ...inputMini, padding: "6px 8px", fontSize: 12 }} />
                  </div>
                ))}
              </div>
              <button onClick={() => { const merged = { ...settings, ...Object.fromEntries(Object.entries(ov).filter(([, v]) => v !== "").map(([k, v]) => [k, +v])) }; saveSettings(merged); setSavedGlobal(true); setTimeout(() => setSavedGlobal(false), 2000); }}
                style={{ width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 10, border: "none", background: savedGlobal ? "#22c55e" : "#0b2f52", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {savedGlobal ? "✓ Guardado" : "💾 Guardar estos valores como configuración global"}
              </button>
            </div>
          )}
        </div>

        {/* Columna resultado */}
        <div>
          <div style={{ background: "linear-gradient(135deg,#0b2f52,#18548a)", borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#b9cee2", textTransform: "uppercase", letterSpacing: 1 }}>Total general</p>
            <p style={{ fontSize: 32, fontWeight: 900 }}>{USD(r.totalGen)}</p>
            {rate && <p style={{ fontSize: 14, color: "#b9cee2" }}>ARS {fmt(r.totalGen * rate, 0)} · dólar ${fmt(rate)}</p>}
            {r.unitario && <p style={{ fontSize: 13, color: "#b9cee2", marginTop: 4 }}>≈ {USD(r.unitario)} por unidad ({r.cantidad} u.)</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 12, color: "#dbe8f6" }}>
              <span>Flete: {USD(r.flete)}</span><span>CIF: {USD(r.cif)}</span>
              <span>Derecho ({r.effectiveDutyPct}%): {USD(r.duty)}</span><span>IVA: {USD(r.iva)}</span>
              <span>Tasa est.: {USD(r.stat)}</span><span>Honorarios: {USD(r.fees)}</span>
              <span>Handling: {USD(r.handling)}{r.hasHandling && r.handling === 0 ? ` (no aplica: peso ≥ ${d.tipo === "avion" ? (s.handlingMaxKg ?? 3) : (s.handlingMaxKgSea ?? 3)} kg)` : ""}</span><span>Logística total: {USD(r.totalLog)}</span>
            </div>
          </div>

          {/* Comparador */}
          {modos.length > 1 && (
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>⚖️ Comparador</p>
              {modos.map(m => (
                <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: m.recomendada ? "rgba(34,197,94,0.15)" : "transparent", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m.label} {m.recomendada && <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 800 }}>★ MEJOR</span>}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: m.recomendada ? "#4ade80" : "#e2e8f0" }}>{USD(m.r.totalGen)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => copy(buildShortSummary(dd, r, rate), "cliente")}
              style={{ padding: "13px 0", borderRadius: 12, border: "none", background: copied === "cliente" ? "#22c55e" : "linear-gradient(135deg,#f26c1e 0%,#f2741b 55%,#fdb813 130%)", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {copied === "cliente" ? "✓ Copiado" : "📋 Copiar resumen cliente"}
            </button>
            <button onClick={() => copy(detalleTecnico(), "tecnico")}
              style={{ padding: "13px 0", borderRadius: 12, border: "2px solid rgba(255,255,255,0.25)", background: copied === "tecnico" ? "#22c55e" : "transparent", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {copied === "tecnico" ? "✓ Copiado" : "🔧 Copiar detalle técnico"}
            </button>
            <button onClick={doPDF} disabled={pdfLoading}
              style={{ gridColumn: "1/-1", padding: "13px 0", borderRadius: 12, border: "none", background: pdfLoading ? "#334155" : "linear-gradient(135deg,#0f3d68,#18548a)", color: "white", fontWeight: 800, fontSize: 13, cursor: pdfLoading ? "wait" : "pointer" }}>
              {pdfLoading ? "⏳ Generando…" : `📄 Descargar PDF ${d.tipo === "avion" ? "aéreo" : d.seaMode === "kg" ? "marítimo kg" : "marítimo m³"}`}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 10, textAlign: "center" }}>Nada se guarda automáticamente: esta pantalla es solo para cotizar rápido.</p>
        </div>
      </main>
    </div>
  );
};

/* ── ROOT ────────────────────────────────────────────────── */
// Rutas: "/" → calculadora (ES la página principal, sin landing previa)
//        "/interno" → cotizador rápido interno (con clave)
const IS_INTERNO = typeof window !== "undefined" && window.location.pathname.startsWith("/interno");

export default function App() {
  const [view,       setView]      = useState(IS_INTERNO ? "interno-login" : "calc");
  const [settings,   setSettings]  = useState(() => ({ ...DEF, ...ls("fvr_cfg", DEF) }));
  const [quotes,     setQuotes]    = useState(() => ls("fvr_quotes",  []));
  const [metrics,    setMetrics]   = useState(() => ls("fvr_metrics", { visits:0, started:0, generated:0, sentWhatsapp:0 }));
  const [dolar,      setDolar]     = useState(null);
  const [dolarErr,   setDolarErr]  = useState(false);
  const [dolarLoad,  setDolarLoad] = useState(false);
  const [formData,   setFormData]  = useState(null);
  const [results,    setResults]   = useState(null);
  const [adminAuth,  setAdminAuth] = useState(false);

  // fetch con timeout: si una fuente no responde en 5s, pasamos a la siguiente
  const fetchT = (url, ms = 5000) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));
  };

  const fetchDolar = async () => {
    const cfg = ls("fvr_cfg", DEF);
    if (cfg.manualDolar) { setDolar(cfg.manualDolar); setDolarErr(false); return; }
    setDolarLoad(true);
    const ok = (v) => { setDolar(v); setDolarErr(false); setDolarLoad(false); ss("fvr_lastDolar", v); };
    // 1) CriptoYa — dólar oficial Banco Nación venta (mismo valor que DolarHoy)
    try {
      const d = await (await fetchT("https://criptoya.com/api/dolar")).json();
      const venta = d?.oficial?.ask ?? d?.oficial?.price;
      if (venta) return ok(venta);
      throw new Error();
    } catch {}
    // 2) dolarapi (respaldo)
    try {
      const d = await (await fetchT("https://dolarapi.com/v1/dolares/oficial")).json();
      if (d.venta) return ok(d.venta);
      throw new Error();
    } catch {}
    // 3) bluelytics (respaldo)
    try {
      const d2 = await (await fetchT("https://api.bluelytics.com.ar/v2/latest")).json();
      if (d2?.oficial?.value_sell) return ok(d2.oficial.value_sell);
      throw new Error();
    } catch {
      // Sin conexión a ninguna fuente: usar la última cotización válida guardada
      setDolarErr(true); setDolar(ls("fvr_lastDolar", 1450));
    }
    setDolarLoad(false);
  };

  useEffect(() => {
    fetchDolar();
    // El modo interno NO suma métricas públicas
    if (!IS_INTERNO) {
      const m = { ...metrics, visits: metrics.visits + 1 };
      setMetrics(m); ss("fvr_metrics", m);
    }
  }, []);

  const saveSettings  = (s) => { setSettings(s); ss("fvr_cfg", s); };
  const saveQuote     = (q) => { const qs = [q,...quotes]; setQuotes(qs); ss("fvr_quotes", qs); };
  const track         = (k) => { const m = {...metrics,[k]:metrics[k]+1}; setMetrics(m); ss("fvr_metrics",m); };

  // ── Sincronización con el backend de leads (/api/quotes) ──
  // Cada cotización se envía también a la base central (fire & forget):
  // si el backend no responde, todo sigue funcionando con localStorage.
  const syncLeadRemote = (q) => {
    try {
      fetch("/api/quotes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...q, origin: "public" }),
      }).catch(() => {});
    } catch {}
  };

  const updateStatus = (id, status) => {
    const qs = quotes.map(q => q.id === id ? { ...q, status } : q);
    setQuotes(qs); ss("fvr_quotes", qs);
    try {
      fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": sessionStorage.getItem("fvr_admin_key") || "" },
        body: JSON.stringify({ id, status }),
      }).catch(() => {});
    } catch {}
  };

  // Al entrar al panel admin: traer los leads de TODOS los clientes desde el
  // backend y mezclarlos con los locales (por id; el remoto manda).
  useEffect(() => {
    if (!adminAuth) return;
    (async () => {
      try {
        const res = await fetch("/api/quotes", { headers: { "x-admin-key": sessionStorage.getItem("fvr_admin_key") || "" } });
        if (!res.ok) return;
        const j = await res.json();
        if (!j?.quotes?.length) return;
        setQuotes(prev => {
          const byId = new Map();
          for (const q of j.quotes) byId.set(q.id, q);
          for (const q of prev) if (!byId.has(q.id)) byId.set(q.id, q);
          const merged = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
          ss("fvr_quotes", merged);
          return merged;
        });
      } catch {}
    })();
  }, [adminAuth]);

  // El cliente carga nombre/WhatsApp ANTES de calcular (seguimiento comercial):
  // la cotización se guarda al calcular, con dedup de recálculos (<15 min).
  const handleCalculate = (d, r) => {
    setFormData(d); setResults(r); setView("results"); track("generated");
    const nueva = { id:uid(), date:new Date().toISOString(), client:d.nombre, whatsapp:d.whatsapp, email:d.email, product:d.producto, hsCode:d.hsCode, importType:d.tipo, formData:d, results:r, status:"nuevo" };
    const prev = quotes[0];
    const esRecalculo = prev && prev.status === "nuevo"
      && prev.client === d.nombre && prev.whatsapp === d.whatsapp && prev.product === d.producto
      && (Date.now() - new Date(prev.date).getTime()) < 15 * 60 * 1000;
    if (esRecalculo) {
      const qs = [{ ...nueva, id: prev.id }, ...quotes.slice(1)];
      setQuotes(qs); ss("fvr_quotes", qs);
      syncLeadRemote({ ...nueva, id: prev.id }); // upsert remoto con el mismo id
    } else {
      saveQuote(nueva);
      syncLeadRemote(nueva);
    }
  };

  // Acepta overrides de datos/resultados para enviar la modalidad ALTERNATIVA
  // (ej: calculó aéreo pero está viendo marítimo por kilo) sin recargar nada.
  const handleWhatsApp = (dOverride, rOverride) => {
    const d = dOverride || formData;
    const r = rOverride || results;
    if (!r || !d) return;
    track("sentWhatsapp");
    const msg = buildWAMsg(d, r, dolar, settings);
    window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // ── Modo interno (/interno): cotizador rápido solo para el dueño ──
  if (IS_INTERNO) {
    if (view !== "interno") return <AdminLogin titulo="Cotizador interno FVR" onLogin={() => setView("interno")} onBack={() => { window.location.href = "/"; }} />;
    return <InternoView settings={settings} saveSettings={saveSettings} dolar={dolar} fetchDolar={fetchDolar} />;
  }

  if (view === "admin-login") return <AdminLogin onLogin={() => { setAdminAuth(true); setView("admin"); }} onBack={() => setView("calc")} />;
  if (view === "admin" && adminAuth) return <AdminPanel settings={settings} saveSettings={saveSettings} quotes={quotes} updateQuoteStatus={updateStatus} metrics={metrics} dolar={dolar} fetchDolar={fetchDolar} onLogout={() => { setAdminAuth(false); setView("calc"); }} />;
  if (view === "results" && results) return <ResultsView formData={formData} results={results} dolar={dolar} settings={settings} onBack={() => setView("calc")} onWhatsApp={handleWhatsApp} />;
  return <CalculatorForm settings={settings} onCalculate={handleCalculate} onAdminClick={() => setView("admin-login")} dolar={dolar} dolarErr={dolarErr} dolarLoading={dolarLoad} onRefresh={fetchDolar} onTrackStarted={() => track("started")} />;
}
