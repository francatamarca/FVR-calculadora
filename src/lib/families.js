/* ── FAMILIAS COMERCIALES (Fase 5 — entradas amplias) ───────
   Cuando el cliente escribe una FAMILIA ("herramientas", "ropa") no
   existe una única NCM: fingirla sería mentir. En su lugar:

   METODOLOGÍA DETERMINÍSTICA (documentada y reproducible):
   1. Cada familia declara las partidas NCM (4 díg) que la componen.
   2. Se toman TODAS las posiciones de 8 dígitos de esas partidas en
      la base oficial vigente y sus aranceles, aplicando antes las
      excepciones argentinas (así "celulares" da 0 y no el AEC crudo).
   3. El estimado es la MEDIANA de esos aranceles (robusta frente a
      posiciones exóticas), redondeada a 1 decimal.
   4. Confianza SIEMPRE "estimación por categoría" (baja) — nunca se
      presenta como posición confirmada.

   El resultado varía solo si cambia la base oficial: sin números
   mágicos escritos a mano. */

import { NCM8 } from "../data/ncm8.js";
import { argExceptionFor, DEC236 } from "../data/argExceptions.js";
import { NCM_RATES } from "./tariffData.js";
import { tokenize, phraseMatch } from "./textNorm.js";

/* Familias: términos que las disparan + partidas que las componen.
   `hsRef` es la partida más representativa (solo informativa). */
export const FAMILIES = [
  { id: "herramientas-mano", label: "Herramientas de mano", terms: ["herramienta", "herramientas manuales", "ferreteria"], partidas: ["8201","8202","8203","8204","8205","8206"], hsRef: "8205" },
  { id: "herramientas-electricas", label: "Herramientas eléctricas", terms: ["herramienta electrica", "electroherramienta", "power tools"], partidas: ["8467"], hsRef: "8467" },
  { id: "ropa", label: "Indumentaria / ropa", terms: ["ropa", "indumentaria", "prenda", "vestimenta", "moda"], partidas: ["6101","6102","6103","6104","6105","6106","6109","6110","6201","6202","6203","6204","6205","6206","6211"], hsRef: "6109" },
  { id: "calzado", label: "Calzado", terms: ["calzado", "zapato", "zapatilla"], partidas: ["6401","6402","6403","6404","6405"], hsRef: "6402" },
  { id: "electronica", label: "Electrónica de consumo", terms: ["electronica", "electronico", "gadget", "aparato electronico"], partidas: ["8517","8518","8519","8521","8525","8526","8527","8528"], hsRef: "8517" },
  { id: "electrodomesticos", label: "Electrodomésticos", terms: ["electrodomestico", "linea blanca"], partidas: ["8415","8418","8422","8450","8508","8509","8510","8516"], hsRef: "8516" },
  { id: "juguetes", label: "Juguetes y juegos", terms: ["juguete", "jugueteria"], partidas: ["9503","9504","9505"], hsRef: "9503" },
  { id: "muebles", label: "Muebles", terms: ["mueble", "mobiliario", "muebleria"], partidas: ["9401","9403","9404","9405"], hsRef: "9403" },
  { id: "textil-hogar", label: "Textiles para el hogar", terms: ["blanqueria", "textil hogar", "ropa de cama", "textil"], partidas: ["6301","6302","6303","6304"], hsRef: "6302" },
  { id: "telas", label: "Telas y tejidos", terms: ["tela", "tejido", "genero textil"], partidas: ["5208","5209","5210","5211","5212","5407","5408","5512","5513","5514","5515","5516","6001","6004","6005","6006"], hsRef: "5208" },
  { id: "repuestos-maquinaria", label: "Repuestos para maquinaria", terms: ["repuesto maquinaria", "repuesto industrial", "repuesto maquina", "pieza maquina", "parte maquina"], partidas: ["8431","8466","8483","8487"], hsRef: "8487" },
  { id: "autopartes", label: "Autopartes y accesorios", terms: ["autoparte", "repuesto auto", "accesorio auto", "repuesto vehiculo"], partidas: ["8707","8708"], hsRef: "8708" },
  { id: "bazar-cocina", label: "Bazar y cocina", terms: ["bazar", "articulo cocina", "utensilio cocina", "menaje"], partidas: ["3924","7323","7615","8215"], hsRef: "7323" },
  { id: "camping-outdoor", label: "Camping y outdoor", terms: ["camping", "outdoor", "articulo camping"], partidas: ["6306","9506","9507"], hsRef: "6306" },
  { id: "iluminacion", label: "Iluminación", terms: ["iluminacion", "luminaria", "lampara"], partidas: ["8539","9405"], hsRef: "9405" },
  { id: "perfumeria-cosmetica", label: "Perfumería y cosmética", terms: ["perfumeria", "cosmetica", "belleza"], partidas: ["3303","3304","3305","3307"], hsRef: "3304" },
  { id: "instrumentos-medicion", label: "Instrumentos de medición", terms: ["instrumento medicion", "medidor", "tester"], partidas: ["9025","9026","9027","9028","9030","9031"], hsRef: "9027" },
  { id: "seguridad-vigilancia", label: "Seguridad y vigilancia", terms: ["seguridad", "vigilancia", "cctv"], partidas: ["8525","8531"], hsRef: "8525" },
  { id: "jardin", label: "Jardín y exterior", terms: ["jardin", "jardineria"], partidas: ["8201","8424","8433","9403"], hsRef: "8201" },
  { id: "mascotas", label: "Artículos para mascotas", terms: ["mascota", "articulo mascota", "pet shop"], partidas: ["2309","4201","9506"], hsRef: "4201" },
];

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Arancel efectivo de una posición: replica el orden de capas del motor
   (excepción argentina → Dec. 236/2025 → TEC oficial) para que la
   estimación de familia nunca use un AEC que Argentina no aplica. */
const effectiveRate = (code8) => {
  const ex = argExceptionFor(code8);
  if (ex) return ex.rate;
  const p2 = code8.slice(0, 2), p4 = code8.slice(0, 4);
  if (DEC236.active && DEC236.chapters.has(p2) && NCM_RATES[p4] !== undefined) return NCM_RATES[p4];
  return NCM8[code8];
};

/* Estimado determinístico de la familia (mediana de posiciones vigentes). */
export const familyEstimate = (family) => {
  const rates = [];
  for (const code8 of Object.keys(NCM8)) {
    if (family.partidas.some((p) => code8.startsWith(p))) rates.push(effectiveRate(code8));
  }
  const med = median(rates);
  return med === null ? null : { rate: Math.round(med * 10) / 10, positions: rates.length };
};

/* Detección de familia en el texto del cliente (palabra completa). */
export const detectFamily = (text) => {
  const tokens = tokenize(text);
  for (const fam of FAMILIES) {
    if (fam.terms.some((t) => phraseMatch(tokens, t))) return fam;
  }
  return null;
};
