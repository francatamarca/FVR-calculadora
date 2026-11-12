import { calculate, dhlEligibility, packTotals } from "./calc.js";

export const originAllowed = (origin) => !/^(espa[nñ]a|spain)$/i.test(String(origin || "").trim());
const commercial = d => ({ ...d, subTipo:"comercial", seaMode:"m3" });
export const publicQuote = (input, settings) => {
  const d = commercial(input);
  if (!originAllowed(d.paisOrigen || d.origenSel)) throw new Error("Origen no disponible");
  if (d.tipo !== "barco") d.tipo = settings.dhlActive && settings.dhlPublic && dhlEligibility(d, settings).ok ? "dhl" : "avion";
  return { d, r:calculate(d, settings) };
};
export const publicModes = (input, settings) => {
  const d = commercial(input);
  const volume = packTotals(d).volCm3;
  const m3 = d.tipo === "barco" && +d.m3manual > 0 ? +d.m3manual : volume / 1e6;
  const sameVolume = d.tipo !== "barco" || Math.abs(m3 - volume / 1e6) < 0.001;
  const modes = [];
  if (+d.peso > 0 && volume > 0 && sameVolume) {
    const air = publicQuote({ ...d, tipo:"avion" }, settings);
    const isDhl = air.d.tipo === "dhl";
    modes.push({ ...air, key:isDhl ? "dhl" : "air", label:isDhl ? "⚡ DHL Express" : "✈️ Aéreo comercial", pdf:isDhl ? "DHL" : "aéreo" });
  }
  if (m3 > 0) {
    const sea = publicQuote({ ...d, tipo:"barco", m3manual:m3 }, settings);
    modes.push({ ...sea, key:"seaM3", label:"🚢 Marítimo por m³", pdf:"marítimo" });
  }
  return modes;
};
