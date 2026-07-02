/* ── CAPA DE PERSISTENCIA ───────────────────────────────────
   BACKEND ACTIVO (Fase 3, 2026-07-02): además del localStorage local,
   los leads se sincronizan con /api/quotes (tabla `calculadora_leads`
   en la base Neon de FVR — la misma de fvr-sourcing, tabla aislada).
   - POST público al calcular (App.jsx → syncLeadRemote)
   - GET/PATCH protegidos con header x-admin-key (env QUOTES_ADMIN_KEY)
   - El panel admin mezcla remoto + local al abrir (remoto manda)
   - Si el backend no responde, todo sigue con localStorage (fallback)

   Este módulo mantiene el adaptador localStorage (caché/fallback).
   Pendiente futuro: persistir documentos subidos (Vercel Blob). */

const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const ss = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const LocalQuotes = {
  load() { return ls("fvr_quotes", []); },
  saveAll(quotes) { ss("fvr_quotes", quotes); },
  add(quote, quotes) { const qs = [quote, ...quotes]; ss("fvr_quotes", qs); return qs; },
  replaceFirst(quote, quotes) { const qs = [quote, ...quotes.slice(1)]; ss("fvr_quotes", qs); return qs; },
  updateStatus(id, status, quotes) { const qs = quotes.map(q => q.id === id ? { ...q, status } : q); ss("fvr_quotes", qs); return qs; },
};

export const quotesStore = LocalQuotes;
export const BACKEND_ACTIVO = false; // true cuando se conecte Supabase
