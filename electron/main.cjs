const { app, BrowserWindow, shell } = require("electron");
const { fork } = require("node:child_process");
const path = require("node:path");
const isDev = !app.isPackaged;
let apiProcess;
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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
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