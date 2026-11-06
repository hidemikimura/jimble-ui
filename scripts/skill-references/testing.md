# Playwright での E2E テスト

jimble-ui で作った画面を Playwright で操作・検証するときの注意。部品は Shadow DOM を持つ。Playwright の CSS ロケーターと `getByRole` は**開いた Shadow DOM を貫通する**ので、たいていは普通に書けるが、次の点だけ違う（Chromium・Firefox・WebKit で確かめた結果。jimble-ui の `tests/e2e/testing-guide.spec.ts` が保証する）。

## 探し方の早見表

| 部品                                     | 探し方                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 入力欄（input・textarea・date-input）    | **`getByRole('textbox', { name: 'ラベル' })`**。`getByLabel` は、部品に `aria-label` を直接書いたとき、部品と中の入力欄の 2 つに当たる                                                                                                                                             |
| ボタン（`jimble-button`）                | `getByRole('button', { name: '保存' })`                                                                                                                                                                                                                                            |
| チェックボックス・スイッチ               | `getByRole('checkbox' \| 'switch', { name })`。`check()` / `toBeChecked()` が使える                                                                                                                                                                                                |
| ラジオ（`jimble-radio`）                 | `getByRole('radio')` は**見つからない**。`page.locator('jimble-radio', { hasText: 'B' })`。グループも名前では探せない（`page.locator('jimble-radio-group[name="plan"]')`）                                                                                                         |
| セレクト（`jimble-select`）              | 開くボタンは `getByRole('button', { name: 'ラベル' })`（combobox ではない）。選択肢は `page.locator('jimble-option', { hasText: '編集者' })`                                                                                                                                       |
| コンボボックス（`jimble-combobox`）      | `getByRole('combobox', { name })` に `fill()`。候補は `getByRole('option', { name })`（こちらは役割が見える）                                                                                                                                                                      |
| メニューの項目（`jimble-menu-item`）     | `getByRole('menuitem')` は**見つからない**。`page.locator('jimble-menu-item', { hasText: '削除' })`                                                                                                                                                                                |
| タブ（`jimble-tab`・`jimble-tab-panel`） | `getByRole('tab', { name: '未処理' })`・`getByRole('tab', { selected: true })`・`getByRole('tabpanel', { name: '未処理' })`（タブは役割と状態を属性にも書くので、見つかる）                                                                                                        |
| 表（`jimble-table` の表・行・セル）      | `getByRole('table' \| 'row' \| 'cell')` は**見つからない**。`page.locator('jimble-table-row', { hasText: '#10001' })`                                                                                                                                                              |
| ダイアログ・ドロワー                     | `getByRole('dialog', { name: '見出し' })` で開閉を確かめる。**中身はダイアログで絞らない**（下の「ダイアログ」）                                                                                                                                                                   |
| 通知（`JimbleUI.toast()`）               | `page.locator('jimble-toast', { hasText: '保存しました' })` に `toBeVisible()`、種別は `toHaveAttribute('variant', 'danger')`。表示時間で消えるので、すぐに確かめる。`getByRole('status')` は、ほかの読み上げ用の領域にも当たり、文はスロットで入るので `toContainText` も効かない |
| コードエディタ（`jimble-code-editor`）   | 編集領域は `getByRole('textbox', { name })`。入力は下の「コードエディタ」                                                                                                                                                                                                          |

**理由**: ラジオ・セレクトの選択肢・メニューの項目・表などは、役割（role）を `ElementInternals` で部品の要素自身に付けている。属性ではないので、Playwright の `getByRole` は見ない（スクリーンリーダーには正しく伝わる）。役割で確かめたいときは、Chromium の CDP（`Accessibility.getFullAXTree`）を使う。

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
- 同じ理由で、**Shadow DOM の中の要素に `toContainText` しても、スロットで入った文は含まれない**（ダイアログの `<dialog>`、通知の領域など）。文は、部品の要素か、利用者が書いた要素で確かめる。
- ページ全体から探す（`page.getByRole('button', { name: 'はい' })`。開いているモーダルの外は操作できないので、取り違えにくい）か、部品の要素で絞る（`page.locator('jimble-dialog#confirm').getByRole('button', { name: 'はい' })`）。

## コードエディタ

- `fill()` と `pressSequentially()` は、**WebKit では入力されない**（Chromium・Firefox では入る）。`await editor.click()` のあと `await page.keyboard.type('本文')` で入力する。中身をまとめて入れるなら、`value` プロパティを設定する（`locator.evaluate((e) => (e.value = '…'))`。このときは `input` が発火しない）。
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
