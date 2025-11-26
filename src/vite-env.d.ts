/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    saveProject: (data: any) => void;
    getAssets: (subPath?: string) => Promise<AssetFile[]>;
  }
}