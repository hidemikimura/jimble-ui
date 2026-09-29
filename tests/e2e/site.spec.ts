import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/guide/getting-started/',
  '/guide/theming/',
  '/guide/i18n/',
  '/components/button/',
  '/components/badge/',
  '/components/card/',
  '/components/alert/',
]
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

for (const path of PAGES) {
  test(`${path}: 描画でき、コンソールエラーが無く、axe 違反が無い`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(path)
    await expect(page.locator('h1')).toHaveCount(1)
    await page.waitForFunction(() => customElements.get('jimble-button') !== undefined)
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(
      result.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
      ),
    ).toEqual([])
    expect(errors).toEqual([])
  })
}

test('例ブロック: 矢印キーでタブが切り替わり、ソースが表示される', async ({ page }) => {
  await page.goto('/components/button/')
  const example = page.locator('docs-example').first()
  const preview = example.getByRole('tab', { name: 'プレビュー' })
  const source = example.getByRole('tab', { name: 'ソース' })
  await expect(preview).toHaveAttribute('aria-selected', 'true')
  await preview.focus()
  await page.keyboard.press('ArrowRight')
  await expect(source).toHaveAttribute('aria-selected', 'true')
  await expect(source).toBeFocused()
  await expect(example.locator('[slot="source"]')).toBeVisible()
  await expect(example.locator('[slot="source"]')).toContainText('<jimble-button')
  await expect(example.locator('[slot="preview"]')).toBeHidden()
  await page.keyboard.press('Home')
  await expect(preview).toHaveAttribute('aria-selected', 'true')
})

test('例ブロック: コピーで状態が通知される', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard の権限付与は Chromium のみ')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/components/button/')
  const example = page.locator('docs-example').first()
  await example.getByRole('button', { name: 'コピー' }).click()
  await expect(example.getByRole('status')).toHaveText('コピーしました')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('jimble-button')
})

test('プレビューのボタンが実際に操作できる（loading は止まる）', async ({ page }) => {
  await page.goto('/components/button/')
  const loading = page.locator('jimble-button[loading]').first()
  await expect(loading).toBeVisible()
  await loading.click()
  await expect(loading.locator('button')).toHaveAttribute('aria-busy', 'true')
})

test('スキップリンクと現在ページ表示がある', async ({ page }) => {
  await page.goto('/components/alert/')
  // Safari はタブキーでリンクにフォーカスしない設定が既定なので、focus() してから確認する
  const skip = page.getByRole('link', { name: '本文へ移動' })
  await skip.focus()
  await expect(skip).toBeFocused()
  const box = await skip.boundingBox()
  expect(box && box.x >= 0).toBe(true) // フォーカス時は画面内に出る
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
  await expect(
    page.getByRole('navigation', { name: 'ドキュメント' }).getByRole('link', { name: 'Alert' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('モバイル幅(375px)で横スクロールが出ない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  for (const path of ['/components/button/', '/guide/theming/']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})
