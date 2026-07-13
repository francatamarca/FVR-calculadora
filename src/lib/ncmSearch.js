/* ── BÚSQUEDA DE POSICIONES NCM REALES (Capa B del clasificador) ──
   Índice BM25 en memoria sobre las descripciones oficiales de la
   nomenclatura. SOLO SERVIDOR (lo importan las funciones /api/*):
   el dataset de descripciones pesa cientos de KB y nunca debe
   llegar al bundle del cliente.

   La IA NO inventa códigos: este módulo genera 5-15 candidatos
   REALES de la base oficial y Claude solo puede elegir entre ellos.

   Fuzzy: si un token de la consulta no existe en el vocabulario del
   índice, se reemplaza por el término más parecido por trigramas
   (typos leves: "martilo" → "martillo"). Controlado con umbral 0.55. */

import { tokenize, trigramSim } from "./textNorm.js";

const K1 = 1.4, B = 0.75; // parámetros BM25 estándar

export function buildIndex(entries) {
  // entries: [{ code, desc }] — desc en español (descripción oficial)
  const docs = [];
  const df = new Map();      // término → nº de documentos que lo contienen
  let totalLen = 0;

  for (const { code, desc, path } of entries) {
    // `desc` (descripción específica) pesa DOBLE frente a `path` (encabezado
    // de partida, largo y repetido en todas las posiciones hermanas) — evita
    // que el heading ahogue al término específico ("Termos" vs "ACERO…").
    const dTok = tokenize(desc);
    const tokens = path ? [...dTok, ...dTok, ...tokenize(path)] : [...dTok, ...dTok];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    totalLen += tokens.length;
    docs.push({ code, desc, tf, len: tokens.length });
  }

  const N = docs.length || 1;
  const avgLen = totalLen / N || 1;
  const vocab = [...df.keys()];

  const idf = (term) => {
    const n = df.get(term) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  const expandToken = (t) => {
    if (df.has(t)) return t;
    // fuzzy controlado: mejor vecino por trigramas, umbral estricto
    let best = null, bestSim = 0.55;
    for (const v of vocab) {
      if (Math.abs(v.length - t.length) > 2) continue;
      const sim = trigramSim(t, v);
      if (sim > bestSim) { bestSim = sim; best = v; }
    }
    return best;
  };

  return {
    size: N,
    search(query, limit = 15) {
      const qTokens = [...new Set(tokenize(query).map(expandToken).filter(Boolean))];
      if (!qTokens.length) return [];
      const scored = [];
      for (const d of docs) {
        let score = 0, matched = 0;
        for (const t of qTokens) {
          const f = d.tf.get(t);
          if (!f) continue;
          matched++;
          score += idf(t) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / avgLen));
        }
        if (score > 0) scored.push({ code: d.code, desc: d.desc, score, matched, of: qTokens.length });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    },
  };
}
