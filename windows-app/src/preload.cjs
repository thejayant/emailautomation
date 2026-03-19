const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("outboundFlowDesktop", {
  connectGmail: () => ipcRenderer.invoke("desktop:connect-gmail"),
  isDesktop: true,
  version: process.versions.electron,
});
