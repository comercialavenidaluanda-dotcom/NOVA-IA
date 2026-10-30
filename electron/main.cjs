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