import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { sharedConfig } from './build/shared.ts'

// CDN 用: 依存(Lit など)を全部同梱した自己完結の ESM。<script type="module"> 1 行で全タグが登録される。
export default defineConfig(({ mode }) =>
  mergeConfig(sharedConfig(mode), {
    build: {
      outDir: 'dist/cdn',
      emptyOutDir: false,
      sourcemap: true,
      minify: true,
      lib: {
        entry: { 'jimble-ui': resolve('src/index.ts'), 'locales/en': resolve('src/locales/en.ts') },
        formats: ['es'],
        fileName: (_format: string, name: string) => `${name}.js`,
      },
    },
  }),
)
