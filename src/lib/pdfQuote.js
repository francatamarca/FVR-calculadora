/* ── PDF DEL PRESUPUESTO (jsPDF, vectorial) ─────────────────
   Extraído de App.jsx para poder renderizarlo también desde Node
   (scripts/preview-pdf.mjs) y revisar el diseño antes de publicar.

   DISEÑO (v2 "prolijo", 30/07/2026):
   - Datos del presupuesto en DOS columnas → mitad de alto, lectura rápida.
   - Secciones numeradas con encabezado azul FVR consistente.
   - Totales con jerarquía visual: caja navy (servicio) + caja naranja
     de marca (TOTAL GENERAL, lo que el cliente busca primero).
   - Variante DHL: transporte con pesos DHL, base aduanera con nota,
     handling único. Sin filas en cero ni conceptos que no aplican.
   - Todo en UNA página A4. */

import { deliveryEstimate } from "./dhlZones.js";

const fmt = (n, dec = 2) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(+n || 0);
const USD = (n) => `USD ${fmt(n)}`;

export async function buildQuotePDF(d, r, dolar, s, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default; // browser (Vite) y Node resuelven distinto
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod.default || autoTableMod.autoTable;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const navy = [11, 47, 82], blue = [24, 84, 138], orange = [242, 108, 30], ink = [21, 35, 59], gray = [100, 116, 139], line = [230, 235, 242];

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0"), mm = String(now.getMonth() + 1).padStart(2, "0");
  const fechaStr = `${dd}/${mm}/${now.getFullYear()}`;
  const venc = new Date(now.getTime() + (+s.validezDias > 0 ? +s.validezDias : 7) * 86400000);
  const validez = `${String(venc.getDate()).padStart(2, "0")}/${String(venc.getMonth() + 1).padStart(2, "0")}/${venc.getFullYear()}`;
  const presNro = `FVR-${now.getFullYear()}${mm}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const dutySuffix = d.categoria ? " · categoría" : (d.dutyManual ? " · manual" : (d.aiDutyRate !== null && d.aiDutyRate !== undefined ? " · IA" : ""));
  const tipo = r.isDhl ? "DHL Express · Envío Comercial"
    : d.tipo === "avion"
      ? (d.subTipo === "personal" ? "Avión · Envío Personal (Franquicia)" : "Avión · Envío Comercial")
      : (d.seaMode === "kg" ? "Barco · Por kilo" : "Barco · Por m³");
  const del = r.isDhl ? deliveryEstimate(d.cp, s) : null;

  // Logo (dataURL) — desde el navegador; en Node se pasa por opts o cae al texto "FVR"
  let logoData = opts.logoDataUrl || null;
  if (!logoData && typeof window !== "undefined") {
    try {
      logoData = await fetch("/logo-fvr.jpg").then(res => res.blob()).then(b => new Promise((ok, no) => {
        const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b);
      }));
    } catch {}
  }
  if (!dolar && typeof window !== "undefined") {
    try {
      const dj = await fetch("https://criptoya.com/api/dolar").then(res => res.json());
      dolar = dj?.oficial?.ask ?? dj?.oficial?.price ?? null;
    } catch {}
  }

  /* ── Banda superior ── */
  doc.setFillColor(...navy); doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...orange); doc.rect(0, 30, W, 1.2, "F"); // filete naranja de marca
  doc.setFillColor(255, 255, 255); doc.roundedRect(M, 5.5, 19, 19, 2.5, 2.5, "F");
  if (logoData) {
    doc.addImage(logoData, "JPEG", M + 1, 6.5, 17, 17);
  } else {
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("FVR", M + 9.5, 17, { align: "center" });
  }
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14.5);
  doc.text("FVR Logística Internacional", M + 24, 13.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(170, 200, 235);
  doc.text("Importaciones puerta a puerta · www.fvrlogistica.com.ar", M + 24, 19);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  doc.text("PRESUPUESTO", W - M, 11, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(170, 200, 235);
  doc.text(`N° ${presNro}`, W - M, 16, { align: "right" });
  doc.text(`Fecha: ${fechaStr}  ·  Válido hasta: ${validez}`, W - M, 20.5, { align: "right" });

  /* Cliente, producto y modalidad van SOLO en la tabla de datos (pedido de
     Francisco: sin duplicados arriba) — las secciones arrancan directo. */
  let cursorY = 36;
  let nSec = 0;
  const section = (title, body, opts2 = {}) => {
    nSec++;
    autoTable(doc, {
      startY: cursorY,
      head: [[{ content: `${nSec} · ${title}`, colSpan: opts2.cols || 2 }]],
      body,
      theme: "grid",
      styles: { lineColor: line, lineWidth: 0.12, cellPadding: 1.55 },
      headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold", fontSize: 8, cellPadding: 1.8 },
      bodyStyles: { fontSize: 8.6, textColor: ink },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: opts2.colStyles || {
        0: { cellWidth: (W - 2 * M) * 0.62 },
        1: { halign: "right", cellWidth: (W - 2 * M) * 0.38, fontStyle: "bold" },
      },
      margin: { left: M, right: M },
    });
    cursorY = doc.lastAutoTable.finalY + 3.2;
  };

  /* ── 1 · Datos en DOS columnas (compacto y prolijo) ── */
  const cw = (W - 2 * M) / 4;
  const datos = [
    ["Cliente", (d.nombre || "—").slice(0, 34), "Producto", (d.producto || "—").slice(0, 38)],
    ["WhatsApp", d.whatsapp || "—", "País de origen", d.paisOrigen || (r.isDhl ? "China" : "—")],
    ["Email", (d.email || "—").slice(0, 32), "HS Code", d.hsCode || "—"],
    ["Código postal", d.cp || "—", "Tipo de envío", tipo],
  ];
  if (del) datos.push(["Entrega estimada", `${del.min} a ${del.max} días hábiles`, "Zona", del.remote ? "Entrega extendida" : "Estándar"]);
  autoTable(doc, {
    startY: cursorY,
    head: [[{ content: "1 · DATOS DEL PRESUPUESTO", colSpan: 4 }]],
    body: datos,
    theme: "grid",
    styles: { lineColor: line, lineWidth: 0.12, cellPadding: 1.55 },
    headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold", fontSize: 8, cellPadding: 1.8 },
    bodyStyles: { fontSize: 8.4, textColor: ink },
    columnStyles: {
      0: { cellWidth: cw * 0.85, textColor: gray },
      1: { cellWidth: cw * 1.15, fontStyle: "bold" },
      2: { cellWidth: cw * 0.85, textColor: gray },
      3: { cellWidth: cw * 1.15, fontStyle: "bold" },
    },
    margin: { left: M, right: M },
  });
  cursorY = doc.lastAutoTable.finalY + 3.2;
  nSec = 1;

  /* ── 2 · Transporte internacional ── */
  const flete = [["FOB / Valor de la mercadería", USD(r.fob)]];
  if (r.isDhl) {
    flete.push(
      ["Peso real total", `${fmt(r.peso)} kg`],
      [`Peso volumétrico DHL (volumen ÷ ${fmt(r.dhlDivisor, 0)})`, `${fmt(r.pVol)} kg`],
      ["Peso facturable (el mayor)", `${fmt(r.pFact)} kg`],
      [`Flete internacional DHL (USD ${r.airRate}/kg)`, USD(r.flete)],
      [`Seguro (${s.insurance}%)`, USD(r.seguro)],
    );
  } else if (r.isAir) {
    flete.push(
      ["Peso real total", `${fmt(r.peso)} kg`],
      ["Peso volumétrico (volumen ÷ 5.000)", `${fmt(r.pVol)} kg`],
      ["Peso facturable (el mayor)", `${fmt(r.pFact)} kg`],
      [`Flete aéreo (USD ${r.airRate}/kg)`, USD(r.flete)],
      [`Seguro (${s.insurance}%)`, USD(r.seguro)],
    );
  } else if (r.seaKg) {
    flete.push(
      ["Peso real total", `${fmt(r.peso)} kg`],
      [`Flete marítimo (USD ${r.airRate}/kg)`, USD(r.flete)],
      [`Seguro (${s.insurance}%)`, USD(r.seguro)],
      ["CIF / Valor en aduana", USD(r.cif)],
    );
  } else {
    flete.push(
      ["Volumen ingresado", `${fmt(r.m3, 3)} m³`],
      [`Volumen facturable (mín. ${s.seaMin} m³)`, `${fmt(r.m3Fact, 3)} m³`],
      [`Flete marítimo (USD ${s.seaRate}/m³)`, USD(r.flete)],
      [`Seguro (${s.insurance}%)`, USD(r.seguro)],
    );
  }
  section("FLETE INTERNACIONAL", flete);

  /* ── Base aduanera separada del flete comercial ── */
  if (r.isDhl) {
    section("BASE ADUANERA (SOLO PARA TRIBUTOS)", [
      [`Flete estimado para base aduanera (USD ${r.customsPerKg}/kg)`, USD(r.fleteBase)],
      [{ content: "Este importe se usa únicamente para estimar la base imponible — NO es un cargo adicional y no se suma al total.", colSpan: 2, styles: { fontSize: 7.2, fontStyle: "italic", textColor: gray, fillColor: [255, 250, 240] } }],
      ["CIF / Valor en aduana", USD(r.cif)],
    ]);
  } else if (r.customsPerUnit != null) {
    const unidad = r.byWeight ? "kg" : "m³";
    section("BASE ADUANERA (SOLO PARA TRIBUTOS)", [
      [`Flete estimado para base aduanera (USD ${r.customsPerUnit}/${unidad})`, USD(r.fleteBase)],
      [{ content: "Este importe se usa únicamente para estimar seguro, CIF y tributos — NO es un cargo adicional y no se suma al total.", colSpan: 2, styles: { fontSize: 7.2, fontStyle: "italic", textColor: gray, fillColor: [255, 250, 240] } }],
      ["CIF / Valor en aduana", USD(r.cif)],
    ]);
  }

  /* ── Impuestos y tributos ── */
  const trib = [];
  if (r.isPersonal) {
    trib.push([`Derecho de importación (${r.effectiveDutyPct}%${dutySuffix})${r.cif <= 400 ? " — exento hasta USD 400" : " sobre excedente de USD 400"}`, USD(r.duty)]);
    trib.push(["Tasa estadística", "No aplica"]);
    trib.push([`IVA (${s.vat}% sobre valor aduanero + derechos)`, USD(r.iva)]);
  } else {
    trib.push([`Derecho de importación (${r.effectiveDutyPct}%${dutySuffix})`, USD(r.duty)]);
    trib.push([`Tasa estadística (${s.stat}%)`, USD(r.stat)]);
    trib.push(["Base imponible IVA", USD(r.ivaBase)]);
    trib.push([`IVA (${s.vat}%)`, USD(r.iva)]);
    if (r.internalTaxes) {
      trib.push([`IVA adicional (${s.addVat}%)`, USD(r.addVat)]);
      trib.push([`Ganancias (${s.gains}%)`, USD(r.gains)]);
      trib.push([`Ingresos Brutos (${s.ib}%)`, USD(r.ib)]);
    }
  }
  section("IMPUESTOS Y TRIBUTOS", trib);

  /* ── Servicios logísticos ── */
  if (r.isDhl) {
    section("SERVICIOS LOGÍSTICOS", [["Handling DHL (único cargo por operación)", USD(r.handling)]]);
  } else {
    const serv = [["Pick up / Retiro en origen", USD(r.pickup)]];
    if (r.hasHandling) serv.push(["Handling", r.handling === 0 ? "No aplica" : USD(r.handling)]);
    serv.push(["Envío nacional", USD(r.domestic)], ["Honorarios de Gestión", USD(r.fees)]);
    section("SERVICIOS LOGÍSTICOS", serv);
  }

  /* ── Totales: navy (servicio) + naranja de marca (TOTAL GENERAL) ── */
  const boxY = cursorY + 0.5;
  const boxH = 26;
  const wLeft = (W - 2 * M) * 0.42, wRight = (W - 2 * M) * 0.58 - 3;
  // Caja izquierda — total del servicio
  doc.setFillColor(...navy); doc.roundedRect(M, boxY, wLeft, boxH, 2, 2, "F");
  doc.setTextColor(170, 200, 235); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.text(r.isDhl ? "TOTAL DEL SERVICIO (SIN MERCADERÍA)" : "TOTAL DEL ENVÍO (SIN MERCADERÍA)", M + 5, boxY + 6.5);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(USD(r.totalLog), M + 5, boxY + 14);
  if (dolar) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(170, 200, 235);
    doc.text(`ARS ${fmt(r.totalLog * dolar, 0)}`, M + 5, boxY + 20.5);
  }
  // Caja derecha — TOTAL GENERAL en naranja de marca
  doc.setFillColor(...orange); doc.roundedRect(M + wLeft + 3, boxY, wRight, boxH, 2, 2, "F");
  doc.setTextColor(255, 235, 220); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("TOTAL GENERAL DE IMPORTACIÓN", M + wLeft + 8, boxY + 6.5);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text(USD(r.totalGen), M + wLeft + 8, boxY + 15);
  if (dolar) {
    doc.setFontSize(10.5); doc.setTextColor(255, 245, 235);
    doc.text(`ARS ${fmt(r.totalGen * dolar, 0)}`, M + wLeft + 8, boxY + 21.5);
  }
  if (r.unitario) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(`${USD(r.unitario)} por unidad (${r.cantidad} u.)`, M + wLeft + wRight - 2, boxY + 21.5, { align: "right" });
  }
  cursorY = boxY + boxH + 4.5;

  if (dolar) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text(`Conversión al dólar oficial $${fmt(dolar)} del ${fechaStr} · sujeto a variación.`, M, cursorY);
    cursorY += 4;
  }

  /* ── Legal + footer ── */
  doc.setTextColor(...gray); doc.setFont("helvetica", "italic"); doc.setFontSize(6.8);
  const legalLines = doc.splitTextToSize(s.legal || "", W - 2 * M);
  doc.text(legalLines, M, cursorY);
  cursorY += legalLines.length * 2.7 + 3.5;
  doc.setDrawColor(...line); doc.setLineWidth(0.25); doc.line(M, cursorY, W - M, cursorY);
  cursorY += 4.5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...navy);
  doc.text("FVR Logística Internacional · Francisco Vega", M, cursorY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...gray);
  doc.text("+54 9 3883372745   ·   francisco@fvrlogistica.com   ·   www.fvrlogistica.com.ar", M, cursorY + 4);
  doc.text(`Presupuesto válido hasta el ${validez}. Valores en USD con su equivalente en ARS al dólar oficial.`, M, cursorY + 8);

  const safeName = (d.nombre || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-") || "cliente";
  const safeLabel = String(opts.filenameLabel || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 30).replace(/\s+/g, "-");
  return { doc, filename: `Presupuesto-FVR-${safeName}${safeLabel ? `-${safeLabel}` : ""}.pdf` };
}
