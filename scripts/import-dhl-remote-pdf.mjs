#!/usr/bin/env node
/* ── IMPORTADOR DE ZONAS REMOTAS DHL desde el PDF OFICIAL ───
   Extrae SOLO la sección ARGENTINA de la "DHL Express Remote Area List"
   y regenera src/data/dhlRemoteZones.js.

   USO:
     node scripts/import-dhl-remote-pdf.mjs "ruta/dhl_express_remote_areas_en.pdf"
   (requiere pdftotext — viene con Git for Windows / poppler)

   REGLAS:
   - No inventa códigos: solo los rangos que figuran bajo ARGENTINA.
   - Los rangos from–to se expanden inclusive (es lo que el PDF define).
   - Detecta y guarda la fecha "Effective ..." del documento.
   - El PDF original se conserva como fuente de auditoría en data/dhl/. */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "dhlRemoteZones.js");
const AUDIT_DIR = join(ROOT, "data", "dhl");

const pdf = process.argv[2];
if (!pdf) { console.error("Uso: node scripts/import-dhl-remote-pdf.mjs <remote_area_list.pdf>"); process.exit(1); }

// 1. PDF → texto
const txtPath = join(tmpdir(), `dhl-remote-${Date.now()}.txt`);
execFileSync("pdftotext", ["-layout", pdf, txtPath], { stdio: "inherit" });
const lines = readFileSync(txtPath, "utf8").split(/\r?\n/);

// 2. Fecha efectiva del documento
const effLine = lines.find((l) => /effective/i.test(l)) || "";
const effective = (effLine.match(/Effective\s+([0-9]{1,2}\s+\w+\s+[0-9]{4})/i) || [])[1] || null;

// 3. Rangos de la sección ARGENTINA (con líneas de continuación)
let country = null;
const ranges = [];
for (const line of lines) {
  const c = line.match(/^([A-Z][A-Z .'()-]+?)\s{2,}[A-Z]{2}(\s|$)/); // "ARGENTINA  AR ..."
  if (c) country = c[1].trim();
  if (country !== "ARGENTINA") continue;
  for (const m of line.matchAll(/(\d{4})\s+(\d{4})/g)) {
    const from = parseInt(m[1], 10), to = parseInt(m[2], 10);
    if (to >= from && to - from < 2000) ranges.push([from, to]); // sanity: rangos razonables
  }
}
if (!ranges.length) { console.error("✖ No se encontraron rangos bajo ARGENTINA — revisar el PDF."); process.exit(1); }

// 4. Expandir rangos (inclusive) → Set de CPs de 4 dígitos
const cps = new Set();
for (const [from, to] of ranges) {
  for (let n = from; n <= to; n++) cps.add(String(n).padStart(4, "0"));
}

// 5. Conservar el PDF original como auditoría
mkdirSync(AUDIT_DIR, { recursive: true });
const auditName = `dhl_express_remote_areas_${(effective || "sin-fecha").replace(/\s+/g, "-")}.pdf`;
copyFileSync(pdf, join(AUDIT_DIR, auditName));

// 6. Generar el módulo
const hoy = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, `/* ── ZONAS REMOTAS DHL — ARGENTINA (códigos de entrega extendida) ──
   GENERADO por scripts/import-dhl-remote-pdf.mjs — NO editar a mano.
   Fuente OFICIAL: "DHL Express Remote Area List" (${basename(pdf)})
   Vigencia del documento: ${effective || "no detectada"} · Importado: ${hoy}
   Auditoría: data/dhl/${auditName}
   ${ranges.length} rangos del PDF → ${cps.size} códigos postales expandidos. */

export const REMOTE_META = {
  updated: "${hoy}",
  effective: ${JSON.stringify(effective)},
  source: "DHL Express Remote Area List (oficial) — sección ARGENTINA",
  audit: ${JSON.stringify("data/dhl/" + auditName)},
  count: ${cps.size},
};

// Rangos tal como figuran en el PDF (para auditoría rápida)
export const REMOTE_RANGES = ${JSON.stringify(ranges)};

export const REMOTE_CPS = new Set(${JSON.stringify([...cps].sort())});
`);
console.log(`✓ ARGENTINA: ${ranges.length} rangos → ${cps.size} CPs remotos (vigencia: ${effective}).`);
console.log(`✓ PDF de auditoría: data/dhl/${auditName}`);
console.log("→ Correr: npx vitest run && commit.");
