import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { sharedConfig } from './build/shared.ts'

// CDN 用のコマンドパレット: 全部入りの jimble-ui.js とは別のファイルにする（設計書 §22.5）。
// 自己完結(Lit なども同梱)。共有シートと言語の設定は、グローバルの 1 つを jimble-ui.js と共有する(Symbol.for)。
export default defineConfig(({ mode }) =>
  mergeConfig(sharedConfig(mode), {
    build: {
      outDir: 'dist/cdn',
      emptyOutDir: false,
      sourcemap: true,
      minify: true,
      lib: {
        entry: { 'command-palette': resolve('src/components/command-palette/index.ts') },
        formats: ['es'],
        fileName: (_format: string, name: string) => `${name}.js`,
      },
      rollupOptions: { output: { chunkFileNames: 'chunks/command-palette-[hash].js' } },
    },
  }),
)
