import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri 开发服务器配置
export default defineConfig({
  plugins: [react()],
  
  // 防止 Vite 清除 Rust 错误信息
  clearScreen: false,
  
  // Tauri 需要固定端口
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // 生产环境配置
  build: {
    // Tauri 在 Windows 上使用 Chromium，在 macOS/Linux 上使用 WebKit
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 调试时不压缩
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 调试时生成 sourcemap
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
