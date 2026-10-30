const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("novaSecureStore", {
  saveApiKey: (provider, key) => ipcRenderer.invoke("nova:keys:save", provider, key),
  getApiKey: (provider) => ipcRenderer.invoke("nova:keys:get", provider),
  hasApiKey: (provider) => ipcRenderer.invoke("nova:keys:has", provider),
  deleteApiKey: (provider) => ipcRenderer.invoke("nova:keys:delete", provider),
  saveGeminiKey: (key) => ipcRenderer.invoke("nova:gemini:save", key),
  getGeminiKey: () => ipcRenderer.invoke("nova:gemini:get"),
  hasGeminiKey: () => ipcRenderer.invoke("nova:gemini:has")
});
