const PROVIDERS = new Set(["google", "openai", "anthropic"]);
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const provider = clean(req.body?.provider, 20);
  const apiKey = clean(req.body?.apiKey, 500);
  const model = clean(req.body?.model, 160);
  const prompt = clean(req.body?.prompt, 12000);
  if (!PROVIDERS.has(provider)) return res.status(400).json({ error: "Fornecedor não suportado." });
  if (!apiKey || !model || !prompt) return res.status(400).json({ error: "Chave API, modelo e pedido são obrigatórios." });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);
  try {
    let url;
    const headers = { "Content-Type": "application/json" };
    let body;
    if (provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers.Authorization = "Bearer " + apiKey;
      body = { model, messages: [{ role: "user", content: prompt }], temperature: 0.7 };
    } else if (provider === "google") {
      url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
      headers["x-goog-api-key"] = apiKey;
      body = { contents: [{ parts: [{ text: prompt }] }] };
    } else {
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      body = { model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] };
    }
    const upstream = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || "O fornecedor recusou o pedido (" + upstream.status + ").";
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: String(message).slice(0, 400) });
    }
    const answer = provider === "openai" ? data?.choices?.[0]?.message?.content
      : provider === "google" ? data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n")
      : data?.content?.map(part => part.text || "").join("\n");
    return res.status(200).json({ text: typeof answer === "string" ? answer : "", provider, usage: data?.usage || data?.usageMetadata || null });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Tempo limite excedido ao contactar o fornecedor." : "Não foi possível contactar o fornecedor de IA.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
