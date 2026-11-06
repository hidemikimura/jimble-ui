// @hidemikimura/jimble-ui/testing(Playwright 用の操作の関数)の試験
import { expect, test } from '@playwright/test'
import { jimble } from '../../src/testing/index.ts'

const FIXTURE = `<main>
<jimble-field label="役割"><jimble-select name="role" placeholder="選択してください"><jimble-option value="admin">管理者</jimble-option><jimble-option value="editor">編集者</jimble-option></jimble-select></jimble-field>
<jimble-field label="都道府県"><jimble-combobox name="pref"><jimble-option value="tokyo">東京都</jimble-option><jimble-option value="osaka">大阪府</jimble-option></jimble-combobox></jimble-field>
<jimble-field label="日付"><jimble-date-input name="date"></jimble-date-input></jimble-field>
<jimble-field label="本文"><jimble-code-editor id="ce"></jimble-code-editor></jimble-field>
<jimble-dropdown-menu id="menu"><jimble-button slot="trigger">操作</jimble-button>
  <jimble-menu-item value="edit">編集</jimble-menu-item>
  <jimble-menu-item>共有<jimble-menu-item slot="submenu" value="mail">メールで送る</jimble-menu-item></jimble-menu-item>
</jimble-dropdown-menu>
<jimble-table label="注文"><jimble-table-header><jimble-table-row><jimble-table-head-cell>番号</jimble-table-head-cell><jimble-table-head-cell>顧客</jimble-table-head-cell></jimble-table-row></jimble-table-header>
<jimble-table-body><jimble-table-row><jimble-table-cell>#1</jimble-table-cell><jimble-table-cell>山田</jimble-table-cell></jimble-table-row><jimble-table-row><jimble-table-cell>#2</jimble-table-cell><jimble-table-cell>佐藤</jimble-table-cell></jimble-table-row></jimble-table-body></jimble-table>
<jimble-dialog id="dlg" heading="保存しますか？"><p>保存します。</p><jimble-button slot="footer" data-dialog-close>はい</jimble-button></jimble-dialog>
<jimble-dialog id="alert" heading="削除しますか？" alert><jimble-button slot="footer" data-dialog-close>キャンセル</jimble-button></jimble-dialog>
</main>`

test.beforeEach(async ({ page }) => {
  await page.goto('/components/code-editor/')
  await page.evaluate((html) => {
    document.body.innerHTML = html
    ;(document.getElementById('ce') as unknown as { variables: unknown }).variables = [
      { name: 'customer_name', label: '顧客名' },
    ]
  }, FIXTURE)
})

test('ready: ページの jimble-* がすべて登録されるまで待つ', async ({ page }) => {
  await jimble(page).ready()
  const undefinedTags = await page.evaluate(() =>
    [...document.querySelectorAll('*')].filter(
      (e) => e.localName.startsWith('jimble-') && !customElements.get(e.localName),
    ),
  )
  expect(undefinedTags).toHaveLength(0)
})

test('ready: 登録されない部品があれば、その名前を出して失敗する', async ({ page }) => {
  await page.evaluate(() => document.body.append(document.createElement('jimble-no-such')))
  await expect(jimble(page).ready({ timeout: 500 })).rejects.toThrow('jimble-no-such')
})

test('select: ラベルで探し、選択肢を選ぶ', async ({ page }) => {
  const role = jimble(page).select('役割')
  await role.choose('編集者')
  await expect(role.host).toHaveJSProperty('value', 'editor')
  await expect(role.trigger).toContainText('編集者')
})

test('combobox: 入力して候補を選ぶ(検索の文字を指定できる)', async ({ page }) => {
  const pref = jimble(page).combobox('都道府県')
  await pref.choose('大阪府', { search: '大阪' })
  await expect(pref.host).toHaveJSProperty('value', 'osaka')
})

test('dateInput: 入力して確定する', async ({ page }) => {
  const date = jimble(page).dateInput('日付')
  await date.fill('2026-09-12')
  await expect(date.host).toHaveJSProperty('value', '2026-09-12')
})

test('codeEditor: 末尾に入力し、変数を候補から選ぶ。値をまとめて入れる', async ({ page }) => {
  const editor = jimble(page).codeEditor('本文')
  await editor.type('こんにちは ')
  await editor.chooseVariable('顧客名')
  await editor.type(' 様')
  await expect(editor.host).toHaveJSProperty('value', 'こんにちは {{customer_name}} 様')
  await editor.setValue('差し替え')
  await expect(editor.host).toHaveJSProperty('value', '差し替え')
})

test('menu: 項目を選ぶ。サブメニューは道順で選ぶ', async ({ page }) => {
  const ui = jimble(page)
  const menu = ui.menu('操作')
  const first = await ui.waitForEvent<{ value: string }>(menu.host, 'jimble-select', () =>
    menu.choose('編集'),
  )
  expect(first.value).toBe('edit')
  const nested = await ui.waitForEvent<{ value: string }>(menu.host, 'jimble-select', () =>
    menu.choose('共有', 'メールで送る'),
  )
  expect(nested.value).toBe('mail')
})

test('dialog: 見出しで探し、中身(スロット)を探せる。alert のダイアログも', async ({ page }) => {
  const ui = jimble(page)
  await page.evaluate(() => (document.getElementById('dlg') as unknown as { show(): void }).show())
  const dialog = ui.dialog('保存しますか？')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('保存します。')).toBeVisible()
  await dialog.getByRole('button', { name: 'はい' }).click()
  await expect(page.getByRole('dialog', { name: '保存しますか？' })).toBeHidden()

  await page.evaluate(() =>
    (document.getElementById('alert') as unknown as { show(): void }).show(),
  )
  await ui.dialog('削除しますか？').getByRole('button', { name: 'キャンセル' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
})

test('table: 名前で探し、行・セルを探せる', async ({ page }) => {
  const table = jimble(page).table('注文')
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(table.getByRole('row', { name: /#2/ }).getByRole('cell').nth(1)).toHaveText('佐藤')
})

test('toast: 文で探す', async ({ page }) => {
  await page.evaluate(() =>
    (
      window as unknown as { JimbleUI: { toast: { danger(m: string): void } } }
    ).JimbleUI.toast.danger('保存できませんでした'),
  )
  const toast = jimble(page).toast('保存できませんでした')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveAttribute('variant', 'danger')
})

test('waitForEvent: 部品の要素で受ける(バブルしないイベント)。届かなければ失敗する', async ({
  page,
}) => {
  const ui = jimble(page)
  const role = ui.select('役割')
  await expect(
    ui.waitForEvent(role.host, 'jimble-never', async () => {}, { timeout: 300 }),
  ).rejects.toThrow('jimble-never')
})
