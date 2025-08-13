import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Ensure the built assets are served from the correct subpath when deploying
// to GitHub Pages. The repository was renamed to "Method-Mosaic", so update
// the default base path to match the new casing.
const base = process.env.VITE_BASE_PATH || '/Method-Mosaic/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    rollupOptions: {
      external: ['@tauri-apps/api/dialog', '@tauri-apps/api/fs']
    }
  }
})
