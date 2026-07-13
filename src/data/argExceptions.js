/* ── EXCEPCIONES ARANCELARIAS ARGENTINAS — VERSIONADO ───────
   Tratamiento nacional que se aplica POR ENCIMA del AEC Mercosur.
   Cada entrada es trazable: norma, vigencia, fecha de verificación.

   REGLAS DE MANTENIMIENTO:
   - Solo agregar entradas con `verified: true` si el % fue confirmado
     contra fuente oficial (Boletín Oficial / InfoLeg / ARCA / VUCE).
   - Nunca borrar: si una norma cae, poner `active: false` y registrar
     `vigenciaHasta`. El historial queda en el archivo + git.
   - `match` es prefijo NCM sin puntos (longest-prefix gana).
   - Actualizar ARG_EXCEPTIONS_META.date en cada cambio. */

export const ARG_EXCEPTIONS_META = {
  version: 2,
  date: "2026-07-13",
  sources: [
    "Boletín Oficial de la República Argentina",
    "InfoLeg (normativa nacional)",
    "VUCE — posiciones arancelarias (control cruzado puntual)",
  ],
  notes:
    "Las excepciones por PREFIJO aplican antes que la TEC oficial de 8 dígitos. " +
    "Los capítulos Dec. 236/2025 se resuelven con la tabla argentina auditada (telas 18 / confección y calzado 20).",
};

/* Excepciones por prefijo NCM (longest-prefix). Orden interno: se evalúa
   de prefijo más largo a más corto, así una posición específica le gana
   a un régimen de capítulo. */
export const ARG_EXCEPTIONS = [
  {
    // DESACTIVADA 2026-07-13: el Arancel Integrado ARCA (consolidado, del
    // 13/07/2026) muestra DIE 16% para TODA la serie 8471.30 (notebooks y
    // tablets). El 0% que figuraba acá no está vigente en aduana. La base
    // DIE ya trae el valor correcto — esta entrada queda como historial.
    match: "847130", rate: 0, regime: "BIT",
    motivo: "Informática (notebooks/tablets) 0% — NO VIGENTE según ARCA 13/07/2026 (DIE real: 16%)",
    norma: "Régimen BIT (histórico)", vigenciaDesde: "2023", vigenciaHasta: "confirmado no vigente al 2026-07-13",
    verified: false, verifiedAt: "2026-07-13", active: false,
  },
  {
    match: "851712", rate: 0, regime: "BIT",
    motivo: "Celulares 0% (Dec. 333/2025)",
    norma: "Dec. 333/2025", vigenciaDesde: "2025",
    verified: true, verifiedAt: "2026-06-24", active: true,
  },
  {
    match: "851713", rate: 0, regime: "BIT",
    motivo: "Celulares 0% (Dec. 333/2025)",
    norma: "Dec. 333/2025", vigenciaDesde: "2025",
    verified: true, verifiedAt: "2026-06-24", active: true,
  },
  {
    match: "8703", rate: 35, regime: "AUTOMOTOR",
    motivo: "Régimen automotor argentino: 35%",
    norma: "Régimen automotor (Ley 21.932 y normas AEC 35% extrazona)", vigenciaDesde: "vigente",
    verified: true, verifiedAt: "2026-06-24", active: true,
  },
  // NOTA HISTÓRICA (2026-07-13): se eliminaron las excepciones 9021→0% y
  // 8713→8% que venían de la auditoría manual de junio: el arancel integrado
  // de ARCA (DIE consolidado oficial) muestra 9021.10.10 = 12,6% y
  // 8713.10.00 = 10,8% (8713.90 con motor = 0%). La base ahora ES el DIE
  // de ARCA, así que este archivo queda para overrides manuales de emergencia
  // y para documentar normativa — no para corregir posiciones una por una.
];

/* Capítulos alcanzados por el Dec. 236/2025 (textil/calzado): Argentina
   redujo el DIE por debajo del AEC (35→20 confección/calzado, telas 18).
   En estos capítulos manda la tabla argentina auditada de 4 dígitos. */
export const DEC236 = {
  chapters: new Set(["50","51","52","53","54","55","56","57","58","59","60","61","62","63","64"]),
  norma: "Dec. 236/2025",
  motivo: "Argentina redujo este sector por Dec. 236/2025 — el AEC Mercosur (35%) no aplica.",
  verified: true, verifiedAt: "2026-06-24", active: true,
};

/* Resolución por longest-prefix sobre las excepciones activas. */
export const argExceptionFor = (digits) => {
  let best = null;
  for (const e of ARG_EXCEPTIONS) {
    if (!e.active || !e.verified) continue;
    if (digits.startsWith(e.match) && (!best || e.match.length > best.match.length)) best = e;
  }
  return best;
};
