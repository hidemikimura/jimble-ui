import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5199, strictPort: false, open: false },
  build: { outDir: 'dist', emptyOutDir: true },
})
