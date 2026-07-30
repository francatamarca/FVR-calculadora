#!/usr/bin/env node
/* ── IMPORTADOR DE ZONAS REMOTAS DHL ────────────────────────
   Regenera src/data/dhlRemoteZones.js desde el archivo oficial.

   USO:
     node scripts/import-dhl-zones.mjs zonas.csv
     node scripts/import-dhl-zones.mjs zonas.json

   FORMATOS ACEPTADOS:
   - CSV/TXT: un código por línea (o separados por coma/punto y coma).
     Acepta "4600", "Y4600", "Y4600ABC" — se extrae la parte numérica.
   - JSON: array de strings con los mismos formatos.

   No inventa códigos: si el archivo está vacío o no parsea, no toca nada. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "dhlRemoteZones.js");
const file = process.argv[2];
if (!file) { console.error("Uso: node scripts/import-dhl-zones.mjs <archivo.csv|json>"); process.exit(1); }

const raw = readFileSync(file, "utf8");
let items = [];
try {
  const j = JSON.parse(raw);
  if (Array.isArray(j)) items = j.map(String);
  else throw new Error("JSON no es array");
} catch {
  items = raw.split(/[\r\n,;]+/);
}

const cps = new Set();
for (const it of items) {
  const m = it.toUpperCase().replace(/\s+/g, "").match(/(\d{4})/);
  if (m) cps.add(m[1]);
}
if (!cps.size) { console.error("✖ No se encontró ningún CP válido en el archivo — no se modifica nada."); process.exit(1); }

const hoy = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, `/* ── ZONAS REMOTAS DHL (códigos postales de entrega extendida) ──
   GENERADO por scripts/import-dhl-zones.mjs — NO editar a mano.
   Fuente: ${basename(file)} · importado el ${hoy}.
   Para actualizar: node scripts/import-dhl-zones.mjs <archivo oficial> */

export const REMOTE_META = {
  updated: "${hoy}",
  source: ${JSON.stringify(basename(file))},
  count: ${cps.size},
};

export const REMOTE_CPS = new Set(${JSON.stringify([...cps].sort())});
`);
console.log(`✓ ${cps.size} códigos postales remotos importados (${hoy}). Correr los tests y commitear.`);
