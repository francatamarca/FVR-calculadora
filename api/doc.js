/* ── /api/doc — visor de documentos del Blob privado ────────
   Los documentos de los clientes se guardan en un Blob store PRIVADO
   (no accesibles públicamente). El panel admin los abre a través de
   este proxy, que valida la clave admin (?k=) y sirve el archivo.

   GET /api/doc?u=<blobUrl>&k=<QUOTES_ADMIN_KEY> */

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { u, k } = req.query || {};
  if (!k || k !== process.env.QUOTES_ADMIN_KEY) return res.status(401).json({ error: "no autorizado" });
  if (!u || !/^https:\/\/[a-z0-9]+\.((public|private)\.)?blob\.vercel-storage\.com\//.test(u)) {
    return res.status(400).json({ error: "url inválida" });
  }
  try {
    const r = await fetch(u, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!r.ok) return res.status(404).json({ error: "documento no encontrado" });
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=300");
    const buf = Buffer.from(await r.arrayBuffer());
    return res.status(200).send(buf);
  } catch {
    return res.status(500).json({ error: "no se pudo obtener el documento" });
  }
}
