import express from "express";
import cors from "cors";
import multer from "multer";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegStaticPath from "ffmpeg-static";

const app = express();
app.disable("x-powered-by");
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === "null" ||
      origin === "http://localhost:5173" ||
      /^https:\/\/(?:[a-z0-9-]+\.)*vercel\.app$/i.test(origin)
    ) return callback(null, true);
    return callback(new Error("Origem não autorizada."));
  }
}));
app.use(express.json({ limit: "1mb" }));

type Provider = "openai" | "google" | "anthropic";
const safeText = (value: unknown, max = 12000) => typeof value === "string" ? value.trim().slice(0, max) : "";

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "nova-ai-studio-api", version: "0.2.0", videoRender: Boolean(resolveFfmpegPath()) }));

function resolveFfmpegPath() {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  const packagedPath = resourcesPath ? path.join(resourcesPath, "ffmpeg.exe") : null;
  const candidate = process.env.NOVA_FFMPEG_PATH || (packagedPath && existsSync(packagedPath) ? packagedPath : ffmpegStaticPath);
  return candidate && existsSync(candidate) ? candidate : null;
}

const upload = multer({
  dest: path.join(os.tmpdir(), "nova-ai-studio-uploads"),
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("video/")) return callback(null, true);
    callback(new Error("Importa um ficheiro de vídeo válido."));
  }
});

app.post("/api/video/render", upload.single("file"), async (req, res) => {
  const inputPath = req.file?.path;
  if (!inputPath) return res.status(400).json({ error: "Ficheiro de vídeo em falta." });
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    await rm(inputPath, { force: true });
    return res.status(503).json({ error: "Motor FFmpeg não encontrado nesta instalação." });
  }

  const trimStart = Number(req.body.trimStart);
  const trimEnd = Number(req.body.trimEnd);
  const speed = Number(req.body.speed);
  const volume = Number(req.body.volume);
  const resolution = req.body.resolution === "720" ? "1280:720" : "1920:1080";
  const fps = [24, 30, 60].includes(Number(req.body.fps)) ? Number(req.body.fps) : 30;
  const effect = safeText(req.body.effect, 20);
  const duration = trimEnd - trimStart;

  if (![trimStart, trimEnd, speed, volume].every(Number.isFinite) || trimStart < 0 || duration <= 0 || duration > 60 * 60 * 4 || speed < 0.5 || speed > 2 || volume < 0 || volume > 1) {
    await rm(inputPath, { force: true });
    return res.status(400).json({ error: "Parâmetros de edição inválidos." });
  }

  const outputPath = path.join(path.dirname(inputPath), randomUUID() + ".mp4");
  const videoFilters = ["setpts=PTS/" + speed];
  if (effect === "mono") videoFilters.push("hue=s=0");
  if (effect === "warm") videoFilters.push("colorbalance=rs=0.08:gs=0.02:bs=-0.06");
  if (effect === "cool") videoFilters.push("colorbalance=rs=-0.05:gs=0.01:bs=0.08");
  if (effect === "vivid") videoFilters.push("eq=contrast=1.08:saturation=1.55");
  if (effect === "cinema") videoFilters.push("eq=contrast=1.16:saturation=0.82");
  if (effect === "soft") videoFilters.push("eq=brightness=0.04:saturation=0.85");
  videoFilters.push("scale=" + resolution + ":force_original_aspect_ratio=decrease", "pad=" + resolution + ":(ow-iw)/2:(oh-ih)/2", "fps=" + fps);
  const audioFilters = ["atempo=" + speed, "volume=" + volume];
  const args = [
    "-hide_banner", "-y", "-ss", String(trimStart), "-i", inputPath, "-t", String(duration),
    "-map", "0:v:0", "-map", "0:a?", "-vf", videoFilters.join(","),
    "-af", audioFilters.join(","), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath
  ];

  const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 15 * 60 * 1000);
  child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-5000); });
  child.on("error", async () => {
    clearTimeout(timeout);
    await rm(inputPath, { force: true });
    await rm(outputPath, { force: true });
    if (!res.headersSent) res.status(500).json({ error: "Não foi possível iniciar o FFmpeg." });
  });
  child.on("close", async code => {
    clearTimeout(timeout);
    await rm(inputPath, { force: true });
    if (code !== 0) {
      await rm(outputPath, { force: true });
      if (!res.headersSent) res.status(timedOut ? 504 : 500).json({ error: timedOut ? "A renderização excedeu o limite de 15 minutos." : "Falha na renderização. Verifica o formato do vídeo e tenta novamente.", detail: stderr.slice(-900) });
      return;
    }
    res.download(outputPath, "nova-ai-studio-video.mp4", async () => {
      await rm(outputPath, { force: true });
    });
  });
  res.on("close", () => {
    if (!res.writableEnded && !child.killed) child.kill();
  });
});

app.post("/api/ai/google/models", async (req, res) => {
  const apiKey = safeText(req.body?.apiKey, 500);
  if (!apiKey) return res.status(400).json({ error: "Gemini API Key em falta." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": apiKey }, signal: controller.signal
    });
    const data = await upstream.json() as any;
    if (!upstream.ok) {
      const message = data?.error?.message || "A Google recusou a chave API.";
      return res.status(upstream.status).json({ error: String(message).slice(0, 500) });
    }
    const models = (Array.isArray(data?.models) ? data.models : [])
      .filter((item: any) => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes("generateContent"))
      .map((item: any) => ({ name: String(item.name || ""), displayName: String(item.displayName || item.name || "") }))
      .filter((item: any) => item.name);
    return res.json({ ok: true, models });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Tempo limite ao validar a chave Gemini." : "Não foi possível contactar a API Gemini.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const provider = req.body?.provider as Provider;
  const apiKey = safeText(req.body?.apiKey, 500);
  const prompt = safeText(req.body?.prompt);
  const model = safeText(req.body?.model, 160);
  if (!["openai", "google", "anthropic"].includes(provider)) return res.status(400).json({ error: "Fornecedor não suportado." });
  if (!apiKey || !prompt || !model) return res.status(400).json({ error: "Chave API, ID do modelo ativo e pedido são obrigatórios." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: unknown;
    if (provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers.Authorization = "Bearer " + apiKey;
      body = { model, messages: [{ role: "user", content: prompt }], temperature: 0.7 };
    } else if (provider === "google") {
      const chosen = model;
      url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(chosen) + ":generateContent";
      headers["x-goog-api-key"] = apiKey;
      body = { contents: [{ parts: [{ text: prompt }] }] };
    } else {
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "false";
      body = { model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] };
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

export default app;

if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT || 8787);
  app.listen(port, "127.0.0.1", () => console.log("NOVA AI STUDIO API listening on 127.0.0.1:" + port));
}
