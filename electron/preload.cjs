const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("novaSecureStore", {
  saveGeminiKey: (key) => ipcRenderer.invoke("nova:gemini:save", key),
  getGeminiKey: () => ipcRenderer.invoke("nova:gemini:get"),
  hasGeminiKey: () => ipcRenderer.invoke("nova:gemini:has")
});
