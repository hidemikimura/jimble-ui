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

1.0 までは、マイナーバージョンで互換性が壊れることがあります（`@0.8` のように固定するのを勧める。下の例の `@0` は、最新の 0.x を取る）。

## 共通の規約

- タグは `jimble-*`。属性は kebab-case（`icon-only`、`sticky-header`）。プロパティは camelCase（`iconOnly`）。
- 真偽値は**属性の有無**で表す（`disabled`、`loading`、`open`）。`disabled="false"` と書いても、属性があるので**無効になる**（有効にするには属性を書かない）。
- 共通の属性: `variant`（見た目。部品ごとの決まった値。未知の値は既定に戻る）、`size`（`sm` / `md` / `lg`、既定 `md`）、`disabled`、`loading`、`open`。
- 独自イベントは `jimble-` で始まる（`jimble-close-request`、`jimble-select` …）。**バブルしない**ので、リスナーは、その部品自身に付ける（親や `document` に付けても届かない。ルーターの `jimble-route-*` だけはバブルする）。入れ子の部品（ドロワーの中の select など）の通知が、外側に漏れることはない。フォーム部品は、ネイティブと同じ `input` / `change` を出す。詳細は `event.detail`。
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
- **独自の検証（フィールド単位）は `jimble-field` の `validate` プロパティ**（属性ではなく JS のプロパティ）。書き方・引数・`validateNow()` / `showErrors()` は `references/form-validation.md` を読む。
- `jimble-input` は Enter で送信する（ネイティブと同じ規則。IME の変換中は送信しない）。`jimble-textarea` の Enter は改行。
- **`<jimble-button type="submit">` は `form.requestSubmit()` を呼ぶだけ**。ボタンの `name` / `value` は送信されず、`formaction` なども使えない。必要ならネイティブの `<button>` を使う。`type` の既定は `button`（ネイティブは `submit`）。

### 3. 表は `jimble-table` 系で組む（`<table>` を書かない）

`jimble-table` > `jimble-table-header` / `jimble-table-body` > `jimble-table-row` > `jimble-table-head-cell` / `jimble-table-cell`。`colspan` / `rowspan` は使えない。表には `label` を付ける。数値の列は `align="end"`。並べ替えは `sortable` を付け、`jimble-sort`（`detail.direction`）を受けて**アプリが行を並べ替える**（部品は並べ替えない）。

### 4. 部品ごとの使い方（オーバーレイ・選択・通知など）

**使う部品の参照ファイルを、書き始める前に読む**（`SKILL.md` と同じフォルダの `references/`）。注意書きと、そのまま使える例がある。

- **ダイアログ・ドロワー・ツールチップ・メニュー・通知** → `references/overlays.md`。ダイアログ・ドロワーは `heading` が必須。通知は要素を自分で置かず `JimbleUI.toast()`。
- **セレクト・コンボボックス・左右分割の選択・日付・色・ファイル添付** → `references/inputs.md`。セレクトは最初の選択肢が自動で選ばれない。コンボボックスは自由入力が値にならず、`jimble-search` が出る。日付の値は文字列で、`jimble-input` に `type="date"` はない。
- **表（並べ替え）・アイコン・スピナー・カンバン** → `references/display.md`。**アイコンの `name` は、そこにある一覧のものだけ**（推測しない）。
- **独自の検証（`jimble-field` の `validate`）** → `references/form-validation.md`。属性ではなく JS のプロパティ。
- **ルーター（SPA）** → `references/router.md`。`title` を必ず付ける。
- **app-shell（サイドバー・ヘッダー）・一覧ページの骨格・テーマの CSS 変数** → `references/layout-theme.md`。

### 5. ナビゲーション

- 現在のページの項目に `current` を付ける（`jimble-nav-item`、`jimble-breadcrumb-item`）。判定はアプリの仕事。
- 1 ページに `nav` の部品（パンくず・サイドバー・ページネーション）を複数置くときは、`label` で名前を変える。
- `jimble-tabs` の `jimble-tab` と `jimble-tab-panel` は `value` で対応させる。`slot` 属性は不要。

### 5b. ルーター（SPA）

`<jimble-router>` に `routes` を渡す（JS のプロパティ。1 ドキュメントに 1 つ）。書き方・`load`・`data` / `state`・スクロールの復元は `references/router.md` を読む。**`title` を必ず付ける**。

### 6. 見た目のカスタマイズ（この順で）

1. **CSS 変数**: 色・角丸・高さなど。`:root { --jimble-color-primary-600: #0f766e; }` はページのどこにでも書け、全部品に届く。部品固有の変数（`--jimble-button-radius` など）は、その部品のページの「CSS 変数」の表にある。
2. **`::part()`**: `jimble-button::part(label) { … }`。part の名前は各ページの表にある。状態は `:state()`（`jimble-button:state(loading)`）。
3. **スロット**: アイコンや操作を自分の HTML に置き換える。

内部の Tailwind クラス名は非公開で、ページの CSS から狙えない・狙ってはいけない。**色を変えるときは、コントラストを確かめる**（主ボタンの背景は白い文字が乗るので 4.5:1 以上、入力欄の枠は 3:1 以上）。

**ダークモード**は CSS の `color-scheme` で切り替える（`:root { color-scheme: light dark }` で OS に従う、`dark` で常にダーク。要素に書けば、その中だけ）。何も書かなければライト。部品はページの `body` を塗らないので、ページの背景・文字の色は自分で指定する。色の変数を 1 つの値で上書きすると両方のモードで同じ色になるので、モードで変えるなら `light-dark(明, 暗)` で書く。`data-theme` などの属性はない。

### 7. 言語

日本語が既定。`import { setLocale } from '@hidemikimura/jimble-ui/i18n'` と `import en from '@hidemikimura/jimble-ui/locales/en'` で `setLocale(en)`。CDN では `JimbleUI.setLocale(en)`（辞書は `dist/cdn/locales/en.js`）。一部だけ変えるには `setMessages({ 'alert.dismiss': '…' })`。

## そのまま使える断片

いずれもドキュメントの例で、アクセシビリティの自動検査（axe）を通っている。

### 検証つきのフォーム

{{example:field/required-error}}

### 管理画面の骨格・テーマ

app-shell・サイドバー・一覧ページの骨格・テーマの CSS 変数は `references/layout-theme.md` を読む。

## やってはいけないこと

- ラベルのない入力欄・アイコンだけのボタンを作る。
- `<table>` / `<select>` / `<dialog>` を、jimble のコンポーネントの代わりに同じ画面へ混ぜて、見た目を CSS で似せる。
- 内部のクラス名（`bg-primary-600` など）や、Shadow DOM の内側の構造に依存した CSS を書く。
- `jimble-button type="submit"` の `name` / `value` に頼る。
- 存在しない属性やイベントを書く（上の早見と `custom-elements.json` にあるものだけを使う）。
- 通知だけに重要な情報を載せる。自動で消えるものは、読み終える前に消えることがある。
- `disabled="false"` のように、真偽値の属性へ値を書いて切り替えようとする（属性の有無で切り替える）。

## 対応ブラウザと既知の制約

Chrome / Edge / Firefox / Safari の最新 2 バージョン。Popover API、`<dialog>`、CSS Anchor Positioning（Chrome/Edge 125+、Firefox 147+、Safari 26+）を使う。未対応: 非モーダルのパネル、Select の複数選択・絞り込み（Combobox を使う）、メニューのチェック付き項目、表のセル結合、日付の秒・タイムゾーン、色の oklch などの色空間、SSR。一覧: <https://hidemikimura.github.io/jimble-ui/guide/limitations/>

## 動作の確かめ方

- ブラウザで開き、キーボードだけで操作してみる（Tab、矢印、Enter、Space、Esc）。
- 入力欄とアイコンボタンに名前があるか、ブラウザの開発者ツールのアクセシビリティ表示、または axe で確認する。
- 色を変えたら、コントラスト比を確認する。
