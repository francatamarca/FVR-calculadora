/* Configuración comercial central de FVR.
   GET es de solo lectura y permite que todas las calculadoras usen la misma
   versión. PUT requiere la clave de administrador y aplica "último guardado
   gana" mediante una revisión incremental. */

import pg from "pg";
import { sanitizeSettings } from "./settingsModel.js";

let pool;
let tableReady;

const getPool = () => {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });
  return pool;
};

const ensureTable = async () => {
  if (!tableReady) {
    tableReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS calculadora_settings (
        id TEXT PRIMARY KEY,
        settings JSONB NOT NULL,
        revision BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
};

const responseFromRow = (row) => ({
  settings: row?.settings || null,
  revision: Number(row?.revision || 0),
  updatedAt: row?.updated_at || null,
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Configuración central no disponible." });

  try {
    await ensureTable();

    if (req.method === "GET") {
      const { rows } = await getPool().query(
        "SELECT settings, revision, updated_at FROM calculadora_settings WHERE id='canonical' LIMIT 1"
      );
      return res.status(200).json(responseFromRow(rows[0]));
    }

    if (req.method === "PUT") {
      const isAdmin = req.headers["x-admin-key"] && req.headers["x-admin-key"] === process.env.QUOTES_ADMIN_KEY;
      if (!isAdmin) return res.status(401).json({ error: "No autorizado." });

      const raw = req.body?.settings;
      if (!raw || JSON.stringify(raw).length > 30000) return res.status(400).json({ error: "Configuración inválida." });
      const baseRevision = Number(req.body?.baseRevision);
      if (!Number.isInteger(baseRevision) || baseRevision < 0) return res.status(400).json({ error: "Revisión de configuración inválida." });
      const settings = sanitizeSettings(raw);
      if (!settings) return res.status(400).json({ error: "Configuración inválida." });

      const { rows } = await getPool().query(
        `INSERT INTO calculadora_settings (id, settings, revision, updated_at)
         SELECT 'canonical', $1::jsonb, 1, now()
         WHERE $2::bigint = 0
            OR EXISTS (
              SELECT 1 FROM calculadora_settings
              WHERE id='canonical' AND revision=$2::bigint
            )
         ON CONFLICT (id) DO UPDATE SET
           settings=EXCLUDED.settings,
           revision=calculadora_settings.revision + 1,
           updated_at=now()
         WHERE calculadora_settings.revision=$2::bigint
         RETURNING settings, revision, updated_at`,
        [JSON.stringify(settings), baseRevision]
      );
      if (!rows[0]) return res.status(409).json({ error: "La configuración cambió en otra sesión. Actualizá y volvé a guardar." });
      return res.status(200).json(responseFromRow(rows[0]));
    }

    return res.status(405).end();
  } catch (error) {
    console.error("settings error:", error.message);
    return res.status(500).json({ error: "No se pudo acceder a la configuración central." });
  }
}
