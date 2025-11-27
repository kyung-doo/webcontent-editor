import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer' // 👈 import 추가
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {}, // HMR 활성화 설정
    }),
    // 👇 [중요] 이 플러그인이 있어야 HMR이 안정적으로 작동합니다.
    renderer(), 
  ],
})