---
name: jimble-ui
description: jimble-ui（`<jimble-button>` など `jimble-` で始まる Web Components）で管理画面の HTML を書く・直すときに使う。コンポーネントの選び方、属性・イベント・スロットの書き方、フォームのラベル付けと送信、表・ダイアログ・メニュー・通知・app-shell の組み立て、見た目のカスタマイズ（CSS 変数 → ::part() → スロット）、アクセシビリティ上の注意を含む。
---

# jimble-ui の使い方

`@hidemikimura/jimble-ui` は、管理画面向けの Web Components です。素の HTML に書けて、React などのラッパーはありません。内部は Shadow DOM で、Tailwind は利用者側に不要です。UI の文言は日本語が既定です。

- ドキュメントとすべての例: <https://hidemikimura.github.io/jimble-ui/>
- 属性・スロット・イベント・part・CSS 変数の完全な一覧（機械可読）: `node_modules/@hidemikimura/jimble-ui/custom-elements.json`
- 下の「コンポーネント早見」は、その一覧から生成した要約です。**細かい仕様（各属性の意味、既定値、キー操作）は各コンポーネントのページを見てください。推測で属性を作らないこと。**

## 読み込み

CDN（依存の Lit も同梱。全部品が登録され、`JimbleUI` グローバルも使える）:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/jimble-ui.js"
></script>
<!-- 任意: 登録前のちらつき防止 -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cloak.css"
/>
```

npm（使うものだけ登録できる）:

```ts
import '@hidemikimura/jimble-ui' // すべて
import '@hidemikimura/jimble-ui/button' // 個別
import { toast } from '@hidemikimura/jimble-ui/toast'
```

1.0 までは、マイナーバージョンで互換性が壊れることがあります（`@0.1` のように固定するのを勧める）。

## 共通の規約

- タグは `jimble-*`。属性は kebab-case（`icon-only`、`sticky-header`）。プロパティは camelCase（`iconOnly`）。
- 真偽値は**属性の有無**で表す（`disabled`、`loading`、`open`）。`disabled="false"` と書いても、属性があるので**無効になる**（有効にするには属性を書かない）。
- 共通の属性: `variant`（見た目。部品ごとの決まった値。未知の値は既定に戻る）、`size`（`sm` / `md` / `lg`、既定 `md`）、`disabled`、`loading`、`open`。
- 独自イベントは `jimble-` で始まる（`jimble-close-request`、`jimble-select` …）。フォーム部品は、ネイティブと同じ `input` / `change` を出す。詳細は `event.detail`。
- 要素は、使う前に登録されている必要がある（スクリプトを読み込む）。登録前は中身が素のまま見える。

## コンポーネント早見

{{components}}

## 必ず守ること（間違えやすい点）

### 1. 入力部品には名前（ラベル）を付ける

`jimble-input`・`jimble-textarea`・`jimble-select`・`jimble-checkbox`・`jimble-switch`・`jimble-radio-group`・アイコンだけのボタンには、次のいずれかで**名前が必要**。付け忘れても警告は出ない（配布物には警告のコードが入っていない）。

- `jimble-field` で包み、`label` を付ける（推奨。ヒント・エラーも付けられる）
- 外側の `<label for="id">` と、部品に同じ `id`
- `aria-label` 属性
- `jimble-checkbox` / `jimble-switch` / `jimble-radio` は、既定スロットの文字がラベル

```html
<jimble-field label="メールアドレス" hint="社用アドレス" required>
  <jimble-input type="email" name="email" autocomplete="email"></jimble-input>
</jimble-field>
```

### 2. フォームの値

- `name` があるものだけが送信される。`disabled` や祖先の `fieldset[disabled]` も送信されない。
- `value` **属性は初期値**（`reset` で戻る先）、`value` **プロパティが現在値**。`checked` も同様。利用者が触ったあとは、属性を書き換えても現在値は変わらない。
- `jimble-checkbox` / `jimble-switch` は、チェック時だけ `value`（既定 `on`）を送る。`jimble-radio-group` は選ばれた `jimble-radio` の `value`。
- 検証はネイティブの制約（`required`、`type`、`minlength`、`pattern` など）。エラーの見た目は「触れた（blur した）後」か「送信を試みた後」だけ。
- サーバー側のエラーは `jimble-field` の `error` 属性、または要素の `setCustomValidity('メッセージ')`。
- `jimble-input` は Enter で送信する（ネイティブと同じ規則。IME の変換中は送信しない）。`jimble-textarea` の Enter は改行。
- **`<jimble-button type="submit">` は `form.requestSubmit()` を呼ぶだけ**。ボタンの `name` / `value` は送信されず、`formaction` なども使えない。必要ならネイティブの `<button>` を使う。`type` の既定は `button`（ネイティブは `submit`）。

### 3. 表は `jimble-table` 系で組む（`<table>` を書かない）

`jimble-table` > `jimble-table-header` / `jimble-table-body` > `jimble-table-row` > `jimble-table-head-cell` / `jimble-table-cell`。`colspan` / `rowspan` は使えない。表には `label` を付ける。数値の列は `align="end"`。並べ替えは `sortable` を付け、`jimble-sort`（`detail.direction`）を受けて**アプリが行を並べ替える**（部品は並べ替えない）。

### 4. オーバーレイ

- **ダイアログ**: `heading` 属性（または `title` スロット / `aria-label`）が必要。開閉は `el.show()` / `el.hide()` / `open` 属性。中の要素に `data-dialog-close` を付けると、JavaScript なしで閉じる。確認など応答が必須のものは `alert`（背景クリックで閉じない）にして、安全な側のボタンに `autofocus`。閉じる前に `jimble-close-request`（`preventDefault()` で止められる）。
- **ドロワー**（`jimble-drawer`。サイドモーダル・スライドパネル・ボトムシート）: 画面の端から出るモーダル。API と挙動は `jimble-dialog` と同じ（`heading`・`show()` / `hide()`・`data-dialog-close`・`jimble-close-request`）。位置は `placement`（`end` 右・既定 / `start` 左 / `top` / `bottom`）、幅は `size`。確認など短い操作は dialog、詳細・絞り込み・編集は drawer。開いている間は背面が操作できない（非モーダルは未対応）。
- **スピナー**（`jimble-spinner`）: 読み込み中の表示。既定で `role="status"` と「読み込み中」を伝える。隣に同じ意味の文字があるときは `decorative`。ボタンの読み込み中は `jimble-button` の `loading`（スピナーを自分で置かない）。
- **ツールチップ**（`jimble-tooltip`）: `<jimble-tooltip text="説明" placement="top|bottom|left|right" multiline>` で**フォーカスできる要素（ネイティブの `button`・`a`、または `jimble-button`）を 1 つ**囲む（入力欄などほかの `jimble-*` は不可）。ホバーとフォーカスで出て、Esc で消える。補足だけを入れる（重要な情報・操作は入れない）。アイコンだけのボタンの名前は `aria-label`（ツールチップではない）。入力欄の説明は `jimble-field` の `hint`。
- **アイコン**（`jimble-icon`）: `<jimble-icon name="check">`。色は文字色に従う。`size`（`sm` `md` `lg` `xl`）。**意味を持つときだけ `label` を付ける**（`role="img"`）。隣に文字があるときは付けない。アイコンだけのボタンは、ボタンに `aria-label`。**`name` は次の一覧にあるものだけ**（推測しない）: {{icons}}。全部品を読み込む入口（CDN も）には全部入っている。個別 import は `@hidemikimura/jimble-ui/icon` + `@hidemikimura/jimble-ui/icons/<name>`。
- **メニュー**: トリガーは `slot="trigger"`。項目は `jimble-menu-item`（`value`）。選ばれたら `jimble-select`（`e.detail.value`）。
- **セレクト**: 選択肢は `jimble-option`（`value`）。未選択はプレースホルダー（ネイティブと違い、最初の選択肢が自動で選ばれない）。
- **コンボボックス**（`jimble-combobox`）: 選択肢が多く、探して選ぶときに使う。選択肢は `jimble-select` と同じ `jimble-option`（読みは `keywords="とうきょう tokyo"`）。既定では**自由入力は値にならない**。文字入力では `input` / `change` は出ず、`jimble-search`（`detail.query`）が出る。
  - `load`（JS プロパティ、`(query, signal) => 項目[] | Promise`）: 入力から候補を取得する（サーバーへの問い合わせも同じ。`fetch` に `signal` を渡す）。項目は `{ value, label }`。返した項目がそのまま表示される。`load-delay`・`load-min-length`。初期値の表示は `items` プロパティで補う。
  - `multiple`: 複数選択（チップ表示、同じ `name` で複数送信、初期値は `value="a,b"`、現在値は `values` 配列）。
  - `max-items`: 選べる数の上限。`reorderable`: チップの並べ替え（Alt+左右の矢印、ドラッグ。`jimble-reorder`）。`jimble-option` の `group="関東"`: 見出し付きでまとまる。
  - `creatable`: 一覧にない文字を追加できる（`jimble-create`。`create` プロパティで作り方を決める）。
- **ファイル添付**（`jimble-file-input`）: ドロップエリア + 「ファイルを選択」ボタン + 一覧。`multiple`・`accept=".pdf,image/*"`・`max-size`（バイト）・`max-files`。合わないファイルは追加されず理由が出る（`jimble-reject`）。ファイルはそのままフォームに送られる。**`upload` プロパティ**（`(file, { onProgress, signal }) => Promise<id>`）を渡すと自動でサーバーへ送り（進捗・中止・再試行つき）、フォームには返した ID が送られる（アップロード中・失敗があると検証が通らない）。サーバー側の検証は必須。
- **日付入力**（`jimble-date-input`）: 値は `YYYY-MM-DD` の文字列（`Date` を渡さない）。範囲は `min` / `max`、週の始まりは `first-day-of-week`。`<input type="date">` の代わりに使う（`jimble-input` に `type="date"` はない）。時刻・期間は未対応。
- **色選択**（`jimble-color-input`）: 値は小文字の `#rrggbb`。候補の色は `presets`。透明度は未対応。
- **通知**: `JimbleUI.toast('...')` / `JimbleUI.toast.success('...')`（CDN）または `import { toast } from '@hidemikimura/jimble-ui/toast'`。`toast({ message, variant, heading, duration, action })`。danger と `action` 付きは自動で消えない。要素を自分で置かない。ダイアログの中で出しても操作・読み上げできる。重要な情報は通知だけに頼らず `jimble-alert` などで画面内にも出す。

### 5. ナビゲーション

- 現在のページの項目に `current` を付ける（`jimble-nav-item`、`jimble-breadcrumb-item`）。判定はアプリの仕事。
- 1 ページに `nav` の部品（パンくず・サイドバー・ページネーション）を複数置くときは、`label` で名前を変える。
- `jimble-tabs` の `jimble-tab` と `jimble-tab-panel` は `value` で対応させる。`slot` 属性は不要。

### 6. 見た目のカスタマイズ（この順で）

1. **CSS 変数**: 色・角丸・高さなど。`:root { --jimble-color-primary-600: #0f766e; }` はページのどこにでも書け、全部品に届く。部品固有の変数（`--jimble-button-radius` など）は、その部品のページの「CSS 変数」の表にある。
2. **`::part()`**: `jimble-button::part(label) { … }`。part の名前は各ページの表にある。状態は `:state()`（`jimble-button:state(loading)`）。
3. **スロット**: アイコンや操作を自分の HTML に置き換える。

内部の Tailwind クラス名は非公開で、ページの CSS から狙えない・狙ってはいけない。**色を変えるときは、コントラストを確かめる**（主ボタンの背景は白い文字が乗るので 4.5:1 以上、入力欄の枠は 3:1 以上）。

### 7. 言語

日本語が既定。`import { setLocale } from '@hidemikimura/jimble-ui/i18n'` と `import en from '@hidemikimura/jimble-ui/locales/en'` で `setLocale(en)`。CDN では `JimbleUI.setLocale(en)`（辞書は `dist/cdn/locales/en.js`）。一部だけ変えるには `setMessages({ 'alert.dismiss': '…' })`。

## そのまま使える断片

いずれもドキュメントの例で、アクセシビリティの自動検査（axe）を通っている。

### 検証つきのフォーム

{{example:field/required-error}}

### 確認ダイアログ（破壊的な操作）

{{example:dialog/alert}}

### メニュー

{{example:dropdown-menu/basic}}

### セレクト

{{example:select/basic}}

### 並べ替えできる表

{{example:table/basic}}

### 通知（種別・見出し・操作・表示時間）

{{example:toast/options}}

### 一覧ページの骨格（app-shell + page-header + tabs + table + pagination）

{{example:app-shell/admin-page}}

## やってはいけないこと

- ラベルのない入力欄・アイコンだけのボタンを作る。
- `<table>` / `<select>` / `<dialog>` を、jimble のコンポーネントの代わりに同じ画面へ混ぜて、見た目を CSS で似せる。
- 内部のクラス名（`bg-primary-600` など）や、Shadow DOM の内側の構造に依存した CSS を書く。
- `jimble-button type="submit"` の `name` / `value` に頼る。
- 存在しない属性やイベントを書く（上の早見と `custom-elements.json` にあるものだけを使う）。
- 通知だけに重要な情報を載せる。自動で消えるものは、読み終える前に消えることがある。
- `disabled="false"` のように、真偽値の属性へ値を書いて切り替えようとする（属性の有無で切り替える）。

## 対応ブラウザと既知の制約

Chrome / Edge / Firefox / Safari の最新 2 バージョン。Popover API、`<dialog>`、CSS Anchor Positioning（Chrome/Edge 125+、Firefox 147+、Safari 26+）を使う。未対応: 非モーダルのパネル、Select の複数選択・絞り込み（Combobox を使う）、メニューのサブメニュー、表のセル結合、日付の範囲選択・時刻、色の透明度、ダークモード、SSR。一覧: <https://hidemikimura.github.io/jimble-ui/guide/limitations/>

## 動作の確かめ方

- ブラウザで開き、キーボードだけで操作してみる（Tab、矢印、Enter、Space、Esc）。
- 入力欄とアイコンボタンに名前があるか、ブラウザの開発者ツールのアクセシビリティ表示、または axe で確認する。
- 色を変えたら、コントラスト比を確認する。
