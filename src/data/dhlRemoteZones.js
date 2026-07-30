/* ── ZONAS REMOTAS DHL (códigos postales de entrega extendida) ──
   Lista local actualizable — NUNCA se consulta un PDF externo por cotización.

   ESTADO ACTUAL: lista VACÍA a propósito. La lista oficial de DHL no
   estaba en el repositorio y NO se inventan códigos: mientras esté vacía,
   todo CP responde "unknown" y se muestra el plazo estándar (5 a 7 días).

   CÓMO IMPORTAR LA LISTA OFICIAL (ver docs/IMPLEMENTACION_DHL_FVR.md):
     node scripts/import-dhl-zones.mjs archivo.csv
   Acepta CSV (un CP de 4 dígitos por línea, con o sin prefijo provincial)
   o JSON (array de strings). El script regenera este archivo con fecha. */

export const REMOTE_META = {
  updated: null, // fecha de la última importación de la lista oficial
  source: "Pendiente: importar lista oficial DHL (scripts/import-dhl-zones.mjs)",
  count: 0,
};

// Set de CPs numéricos de 4 dígitos considerados zona remota
export const REMOTE_CPS = new Set([]);
