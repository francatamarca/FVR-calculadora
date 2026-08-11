#!/usr/bin/env node
/* Renderiza PDFs de muestra del presupuesto (aéreo y DHL) para revisar el
   diseño sin abrir el navegador:  node scripts/preview-pdf.mjs [dirSalida] */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEF, calculate } from "../src/lib/calc.js";
import { buildQuotePDF } from "../src/lib/pdfQuote.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] || join(ROOT, "data");

const logoPath = join(ROOT, "public", "logo-fvr.jpg");
const logoDataUrl = existsSync(logoPath)
  ? `data:image/jpeg;base64,${readFileSync(logoPath).toString("base64")}`
  : null;

const s = { ...DEF };
const base = {
  nombre: "Juan Pérez", whatsapp: "+54 9 388 5551234", email: "juan@mail.com", cp: "Y4600ABC",
  producto: "Herramientas eléctricas surtidas", paisOrigen: "China", hsCode: "8467.21.00",
  origenSel: "China", fob: "1000", cantidad: "100", peso: "20", largo: "40", ancho: "30", alto: "30",
  bultos: "2", aiDutyRate: 12, categoria: "", dutyManual: false,
};

const casos = [
  { tag: "aereo", d: { ...base, tipo: "avion", subTipo: "comercial" } },
  { tag: "dhl",   d: { ...base, tipo: "dhl" } },
  { tag: "personal", d: { ...base, tipo: "avion", subTipo: "personal", fob: "350" } },
  { tag: "maritimo-kg", d: { ...base, tipo: "barco", seaMode: "kg" } },
  { tag: "maritimo-m3", d: { ...base, tipo: "barco", seaMode: "m3", m3manual: "1.5" } },
];

for (const { tag, d } of casos) {
  const r = calculate(d, s);
  const { doc } = await buildQuotePDF(d, r, 1495, s, { logoDataUrl });
  const file = join(outDir, `muestra-${tag}.pdf`);
  writeFileSync(file, Buffer.from(doc.output("arraybuffer")));
  console.log(`✓ ${file} (${doc.getNumberOfPages()} página/s) — total ${r.totalGen.toFixed(2)}`);
}
