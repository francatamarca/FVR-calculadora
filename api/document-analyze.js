/* ── /api/document-analyze ──────────────────────────────────
   Extracción automática de datos desde factura proforma / packing list
   (PDF o imagen) usando Claude con document blocks.

   REGLAS:
   - Requiere ANTHROPIC_API_KEY en Vercel; sin key responde 501 con mensaje
     claro (la UI lo muestra y ofrece carga manual).
   - El HS Code que traiga el documento se devuelve como "hsDeclaradoProveedor"
     y se valida contra el motor arancelario local — NUNCA se toma como verdad.
   - El arancel sugerido sale SIEMPRE de la base local (tariffEngine).
   - Los archivos NO se guardan: se procesan en memoria y se descartan.
     (Persistirlos requiere backend con storage — ver src/lib/storage.js.)
   - Límite 4 MB base64 (las funciones Vercel aceptan ~4.5 MB de body). */

import { classifyCode, classifyProduct, toLegacyShape } from "../src/lib/tariffEngine.js";

const MAX_B64 = 4 * 1024 * 1024; // ~3 MB de archivo real
const MIME_OK = { "application/pdf": "document", "image/jpeg": "image", "image/png": "image", "image/webp": "image" };

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "La lectura automática de documentos todavía no está activa. Cargá los datos manualmente — el cálculo funciona igual.",
      code: "AI_NOT_CONFIGURED",
    });
  }

  const { mimeType, dataBase64 } = req.body || {};
  const blockType = MIME_OK[mimeType];
  if (!blockType) return res.status(400).json({ error: "Formato no soportado. Subí PDF, JPG, PNG o WebP." });
  if (!dataBase64 || typeof dataBase64 !== "string") return res.status(400).json({ error: "Falta el archivo." });
  if (dataBase64.length > MAX_B64) return res.status(413).json({ error: "Archivo muy grande (máx. ~3 MB). Comprimilo o subí solo la página principal." });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            { type: blockType, source: { type: "base64", media_type: mimeType, data: dataBase64 } },
            { type: "text", text: `Extraé los datos de esta factura proforma / packing list de importación.
Devolvé ÚNICAMENTE JSON sin markdown con este formato exacto (null si un dato no aparece):
{"producto":"descripción comercial corta","cantidad":N,"precioUnitario":N,"valorTotal":N,"moneda":"USD","incoterm":"FOB",
"hsCodeDeclarado":"XXXX.XX.XX","pesoNetoKg":N,"pesoBrutoKg":N,"bultos":N,"largoCm":N,"anchoCm":N,"altoCm":N,
"cbmTotal":N,"paisOrigen":"China","proveedor":"nombre","observaciones":"breve"}
No inventes valores: si no está en el documento, poné null. No calcules aranceles.` },
          ],
        }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Anthropic ${response.status}`);
    const data = await response.json();
    const text = data?.content?.[0]?.text || "";
    const p = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Validación server-side campo por campo (nunca confiar en la IA a ciegas)
    const extracted = {
      producto: typeof p.producto === "string" ? p.producto.slice(0, 200) : null,
      cantidad: num(p.cantidad),
      precioUnitario: num(p.precioUnitario),
      valorTotal: num(p.valorTotal),
      moneda: typeof p.moneda === "string" ? p.moneda.slice(0, 10) : null,
      incoterm: typeof p.incoterm === "string" ? p.incoterm.slice(0, 10) : null,
      hsDeclaradoProveedor: typeof p.hsCodeDeclarado === "string" ? p.hsCodeDeclarado.slice(0, 20) : null,
      pesoNetoKg: num(p.pesoNetoKg),
      pesoBrutoKg: num(p.pesoBrutoKg),
      bultos: num(p.bultos),
      largoCm: num(p.largoCm),
      anchoCm: num(p.anchoCm),
      altoCm: num(p.altoCm),
      cbmTotal: num(p.cbmTotal),
      paisOrigen: typeof p.paisOrigen === "string" ? p.paisOrigen.slice(0, 60) : null,
      proveedor: typeof p.proveedor === "string" ? p.proveedor.slice(0, 100) : null,
      observaciones: typeof p.observaciones === "string" ? p.observaciones.slice(0, 300) : null,
    };

    // Sugerencia arancelaria: HS declarado validado contra la base local,
    // o clasificación por descripción. El % nunca viene del documento ni de la IA.
    let arancel = null;
    if (extracted.hsDeclaradoProveedor) {
      arancel = toLegacyShape(classifyCode(extracted.hsDeclaradoProveedor));
      arancel.warnings = ["HS declarado por el PROVEEDOR — suele venir mal: validalo antes de operar.", ...arancel.warnings];
    } else if (extracted.producto) {
      arancel = toLegacyShape(classifyProduct(extracted.producto));
    }

    const faltantes = [];
    if (!extracted.valorTotal && !extracted.precioUnitario) faltantes.push("valor FOB");
    if (!extracted.pesoBrutoKg && !extracted.pesoNetoKg) faltantes.push("peso");
    if (!extracted.cbmTotal && !(extracted.largoCm && extracted.anchoCm && extracted.altoCm)) faltantes.push("medidas o CBM");

    return res.status(200).json({ ok: true, extracted, arancel, faltantes });
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return res.status(422).json({
      error: aborted
        ? "El documento tardó demasiado en procesarse. Probá con un archivo más liviano o cargá los datos manualmente."
        : "No se pudo leer el documento. Verificá que sea una factura/packing legible y, si no, cargá los datos manualmente.",
    });
  }
}
