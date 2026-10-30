import express from "express";
import cors from "cors";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.NODE_ENV === "production" ? false : true }));
app.use(express.json({ limit: "1mb" }));

type Provider = "openai" | "google" | "anthropic";
const safeText = (value: unknown, max = 12000) => typeof value === "string" ? value.trim().slice(0, max) : "";

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "nova-ai-studio-api", version: "0.1.0" }));

app.post("/api/ai/chat", async (req, res) => {
  const provider = req.body?.provider as Provider;
  const apiKey = safeText(req.body?.apiKey, 500);
  const prompt = safeText(req.body?.prompt);
  const model = safeText(req.body?.model, 160);
  if (!["openai", "google", "anthropic"].includes(provider)) return res.status(400).json({ error: "Fornecedor não suportado." });
  if (!apiKey || !prompt) return res.status(400).json({ error: "Chave API e pedido são obrigatórios." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;
    if (provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers.Authorization = "Bearer " + apiKey;
      body = { model: model || "gpt-4.1-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7 };
    } else if (provider === "google") {
      const chosen = model || "gemini-2.5-flash";
      url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(chosen) + ":generateContent?key=" + encodeURIComponent(apiKey);
      body = { contents: [{ parts: [{ text: prompt }] }] };
    } else {
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "false";
      body = { model: model || "claude-3-5-haiku-latest", max_tokens: 2048, messages: [{ role: "user", content: prompt }] };
    }
    const upstream = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const data = await upstream.json() as any;
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || "O fornecedor recusou o pedido (" + upstream.status + ").";
      return res.status(upstream.status).json({ error: String(message).slice(0, 500) });
    }
    const text = provider === "openai" ? data?.choices?.[0]?.message?.content
      : provider === "google" ? data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n")
      : data?.content?.map((p: any) => p.text || "").join("\n");
    return res.json({ text: typeof text === "string" ? text : "", provider, usage: data?.usage || data?.usageMetadata || null });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Tempo limite excedido." : "Não foi possível contactar o fornecedor de IA.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log("NOVA AI STUDIO API listening on " + port));