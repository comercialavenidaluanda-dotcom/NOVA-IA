export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim().slice(0, 500) : "";
  if (!apiKey) return res.status(400).json({ error: "Gemini API Key em falta." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": apiKey }, signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json({ error: String(data?.error?.message || "A Google recusou a chave API.").slice(0, 400) });
    const models = (Array.isArray(data?.models) ? data.models : [])
      .filter(item => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes("generateContent"))
      .map(item => ({ name: String(item.name || ""), displayName: String(item.displayName || item.name || "") }))
      .filter(item => item.name);
    return res.status(200).json({ ok: true, models });
  } catch (error) {
    return res.status(502).json({ error: error?.name === "AbortError" ? "Tempo limite ao validar a chave Gemini." : "Não foi possível contactar a API Gemini." });
  } finally {
    clearTimeout(timeout);
  }
}
