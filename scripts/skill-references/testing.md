# Playwright での E2E テスト

jimble-ui で作った画面を Playwright で操作・検証するときの注意。部品は Shadow DOM を持つ。Playwright の CSS ロケーターと `getByRole` は**開いた Shadow DOM を貫通する**ので、たいていは普通に書けるが、次の点だけ違う（Chromium・Firefox・WebKit で確かめた結果。jimble-ui の `tests/e2e/testing-guide.spec.ts` が保証する）。

## まず、操作の関数を使う（`@hidemikimura/jimble-ui/testing`）

書きにくい操作は、jimble-ui が配る関数でまとめて書ける（Playwright は型だけを使う。`@playwright/test` 1.45 以上）。下の注意の多くを、この関数が吸収している。

```ts
import { expect, test } from '@playwright/test'
import { jimble } from '@hidemikimura/jimble-ui/testing'

test('注文を登録する', async ({ page }) => {
  await page.goto('/orders/new')
  const ui = jimble(page)
  await ui.ready() // ページの jimble-* が登録されるまで待つ(読み込み忘れなら、部品名を出して失敗する)

  await page.getByRole('textbox', { name: '氏名' }).fill('山田')
  await ui.select('役割').choose('編集者')
  await ui.combobox('都道府県').choose('大阪府', { search: '大阪' })
  await ui.dateInput('配達日').fill('2026-09-12')
  await ui.codeEditor('本文').type('こんにちは ')
  await ui.codeEditor('本文').chooseVariable('顧客名') // {{ を入力して、候補をクリックで選ぶ
  await expect(ui.select('役割').host).toHaveJSProperty('value', 'editor')

  const detail = await ui.waitForEvent<{ value: string }>(
    ui.menu('操作').host,
    'jimble-select',
    () => ui.menu('操作').choose('共有', 'メールで送る'), // サブメニューは道順で
  )
  expect(detail.value).toBe('mail')

  await page.getByRole('button', { name: '保存' }).click()
  await ui.dialog('保存しますか？').getByRole('button', { name: 'はい' }).click() // 中身はこれで絞る
  await expect(ui.toast('保存しました')).toBeVisible()
  await expect(ui.table('注文').getByRole('row', { name: /#10001/ })).toBeVisible() // 行はこれで絞る
})
```

| 関数                                              | 返すもの・すること                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ready({ timeout })`                              | ページの `jimble-*` がすべて登録されるまで待つ                                                                    |
| `select(label)`                                   | `.host`・`.trigger`・`.option(name)`・`.choose(name)`                                                             |
| `combobox(label)`                                 | `.host`・`.input`・`.option(name)`・`.choose(name, { search })`                                                   |
| `dateInput(label)`                                | `.host`・`.input`・`.fill('2026-09-12')`（入力して Tab で確定）                                                   |
| `codeEditor(label)`                               | `.host`・`.editor`・`.type(text)`（末尾に入力）・`.chooseVariable(label)`・`.setValue(value)`                     |
| `menu(trigger)`                                   | `.host`・`.trigger`・`.item(name)`・`.choose(...path)`                                                            |
| `dialog(heading)`・`table(label)`                 | 部品の要素の Locator。中身・行は、これで絞って探す                                                                |
| `toast(text)`                                     | 通知の Locator（`toHaveAttribute('variant', 'danger')` で種別）                                                   |
| `waitForEvent(target, name, action, { timeout })` | `action` の間に `target` で起きたイベントの `detail`（`jimble-*` イベントはバブルしないので、部品の要素で受ける） |

ラベルは `jimble-field` の `label` か `aria-label`。入力欄・ボタン・チェックボックス・ラジオ・タブは、`getByRole` で直接書く（関数は無い）。

## 探し方の早見表

| 部品                                     | 探し方                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 入力欄（input・textarea・date-input）    | **`getByRole('textbox', { name: 'ラベル' })`**。`getByLabel` は、部品に `aria-label` を直接書いたとき、部品と中の入力欄の 2 つに当たる                                                                                                                                             |
| ボタン（`jimble-button`）                | `getByRole('button', { name: '保存' })`                                                                                                                                                                                                                                            |
| チェックボックス・スイッチ               | `getByRole('checkbox' \| 'switch', { name })`。`check()` / `toBeChecked()` が使える                                                                                                                                                                                                |
| ラジオ（`jimble-radio`）                 | `getByRole('radio', { name: 'B' })`（`check()` / `toBeChecked()` が使える）。グループは `getByRole('radiogroup', { name })`（名前は `aria-label` か `jimble-field` のラベル）                                                                                                      |
| セレクト（`jimble-select`）              | 開くボタンは `getByRole('button', { name: 'ラベル' })`（combobox ではない）。選択肢は `getByRole('option', { name: '編集者' })`                                                                                                                                                    |
| コンボボックス（`jimble-combobox`）      | `getByRole('combobox', { name })` に `fill()`。候補は `getByRole('option', { name })`（こちらは役割が見える）                                                                                                                                                                      |
| メニューの項目（`jimble-menu-item`）     | `getByRole('menuitem', { name: '削除' })`                                                                                                                                                                                                                                          |
| タブ（`jimble-tab`・`jimble-tab-panel`） | `getByRole('tab', { name: '未処理' })`・`getByRole('tab', { selected: true })`・`getByRole('tabpanel', { name: '未処理' })`（タブは役割と状態を属性にも書くので、見つかる）                                                                                                        |
| 表（`jimble-table`）                     | 表は `getByRole('table', { name: 'ラベル' })` で見つかるが、**行・セルは表で絞らない**（スロットで入るので見つからない）。部品の要素で絞る: `page.locator('jimble-table[label="注文"]').getByRole('row', { name: /#10001/ })`                                                      |
| ダイアログ・ドロワー                     | `getByRole('dialog', { name: '見出し' })` で開閉を確かめる。**中身はダイアログで絞らない**（下の「ダイアログ」）                                                                                                                                                                   |
| 通知（`JimbleUI.toast()`）               | `page.locator('jimble-toast', { hasText: '保存しました' })` に `toBeVisible()`、種別は `toHaveAttribute('variant', 'danger')`。表示時間で消えるので、すぐに確かめる。`getByRole('status')` は、ほかの読み上げ用の領域にも当たり、文はスロットで入るので `toContainText` も効かない |
| コードエディタ（`jimble-code-editor`）   | 編集領域は `getByRole('textbox', { name })`。入力は下の「コードエディタ」                                                                                                                                                                                                          |

**理由**: 役割（role）は `ElementInternals` で部品の要素に付けているが、Playwright の `getByRole` は `ElementInternals` を見ない。そのため、ラジオ・セレクトの選択肢・メニューの項目・タブ・表は、役割と状態（`aria-checked`・`aria-selected` など）を**属性にも書いている**（利用者が書いた属性は上書きしない）。ほかの部品（パンくずの項目・カンバン・アイコンなど）は、役割を属性に書いていないので、`getByRole` で見つからない。文字か `:state()` で探す。役割で確かめたいときは、Chromium の CDP（`Accessibility.getFullAXTree`）を使う。

## 値を確かめる

- 入力欄: `await expect(page.getByRole('textbox', { name: '氏名' })).toHaveValue('山田')`。
- セレクト・コンボボックス・ラジオグループ・日付・コードエディタなど: 部品の要素の `value` プロパティを見る。`await expect(page.locator('jimble-select[name="role"]')).toHaveJSProperty('value', 'editor')`。
- **部品の要素（`jimble-input` など）に `fill()` しない**（「`<input>` ではない」と失敗する）。`getByRole('textbox')` が中の入力欄を指す。
- 日付は `fill('2026-09-12')` のあと `press('Tab')` で確定する（値は `YYYY-MM-DD` の文字列）。

## 状態で探す（`:state()`）

部品の状態は、CSS の `:state()` で公開している（各部品の API の「状態」）。Playwright の CSS ロケーターで、そのまま探せる（Chromium・Firefox・WebKit とも）。

```ts
await expect(page.locator('jimble-tab:state(selected)')).toHaveText('未処理') // 選ばれているタブ
await expect(page.locator('jimble-radio:state(checked)')).toHaveText('B') // 選ばれているラジオ
await expect(page.locator('jimble-option:state(selected)')).toHaveText('編集者') // セレクトの選んだ選択肢
await expect(page.locator('jimble-input:state(invalid)')).toHaveCount(1) // 誤りを表示している入力欄
```

主な状態: `selected`（タブ・選択肢）、`checked`（ラジオ）、`invalid` / `touched` / `disabled` / `readonly`（フォームの部品）、`current`（サイドバーの今のページ）、`loading`（ボタン）、`empty`（表）。

## 無効な部品

- `getByRole('button', { name })` で無効なボタンを `click()` すると、**押せるようになるまで待ち続けて**、制限時間で失敗する。無効であることは `await expect(…).toBeDisabled()` で確かめる。
- 部品の要素（`page.locator('jimble-button#save')`）を `click()` すると、無効でも**何も起きずに通る**（要素自身は無効と判定されない）。押せないことを確かめるつもりで書くと、誤って通る。

## ダイアログ

- `jimble-dialog` の中身（本文・`slot="footer"` のボタン）は、Shadow DOM の `<dialog>` に**スロットで入る**だけで、`<dialog>` の DOM の子ではない。そのため `page.getByRole('dialog').getByRole('button', …)` は**見つからない**。
- **表**も同じ: `getByRole('table')` は Shadow DOM の中の要素を指すので、それで絞ると、行・セルが見つからない。
- 同じ理由で、**Shadow DOM の中の要素に `toContainText` しても、スロットで入った文は含まれない**（ダイアログの `<dialog>`、通知の領域など）。文は、部品の要素か、利用者が書いた要素で確かめる。
- ページ全体から探す（`page.getByRole('button', { name: 'はい' })`。開いているモーダルの外は操作できないので、取り違えにくい）か、部品の要素で絞る（`page.locator('jimble-dialog#confirm').getByRole('button', { name: 'はい' })`）。

## コードエディタ

- `fill()` と `pressSequentially()` は、**WebKit では入力されない**（Chromium・Firefox では入る）。`await editor.click()` のあと、**日本語は `await page.keyboard.insertText('本文')`** で入力する（`keyboard.type` で日本語を 1 文字ずつ送ると、WebKit では、空の欄の 1 文字目のあとでカーソルが進まず、「こんにちは」が「んにちはこ」になることがある）。英数字や `{{` は `keyboard.type` でよい。中身をまとめて入れるなら、`value` プロパティを設定する（`locator.evaluate((e) => (e.value = '…'))`。このときは `input` が発火しない）。
- `page.keyboard.type('{{cust')` で変数の候補が開き、`getByRole('option')` で見つかる。候補は `getByRole('option', { name: '顧客名' }).click()` で選ぶ（`Enter` は、重いときに候補が閉じた後に届いて、改行になることがある）。値は `toHaveJSProperty('value', '… {{customer_name}}')` で確かめる。

## イベント・待ち方

- **`jimble-*` イベント（`jimble-select`・`jimble-tab-change` など）はバブルしない**。`page.evaluate` でリスナーを付けるときは、`document` ではなく部品の要素に付ける。
- 部品は JavaScript で登録される。ロケーターの操作は自動で待つが、`page.goto()` の直後に `evaluate` で部品のプロパティやメソッドを使うときは、先に `await page.waitForFunction(() => customElements.get('jimble-select'))` で登録を待つ。
- コードエディタは全部入りに含まれない（別に読み込む）。読み込み忘れると、要素は空のまま。
- 表を `columns` / `rows` で描く（仮想スクロール）と、見えている行だけが DOM にある。画面の外の行は、スクロールしてから探すか、`rows` のデータで確かめる。

## 環境

- macOS の Firefox・WebKit は、既定では **Tab がボタンやリンクに止まらない**（OS の設定）。キーボードの移動を試すときは、Tab の行き先をテキスト入力にするか、Chromium で試す。
- 日本語は `fill()` / `keyboard.type()` で入る（変換中の状態は作れないので、IME は手で確かめる）。
- CI で `npx playwright install --with-deps` が、Ubuntu のミラーが遅いときに数十分止まることがある。Playwright のコンテナ（`mcr.microsoft.com/playwright:v<版>-noble`）で動かすと、ブラウザと OS の依存の取得がなくなる。
