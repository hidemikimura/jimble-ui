import tailwindcss from '@tailwindcss/postcss'
import { Features } from 'lightningcss'
import type { UserConfig } from 'vite'
import shadowFix from './postcss-shadow-fix.ts'

/** ライブラリ用・CDN 用・テスト用で共通の Vite 設定（Tailwind + Shadow DOM 補正 + Lightning CSS） */
export function sharedConfig(mode: string): UserConfig {
  return {
    define: { __DEV__: JSON.stringify(mode !== 'production') },
    css: {
      postcss: { plugins: [tailwindcss(), shadowFix()] },
      // light-dark() を --lightningcss-light/-dark の変数に置き換えさせない（ダークモード。設計書 §4.8）。
      // Tailwind 自身も同じものを除外している。
      lightningcss: { exclude: Features.LightDark },
    },
    build: { target: 'es2023', cssMinify: 'lightningcss' },
  }
}
