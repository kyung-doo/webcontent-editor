import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        // Electron 메인 프로세스 진입점
        entry: 'electron/main.ts',
      },
      preload: {
        // 프리로드 스크립트 진입점
        input: 'electron/preload.ts',
      },
      renderer: {}, // 렌더러 프로세스 HMR 활성화
    }),
    renderer(), 
  ],
})