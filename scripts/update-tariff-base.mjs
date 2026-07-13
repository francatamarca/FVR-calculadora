#!/usr/bin/env node
/* ── PIPELINE DE ACTUALIZACIÓN DE LA BASE ARANCELARIA ───────
   Fuente: Arancel Integrado de ARCA (ex-AFIP) — arancel.zip
   https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/archivos/arancel.zip
   Se regenera a diario (~02:00 AR). Contiene el nomenclador SIM completo
   con el DIE (Derecho de Importación Extrazona) argentino YA CONSOLIDADO
   con todos los decretos vigentes (557/23, 236/25, 333/25, 513/25, BIT,
   automotor, etc.) + descripciones oficiales en español.

   Diseño de registro (separador @, ver PDF oficial de AFIP
   "disenioDeArchivosNomencladorSufijosConArrobas.pdf"):
   2@POSICION(16)@DE@ReintExtra@DIE@ReintIntra@DII@DerEspecMin@UEstad@UDerEsp@DESCRIPCION

   USO:
     node scripts/update-tariff-base.mjs               # descarga y actualiza
     node scripts/update-tariff-base.mjs --dry-run     # muestra el diff, no escribe
     node scripts/update-tariff-base.mjs --offline p.zip  # usa un zip local (tests)
     node scripts/update-tariff-base.mjs --force       # ignora el freno de cambios masivos

   GARANTÍAS (Fase 3):
   - Nunca publica una base inconsistente: sanity gates + tests (vitest)
     ANTES de dejar los archivos definitivos; si algo falla, restaura backup.
   - Historial: data/tariff-history/CHANGELOG.md + git (rollback = git revert).
   - Si la fuente no responde: conserva la última base válida y sale con error. */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_ZIP = "https://serviciosweb.afip.gob.ar/aduana/arancelintegrado/archivos/arancel.zip";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const OUT_BASE = join(ROOT, "data", "tariff-base.json");
const OUT_NCM8 = join(ROOT, "src", "data", "ncm8.js");
const OUT_DESC = join(ROOT, "src", "data", "ncmDescriptions.js");
const OUT_META = join(ROOT, "src", "data", "tariffMeta.js");
const CHANGELOG = join(ROOT, "data", "tariff-history", "CHANGELOG.md");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const offlineIdx = args.indexOf("--offline");
const OFFLINE_ZIP = offlineIdx >= 0 ? args[offlineIdx + 1] : null;

const die = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
const log = (msg) => console.log(msg);

/* ── 1. DESCARGA ──────────────────────────────────────────── */
async function download() {
  if (OFFLINE_ZIP) {
    log(`→ Modo offline: ${OFFLINE_ZIP}`);
    return readFileSync(OFFLINE_ZIP);
  }
  log(`→ Descargando ${URL_ZIP} …`);
  const res = await fetch(URL_ZIP, { headers: { "User-Agent": UA } });
  if (!res.ok) die(`La fuente ARCA respondió ${res.status} — se CONSERVA la base actual (no se toca nada).`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200_000) die(`Archivo sospechosamente chico (${buf.length} bytes) — se conserva la base actual.`);
  return buf;
}

/* ── 2. PARSEO DEL NOMENCLADOR ────────────────────────────── */
const cleanDesc = (s) =>
  s.replace(/[\x91\x92‘’]/g, "'").replace(/[\x93\x94“”]/g, '"')
   .replace(/^[\s\-]+/, "").replace(/\s+/g, " ").trim();

const parseRate = (s) => {
  const t = (s || "").trim();
  if (!/^\d{3}\.\d{2}$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100) / 100;
};

function parse(zipBuf) {
  const zip = new AdmZip(zipBuf);
  const entry = zip.getEntries().find((e) => /^nomenclador_\d{8}\.txt$/i.test(e.entryName));
  if (!entry) die("El zip no contiene nomenclador_DDMMAAAA.txt — formato cambió, revisar a mano.");
  const m = entry.entryName.match(/(\d{2})(\d{2})(\d{4})/);
  const fileDate = `${m[3]}-${m[2]}-${m[1]}`; // ISO
  const text = entry.getData().toString("latin1");
  const lines = text.split(/\r?\n/);

  const partidaDesc = {};      // "6109" → "T-SHIRTS Y CAMISETAS, DE PUNTO."
  const ncm8Desc = {};         // "61091000" → descripción del nivel 8 díg
  const leaves = {};           // "61091000" → [12.6, 12.6, ...] DIE de hojas SIM

  for (const line of lines) {
    if (!line.startsWith("2@")) continue;
    const parts = line.split("@");
    if (parts.length < 11) continue;
    const pos = (parts[1] || "").trim();
    const digits = pos.replace(/[^0-9]/g, "");
    const desc = cleanDesc(parts.slice(10).join("@"));
    const dieRate = parseRate(parts[4]);

    if (digits.startsWith("0000")) continue; // rancho / provisiones de a bordo — no es NCM

    if (digits.length === 4 && pos.includes(".") && pos.length <= 6) {
      partidaDesc[digits] = desc;                       // "61.09" partida
    } else if (digits.length === 8) {
      if (desc) ncm8Desc[digits] = desc;                // "6109.10.00" nivel NCM
      if (dieRate !== null) (leaves[digits] ||= []).push(dieRate); // NCM sin apertura SIM
    } else if (digits.length > 8 && dieRate !== null) {
      (leaves[digits.slice(0, 8)] ||= []).push(dieRate); // hoja SIM
    }
  }

  // DIE por NCM8 = moda de sus hojas; flag si hay valores mixtos
  const base = {};
  let mixed = 0;
  for (const [code8, rates] of Object.entries(leaves)) {
    const freq = {};
    for (const r of rates) freq[r] = (freq[r] || 0) + 1;
    const [best] = Object.entries(freq).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const isMixed = Object.keys(freq).length > 1;
    if (isMixed) mixed++;
    base[code8] = {
      die: parseFloat(best[0]),
      // Descripción ESPECÍFICA primero (más peso en la búsqueda), encabezado
      // de partida después como contexto — separador " — " (lo parsea getIndex)
      desc: [ncm8Desc[code8], partidaDesc[code8.slice(0, 4)]].filter(Boolean).join(" — "),
      leaves: rates.length,
      ...(isMixed ? { mixed: true, rates: [...new Set(rates)].sort((a, b) => a - b) } : {}),
    };
  }
  return { base, fileDate, mixed };
}

/* ── 3. SANITY GATES ──────────────────────────────────────── */
function sanity(base, prev) {
  const codes = Object.keys(base);
  if (codes.length < 9000) die(`Solo ${codes.length} posiciones (esperadas ≥9000) — base inconsistente, NO se publica.`);
  const bad = codes.filter((c) => base[c].die < 0 || base[c].die > 60);
  if (bad.length) die(`Aranceles fuera de rango [0,60] en ${bad.length} posiciones (ej: ${bad[0]}) — NO se publica.`);
  const sinDesc = codes.filter((c) => !base[c].desc).length;
  if (sinDesc > codes.length * 0.05) die(`${sinDesc} posiciones sin descripción (>5%) — NO se publica.`);

  if (prev) {
    const prevCodes = Object.keys(prev);
    if (codes.length < prevCodes.length * 0.95)
      die(`La base nueva tiene ${codes.length} posiciones vs ${prevCodes.length} anteriores (caída >5%) — NO se publica.`);
    let changed = 0;
    for (const c of prevCodes) if (base[c] && base[c].die !== prev[c].die) changed++;
    const pct = (changed / prevCodes.length) * 100;
    if (pct > 20 && !FORCE)
      die(`Cambió el ${pct.toFixed(1)}% de los aranceles (>20%) — sospechoso. Revisar a mano o correr con --force.`);
    return { changed, added: codes.filter((c) => !prev[c]).length, removed: prevCodes.filter((c) => !base[c]).length };
  }
  return { changed: 0, added: codes.length, removed: 0 };
}

/* ── 4. GENERADORES ───────────────────────────────────────── */
const genNcm8 = (base, meta) => {
  const rates = Object.entries(base).map(([c, v]) => `"${c}":${v.die}`).join(",");
  return `/* ── DIE ARGENTINO OFICIAL a 8 dígitos ──────────────────────
   GENERADO por scripts/update-tariff-base.mjs — NO editar a mano.
   Fuente: Arancel Integrado ARCA (nomenclador SIM ${meta.fileDate}) —
   Derecho de Importación Extrazona YA CONSOLIDADO con la normativa
   vigente (Dec. 557/23, 236/25, 333/25, 513/25, BIT, automotor, …).
   ${Object.keys(base).length} posiciones NCM. Checksum fuente: ${meta.checksum.slice(0, 16)}…
   Actualizar con: node scripts/update-tariff-base.mjs */

export const NCM8 = {${rates}};

/* BIT_SET: reservado para marcar posiciones informática/telecom (fuente
   POLCOM). Con la base DIE consolidada el 0% BIT ya viene aplicado, así
   que hoy no genera advertencias. */
export const BIT_SET = new Set([]);
`;
};

const genDesc = (base, meta) => {
  const entries = Object.entries(base)
    .filter(([, v]) => v.desc)
    .map(([c, v]) => `"${c}":${JSON.stringify(v.desc)}`).join(",\n");
  return `/* ── DESCRIPCIONES OFICIALES NCM (8 dígitos) ────────────────
   GENERADO por scripts/update-tariff-base.mjs — NO editar a mano.
   SOLO SERVIDOR (funciones /api/*): el cliente nunca importa este módulo.
   Fuente: nomenclador ARCA ${meta.fileDate} (español, encabezado de partida
   + descripción de la posición). */

export const NCM_DESC = {
${entries}
};

export const NCM_DESC_META = ${JSON.stringify({
    date: meta.fileDate, source: "Arancel Integrado ARCA (nomenclador SIM)",
    positions: Object.keys(base).length, downloadedAt: meta.downloadedAt, checksum: meta.checksum,
  }, null, 2)};
`;
};

const genMeta = (meta, stats) => `/* GENERADO por scripts/update-tariff-base.mjs — NO editar a mano. */
export const TARIFF_META = ${JSON.stringify({
  baseDate: meta.fileDate,
  source: "Arancel Integrado ARCA — DIE extrazona consolidado",
  positions: stats.positions,
  downloadedAt: meta.downloadedAt,
  checksum: meta.checksum,
}, null, 2)};
`;

/* ── MAIN ─────────────────────────────────────────────────── */
const buf = await download();
const checksum = createHash("sha256").update(buf).digest("hex");
const { base, fileDate, mixed } = parse(buf);
const meta = { fileDate, checksum, downloadedAt: new Date().toISOString() };

log(`→ Nomenclador del ${fileDate}: ${Object.keys(base).length} posiciones NCM (${mixed} con DIE mixto entre sufijos SIM)`);

// Comparación contra la base anterior
let prev = null;
if (existsSync(OUT_BASE)) {
  try { prev = JSON.parse(readFileSync(OUT_BASE, "utf8")).positions; } catch { /* primera corrida */ }
}
if (!FORCE && prev && JSON.parse(readFileSync(OUT_BASE, "utf8")).meta?.checksum === checksum) {
  log("✓ La fuente no cambió desde la última corrida (mismo checksum). Nada para hacer (usar --force para regenerar).");
  process.exit(0);
}
const stats = sanity(base, prev);
log(`→ Diff vs base anterior: +${stats.added} nuevas · −${stats.removed} eliminadas · ${stats.changed} aranceles modificados`);

if (DRY) {
  if (prev) {
    let shown = 0;
    for (const c of Object.keys(base)) {
      if (prev[c] && base[c].die !== prev[c].die && shown < 30) {
        log(`   ${c}: ${prev[c].die}% → ${base[c].die}%  (${base[c].desc.slice(0, 60)})`);
        shown++;
      }
    }
  }
  log("✓ Dry-run: no se escribió nada.");
  process.exit(0);
}

// Backup para restaurar si los tests fallan (los archivos que no existían
// se BORRAN en el rollback — no pueden quedar huérfanos de una corrida fallida)
const backups = [], created = [];
for (const f of [OUT_BASE, OUT_NCM8, OUT_DESC, OUT_META]) {
  if (existsSync(f)) { copyFileSync(f, f + ".bak"); backups.push(f); }
  else created.push(f);
}

try {
  mkdirSync(dirname(OUT_BASE), { recursive: true });
  mkdirSync(dirname(CHANGELOG), { recursive: true });
  writeFileSync(OUT_BASE, JSON.stringify({ meta: { ...meta, source: "ARCA arancel.zip" }, positions: base }));
  writeFileSync(OUT_NCM8, genNcm8(base, meta));
  writeFileSync(OUT_DESC, genDesc(base, meta));
  writeFileSync(OUT_META, genMeta(meta, { positions: Object.keys(base).length }));

  // Gate final: la suite completa tiene que pasar con la base nueva
  log("→ Corriendo tests con la base nueva…");
  execSync("npx vitest run", { cwd: ROOT, stdio: "inherit" });

  appendFileSync(CHANGELOG,
    `\n## ${meta.fileDate} (corrida ${meta.downloadedAt})\n` +
    `- Posiciones: ${Object.keys(base).length} (+${stats.added} / −${stats.removed})\n` +
    `- Aranceles modificados: ${stats.changed}\n- Checksum: ${checksum}\n`);
  for (const f of backups) rmSync(f + ".bak");
  log(`✓ Base arancelaria actualizada al ${fileDate}. Commitear los cambios para publicar.`);
} catch (e) {
  log("✖ Falló la validación — restaurando la base anterior…");
  for (const f of backups) { copyFileSync(f + ".bak", f); rmSync(f + ".bak"); }
  for (const f of created) { if (existsSync(f)) rmSync(f); }
  die(`No se publicó la actualización: ${e.message}`);
}
