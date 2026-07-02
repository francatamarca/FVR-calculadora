/* ── /api/quotes — Leads centralizados ──────────────────────
   Las cotizaciones de TODOS los clientes llegan acá (tabla aislada
   `calculadora_leads` en la base Neon de FVR) además del localStorage
   local. El panel admin las lee de acá: Francisco ve todo desde
   cualquier dispositivo.

   - POST  (público): guarda/actualiza un lead. Upsert por id → el
     dedup de recálculos (<15 min) actualiza en vez de duplicar.
   - GET   (protegido con header x-admin-key = QUOTES_ADMIN_KEY):
     últimas 300 cotizaciones.
   - PATCH (protegido): cambia el estado de una cotización.

   Si DATABASE_URL no está configurada, responde 503 y el front sigue
   con localStorage (degradación limpia, sin romper nada). */

import pg from "pg";

// Pool a nivel módulo: se reusa entre invocaciones calientes de la lambda
let pool;
const getPool = () => {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });
  return pool;
};

const S = (v, max) => (typeof v === "string" ? v.slice(0, max) : null);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "backend no configurado" });

  try {
    if (req.method === "POST") {
      const b = req.body || {};
      if (!b.id || typeof b.id !== "string" || b.id.length > 40) return res.status(400).json({ error: "id inválido" });
      // límites defensivos: los jsonb quedan acotados
      const formData = b.formData && JSON.stringify(b.formData).length < 20000 ? b.formData : null;
      const results  = b.results  && JSON.stringify(b.results).length  < 20000 ? b.results  : null;
      await getPool().query(
        `INSERT INTO calculadora_leads (id, client, whatsapp, email, product, hs_code, import_type, origin, status, form_data, results)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'nuevo',$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           client=EXCLUDED.client, whatsapp=EXCLUDED.whatsapp, email=EXCLUDED.email,
           product=EXCLUDED.product, hs_code=EXCLUDED.hs_code, import_type=EXCLUDED.import_type,
           form_data=EXCLUDED.form_data, results=EXCLUDED.results, updated_at=now()`,
        [b.id, S(b.client, 120), S(b.whatsapp, 40), S(b.email, 120), S(b.product, 200), S(b.hsCode, 30), S(b.importType, 20), S(b.origin, 20) || "public", formData, results]
      );
      return res.status(200).json({ ok: true });
    }

    const isAdmin = req.headers["x-admin-key"] && req.headers["x-admin-key"] === process.env.QUOTES_ADMIN_KEY;
    if (!isAdmin) return res.status(401).json({ error: "no autorizado" });

    if (req.method === "GET") {
      const { rows } = await getPool().query(
        `SELECT id, created_at, client, whatsapp, email, product, hs_code, import_type, origin, status, form_data, results
         FROM calculadora_leads ORDER BY created_at DESC LIMIT 300`
      );
      return res.status(200).json({ quotes: rows.map(q => ({
        id: q.id, date: q.created_at, client: q.client, whatsapp: q.whatsapp, email: q.email,
        product: q.product, hsCode: q.hs_code, importType: q.import_type, origin: q.origin,
        status: q.status, formData: q.form_data, results: q.results, remote: true,
      })) });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      if (!id || !["nuevo", "en_analisis", "respondido", "cerrado"].includes(status)) return res.status(400).json({ error: "datos inválidos" });
      await getPool().query("UPDATE calculadora_leads SET status=$2, updated_at=now() WHERE id=$1", [id, status]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error("quotes error:", e.message);
    return res.status(500).json({ error: "error de base de datos" });
  }
}
