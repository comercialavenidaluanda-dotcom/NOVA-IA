const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const fs = require("node:fs/promises");
const { fork } = require("node:child_process");
const path = require("node:path");
const isDev = !app.isPackaged;
let apiProcess;
const secretFile = () => path.join(app.getPath("userData"), "nova-secure-settings.json");
ipcMain.handle("nova:gemini:save", async (_event, key) => {
  if (typeof key !== "string" || !key.trim()) return { saved: false };
  if (!safeStorage.isEncryptionAvailable()) return { saved: false, reason: "secure-storage-unavailable" };
  const encrypted = safeStorage.encryptString(key.trim()).toString("base64");
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(secretFile(), JSON.stringify({ geminiApiKey: encrypted }), { mode: 0o600 });
  return { saved: true };
});
ipcMain.handle("nova:gemini:get", async () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return "";
    const saved = JSON.parse(await fs.readFile(secretFile(), "utf8"));
    return saved.geminiApiKey ? safeStorage.decryptString(Buffer.from(saved.geminiApiKey, "base64")) : "";
  } catch { return ""; }
});
ipcMain.handle("nova:gemini:has", async () => {
  try {
    const saved = JSON.parse(await fs.readFile(secretFile(), "utf8"));
    return Boolean(saved.geminiApiKey);
  } catch { return false; }
});
function startBundledApi() {
  const resourcesPath = process.resourcesPath;
  const unpackedRoot = path.join(resourcesPath, "app.asar.unpacked");
  const apiPath = path.join(unpackedRoot, "dist-server", "index.cjs");
  const ffmpegPath = path.join(resourcesPath, "ffmpeg.exe");

  apiProcess = fork(apiPath, [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: "8787",
      NODE_PATH: path.join(unpackedRoot, "node_modules"),
      NOVA_FFMPEG_PATH: ffmpegPath
    },
    stdio: "ignore"
  });
  apiProcess.on("error", error => console.error("[NOVA API] Falha ao iniciar:", error));
  apiProcess.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) console.error("[NOVA API] Processo terminou:", code, signal);
  });
}

async function waitForBundledApi(timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (apiProcess?.exitCode !== null && apiProcess?.exitCode !== undefined) {
      throw new Error("A API local terminou antes de ficar pronta.");
    }
    try {
      const response = await fetch("http://127.0.0.1:8787/api/health", {
        signal: AbortSignal.timeout(1200)
      });
      if (response.ok) {
        const health = await response.json();
        if (health?.ok === true) return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error("A API local não ficou pronta dentro do tempo esperado.");
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 980, minHeight: 680,
    backgroundColor: "#10131b",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.cjs") }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  if (isDev) win.loadURL("http://localhost:5173");
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(async () => {
  if (!isDev) {
    startBundledApi();
    try {
      await waitForBundledApi();
    } catch (error) {
      console.error("[NOVA AI STUDIO] API local indisponível:", error);
    }
  }
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("before-quit", () => { if (apiProcess && !apiProcess.killed) apiProcess.kill(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });