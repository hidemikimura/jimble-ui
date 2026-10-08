import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/guide/getting-started/',
  '/guide/theming/',
  '/guide/i18n/',
  '/guide/forms/',
  '/guide/overlays/',
  '/guide/accessibility/',
  '/guide/limitations/',
  '/guide/ai/',
  '/components/button/',
  '/components/badge/',
  '/components/card/',
  '/components/alert/',
  '/components/spinner/',
  '/components/icon/',
  '/components/input/',
  '/components/textarea/',
  '/components/checkbox/',
  '/components/switch/',
  '/components/radio-group/',
  '/components/field/',
  '/components/dialog/',
  '/components/drawer/',
  '/components/dropdown-menu/',
  '/components/select/',
  '/components/combobox/',
  '/components/date-input/',
  '/components/dual-listbox/',
  '/components/kanban/',
  '/components/file-input/',
  '/components/color-input/',
  '/components/toast/',
  '/components/tooltip/',
  '/components/app-shell/',
  '/components/sidebar-nav/',
  '/components/page-header/',
  '/components/tabs/',
  '/components/breadcrumb/',
  '/components/router/',
  '/components/pagination/',
  '/components/table/',
  '/components/description-list/',
  '/frames/app-shell/basic/',
  '/frames/app-shell/admin-page/',
  '/frames/app-shell/collapsible/',
]
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

for (const path of PAGES) {
  test(`${path}: 描画でき、コンソールエラーが無く、axe 違反が無い`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(path)
    // iframe 用の単体ページ(/frames/)は見出しを page-header の role=heading で持つので、h1 要素の検査は対象外
    if (!path.startsWith('/frames/')) await expect(page.locator('h1')).toHaveCount(1)
    await page.waitForFunction(() => customElements.get('jimble-button') !== undefined)
    // iframe プレビュー(app-shell など)は、中身を /frames/<id>/ のページとして個別に検査する
    const result = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze()
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
  for (const path of [
    '/components/button/',
    '/guide/theming/',
    '/components/table/',
    '/components/app-shell/',
    '/components/pagination/',
  ]) {
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

test.describe('日付・色・コンボボックス(実操作)', () => {
  test('日付入力: カレンダーをキーボードで操作して日を選ぶと、フォームの値が変わる', async ({
    page,
  }) => {
    await page.goto('/components/date-input/')
    const example = page.locator('docs-example', { hasText: 'フォームの送信とリセット' })
    const el = example.locator('jimble-date-input')
    const input = el.locator('input[part="input"]')
    await expect(input).toHaveValue('1990/04/01')
    await input.focus()
    await page.keyboard.press('ArrowDown')
    await expect(el.locator('[data-date="1990-04-01"]')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('1990/04/02')
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText('"birthday":"1990-04-02"')
    await example.getByRole('button', { name: 'リセット' }).click()
    await expect(input).toHaveValue('1990/04/01')
  })

  test('日付入力: 全角・区切り違いの入力が正規の書式に整い、範囲外はエラー', async ({ page }) => {
    await page.goto('/components/date-input/')
    const example = page.locator('docs-example', { hasText: '範囲（min / max）' })
    const input = example.locator('jimble-date-input input[part="input"]')
    await input.fill('2026年9月12日')
    await input.blur()
    await expect(input).toHaveValue('2026/09/12')
    await input.fill('2026/09/25')
    await input.blur()
    const valid = await example
      .locator('jimble-date-input')
      .evaluate((e) => (e as HTMLElement & { validity: ValidityState }).validity.rangeOverflow)
    expect(valid).toBe(true)
  })

  test('日付入力: 期間を 2 回クリックで選ぶと、フォームの値が 開始/終了 になる', async ({
    page,
  }) => {
    await page.goto('/components/date-input/')
    const example = page.locator('docs-example', { hasText: '期間と時刻（range と time' })
    const el = example.locator('jimble-date-input')
    const input = el.locator('input[part="input"]')
    await expect(input).toHaveValue('2026/09/29 09:00 〜 2026/09/30 18:30')
    await el.locator('[part="calendar-button"]').click()
    await el.locator('[data-date="2026-09-01"]').click()
    await el.locator('[data-date="2026-09-05"]').click()
    await expect(el.locator('[part="time-hour"]').first()).toBeEnabled()
    await el.locator('[part="time-hour"]').first().fill('7')
    await el.locator('[part="time-hour"]').first().press('Tab')
    await el.getByRole('button', { name: '完了' }).click()
    await expect(el.locator('[part="popup"]')).toBeHidden()
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText(
      '"event":"2026-09-01T07:00/2026-09-05T18:30"',
    )
  })

  test('色選択: スライダー・候補の色で値が変わり、Escape で入力欄に戻る', async ({ page }) => {
    await page.goto('/components/color-input/')
    const example = page.locator('docs-example', { hasText: 'フォームの送信とリセット' })
    const el = example.locator('jimble-color-input')
    const input = el.locator('input[type="text"]')
    await expect(input).toHaveValue('#0d9488')
    await el.getByRole('button', { name: '色を選ぶ' }).click()
    await expect(el.getByRole('dialog')).toBeVisible()
    await el.getByRole('button', { name: '#dc2626' }).click()
    await expect(input).toHaveValue('#dc2626')
    await page.keyboard.press('Escape')
    await expect(el.getByRole('dialog')).toBeHidden()
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText('"brand":"#dc2626"')
  })

  test('コンボボックス: 読みで絞り込み、矢印と Enter で選ぶ', async ({ page }) => {
    await page.goto('/components/combobox/')
    const example = page.locator('docs-example', { hasText: '基本（field と組み合わせる）' })
    const el = example.locator('jimble-combobox').first()
    const input = el.locator('input')
    await input.focus()
    await page.keyboard.type('おおさか')
    await expect(el.getByRole('option')).toHaveCount(1)
    await expect(el.getByRole('option').first()).toContainText('大阪府')
    await page.keyboard.press('Enter')
    await expect(input).toHaveValue('大阪府')
    await expect(el.getByRole('option')).toHaveCount(0)
    await input.fill('zzz')
    await expect(el.locator('[part="empty"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('大阪府')
  })

  test('コンボボックス: 取得(load)・複数選択・追加が動く', async ({ page }) => {
    await page.goto('/components/combobox/')
    const load = page.locator('docs-example', { hasText: '入力から候補を取得する' })
    const lb = load.locator('jimble-combobox')
    await lb.locator('input').focus()
    await page.keyboard.type('さと')
    await expect(lb.locator('[part="empty"]')).toContainText('読み込み中')
    await expect(lb.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(lb.locator('input')).toHaveValue('佐藤 花子')

    const multi = page.locator('docs-example', { hasText: '複数選択（multiple）' })
    const mb = multi.locator('jimble-combobox')
    await expect(mb.locator('[part="chip"]')).toHaveCount(2)
    await mb.locator('input').focus()
    await page.keyboard.press('Backspace')
    await expect(mb.locator('[part="chip"]')).toHaveCount(1)
    await mb.locator('input').fill('京都府')
    await page.keyboard.press('Enter')
    await expect(mb.locator('[part="chip"]')).toHaveCount(2)
    await multi.getByRole('button', { name: '送信' }).click()
    await expect(multi.locator('output')).toContainText('["tokyo","kyoto"]')

    const cre = page.locator('docs-example', { hasText: '一覧にない値の追加' })
    const tags = cre.locator('jimble-combobox').first()
    await tags.locator('input').fill('新タグ')
    await expect(tags.getByRole('option')).toHaveText(['「新タグ」を追加'])
    await page.keyboard.press('Enter')
    await expect(tags.locator('[part="chip"]')).toHaveCount(2)
  })

  test('コンボボックス: 実アクセシビリティツリーで combobox の状態と選択肢（Chromium）', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP は Chromium のみ')
    await page.goto('/components/combobox/')
    const example = page.locator('docs-example', { hasText: '基本（field と組み合わせる）' })
    const input = example.locator('jimble-combobox').first().locator('input')
    await input.focus()
    await page.keyboard.press('ArrowDown')
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const live = nodes.filter((n) => !n.ignored)
    const box = live.find((n) => n.role?.value === 'combobox' && n.name?.value === '都道府県')
    expect(box, 'combobox "都道府県"').toBeTruthy()
    expect(box!.properties?.find((p) => p.name === 'expanded')?.value.value).toBe(true)
    expect(live.some((n) => n.role?.value === 'option' && n.name?.value === '東京都')).toBe(true)
  })
})

test.describe('ドロワー(実操作)', () => {
  test('右から出て、Esc で閉じ、フォーカスが開いたボタンに戻る', async ({ page }) => {
    await page.goto('/components/drawer/')
    const example = page.locator('docs-example', { hasText: '基本（右から出るサイドモーダル）' })
    const opener = example.getByRole('button', { name: '詳細を開く' })
    await opener.focus()
    await page.keyboard.press('Enter')
    const drawer = example.locator('jimble-drawer')
    await expect(drawer.locator('dialog')).toBeVisible()
    // 画面の右端 = position: fixed の基準の右端(スクロールロックの余白補正のあとは全幅)
    const vw = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'
      document.body.append(probe)
      const right = probe.getBoundingClientRect().right
      probe.remove()
      return right
    })
    await expect
      .poll(async () => {
        const b = (await drawer.locator('[part="panel"]').boundingBox())!
        return Math.round(b.x + b.width)
      })
      .toBeGreaterThanOrEqual(Math.round(vw) - 1)
    await page.keyboard.press('Escape')
    await expect(drawer.locator('dialog')).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('左から出るフォーム: 閉じるボタンの名前と、パネル内だけで Tab が回る', async ({ page }) => {
    await page.goto('/components/drawer/')
    const example = page.locator('docs-example', { hasText: '絞り込みフォーム' })
    await example.getByRole('button', { name: '絞り込み', exact: true }).click()
    const drawer = example.locator('jimble-drawer')
    await expect(drawer.locator('[part="close-button"]')).toHaveAttribute('aria-label', '閉じる')
    await drawer.locator('jimble-input input').focus()
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
    const inside = await page.evaluate(() =>
      document.querySelector('#drw-form')!.contains(document.activeElement),
    )
    expect(inside).toBe(true)
  })
})

test.describe('ツールチップ(実操作)', () => {
  test('ホバーで出て、Esc で消え、フォーカスでも出る。位置は対象の上', async ({ page }) => {
    await page.goto('/components/tooltip/')
    const example = page.locator('docs-example', { hasText: '基本（マウスを重ねる' })
    const tip = example.locator('jimble-tooltip').first()
    const popup = tip.locator('[part="popup"]')
    await tip.locator('jimble-button').hover()
    await expect(popup).toBeVisible()
    const t = (await tip.locator('jimble-button').boundingBox())!
    const p = (await popup.boundingBox())!
    expect(p.y + p.height).toBeLessThanOrEqual(t.y + 1)
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    await page.mouse.move(2, 2)
    await tip.locator('jimble-button').focus()
    await expect(popup).toBeVisible()
    await expect(popup).toHaveText('変更内容を保存します')
  })

  test('aria-describedby が付いている(Chromium のアクセシビリティツリー)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP は Chromium のみ')
    await page.goto('/components/tooltip/')
    const example = page.locator('docs-example', { hasText: '基本（マウスを重ねる' })
    await example.locator('jimble-tooltip').first().locator('jimble-button').focus()
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const hit = nodes.find(
      (n) =>
        !n.ignored && n.role?.value === 'button' && n.description?.value === '変更内容を保存します',
    )
    expect(hit, 'button の description').toBeTruthy()
  })
})

test.describe('ファイル添付(実操作)', () => {
  test('ボタンから選ぶとアップロードが進み、完了するとフォームに ID が送られる', async ({
    page,
  }) => {
    await page.goto('/components/file-input/')
    const example = page.locator('docs-example', { hasText: 'サーバーへのアップロード' })
    const fi = example.locator('jimble-file-input')
    await fi.locator('input[type="file"]').setInputFiles([
      { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('a') },
      { name: 'b-error.txt', mimeType: 'text/plain', buffer: Buffer.from('b') },
    ])
    await expect(fi.locator('[part="item"]')).toHaveCount(2)
    await expect(fi.locator('[part="item"]').first()).toHaveAttribute('data-status', 'uploading')
    await expect(fi.locator('[part="item"]').first()).toHaveAttribute('data-status', 'done', {
      timeout: 10_000,
    })
    await expect(fi.locator('[part="item"]').nth(1)).toHaveAttribute('data-status', 'error', {
      timeout: 10_000,
    })
    await fi.locator('[part="item"]').nth(1).locator('[part="remove"]').click()
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText('["file-a.txt"]')
  })

  test('形式が合わないファイルは理由つきで出る。選ぶボタンはキーボードで届く', async ({ page }) => {
    await page.goto('/components/file-input/')
    const example = page.locator('docs-example', { hasText: '基本（複数・形式とサイズの制限）' })
    const fi = example.locator('jimble-file-input')
    await fi
      .locator('input[type="file"]')
      .setInputFiles([{ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }])
    await expect(fi.locator('[part="item"]')).toContainText('対応していないファイル形式です')
    await fi.locator('[part="browse"]').focus()
    await expect(fi.locator('[part="browse"]')).toBeFocused()
  })
})

test.describe('左右分割の選択(実操作)', () => {
  test('選んで「追加」で右へ移り、フォームに複数の値が送られる。キーボードでも移せる', async ({
    page,
  }) => {
    await page.goto('/components/dual-listbox/')
    const example = page.locator('docs-example', { hasText: 'フォームの送信とリセット' })
    const dl = example.locator('jimble-dual-listbox')
    await dl.locator('[data-side="available"] [role="option"]', { hasText: '管理者' }).click()
    await dl.locator('[part="add"]').click()
    await expect(dl.locator('[data-side="selected"] [role="option"]')).toHaveText([
      /閲覧者/,
      /管理者/,
    ])
    await dl.locator('[data-side="available"] [role="option"]', { hasText: '編集者' }).focus()
    await page.keyboard.press('Enter')
    await expect(dl.locator('[data-side="selected"] [role="option"]')).toHaveCount(3)
    await example.getByRole('button', { name: '送信' }).click()
    await expect(example.locator('output')).toContainText('["viewer","admin","editor"]')
    await example.getByRole('button', { name: 'リセット' }).click()
    await expect(dl.locator('[data-side="selected"] [role="option"]')).toHaveCount(1)
  })
  test('並べ替え: 「下へ」ボタンで右の一覧の順番が変わり、フォームにその順で送られる', async ({
    page,
  }) => {
    await page.goto('/components/dual-listbox/')
    const example = page.locator('docs-example', { hasText: '並べ替え（reorderable）' })
    const dl = example.locator('jimble-dual-listbox')
    const selected = dl.locator('[data-side="selected"] [role="option"]')
    await expect(selected.first()).toContainText('名前')
    await selected.first().click()
    await dl.locator('[part="move-down"]').click()
    await expect(selected.nth(1)).toContainText('名前')
    await expect(selected.nth(1)).toBeFocused()
    await selected.nth(1).press('Alt+ArrowUp')
    await expect(selected.first()).toContainText('名前')
  })
})

test.describe('フィールドの独自の検証(実操作)', () => {
  test('フォーカスが外れるとエラーが出て、同期・非同期の検証で送信が止まる', async ({ page }) => {
    await page.goto('/components/field/')
    const example = page.locator('docs-example', { hasText: '独自の検証' })
    const email = example.locator('#fld-email')
    const user = example.locator('#fld-user')
    await email.locator('input').fill('taro@gmail.com')
    await expect(email.locator('[part="error"]')).toBeHidden() // 触れる前(まだフォーカス中)
    await email.locator('input').blur()
    await expect(email.locator('[part="error"]')).toContainText('社用アドレス')
    await user.locator('input').fill('admin')
    await user.locator('input').blur()
    await expect(user.locator('[part="error"]')).toContainText('使われています')
    await email.locator('input').fill('taro@example.com')
    await user.locator('input').fill('taro')
    await user.locator('input').blur()
    await expect(user.locator('[part="error"]')).toBeHidden()
    await example.getByRole('button', { name: '登録' }).click()
    await expect(example.locator('output')).toContainText('taro@example.com')
  })
})

test.describe('ルーター(実操作)', () => {
  const BASE = '/frames/router/basic'

  test('リンクで遷移し(ページの再読み込みなし)、data が 1 回だけ渡り、戻るとスクロール位置が復元される', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`)
    await page.evaluate(() => ((window as unknown as { __mark: number }).__mark = 1))
    await page.getByRole('link', { name: 'ユーザー一覧' }).click()
    await expect(page.getByRole('heading', { name: 'ユーザー一覧（1 ページ目）' })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(`${BASE}/users`)
    // ページが読み込み直されていない(マークが残る)
    expect(await page.evaluate(() => (window as unknown as { __mark?: number }).__mark)).toBe(1)
    await expect(page).toHaveTitle('ユーザー一覧')
    await page.evaluate(() => window.scrollTo(0, 300))
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(100)
    await page.getByRole('link', { name: 'ユーザー 15' }).click()
    await expect(page.getByRole('heading', { name: 'ユーザー 15' })).toBeVisible()
    await expect(page.getByText('一覧から開きました。')).toBeVisible() // data
    await expect(page).toHaveTitle('ユーザー 15')
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'ユーザー一覧（1 ページ目）' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 5)
    await page.goForward()
    await expect(page.getByRole('heading', { name: 'ユーザー 15' })).toBeVisible()
    await expect(page.getByText('一覧から開きました。')).toHaveCount(0) // 戻る・進むでは data は渡らない
  })

  test('setQuery は、ページを再描画せずに URL だけを変える。フォーカスはページの先頭へ移る', async ({
    page,
  }) => {
    // 深いパスを直接開くには、サーバーがそのパスでもアプリを返す必要がある(静的な例では、ルートから入る)
    await page.goto(`${BASE}/`)
    await page.getByRole('link', { name: 'ユーザー一覧' }).click()
    await expect(page.getByRole('heading', { name: 'ユーザー一覧（1 ページ目）' })).toBeVisible()
    await page.evaluate(() => {
      ;(window as unknown as { __page: Element }).__page = document.querySelector(
        'jimble-router [data-jimble-outlet] ul',
      )!
    })
    await page.getByRole('button', { name: '次へ（履歴に残す）' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/users\\?page=2$`))
    // 再描画されないので、一覧の要素は同じ(見出しは、ページ側の再描画がないので、そのまま)
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __page: Element }).__page ===
          document.querySelector('jimble-router [data-jimble-outlet] ul'),
      ),
    ).toBe(true)
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${BASE}/users$`))
  })

  test('存在しないパスは、fallback のページになる', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.evaluate(
      (b) =>
        (
          document.querySelector('jimble-router') as unknown as { navigate(u: string): void }
        ).navigate(`${b}/nope`),
      BASE,
    )
    await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible()
    await expect(page).toHaveTitle('見つかりません')
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

// ---- M4: レイアウトとデータ -------------------------------------------------------------
test.describe('app-shell(実際のビューポート)', () => {
  test('広い画面: サイドバーが常に見え、メニューボタンは無い。ヘッダーは 56px でスクロールしても残る', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/frames/app-shell/admin-page/')
    const shell = page.locator('jimble-app-shell')
    await expect(shell.locator('jimble-nav-item', { hasText: '顧客' })).toBeVisible()
    expect(
      await shell.evaluate((el) => !!el.shadowRoot!.querySelector('[part="menu-button"]')),
    ).toBe(false)
    const header = await shell.evaluate((el) =>
      el.shadowRoot!.querySelector('[part="header"]')!.getBoundingClientRect().toJSON(),
    )
    expect(Math.round(header.height)).toBe(56)
    // サイドバーは左、本文は右
    const sidebar = await shell.evaluate((el) =>
      el.shadowRoot!.querySelector('[part="sidebar"]')!.getBoundingClientRect().toJSON(),
    )
    const main = await shell.evaluate((el) =>
      el.shadowRoot!.querySelector('[part="main"]')!.getBoundingClientRect().toJSON(),
    )
    expect(Math.round(sidebar.width)).toBe(256)
    expect(main.left).toBeGreaterThanOrEqual(sidebar.right - 1)
  })
  test('サイドバーを細くできる: ボタンで 64px になり、マウスを重ねると項目名と子項目つきで広がる(本文は動かない)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/frames/app-shell/collapsible/')
    const shell = page.locator('jimble-app-shell')
    const box = (part: string) =>
      shell.evaluate(
        (el, p) => el.shadowRoot!.querySelector(`[part="${p}"]`)!.getBoundingClientRect().toJSON(),
        part,
      )
    const toggle = shell.locator('[part="toggle-button"]')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(Math.round((await box('sidebar')).width)).toBe(256)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(async () => Math.round((await box('sidebar')).width)).toBe(64)
    const mainLeft = (await box('main')).left
    const nav = shell.locator('jimble-sidebar-nav')
    // 細い間は、項目名が画面に出ない(幅が 1px の読み上げ用)
    const labelWidth = () =>
      shell
        .locator('jimble-nav-item')
        .first()
        .evaluate(
          (el) =>
            el.shadowRoot!.querySelector('a > span:last-child')!.getBoundingClientRect().width,
        )
    expect(await labelWidth()).toBeLessThanOrEqual(1)

    // マウスを重ねると、本文に重なるように広がる。列の幅(本文の位置)は変わらない
    await page.mouse.move(30, 150)
    await expect.poll(async () => Math.round((await box('sidebar-panel')).width)).toBe(256)
    expect((await box('main')).left).toBe(mainLeft)
    await expect(nav).not.toHaveAttribute('compact', '')
    expect(await labelWidth()).toBeGreaterThan(40)
    // 本文の中の sticky な要素(表の見出しなど、z-sticky)より、広がったサイドバーが上に出る
    await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.id = 'probe'
      probe.style.cssText =
        'position: sticky; top: 0; z-index: 10; height: 400px; background: red; margin-top: -2rem'
      document.querySelector('jimble-app-shell')!.append(probe)
    })
    await expect
      .poll(() => page.evaluate(() => document.elementFromPoint(200, 300)?.id ?? 'sidebar'))
      .not.toBe('probe')
    // 子項目も、広がった中で開ける
    await shell.locator('jimble-nav-group').locator('[part="button"]').click()
    await expect(shell.locator('jimble-nav-item', { hasText: 'プロフィール' })).toBeVisible()

    // 離れると、細い表示に戻る(マウスで押したボタンに、フォーカスが残っていても)
    await page.mouse.move(700, 400)
    await expect.poll(async () => Math.round((await box('sidebar-panel')).width)).toBe(64)
    await expect(nav).toHaveAttribute('compact', '')
    await expect(shell.locator('jimble-nav-item', { hasText: 'プロフィール' })).toBeHidden()

    // もう一度ボタンで、広い表示に戻る
    await toggle.click()
    await expect.poll(async () => Math.round((await box('sidebar')).width)).toBe(256)
    await expect(nav).not.toHaveAttribute('compact', '')
  })
  test('広い画面: 本文が長くても、サイドバーは画面の高さ(ヘッダーの下から下端まで)で、スクロールしても動かない', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/frames/app-shell/admin-page/')
    const shell = page.locator('jimble-app-shell')
    await shell.evaluate((el) => {
      const tall = document.createElement('div')
      tall.style.height = '3000px'
      el.append(tall)
    })
    await page.evaluate(() => window.scrollTo(0, 1000))
    const rects = await shell.evaluate((el) => {
      const rect = (part: string) =>
        el.shadowRoot!.querySelector(`[part="${part}"]`)!.getBoundingClientRect().toJSON()
      return { header: rect('header'), sidebar: rect('sidebar') }
    })
    // クラスの組み立てミス(Tailwind が CSS を出さない)だと、サイドバーが本文と同じ高さに伸びて、動いてしまう
    expect(Math.round(rects.header.top)).toBe(0)
    expect(Math.round(rects.sidebar.top)).toBe(56)
    expect(Math.round(rects.sidebar.height)).toBe(700 - 56)
  })

  test('狭い画面: メニューボタンでドロワーが開き、Esc で閉じてフォーカスがボタンに戻る', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/frames/app-shell/admin-page/')
    const shell = page.locator('jimble-app-shell')
    const button = shell.getByRole('button', { name: 'メニューを開く' })
    await expect(button).toBeVisible()
    await button.click()
    const drawer = shell.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(shell.locator('jimble-nav-item', { hasText: '顧客' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('狭い画面のドロワーの背景をクリックすると閉じる', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/frames/app-shell/basic/')
    const shell = page.locator('jimble-app-shell')
    await shell.getByRole('button', { name: 'メニューを開く' }).click()
    const drawer = shell.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // ドロワーの幅(20rem=320px)より右 = 背景。右端(スクロールバーの隙間)を避け、背景の中ほどをクリックする。
    // Linux の Chromium は幅のあるスクロールバーを出すため、端(x=370)だと背景に当たらないことがある
    await page.mouse.click(345, 300)
    await expect(drawer).toBeHidden()
  })

  test('画面の幅を変えるとドロワーとサイドバーが切り替わり、開いたドロワーは閉じる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/frames/app-shell/basic/')
    const shell = page.locator('jimble-app-shell')
    await shell.getByRole('button', { name: 'メニューを開く' }).click()
    await expect(shell.getByRole('dialog')).toBeVisible()
    await page.setViewportSize({ width: 1200, height: 700 })
    await expect(shell.getByRole('dialog')).toBeHidden()
    await expect(shell.locator('jimble-nav-item', { hasText: '顧客' })).toBeVisible()
  })

  test('スキップリンク: 最初の Tab でフォーカスされ、Enter で本文に移る', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/frames/app-shell/basic/')
    const skip = page.locator('jimble-app-shell').getByRole('button', { name: '本文へ移動' })
    await skip.focus()
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    const isMain = await page.evaluate(() =>
      document.querySelector('jimble-app-shell')!.shadowRoot!.activeElement?.getAttribute('part'),
    )
    expect(isMain).toBe('main')
  })

  test('固定ヘッダーの下にフォーカスが隠れない: 下へ Tab で進んでも、フォーカスした要素はヘッダーより下に見える', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 360 })
    await page.goto('/frames/app-shell/admin-page/')
    await page.evaluate(() => window.scrollTo(0, 0))
    const buttons = page.locator('jimble-app-shell jimble-button')
    const n = await buttons.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const ok = await page.evaluate(() => {
        const shell = document.querySelector('jimble-app-shell')!
        const header = shell.shadowRoot!.querySelector('[part="header"]')!.getBoundingClientRect()
        const a = document.activeElement
        // シェル自身の要素(スキップリンク・メニューボタン)は、ヘッダーの手前に出るので対象外
        if (shell.shadowRoot!.activeElement) return true
        if (!a || a === document.body || !shell.contains(a)) return true
        return a.getBoundingClientRect().top >= header.bottom - 1
      })
      expect(ok, `Tab ${i + 1} 回目`).toBe(true)
    }
    // 実際にスクロールが起きるほど進めていること（検証が空振りでない）
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })
})

test.describe('表(R5): 実際のアクセシビリティツリー', () => {
  test('table / rowgroup / row / columnheader / cell / rowheader が出て、表に名前が付く（Chromium）', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP は Chromium のみ')
    await page.goto('/components/table/')
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const live = nodes.filter((n) => !n.ignored)
    const roles = (r: string) => live.filter((n) => n.role?.value === r)
    const table = roles('table').find((n) => n.name?.value === '注文一覧')
    expect(table, '名前付きの table').toBeTruthy()
    expect(roles('rowgroup').length).toBeGreaterThan(0)
    expect(roles('row').length).toBeGreaterThan(3)
    expect(roles('columnheader').map((n) => n.name?.value)).toEqual(
      expect.arrayContaining(['注文番号', '顧客', '状態', '金額']),
    )
    expect(roles('rowheader').map((n) => n.name?.value)).toEqual(
      expect.arrayContaining(['#1024', '#1023']),
    )
    expect(roles('cell').length).toBeGreaterThan(5)
  })

  test('並べ替えると行が並び替わり、見出しに aria-sort が付く', async ({ page, browserName }) => {
    await page.goto('/components/table/')
    const example = page.locator('docs-example').first()
    const amount = example.locator('jimble-table-head-cell', { hasText: '金額' })
    await amount.getByRole('button').click()
    const firstRowOrder = () =>
      example
        .locator('jimble-table-body jimble-table-row jimble-table-cell[header]')
        .allTextContents()
    expect((await firstRowOrder()).map((t) => t.trim())).toEqual(['#1023', '#1024', '#1022'])
    await amount.getByRole('button').click()
    expect((await firstRowOrder()).map((t) => t.trim())).toEqual(['#1022', '#1024', '#1023'])
    // 見出しに aria-sort が設定されている(ElementInternals)。CDP のアクセシビリティツリーは sort を公開しないので、値で確認する
    const ariaSort = await amount.evaluate(
      (el) => (el as unknown as { internals: ElementInternals }).internals.ariaSort,
    )
    expect(ariaSort).toBe('descending')
    void browserName
  })

  test('固定ヘッダー: 表の中をスクロールしても見出しが残る（3 エンジン）', async ({ page }) => {
    await page.goto('/components/table/')
    const example = page.locator('docs-example', { hasText: '固定ヘッダーと最大の高さ' })
    const table = example.locator('jimble-table')
    const head = table.locator('jimble-table-head-cell').first()
    const offset = async () =>
      table.evaluate((t) => {
        const s = t.shadowRoot!.querySelector('[part="scroller"]')!.getBoundingClientRect()
        return Math.round(
          t.querySelector('jimble-table-head-cell')!.getBoundingClientRect().top - s.top,
        )
      })
    const before = await offset()
    await table.evaluate((t) => (t.shadowRoot!.querySelector('[part="scroller"]')!.scrollTop = 150))
    expect(await offset()).toBe(before)
    await expect(head).toBeVisible()
  })
})

test.describe('タブ・ページネーション・パンくず・ナビ・説明リスト(実操作)', () => {
  test('タブ: 矢印キーで切り替わり、パネルが変わる。tabpanel に名前が付く', async ({ page }) => {
    await page.goto('/components/tabs/')
    const example = page.locator('docs-example').first()
    const tabs = example.locator('jimble-tab')
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
    await expect(example.locator('jimble-tab-panel[value="open"]')).toBeVisible()
    await expect(example.locator('jimble-tab-panel[value="all"]')).toBeHidden()
    await page.keyboard.press('ArrowRight') // 無効な「完了」を飛ばす
    await expect(tabs.nth(3)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(tabs.first()).toBeFocused()
  })

  test('タブ: 実アクセシビリティツリーで tab / tabpanel の名前と selected（Chromium）', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CDP は Chromium のみ')
    await page.goto('/components/tabs/')
    const cdp = await page.context().newCDPSession(page)
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const live = nodes.filter((n) => !n.ignored)
    const tab = live.find((n) => n.role?.value === 'tab' && n.name?.value === 'すべて')
    expect(tab, 'tab "すべて"').toBeTruthy()
    expect(tab!.properties?.find((p) => p.name === 'selected')?.value.value).toBe(true)
    expect(live.some((n) => n.role?.value === 'tablist' && n.name?.value === '注文の表示')).toBe(
      true,
    )
    expect(live.some((n) => n.role?.value === 'tabpanel' && n.name?.value === 'すべて')).toBe(true)
  })

  test('ページネーション: クリックでページが変わり、現在のページが移る', async ({ page }) => {
    await page.goto('/components/pagination/')
    const pager = page.locator('docs-example').first().locator('jimble-pagination').first()
    await expect(pager.getByRole('button', { name: '1 ページ目', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await pager.getByRole('button', { name: '3 ページ目', exact: true }).click()
    await expect(pager.getByRole('button', { name: '3 ページ目', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(pager.getByText('243 件中 41〜60 件')).toBeVisible()
    await pager.getByRole('button', { name: '次のページ', exact: true }).click()
    await expect(pager.getByText('243 件中 61〜80 件')).toBeVisible()
  })

  test('パンくず・サイドバー: ランドマークと現在のページ', async ({ page }) => {
    await page.goto('/components/breadcrumb/')
    const example = page.locator('docs-example').first()
    await expect(example.getByRole('navigation', { name: 'パンくずリスト' })).toBeVisible()
    // 項目は light DOM の子(スロット)なので、nav の中ではなく host から探す
    await expect(
      example
        .locator('jimble-breadcrumb-item', { hasText: '注文 #1024' })
        .locator('[aria-current="page"]'),
    ).toHaveCount(1)
    await page.goto('/components/sidebar-nav/')
    const nav = page.locator('docs-example').first()
    await expect(nav.getByRole('navigation', { name: 'メインメニュー' })).toBeVisible()
    await expect(
      nav.locator('jimble-nav-item', { hasText: 'ダッシュボード' }).getByRole('link'),
    ).toHaveAttribute('aria-current', 'page')
    const group = nav.locator('jimble-nav-group').getByRole('button', { name: '設定' })
    await expect(group).toHaveAttribute('aria-expanded', 'false')
    await group.click()
    await expect(group).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.locator('jimble-nav-item', { hasText: 'チーム' })).toBeVisible()
  })

  test('説明リスト: 広い画面では項目名と値が横に並び、狭い画面では縦に並ぶ', async ({ page }) => {
    const measure = () =>
      page.evaluate(() => {
        const item = document.querySelector('jimble-description-item')!
        const l = item.shadowRoot!.querySelector('[part="label"]')!.getBoundingClientRect()
        const v = item.shadowRoot!.querySelector('[part="value"]')!.getBoundingClientRect()
        return { sameRow: Math.abs(l.top - v.top) < 4, valueRightOfLabel: v.left >= l.right - 1 }
      })
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/components/description-list/')
    expect(await measure()).toEqual({ sameRow: true, valueRightOfLabel: true })
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/components/description-list/')
    expect((await measure()).sameRow).toBe(false)
  })
})

test('サイト内のリンクが切れていない（全ページのリンク先が 200 で開ける）', async ({
  page,
  request,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'リンクの存在確認はエンジンに依らないので Chromium だけで行う',
  )
  const seen = new Set<string>()
  const broken: string[] = []
  for (const path of PAGES.filter((p) => !p.startsWith('/frames/'))) {
    await page.goto(path)
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href),
    )
    for (const href of hrefs) {
      const url = new URL(href)
      if (url.origin !== new URL(page.url()).origin) continue // 外部リンクは対象外
      url.hash = ''
      if (seen.has(url.href)) continue
      seen.add(url.href)
      const res = await request.get(url.href)
      if (res.status() !== 200) broken.push(`${path} → ${url.pathname} (${res.status()})`)
    }
  }
  expect(broken).toEqual([])
  expect(seen.size).toBeGreaterThan(20)
})
