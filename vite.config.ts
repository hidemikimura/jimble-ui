import { globSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { playwright } from '@vitest/browser-playwright'
import { sharedConfig } from './build/shared.ts'

// 入口: src/index.ts（全部）、src/components/<name>/index.ts（個別 import）、i18n、locales/*
const entries: Record<string, string> = { index: resolve('src/index.ts') }
for (const file of globSync('src/components/*/index.ts')) {
  const name = file.split('/')[2]!
  entries[`components/${name}`] = resolve(file)
}
// アイコンは 1 つずつ読み込める(icons/<name>)。icons は全部、icons/names は名前の一覧
for (const file of globSync('src/icons/register/*.ts')) {
  const name = file.split('/')[3]!.replace(/\.ts$/, '')
  entries[`icons/${name}`] = resolve(file)
}
entries['icons/names'] = resolve('src/icons/names.ts')
entries.i18n = resolve('src/i18n/index.ts')
for (const file of globSync('src/locales/*.ts')) {
  entries[`locales/${file.split('/')[2]!.replace(/\.ts$/, '')}`] = resolve(file)
}

export default defineConfig(({ mode }) =>
  mergeConfig(sharedConfig(mode), {
    build: {
      lib: { entry: entries, formats: ['es'] },
      rollupOptions: {
        // 利用者側の依存解決に任せる（CDN 用ビルドだけが全部を同梱する）
        external: [/^lit(\/|$)/, /^@lit\//, /^@floating-ui\//],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
      },
    },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/unit/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'browser',
            // キーボード操作のテストは、同じブラウザで並列に走るとフォーカスの奪い合いで不安定になる（特に Firefox）
            fileParallelism: false,
            include: ['src/**/*.test.ts', 'tests/browser/**/*.test.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
            },
          },
        },
      ],
    },
  }),
)
