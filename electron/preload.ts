import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (data: any) => ipcRenderer.send('save-project', data),
  getAssets: (subPath?: string) => ipcRenderer.invoke('get-assets', subPath),
})