// skill の references/testing.md(Playwright での E2E テストの注意)に書いたことが、本当であることを確かめる。
// 部品の作りが変わって、ここが落ちたら、scripts/skill-references/testing.md も直す。
import { expect, test, type Page } from '@playwright/test'

const FIXTURE = `<main>
<jimble-field label="氏名"><jimble-input name="name"></jimble-input></jimble-field>
<jimble-input aria-label="検索"></jimble-input>
<jimble-checkbox name="agree">同意する</jimble-checkbox>
<jimble-radio-group label="プラン" name="plan"><jimble-radio value="a">A</jimble-radio><jimble-radio value="b">B</jimble-radio></jimble-radio-group>
<jimble-field label="役割"><jimble-select name="role" placeholder="選択してください"><jimble-option value="admin">管理者</jimble-option><jimble-option value="editor">編集者</jimble-option></jimble-select></jimble-field>
<jimble-field label="都道府県"><jimble-combobox name="pref"><jimble-option value="tokyo">東京都</jimble-option><jimble-option value="osaka">大阪府</jimble-option></jimble-combobox></jimble-field>
<jimble-field label="日付"><jimble-date-input name="date"></jimble-date-input></jimble-field>
<jimble-button id="off" disabled>無効</jimble-button>
<jimble-dropdown-menu><jimble-button slot="trigger">操作</jimble-button><jimble-menu-item value="del">削除</jimble-menu-item></jimble-dropdown-menu>
<jimble-tabs label="表示"><jimble-tab value="a">すべて</jimble-tab><jimble-tab value="b">未処理</jimble-tab><jimble-tab-panel value="a">A</jimble-tab-panel><jimble-tab-panel value="b">B</jimble-tab-panel></jimble-tabs>
<jimble-table label="注文"><jimble-table-header><jimble-table-row><jimble-table-head-cell>番号</jimble-table-head-cell></jimble-table-row></jimble-table-header><jimble-table-body><jimble-table-row><jimble-table-cell>#1</jimble-table-cell></jimble-table-row></jimble-table-body></jimble-table>
<jimble-dialog id="dlg" heading="保存しますか？"><p>本文</p><jimble-button slot="footer">はい</jimble-button></jimble-dialog>
<jimble-field label="本文"><jimble-code-editor id="ce"></jimble-code-editor></jimble-field>
</main>`

// コードエディタも登録されるページを開き、本文を試す部品に差し替える
async function setup(page: Page) {
  await page.goto('/components/code-editor/')
  await page.waitForFunction(() => customElements.get('jimble-code-editor'))
  await page.evaluate((html) => {
    document.body.innerHTML = html
    ;(document.getElementById('ce') as unknown as { variables: unknown }).variables = [
      { name: 'customer_name', label: '顧客名' },
    ]
  }, FIXTURE)
}

test.beforeEach(async ({ page }) => setup(page))

test('入力欄: getByRole(textbox) は 1 つ。部品に aria-label を書くと、getByLabel は 2 つに当たる', async ({
  page,
}) => {
  await expect(page.getByRole('textbox', { name: '検索' })).toHaveCount(1)
  await expect(page.getByLabel('検索')).toHaveCount(2)
  const name = page.getByRole('textbox', { name: '氏名' })
  await name.fill('山田')
  await expect(name).toHaveValue('山田')
  // 部品の要素には fill できない
  await expect(
    page.locator('jimble-input[name="name"]').fill('x', { timeout: 1000 }),
  ).rejects.toThrow()
})

test('役割を ElementInternals で持つ部品は、getByRole で見つからない。文字で探す', async ({
  page,
}) => {
  for (const role of ['radio', 'menuitem', 'table', 'row'] as const)
    await expect(page.getByRole(role), role).toHaveCount(0)
  await expect(page.locator('jimble-select').getByRole('option')).toHaveCount(0)
  // 見えるもの
  // ラジオグループは、役割はあるが、名前では探せない
  await expect(page.getByRole('radiogroup', { name: 'プラン' })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: '同意する' })).toHaveCount(1)

  await page.locator('jimble-radio', { hasText: 'B' }).click()
  await expect(page.locator('jimble-radio-group')).toHaveJSProperty('value', 'b')
  await page.getByRole('button', { name: '操作' }).click()
  await page.locator('jimble-menu-item', { hasText: '削除' }).click()
})

test('タブは、役割と状態を属性にも書くので、getByRole で探せる', async ({ page, browserName }) => {
  const tab = page.getByRole('tab', { name: '未処理' })
  await expect(page.getByRole('tab', { selected: true })).toHaveText('すべて')
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { selected: true })).toHaveText('未処理')
  await expect(page.getByRole('tabpanel', { name: '未処理' })).toBeVisible()
  await expect(page.locator('jimble-tabs')).toHaveJSProperty('value', 'b')
  if (browserName !== 'chromium') return
  // 実際のアクセシビリティツリー: タブが二重にならず、選択の状態が属性と同じ
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  const tabs = nodes.filter((n) => !n.ignored && n.role?.value === 'tab')
  expect(
    tabs.map((n) => [n.name?.value, n.properties?.find((p) => p.name === 'selected')?.value.value]),
  ).toEqual([
    ['すべて', false],
    ['未処理', true],
  ])
})

test(':state() で、部品の状態を CSS ロケーターから探せる', async ({ page }) => {
  await page.locator('jimble-tab', { hasText: '未処理' }).click()
  await expect(page.locator('jimble-tab:state(selected)')).toHaveText('未処理')
  await page.locator('jimble-radio', { hasText: 'B' }).click()
  await expect(page.locator('jimble-radio:state(checked)')).toHaveText('B')
  await page.getByRole('button', { name: '役割' }).click()
  await page.locator('jimble-option', { hasText: '編集者' }).click()
  await expect(page.locator('jimble-option:state(selected)')).toHaveText('編集者')
  await expect(page.locator('jimble-checkbox:state(disabled)')).toHaveCount(0)
})

test('セレクトは「ボタン → jimble-option」。selectOption は使えない', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: '役割' })).toHaveCount(0)
  await expect(
    page.locator('jimble-select').selectOption('editor', { timeout: 1000 }),
  ).rejects.toThrow()
  await page.getByRole('button', { name: '役割' }).click()
  await page.locator('jimble-option', { hasText: '編集者' }).click()
  await expect(page.locator('jimble-select')).toHaveJSProperty('value', 'editor')
})

test('コンボボックスの候補と、日付の入力', async ({ page }) => {
  await page.getByRole('combobox', { name: '都道府県' }).fill('大阪')
  await page.locator('jimble-combobox').getByRole('option', { name: '大阪府' }).click()
  await expect(page.locator('jimble-combobox')).toHaveJSProperty('value', 'osaka')
  const date = page.getByRole('textbox', { name: '日付' })
  await date.fill('2026-09-12')
  await date.press('Tab')
  await expect(page.locator('jimble-date-input')).toHaveJSProperty('value', '2026-09-12')
})

test('無効なボタン: 役割で押すと待ち続ける。部品の要素で押すと、何も起きずに通る', async ({
  page,
}) => {
  const byRole = page.getByRole('button', { name: '無効' })
  await expect(byRole).toBeDisabled()
  await expect(byRole.click({ timeout: 1000 })).rejects.toThrow(/Timeout/)
  await page.locator('#off').click({ timeout: 1000 })
  expect(await page.locator('#off').isDisabled()).toBe(false)
})

test('ダイアログの中身は、ダイアログで絞ると見つからない。ページ全体か、部品の要素で絞る', async ({
  page,
}) => {
  await page.evaluate(() => (document.getElementById('dlg') as unknown as { show(): void }).show())
  const dialog = page.getByRole('dialog', { name: '保存しますか？' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'はい' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'はい' })).toHaveCount(1)
  await expect(page.locator('#dlg').getByRole('button', { name: 'はい' })).toHaveCount(1)
})

test('コードエディタ: クリックして keyboard.type で入力できる。{{ で候補が開く', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', { name: '本文' })
  await editor.click()
  await page.keyboard.type('こんにちは {{cust')
  // Enter で選ぶと、重いときに候補が閉じた後に届いて改行になることがある。候補をクリックする
  await page.locator('#ce').getByRole('option', { name: '顧客名' }).click()
  await expect(page.locator('#ce')).toHaveJSProperty('value', 'こんにちは {{customer_name}}')
})

test('コードエディタ: WebKit では fill が入らない(だから keyboard.type を使う)', async ({
  page,
  browserName,
}) => {
  await page.getByRole('textbox', { name: '本文' }).fill('入力')
  await expect(page.locator('#ce')).toHaveJSProperty(
    'value',
    browserName === 'webkit' ? '' : '入力',
  )
})

test('通知は jimble-toast で探す。領域(status・alert)では確かめられない', async ({ page }) => {
  await page.evaluate(() => {
    const ui = (
      window as unknown as {
        JimbleUI: { toast: { success(m: string): void; danger(m: string): void } }
      }
    ).JimbleUI
    ui.toast.success('保存しました')
    ui.toast.danger('保存できませんでした')
  })
  await expect(page.locator('jimble-toast', { hasText: '保存しました' })).toBeVisible()
  await expect(page.locator('jimble-toast', { hasText: '保存できませんでした' })).toHaveAttribute(
    'variant',
    'danger',
  )
  // 読み上げ用の別の status にも当たる。文はスロットで入るので、領域の文に含まれない
  await expect(page.getByRole('status')).toHaveCount(2)
  await expect(page.locator('jimble-toast-region').getByRole('alert')).not.toContainText(
    '保存できませんでした',
  )
})

test('jimble-* イベントは document まで届かない(部品の要素で受ける)', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const got = { document: false, element: false }
    const tabs = document.querySelector('jimble-tabs')!
    document.addEventListener('jimble-tab-change', () => (got.document = true))
    tabs.addEventListener('jimble-tab-change', () => (got.element = true))
    tabs.querySelector<HTMLElement>('jimble-tab[value="b"]')!.click()
    await new Promise((r) => setTimeout(r, 50))
    return got
  })
  expect(result).toEqual({ document: false, element: true })
})
