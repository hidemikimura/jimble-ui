import tailwindcss from '@tailwindcss/postcss'
import type { UserConfig } from 'vite'
import shadowFix from './postcss-shadow-fix.ts'

/** ライブラリ用・CDN 用・テスト用で共通の Vite 設定（Tailwind + Shadow DOM 補正 + Lightning CSS） */
export function sharedConfig(mode: string): UserConfig {
  return {
    define: { __DEV__: JSON.stringify(mode !== 'production') },
    css: {
      postcss: { plugins: [tailwindcss(), shadowFix()] },
    },
    build: { target: 'es2023', cssMinify: 'lightningcss' },
  }
}
