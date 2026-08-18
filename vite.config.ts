import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 配置 @ 路径别名，指向 src 目录
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
