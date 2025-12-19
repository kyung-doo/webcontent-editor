import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (data: any) => ipcRenderer.send('save-project', data),
  getAssets: (subPath?: string) => ipcRenderer.invoke('get-assets', subPath),
  getScripts: () => ipcRenderer.invoke('get-scripts'),
  openPreview: (width: number, height: number, pageId: string) => ipcRenderer.send('open-preview', width, height, pageId),

  // [Renderer -> Main] 액션 보내기
  dispatch: (action: any) => ipcRenderer.send('dispatch-main', action),

  // [Main -> Renderer] 액션 받기 (리스너 등록)
  onDispatch: (callback: (action: any) => void) => {
    const subscription = (_: any, action: any) => callback(action);
    ipcRenderer.on('dispatch-renderer', subscription);
    return () => ipcRenderer.removeListener('dispatch-renderer', subscription);
  },
  
  // 초기 상태 가져오기
  getInitialState: () => ipcRenderer.invoke('get-initial-state'),

  // 스크립트 vscode 실행
  openInVSCode: (path: string) => ipcRenderer.invoke('open-in-vscode', path),
  
  getFonts: () => ipcRenderer.invoke("get-fonts"),
  fetchUrl: (url: string) => ipcRenderer.invoke("fetch-url", url),

  getAssetsBaseUrl: () => ipcRenderer.invoke('get-assets-base-url'),

})