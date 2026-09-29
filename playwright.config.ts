import { defineConfig, devices } from '@playwright/test'

// ドキュメントサイト(site/dist)に対する E2E。`npm run test:e2e`
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', locale: 'ja-JP' },
  webServer: {
    command:
      'npm run build:site && npx vite preview --config site/vite.config.ts --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
