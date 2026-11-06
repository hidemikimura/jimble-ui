import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { sharedConfig } from './build/shared.ts'

// CDN 用のコードエディタ: CodeMirror を含むので、全部入りの jimble-ui.js とは別のファイルにする。
// 自己完結(Lit なども同梱)。言語(HTML・JSON)は、使うときに chunks/ から読み込む。
// 言語の設定と共有シートは、グローバルの 1 つを jimble-ui.js と共有する(Symbol.for)。
export default defineConfig(({ mode }) =>
  mergeConfig(sharedConfig(mode), {
    build: {
      outDir: 'dist/cdn',
      emptyOutDir: false,
      sourcemap: true,
      minify: true,
      lib: {
        entry: { 'code-editor': resolve('src/components/code-editor/index.ts') },
        formats: ['es'],
        fileName: (_format: string, name: string) => `${name}.js`,
      },
      rollupOptions: { output: { chunkFileNames: 'chunks/code-editor-[hash].js' } },
    },
  }),
)
