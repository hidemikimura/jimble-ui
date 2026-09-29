import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/guide/getting-started/',
  '/guide/theming/',
  '/guide/i18n/',
  '/guide/forms/',
  '/guide/overlays/',
  '/components/button/',
  '/components/badge/',
  '/components/card/',
  '/components/alert/',
  '/components/input/',
  '/components/textarea/',
  '/components/checkbox/',
  '/components/switch/',
  '/components/radio-group/',
  '/components/field/',
  '/components/dialog/',
  '/components/dropdown-menu/',
  '/components/select/',
  '/components/toast/',
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

// ---- R2: jimble-field のラベル・ヒント・エラーが、ブラウザの計算する名前・説明になっているか ----
test.describe('jimble-field のアクセシブルネームと説明（R2）', () => {
  test('ラベルが名前、ヒントが説明になる', async ({ page }) => {
    await page.goto('/components/field/')
    const input = page.getByRole('textbox', { name: 'メールアドレス', exact: true }).first()
    await expect(input).toHaveAccessibleName('メールアドレス')
    await expect(input).toHaveAccessibleDescription('社用アドレスを入力してください')
  })

  test('error 属性は説明に含まれ、invalid になる', async ({ page }) => {
    await page.goto('/components/field/')
    const input = page.getByRole('textbox', { name: 'ユーザー名' })
    await expect(input).toHaveAccessibleDescription('このユーザー名はすでに使われています')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  test('送信して検証に失敗すると、エラーが説明に加わる', async ({ page }) => {
    await page.goto('/components/field/')
    const example = page.locator('docs-example', { hasText: '必須とエラー' })
    const name = example.getByRole('textbox', { name: 'お名前' })
    await expect(name).toHaveAccessibleDescription('')
    await example.getByRole('button', { name: '送信' }).click()
    await expect(name).toHaveAccessibleDescription('この項目は必須です')
    await expect(name).toHaveAttribute('aria-invalid', 'true')
  })

  // ラジオの role は ElementInternals で付けている。Playwright の getByRole は internals を見ないので、
  // Chromium の実際のアクセシビリティツリー(CDP)で確認する
  test('ラジオグループの role・名前・checked が実際のアクセシビリティツリーに出る（Chromium）', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP は Chromium のみ')
    await page.goto('/components/radio-group/')
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const live = nodes.filter((n) => !n.ignored)
    const group = live.find((n) => n.role?.value === 'radiogroup' && n.name?.value === 'プラン')
    expect(group, 'radiogroup "プラン" がある').toBeTruthy()
    const radios = live.filter((n) => n.role?.value === 'radio')
    const state = Object.fromEntries(
      radios.map((n) => [
        n.name?.value,
        n.properties?.find((p) => p.name === 'checked')?.value.value,
      ]),
    )
    expect(state).toMatchObject({ 無料: 'false', Pro: 'true', Enterprise: 'false' })
  })

  test('チェックボックス・スイッチのロールと名前', async ({ page }) => {
    await page.goto('/components/checkbox/')
    await expect(page.getByRole('checkbox', { name: '利用規約に同意する' })).not.toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'お知らせを受け取る' })).toBeChecked()
    await page.goto('/components/switch/')
    await expect(page.getByRole('switch', { name: '通知を受け取る' })).toBeChecked()
  })
})

test('ラジオグループ: 矢印キーで移動と選択ができる（実キー入力）', async ({ page }) => {
  await page.goto('/components/radio-group/')
  const example = page.locator('docs-example').first()
  const group = example.locator('jimble-radio-group')
  const value = () => group.evaluate((el: HTMLElement & { value: string }) => el.value)
  await example.locator('jimble-radio[value="m"]').focus()
  await page.keyboard.press('ArrowDown')
  expect(await value()).toBe('l')
  await page.keyboard.press('ArrowDown') // XL は無効なのでスキップして S へ循環
  expect(await value()).toBe('s')
  await page.keyboard.press('ArrowUp') // S の前は循環して L
  expect(await value()).toBe('l')
})

test('フォームの例: Enter で送信され、結果が出る', async ({ page }) => {
  await page.goto('/components/input/')
  const form = page.locator('docs-example', { hasText: 'フォームの送信' })
  // input/basic には form が無いので、ガイドの例を使う
  await page.goto('/guide/forms/')
  const example = page.locator('docs-example', { hasText: 'フォームの送信とリセット' })
  await example.getByRole('textbox', { name: 'メモ' }).fill('テスト')
  await page.keyboard.press('Enter')
  await expect(example.locator('output')).toContainText('"memo":"テスト"')
  void form
})

// ---- M3: オーバーレイ ---------------------------------------------------------------------
test.describe('ダイアログ(実操作)', () => {
  test('ボタンで開き、Esc で閉じてフォーカスが戻る。背面には Tab で出ない', async ({ page }) => {
    await page.goto('/components/dialog/')
    const example = page.locator('docs-example').first()
    const opener = example.getByRole('button', { name: 'ダイアログを開く' })
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: '設定を保存しますか？' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const outside = await page.evaluate(() => {
        const a = document.activeElement
        return !!a?.closest('nav, header, .layout') && !a.closest('jimble-dialog')
      })
      expect(outside, `Tab ${i + 1} 回目`).toBe(false)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('背景を実際にクリックすると閉じる。パネルの中のクリックでは閉じない', async ({ page }) => {
    await page.goto('/components/dialog/')
    const example = page.locator('docs-example').first()
    await example.getByRole('button', { name: 'ダイアログを開く' }).click()
    const dialog = page.getByRole('dialog', { name: '設定を保存しますか？' })
    await expect(dialog).toBeVisible()
    await page.locator('#dlg-basic').getByText('変更内容は').click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(dialog).toBeHidden()
  })

  test('alertdialog は背景クリックで閉じず、autofocus の「キャンセル」にフォーカスがある', async ({
    page,
  }) => {
    await page.goto('/components/dialog/')
    const example = page.locator('docs-example', { hasText: '確認ダイアログ' })
    await example.getByRole('button', { name: '削除する' }).first().click()
    const dialog = page.getByRole('alertdialog', { name: 'この注文を削除しますか？' })
    await expect(dialog).toBeVisible()
    await expect(
      page.locator('#dlg-alert').getByRole('button', { name: 'キャンセル' }),
    ).toBeFocused()
    await page.mouse.click(4, 4)
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('フォーム入りダイアログ: autofocus の入力欄にフォーカスし、Enter で送信されて通知が出る', async ({
    page,
  }) => {
    await page.goto('/components/dialog/')
    const example = page.locator('docs-example', { hasText: 'フォーム入りのダイアログ' })
    await example.getByRole('button', { name: 'メンバーを招待' }).click()
    const dialog = page.getByRole('dialog', { name: 'メンバーを招待' })
    const input = page.locator('#dlg-form').getByRole('textbox', { name: 'メールアドレス' })
    await expect(input).toBeFocused()
    await input.fill('a@example.com')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page.locator('jimble-toast', { hasText: '招待を送りました' })).toBeVisible()
  })
})

test.describe('ドロップダウンメニュー(実操作)', () => {
  test('キーボードで開いて項目を選ぶと通知が出て、閉じてトリガーにフォーカスが戻る', async ({
    page,
  }) => {
    await page.goto('/components/dropdown-menu/')
    const example = page.locator('docs-example').first()
    const trigger = example.getByRole('button', { name: '操作' })
    await trigger.focus()
    await page.keyboard.press('ArrowDown')
    const items = example.locator('jimble-menu-item')
    await expect(items.first()).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('jimble-toast', { hasText: '選ばれた項目: copy' })).toBeVisible()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('メニューはトリガーの直下に出る(Anchor Positioning)。外側クリックで閉じる', async ({
    page,
  }) => {
    await page.goto('/components/dropdown-menu/')
    const example = page.locator('docs-example').first()
    const trigger = example.getByRole('button', { name: '操作' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const t = await trigger.boundingBox()
    const m = await example.locator('jimble-menu-item').first().boundingBox()
    expect(m!.y).toBeGreaterThan(t!.y + t!.height - 1)
    expect(m!.y - (t!.y + t!.height)).toBeLessThan(40)
    await page.mouse.click(4, 300)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('セレクト(実操作)', () => {
  test('キーボードで開いて選ぶと、フォームの値が変わる', async ({ page }) => {
    await page.goto('/components/select/')
    const example = page.locator('docs-example', { hasText: 'フォームの送信とリセット' })
    const select = example.locator('jimble-select')
    const button = select.getByRole('button')
    await button.focus()
    await page.keyboard.press('ArrowDown')
    await expect(select.locator('jimble-option').first()).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(button).toBeFocused()
    await expect(button).toContainText('編集者')
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText('"role":"editor"')
    await example.getByRole('button', { name: 'リセット' }).click()
    await expect(button).toContainText('選択してください')
  })
})

test.describe('通知(実操作)', () => {
  test('ボタンで通知が出て、閉じるボタンで消える', async ({ page }) => {
    await page.goto('/components/toast/')
    const example = page.locator('docs-example').first()
    await example.getByRole('button', { name: 'success' }).click()
    const toast = page.locator('jimble-toast', { hasText: '保存しました' })
    await expect(toast).toBeVisible()
    await toast.getByRole('button', { name: '通知を閉じる' }).click()
    await expect(toast).toHaveCount(0)
  })

  test('操作付きの通知: 押すと実行されて消える', async ({ page }) => {
    await page.goto('/components/toast/')
    const example = page.locator('docs-example', { hasText: '見出し・操作・表示時間' })
    await example.getByRole('button', { name: '元に戻せる通知' }).click()
    const toast = page.locator('jimble-toast', { hasText: '削除しました' })
    await toast.getByRole('button', { name: '元に戻す' }).click()
    await expect(page.locator('jimble-toast', { hasText: '元に戻しました' })).toBeVisible()
    await expect(toast).toHaveCount(0)
  })

  test('モーダルの中でも通知が見えて押せる(R4)。実際のアクセシビリティツリーにも出る(Chromium)', async ({
    page,
    browserName,
  }) => {
    await page.goto('/components/toast/')
    const example = page.locator('docs-example', { hasText: 'ダイアログの中でも' })
    await example.getByRole('button', { name: 'ダイアログを開く' }).click()
    const dialog = page.getByRole('dialog', { name: '通知のテスト' })
    await expect(dialog).toBeVisible()
    await page.locator('#dlg-toast').getByRole('button', { name: '通知を出す' }).click()
    const toast = page.locator('jimble-toast', { hasText: 'ダイアログの中から出した通知' })
    await expect(toast).toBeVisible()
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page)
      const { nodes } = await cdp.send('Accessibility.getFullAXTree')
      const found = nodes.filter(
        (n) => !n.ignored && String(n.name?.value ?? '').includes('ダイアログの中から出した通知'),
      )
      expect(found.length, 'モーダルの中の通知がアクセシビリティツリーにある').toBeGreaterThan(0)
    }
    // 実際のマウスで閉じるボタンを押せる（inert なら押せない）
    await toast.getByRole('button', { name: '通知を閉じる' }).click()
    await expect(toast).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
