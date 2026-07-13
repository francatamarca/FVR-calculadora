/* ── NORMALIZACIÓN DE TEXTO (Capa A del clasificador) ───────
   Compartida por el matcher local por palabra completa y por el
   buscador de posiciones (ncmSearch). Todo determinístico, sin IA.

   Pipeline: minúsculas → sin acentos → tokenizar → quitar stopwords
   → stem liviano español (plurales) → variantes regionales/inglés. */

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
  "y", "o", "u", "e", "para", "por", "con", "sin", "en", "a", "al",
  "que", "se", "su", "sus", "es", "tipo", "marca", "modelo", "nuevo",
  "nueva", "nuevos", "nuevas", "original", "originales", "importado",
  "importada", "unidad", "unidades", "juego", "set", "kit", "pack",
  "the", "of", "for", "with", "and", "new",
]);

/* Variantes regionales / inglés → término canónico español.
   Se aplica token a token DESPUÉS del stemming. */
const TOKEN_ALIASES = {
  // inglés frecuente en descripciones comerciales
  hammer: "martillo", drill: "taladro", tool: "herramienta", tools: "herramienta",
  wireless: "inalambrico", camera: "camara", phone: "celular", watch: "reloj",
  shoes: "zapato", sneakers: "zapatilla", backpack: "mochila", headphones: "auricular",
  speaker: "parlante", charger: "cargador", filter: "filtro", pump: "bomba",
  heater: "calefactor", fan: "ventilador", toy: "juguete", bag: "bolso",
  glass: "vidrio", steel: "acero", cotton: "algodon", leather: "cuero",
  // variantes regionales / comerciales
  goma: "caucho", // en comercio AR "goma" = caucho (la nomenclatura usa "caucho")
  polera: "remera", playera: "remera", franela: "remera",
  championes: "zapatilla", tenis: "zapatilla",
  celu: "celular", compu: "computadora", notebook: "notebook",
  frazada: "manta", polar: "manta",
};

export const stripAccents = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Stem liviano español: solo plurales regulares. Conservador a propósito:
   preferimos no unificar antes que unificar mal (p. ej. "mes" ≠ "me"). */
export const stemEs = (t) => {
  if (t.length > 5 && t.endsWith("ces")) return t.slice(0, -3) + "z"; // lapices → lapiz
  if (t.length > 4 && t.endsWith("es")) {
    // "relojes"→"reloj", "filtros" no pasa por acá; evitar "mes"/"tres"
    const base = t.slice(0, -2);
    if (/[jlrndz]$/.test(base)) return base; // consonantes típicas de plural -es
    return t.slice(0, -1); // "paquetes" → "paquete"
  }
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("us") && !t.endsWith("is")) return t.slice(0, -1);
  return t;
};

/* Tokeniza y normaliza una frase completa → array de tokens canónicos. */
export const tokenize = (text) => {
  const raw = stripAccents(text).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(Boolean);
  const out = [];
  for (const tok of raw) {
    if (STOPWORDS.has(tok)) continue;
    const stemmed = stemEs(tok);
    out.push(TOKEN_ALIASES[stemmed] || TOKEN_ALIASES[tok] || stemmed);
  }
  return out;
};

/* Match de FRASE por palabra completa: los tokens de `phrase` deben
   aparecer consecutivos dentro de los tokens del texto. Reemplaza al
   viejo `texto.includes(palabra)` que producía falsos positivos
   ("control remoto" ⊃ "moto"). */
export const phraseMatch = (textTokens, phrase) => {
  const p = tokenize(phrase);
  if (!p.length) return false;
  outer: for (let i = 0; i <= textTokens.length - p.length; i++) {
    for (let j = 0; j < p.length; j++) {
      if (textTokens[i + j] !== p[j]) continue outer;
    }
    return true;
  }
  return false;
};

/* Trigramas de caracteres para fuzzy matching controlado (typos leves). */
export const trigrams = (token) => {
  const t = `  ${token} `;
  const out = new Set();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
};

export const trigramSim = (a, b) => {
  if (a === b) return 1;
  const ta = trigrams(a), tb = trigrams(b);
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter++;
  return inter / (ta.size + tb.size - inter || 1);
};
