/* ── CÓDIGO POSTAL Y DEMORA DHL ─────────────────────────────
   Normalización reutilizable del CP argentino y estado de zona.
   Acepta: "4600" (numérico), "Y4600" (prefijo provincial),
   "Y4600ABC" (CPA completo). El CP NUNCA modifica el precio —
   solo estima el plazo de entrega. */

import { REMOTE_CPS, REMOTE_META } from "../data/dhlRemoteZones.js";

export const normalizeCP = (raw) => {
  const original = (raw ?? "").toString();
  const clean = original.toUpperCase().replace(/\s+/g, "");
  const m = clean.match(/(\d{4})/); // parte numérica del CPA
  return { original, clean, num: m ? m[1] : null };
};

/* Estados internos: "remote" | "not_remote" | "unknown".
   - Lista vacía o CP no identificable → "unknown" (se muestra plazo estándar,
     nunca "sujeto a confirmación" al cliente). */
export const remoteStatus = (raw) => {
  const { num } = normalizeCP(raw);
  if (!num || REMOTE_CPS.size === 0) return "unknown";
  return REMOTE_CPS.has(num) ? "remote" : "not_remote";
};

export const deliveryEstimate = (raw, s = {}) => {
  const status = remoteStatus(raw);
  const remote = status === "remote";
  return {
    status,
    remote,
    min: remote ? (+s.dhlRemoteMin || 9) : (+s.dhlDeliveryMin || 5),
    max: remote ? (+s.dhlRemoteMax || 11) : (+s.dhlDeliveryMax || 7),
    zonesUpdated: REMOTE_META.updated,
    zonesCount: REMOTE_CPS.size,
  };
};
