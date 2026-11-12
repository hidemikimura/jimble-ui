// CLI（cli/bin.ts → dist/cli/jimble-ui.js）。Node で動く 1 ファイルにする。依存は Node の組み込みだけ（設計書 §17）
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: resolve(import.meta.dirname, 'cli/bin.ts'),
    outDir: 'dist/cli',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'jimble-ui.js',
        banner: '#!/usr/bin/env node',
      },
    },
  },
})
