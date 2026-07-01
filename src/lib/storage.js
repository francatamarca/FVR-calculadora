/* ── CAPA DE PERSISTENCIA ───────────────────────────────────
   Hoy: adaptador localStorage (cada navegador guarda SOLO lo suyo —
   las cotizaciones de los clientes NO llegan al panel del dueño).

   Para volverla comercial de verdad, conectar un backend. Interfaz ya
   desacoplada: implementar los mismos métodos contra Supabase y cambiar
   el export final.

   TODO backend (recomendado: Supabase, plan free alcanza):
   1. Crear proyecto en supabase.com → tabla `quotes`:
      id uuid pk, created_at timestamptz, client text, whatsapp text,
      email text, product text, hs_code text, import_type text,
      form_data jsonb, results jsonb, status text, origin text ('public'|'interno')
   2. Variables en Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
      (con Row Level Security: INSERT anónimo permitido, SELECT solo
      con service key desde un endpoint /api/quotes protegido).
   3. Implementar SupabaseQuotes con los mismos métodos de abajo y
      exportar ese adaptador. El panel admin lee de /api/quotes.
   4. Para documentos subidos: Supabase Storage o Vercel Blob
      (hoy /api/document-analyze procesa en memoria y NO persiste). */

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
