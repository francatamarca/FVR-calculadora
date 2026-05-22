export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { type, value } = req.body || {};
  if (!value) return res.status(400).json({ error: "Falta el valor a analizar" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key no configurada" });

  let prompt;
  if (type === "hsCode") {
    prompt = `Eres un experto en aranceles aduaneros de Argentina con conocimiento del Nomenclador Común del MERCOSUR (NCM).
Para el código HS/NCM: "${value}", determina:
1. El derecho de importación ad valorem aplicable para importación a Argentina según el AEC del MERCOSUR vigente
2. Una descripción del tipo de mercadería que corresponde a ese código

Los aranceles más frecuentes en Argentina son: 0%, 2%, 4%, 6%, 8%, 10%, 12%, 14%, 16%, 18%, 20%, 22%, 28%, 35%.

Responde ÚNICAMENTE en JSON sin markdown ni backticks:
{"dutyRate":XX,"description":"descripción del código arancelario","confidence":"alta/media/baja"}`;
  } else {
    prompt = `Eres un experto en comercio exterior argentino con conocimiento actualizado del Nomenclador Común del MERCOSUR (NCM) y el Sistema Informático MALVINA (SIM/VUCE) de Argentina.
Para el producto: "${value}", determina:
1. El código HS/NCM más probable para importación a Argentina (formato: XXXX.XX.XX)
2. El derecho de importación ad valorem aplicable según el AEC del MERCOSUR vigente en Argentina
3. Una descripción breve y precisa del producto

Considera que Argentina aplica el Arancel Externo Común del MERCOSUR. Los aranceles más comunes son: 0%, 2%, 4%, 6%, 8%, 10%, 12%, 14%, 16%, 18%, 20%, 22%, 28%, 35%.

Responde ÚNICAMENTE en JSON sin markdown ni backticks:
{"hsCode":"XXXX.XX.XX","dutyRate":XX,"description":"descripción breve","confidence":"alta/media/baja"}`;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al llamar a la API de IA" });
  }
}
