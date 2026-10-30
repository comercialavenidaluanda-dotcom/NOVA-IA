const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const fs = require("node:fs/promises");
const { fork } = require("node:child_process");
const path = require("node:path");
const isDev = !app.isPackaged;
let apiProcess;
const secretFile = () => path.join(app.getPath("userData"), "nova-secure-settings.json");
const allowedProviders = new Set(["google", "openai", "anthropic"]);
async function readSecureSettings() {
  try { return JSON.parse(await fs.readFile(secretFile(), "utf8")); } catch { return {}; }
}
async function saveProviderKey(provider, key) {
  if (!allowedProviders.has(provider) || typeof key !== "string" || !key.trim() || key.length > 500) return { saved: false, reason: "invalid-input" };
  if (!safeStorage.isEncryptionAvailable()) return { saved: false, reason: "secure-storage-unavailable" };
  const settings = await readSecureSettings();
  settings.apiKeys = settings.apiKeys && typeof settings.apiKeys === "object" ? settings.apiKeys : {};
  settings.apiKeys[provider] = safeStorage.encryptString(key.trim()).toString("base64");
  // Migrate the previous Gemini-only setting without exposing plaintext.
  delete settings.geminiApiKey;
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(secretFile(), JSON.stringify(settings), { mode: 0o600 });
  return { saved: true };
}
ipcMain.handle("nova:keys:save", async (_event, provider, key) => saveProviderKey(provider, key));
ipcMain.handle("nova:keys:get", async (_event, provider) => {
  try {
    if (!allowedProviders.has(provider) || !safeStorage.isEncryptionAvailable()) return "";
    const settings = await readSecureSettings();
    const encrypted = settings.apiKeys?.[provider] || (provider === "google" ? settings.geminiApiKey : "");
    return encrypted ? safeStorage.decryptString(Buffer.from(encrypted, "base64")) : "";
  } catch { return ""; }
});
ipcMain.handle("nova:keys:has", async (_event, provider) => {
  if (!allowedProviders.has(provider)) return false;
  const settings = await readSecureSettings();
  return Boolean(settings.apiKeys?.[provider] || (provider === "google" && settings.geminiApiKey));
});
ipcMain.handle("nova:keys:delete", async (_event, provider) => {
  if (!allowedProviders.has(provider)) return { deleted: false };
  const settings = await readSecureSettings();
  if (settings.apiKeys) delete settings.apiKeys[provider];
  if (provider === "google") delete settings.geminiApiKey;
  await fs.writeFile(secretFile(), JSON.stringify(settings), { mode: 0o600 });
  return { deleted: true };
});
// Backward-compatible Gemini IPC aliases for older renderer builds.
ipcMain.handle("nova:gemini:save", async (_event, key) => saveProviderKey("google", key));
ipcMain.handle("nova:gemini:get", async () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return "";
    const settings = await readSecureSettings();
    const encrypted = settings.apiKeys?.google || settings.geminiApiKey;
    return encrypted ? safeStorage.decryptString(Buffer.from(encrypted, "base64")) : "";
  } catch { return ""; }
});
ipcMain.handle("nova:gemini:has", async () => {
  const settings = await readSecureSettings();
  return Boolean(settings.apiKeys?.google || settings.geminiApiKey);
});
function startBundledApi() {
  const apiPath = path.join(__dirname, "../dist-server/index.cjs");
  apiProcess = fork(apiPath, [], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: "8787", NODE_ENV: "production" },
    stdio: "ignore"
  });
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
app.whenReady().then(() => {
  if (!isDev) startBundledApi();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("before-quit", () => { if (apiProcess && !apiProcess.killed) apiProcess.kill(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });