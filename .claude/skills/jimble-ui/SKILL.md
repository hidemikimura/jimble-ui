---
name: jimble-ui
description: jimble-ui（`<jimble-button>` など `jimble-` で始まる Web Components）で管理画面の HTML を書く・直すときに使う。コンポーネントの選び方、属性・イベント・スロットの書き方、フォームのラベル付けと送信、表・ダイアログ・メニュー・通知・app-shell の組み立て、見た目のカスタマイズ（CSS 変数 → ::part() → スロット）、アクセシビリティ上の注意を含む。
---

<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・custom-elements.json・site/examples から作る。直接編集しない。 -->

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

1.0 までは、マイナーバージョンで互換性が壊れることがあります（`@0.3` のように固定するのを勧める）。

## 共通の規約

- タグは `jimble-*`。属性は kebab-case（`icon-only`、`sticky-header`）。プロパティは camelCase（`iconOnly`）。
- 真偽値は**属性の有無**で表す（`disabled`、`loading`、`open`）。`disabled="false"` と書いても、属性があるので**無効になる**（有効にするには属性を書かない）。
- 共通の属性: `variant`（見た目。部品ごとの決まった値。未知の値は既定に戻る）、`size`（`sm` / `md` / `lg`、既定 `md`）、`disabled`、`loading`、`open`。
- 独自イベントは `jimble-` で始まる（`jimble-close-request`、`jimble-select` …）。フォーム部品は、ネイティブと同じ `input` / `change` を出す。詳細は `event.detail`。
- 要素は、使う前に登録されている必要がある（スクリプトを読み込む）。登録前は中身が素のまま見える。

## コンポーネント早見

### 枠組み

- **`jimble-app-shell`** — 管理画面の枠組み: 上部のヘッダー、左のサイドバー、本文。
  - 属性: `sidebar-open`, `sidebar-collapsible`, `sidebar-collapsed`
  - スロット: `header`, `sidebar`, (既定)
  - イベント: `jimble-open`, `jimble-close`, `jimble-sidebar-toggle`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/app-shell/
- **`jimble-sidebar-nav`** — サイドバーのナビゲーション。
  - 属性: `label=値`, `compact`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/sidebar-nav/
- **`jimble-nav-item`** — ナビゲーションの項目（リンク）。
  - 属性: `href=値`, `current`, `target=値`
  - スロット: (既定), `icon`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/sidebar-nav/
- **`jimble-nav-group`** — 折りたためる項目のまとまり（disclosure パターン）。
  - 属性: `label=値`, `open`
  - スロット: (既定), `icon`
  - イベント: `jimble-open`, `jimble-close`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/sidebar-nav/
- **`jimble-page-header`** — ページの見出し領域。
  - 属性: `heading=値`, `description=値`, `level=数値`
  - スロット: `breadcrumb`, `title`, `description`, `actions`, (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/page-header/
- **`jimble-breadcrumb`** — パンくずリスト。
  - 属性: `label=値`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/breadcrumb/
- **`jimble-breadcrumb-item`** — パンくずの 1 項目。
  - 属性: `href=値`, `current`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/breadcrumb/
- **`jimble-tabs`** — タブ。
  - 属性: `value=値`, `activation=auto|manual`, `orientation=horizontal|vertical`, `label=値`
  - スロット: (既定), `tab`
  - イベント: `jimble-tab-change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/tabs/
- **`jimble-tab`** — タブ 1 つ。
  - 属性: `value=値`, `disabled`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/tabs/
- **`jimble-tab-panel`** — タブのパネル。
  - 属性: `value=値`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/tabs/
- **`jimble-router`** — シングルページアプリのルーター（Navigation API を使う）。
  - 属性: `scroll-container=値`, `no-chunk-reload`, `busy`, `announcement=値`
  - スロット: (既定)
  - イベント: `jimble-route-loading`, `jimble-route-change`, `jimble-route-error`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/router/

### 表示

- **`jimble-card`** — 関連する情報をまとめる面。
  - スロット: (既定), `header`, `footer`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/card/
- **`jimble-badge`** — 状態やカテゴリを示す小さなラベル。
  - 属性: `variant=neutral|primary|success|warning|danger|info`, `size=sm|md`
  - スロット: (既定), `prefix`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/badge/
- **`jimble-alert`** — ページ内の通知。
  - 属性: `variant=info|success|warning|danger`, `dismissible`
  - スロット: (既定), `title`, `icon`, `actions`
  - イベント: `jimble-dismiss`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/alert/
- **`jimble-spinner`** — 読み込み中を示すスピナー。
  - 属性: `size=sm|md|lg`, `variant=current|primary`, `label=値`, `decorative`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/spinner/
- **`jimble-icon`** — アイコン。
  - 属性: `name=値`, `size=sm|md|lg|xl`, `label=値`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/icon/
- **`jimble-table`** — データテーブル。
  - 属性: `label=値`, `sticky-header`, `striped`, `loading`
  - スロット: (既定)
  - イベント: `jimble-sort`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-table-header`** — 表の見出し行のまとまり（rowgroup）。
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-table-body`** — 表の本体の行のまとまり（rowgroup）。
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-table-row`** — 表の行（row）。
  - 属性: `selected`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-table-head-cell`** — 表の見出しセル（columnheader）。
  - 属性: `align=start|center|end`, `sortable`, `sort=ascending|descending|none`
  - スロット: (既定)
  - イベント: `jimble-sort`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-table-cell`** — 表のセル（cell）。
  - 属性: `align=start|center|end`, `header`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/table/
- **`jimble-description-list`** — 項目名と値の一覧（詳細画面など）。
  - 属性: `layout=horizontal|vertical`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/description-list/
- **`jimble-description-item`** — 一覧の 1 項目。
  - 属性: `label=値`
  - スロット: (既定), `label`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/description-list/
- **`jimble-pagination`** — ページネーション。
  - 属性: `page=数値`, `total-pages=値`, `total=値`, `page-size=数値`, `sibling-count=数値`, `href-template=値`, `size=sm|md|lg`, `label=値`
  - イベント: `jimble-page-change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/pagination/
- **`jimble-kanban`** — カンバンボード。
  - 属性: `label=値`, `readonly`
  - スロット: (既定)
  - イベント: `jimble-card-move`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/kanban/
- **`jimble-kanban-column`** — カンバンの列。
  - 属性: `value=値`, `heading=値`
  - スロット: (既定), `actions`, `empty`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/kanban/
- **`jimble-kanban-card`** — カンバンのカード。
  - 属性: `value=値`, `label=値`, `locked`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/kanban/

### 入力

- **`jimble-button`** — ボタン。
  - 属性: `variant=primary|secondary|danger|ghost`, `size=sm|md|lg`, `type=button|submit|reset`, `disabled`, `loading`, `href=値`, `target=値`, `rel=値`, `download=値`, `icon-only`, `block`, `aria-label=値`, `aria-description=値`
  - スロット: (既定), `prefix`, `suffix`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/button/
- **`jimble-field`** — ラベル・ヒント・エラーを付けるための入れ物。
  - 属性: `label=値`, `hint=値`, `error=値`, `required`
  - スロット: (既定), `label`, `hint`, `error`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/field/
- **`jimble-input`** — 1 行のテキスト入力。
  - 属性: `type=text|email|password|search|tel|url|number`, `min=値`, `max=値`, `step=値`, `pattern=値`, `value=値`, `placeholder=値`, `readonly`, `minlength=値`, `maxlength=値`, `autocomplete=値`, `inputmode=値`, `enterkeyhint=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: `prefix`, `suffix`
  - イベント: `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/input/
- **`jimble-textarea`** — 複数行のテキスト入力。
  - 属性: `rows=数値`, `autosize`, `value=値`, `placeholder=値`, `readonly`, `minlength=値`, `maxlength=値`, `autocomplete=値`, `inputmode=値`, `enterkeyhint=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/textarea/
- **`jimble-select`** — セレクト(WAI-ARIA の collapsible dropdown listbox パターン)。
  - 属性: `value=値`, `placeholder=値`, `open`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `input`, `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/select/
- **`jimble-option`** — セレクトの選択肢。
  - 属性: `value=値`, `disabled`, `keywords=値`, `group=値`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/select/
- **`jimble-combobox`** — 絞り込みできるセレクト(WAI-ARIA の combobox・list autocomplete パターン)。
  - 属性: `value=値`, `placeholder=値`, `readonly`, `clearable`, `multiple`, `creatable`, `match=contains|starts-with`, `search-group`, `open`, `load-delay=数値`, `load-min-length=数値`, `max-items=値`, `reorderable`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `jimble-search`, `jimble-create`, `jimble-load-error`, `jimble-reorder`, `jimble-open`, `jimble-close`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/combobox/
- **`jimble-dual-listbox`** — 左右に分かれた選択(デュアルリストボックス)。
  - 属性: `value=値`, `available-label=値`, `selected-label=値`, `move-all`, `max-items=値`, `match=contains|starts-with`, `reorderable`, `search-group`, `pickedAvailable=値`, `pickedSelected=値`, `queryAvailable=値`, `querySelected=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`, `jimble-reorder`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/dual-listbox/
- **`jimble-date-input`** — 日付・日時・期間の入力。
  - 属性: `value=値`, `min=値`, `max=値`, `placeholder=値`, `readonly`, `picker-only`, `range`, `time`, `months=数値`, `minute-step=数値`, `first-day-of-week=数値`, `open`, `view=値`, `focusDay=値`, `hoverDay=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `type`, `input`, `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/date-input/
- **`jimble-color-input`** — 色の入力。
  - 属性: `value=値`, `placeholder=値`, `readonly`, `presets=値`, `open`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `type`, `input`, `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/color-input/
- **`jimble-file-input`** — ファイルの添付。
  - 属性: `accept=値`, `multiple`, `max-size=値`, `max-files=値`, `preview`, `entries=値`, `dragging`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`, `jimble-reject`, `jimble-upload-start`, `jimble-upload-complete`, `jimble-upload-error`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/file-input/
- **`jimble-checkbox`** — チェックボックス。
  - 属性: `indeterminate`, `checked`, `value=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/checkbox/
- **`jimble-radio-group`** — ラジオのグループ。
  - 属性: `value=値`, `orientation=vertical|horizontal`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `input`, `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/radio-group/
- **`jimble-radio`** — ラジオ。
  - 属性: `value=値`, `disabled`, `size=sm|md|lg`
  - スロット: (既定)
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/radio-group/
- **`jimble-switch`** — オン/オフのスイッチ。
  - 属性: `checked`, `value=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `change`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/switch/

### オーバーレイ

- **`jimble-dialog`** — モーダルダイアログ。
  - 属性: `open`, `heading=値`, `size=sm|md|lg`, `alert`, `static-backdrop`, `hide-close-button`, `aria-label=値`
  - スロット: (既定), `title`, `footer`
  - イベント: `jimble-open`, `jimble-close-request`, `jimble-close`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/dialog/
- **`jimble-drawer`** — 画面の端から出るモーダルのパネル(サイドモーダル・ドロワー・スライドパネル・ボトムシート)。
  - 属性: `placement=end|start|top|bottom`, `open`, `heading=値`, `size=sm|md|lg`, `alert`, `static-backdrop`, `hide-close-button`, `aria-label=値`
  - スロット: (既定), `title`, `footer`
  - イベント: `jimble-open`, `jimble-close-request`, `jimble-close`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/drawer/
- **`jimble-dropdown-menu`** — ドロップダウンメニュー(WAI-ARIA の menu button パターン)。
  - 属性: `open`, `placement=bottom-start|bottom-end|top-start|top-end`, `label=値`
  - スロット: `trigger`, (既定)
  - イベント: `jimble-open`, `jimble-close`, `jimble-select`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/dropdown-menu/
- **`jimble-menu-item`** — メニューの項目。
  - 属性: `value=値`, `disabled`, `href=値`, `target=値`, `variant=default|danger`
  - スロット: (既定), `prefix`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/dropdown-menu/
- **`jimble-menu-separator`** — メニューの区切り線。
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/dropdown-menu/
- **`jimble-toast`** — 通知1件。
  - 属性: `variant=info|success|warning|danger`, `duration=値`, `dismissible`
  - スロット: (既定), `title`, `actions`
  - イベント: `jimble-dismiss`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/toast/
- **`jimble-toast-region`** — 通知(`jimble-toast`)の置き場。
  - 属性: `placement=top-start|top|top-end|bottom-start|bottom|bottom-end`
  - スロット: `polite`, `assertive`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/toast/
- **`jimble-tooltip`** — 囲んだ要素にマウスを重ねる、またはフォーカスすると、短い補足説明を出すツールチップ。
  - 属性: `text=値`, `placement=top|bottom|left|right`, `multiline`, `delay=数値`, `disabled`, `open`
  - スロット: (既定)
  - イベント: `jimble-open`, `jimble-close`
  - 詳細: https://hidemikimura.github.io/jimble-ui/components/tooltip/

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
- **独自の検証（フィールド単位）は `jimble-field` の `validate` プロパティ**（属性ではなく JS のプロパティ。Lit なら `.validate=${fn}`）: `(value, control) => エラーメッセージ | null`（Promise も可。サーバーへの確認など）。値が変わったとき・フォーカスが外れたとき・最初に 1 回、**空の値でも**呼ばれる。空でない文字列を返すとエラー（表示は一度フォーカスが外れたあと）で、フォームは送信されない。値は文字列（チェックボックスは真偽値、複数選択は配列、ファイルは File の配列）。`await field.validateNow()` で送信前に確定できる（表示は変えない）。`await field.showErrors()` は検証してエラーを**表示**、`field.hideErrors()` は表示を**隠す**。部品の `value` をプログラムから書き換える（Autokana.js など）と、`validate` は自動でやり直される。1 つの field に部品が複数（姓と名）あるときは部品ごとに呼ばれ、3 つ目の引数 `context.get('name')` でほかの部品の値を引ける（部品には区別できる `aria-label` を付ける）。
- `jimble-input` は Enter で送信する（ネイティブと同じ規則。IME の変換中は送信しない）。`jimble-textarea` の Enter は改行。
- **`<jimble-button type="submit">` は `form.requestSubmit()` を呼ぶだけ**。ボタンの `name` / `value` は送信されず、`formaction` なども使えない。必要ならネイティブの `<button>` を使う。`type` の既定は `button`（ネイティブは `submit`）。

### 3. 表は `jimble-table` 系で組む（`<table>` を書かない）

`jimble-table` > `jimble-table-header` / `jimble-table-body` > `jimble-table-row` > `jimble-table-head-cell` / `jimble-table-cell`。`colspan` / `rowspan` は使えない。表には `label` を付ける。数値の列は `align="end"`。並べ替えは `sortable` を付け、`jimble-sort`（`detail.direction`）を受けて**アプリが行を並べ替える**（部品は並べ替えない）。

### 4. オーバーレイ

- **ダイアログ**: `heading` 属性（または `title` スロット / `aria-label`）が必要。開閉は `el.show()` / `el.hide()` / `open` 属性。中の要素に `data-dialog-close` を付けると、JavaScript なしで閉じる。確認など応答が必須のものは `alert`（背景クリックで閉じない）にして、安全な側のボタンに `autofocus`。閉じる前に `jimble-close-request`（`preventDefault()` で止められる）。
- **ドロワー**（`jimble-drawer`。サイドモーダル・スライドパネル・ボトムシート）: 画面の端から出るモーダル。API と挙動は `jimble-dialog` と同じ（`heading`・`show()` / `hide()`・`data-dialog-close`・`jimble-close-request`）。位置は `placement`（`end` 右・既定 / `start` 左 / `top` / `bottom`）、幅は `size`。確認など短い操作は dialog、詳細・絞り込み・編集は drawer。開いている間は背面が操作できない（非モーダルは未対応）。
- **スピナー**（`jimble-spinner`）: 読み込み中の表示。既定で `role="status"` と「読み込み中」を伝える。隣に同じ意味の文字があるときは `decorative`。ボタンの読み込み中は `jimble-button` の `loading`（スピナーを自分で置かない）。
- **ツールチップ**（`jimble-tooltip`）: `<jimble-tooltip text="説明" placement="top|bottom|left|right" multiline>` で**フォーカスできる要素（ネイティブの `button`・`a`、または `jimble-button`）を 1 つ**囲む（入力欄などほかの `jimble-*` は不可）。ホバーとフォーカスで出て、Esc で消える。補足だけを入れる（重要な情報・操作は入れない）。アイコンだけのボタンの名前は `aria-label`（ツールチップではない）。入力欄の説明は `jimble-field` の `hint`。
- **アイコン**（`jimble-icon`）: `<jimble-icon name="check">`。色は文字色に従う。`size`（`sm` `md` `lg` `xl`）。**意味を持つときだけ `label` を付ける**（`role="img"`）。隣に文字があるときは付けない。アイコンだけのボタンは、ボタンに `aria-label`。**`name` は次の一覧にあるものだけ**（推測しない）: `adjustments-horizontal`、`archive-box`、`arrow-down`、`arrow-down-tray`、`arrow-left`、`arrow-path`、`arrow-right`、`arrow-top-right-on-square`、`arrow-up`、`arrow-up-tray`、`banknotes`、`bars-3`、`bell`、`bolt`、`bookmark`、`building-office`、`calendar`、`calendar-days`、`chart-bar`、`chat-bubble-left`、`check`、`check-circle`、`chevron-down`、`chevron-left`、`chevron-right`、`chevron-up-down`、`clipboard`、`clipboard-document`、`clock`、`cloud`、`code-bracket`、`cog-6-tooth`、`command-line`、`computer-desktop`、`cpu-chip`、`credit-card`、`cube`、`currency-yen`、`device-phone-mobile`、`document`、`document-text`、`ellipsis-horizontal`、`ellipsis-vertical`、`envelope`、`exclamation-circle`、`exclamation-triangle`、`eye`、`eye-slash`、`face-smile`、`flag`、`folder`、`funnel`、`globe-alt`、`hand-thumb-down`、`hand-thumb-up`、`heart`、`home`、`identification`、`inbox`、`information-circle`、`key`、`language`、`link`、`list-bullet`、`lock-closed`、`lock-open`、`magnifying-glass`、`map-pin`、`minus`、`minus-circle`、`no-symbol`、`paper-clip`、`pencil`、`pencil-square`、`phone`、`photo`、`plus`、`plus-circle`、`power`、`printer`、`puzzle-piece`、`question-mark-circle`、`queue-list`、`rectangle-stack`、`server`、`share`、`shield-check`、`shopping-cart`、`spinner`、`squares-2x2`、`star`、`swatch`、`table-cells`、`tag`、`trash`、`truck`、`tv`、`user`、`user-circle`、`user-group`、`user-plus`、`users`、`wrench-screwdriver`、`x-circle`、`x-mark`。全部品を読み込む入口（CDN も）には全部入っている。個別 import は `@hidemikimura/jimble-ui/icon` + `@hidemikimura/jimble-ui/icons/<name>`。
- **メニュー**: トリガーは `slot="trigger"`。項目は `jimble-menu-item`（`value`）。選ばれたら `jimble-select`（`e.detail.value`）。
- **セレクト**: 選択肢は `jimble-option`（`value`）。未選択はプレースホルダー（ネイティブと違い、最初の選択肢が自動で選ばれない）。
- **コンボボックス**（`jimble-combobox`）: 選択肢が多く、探して選ぶときに使う。選択肢は `jimble-select` と同じ `jimble-option`（読みは `keywords="とうきょう tokyo"`）。既定では**自由入力は値にならない**。文字入力では `input` / `change` は出ず、`jimble-search`（`detail.query`）が出る。
  - `load`（JS プロパティ、`(query, signal) => 項目[] | Promise`）: 入力から候補を取得する（サーバーへの問い合わせも同じ。`fetch` に `signal` を渡す）。項目は `{ value, label }`。返した項目がそのまま表示される。`load-delay`・`load-min-length`。初期値の表示は `items` プロパティで補う。
  - `multiple`: 複数選択（チップ表示、同じ `name` で複数送信、初期値は `value="a,b"`、現在値は `values` 配列）。
  - `max-items`: 選べる数の上限。`reorderable`: チップの並べ替え（Alt+左右の矢印、ドラッグ。`jimble-reorder`）。`jimble-option` の `group="関東"`: 見出し付きでまとまる。
  - `creatable`: 一覧にない文字を追加できる（`jimble-create`。`create` プロパティで作り方を決める）。
- **ファイル添付**（`jimble-file-input`）: ドロップエリア + 「ファイルを選択」ボタン + 一覧。`multiple`・`accept=".pdf,image/*"`・`max-size`（バイト）・`max-files`。合わないファイルは追加されず理由が出る（`jimble-reject`）。ファイルはそのままフォームに送られる。**`upload` プロパティ**（`(file, { onProgress, signal }) => Promise<id>`）を渡すと自動でサーバーへ送り（進捗・中止・再試行つき）、フォームには返した ID が送られる（アップロード中・失敗があると検証が通らない）。サーバー側の検証は必須。
- **左右分割の選択**（`jimble-dual-listbox`）: 左に未選択、右に選択済みを並べて「追加」「削除」で移す。項目は `jimble-option`、初期値は `value="a,b"`（カンマ区切り）、現在値は `values` 配列、同じ `name` で複数送信。`available-label` / `selected-label`・`move-all`・`max-items`。`reorderable` で右の一覧を並べ替え（ドラッグ・Alt+↑↓・「上へ」「下へ」。`jimble-reorder`）。`jimble-option` の `group` で見出し付きにまとめる（`search-group` でグループ名でも絞り込み）。項目が少なければ `jimble-select` や `jimble-combobox multiple`。
- **カンバンボード**（`jimble-kanban` > `jimble-kanban-column`（`value` `heading`）> `jimble-kanban-card`（`value` `label` `locked`））: 列の間・列の中でカードを動かす。動かすと**カードの要素そのものが入れ替わる**（状態を別に持たない）。ドラッグ（タッチは長押し）・カードの移動ボタン・Alt+矢印キーで動かせる。動かす直前の `jimble-card-move`（`detail`: `value` `from` `to` `index`）を `preventDefault()` するとキャンセル（サーバーが断ったとき）。並びは `board`（`{ 列: [カード, …] }`）で取る。`readonly` で閲覧専用。カードの中身は自由な HTML。
- **日付入力**（`jimble-date-input`）: 日付・日時・期間の選択（`<input type="date">` の代わり。`jimble-input` に `type="date"` はない）。値は文字列で、`Date` を渡さない。既定 `YYYY-MM-DD`、`time` で `YYYY-MM-DDTHH:mm`、`range` で `開始/終了`（`2026-09-01/2026-09-10`。`start` / `end` プロパティ）、`range time` で両方。`min` / `max`、`first-day-of-week`、`months="2"`、`minute-step`。期間は 2 回クリック（開始→終了）。カレンダーの見出しで月・年を直接選べる。`picker-only` で手入力不可（カレンダーだけで選ばせる。このときだけ入力欄のクリックで開く）。時刻ありはカレンダーが開いたままで「完了」で閉じる。秒・タイムゾーン・12 時間表記は未対応。
- **色選択**（`jimble-color-input`）: 値は小文字の `#rrggbb`。候補の色は `presets`。透明度は未対応。
- **通知**: `JimbleUI.toast('...')` / `JimbleUI.toast.success('...')`（CDN）または `import { toast } from '@hidemikimura/jimble-ui/toast'`。`toast({ message, variant, heading, duration, action })`。danger と `action` 付きは自動で消えない。要素を自分で置かない。ダイアログの中で出しても操作・読み上げできる。重要な情報は通知だけに頼らず `jimble-alert` などで画面内にも出す。

### 5. ナビゲーション

- 現在のページの項目に `current` を付ける（`jimble-nav-item`、`jimble-breadcrumb-item`）。判定はアプリの仕事。
- 1 ページに `nav` の部品（パンくず・サイドバー・ページネーション）を複数置くときは、`label` で名前を変える。
- `jimble-tabs` の `jimble-tab` と `jimble-tab-panel` は `value` で対応させる。`slot` 属性は不要。

### 5b. ルーター（SPA）

`<jimble-router>` に `routes` を渡す（JS のプロパティ。1 ドキュメントに 1 つ）。ページ用の基底クラスは要らない。

```js
router.routes = [
  { path: '/', render: () => html`<page-home></page-home>` },
  {
    path: '/users/:id',
    name: 'user',
    title: ({ params }) => `ユーザー ${params.id}`,
    load: ({ params, signal }) => fetchUser(params.id, signal), // 任意。終わるまで画面は切り替わらない
    render: ({ data, query }, user) => html`<page-user .user=${user}></page-user>`,
  },
]
router.fallback = { render: () => html`<page-not-found></page-not-found>` } // 404
router.navigate('/users/1', { data: { flash: '保存しました' }, state: { tab: 'a' } })
router.setQuery({ page: 2 }) // URL の検索文字列だけ差し替える(再描画しない。既定は履歴を増やさない replace)
```

- ページの部品を動的 `import()` するのは、**`load` の中**(`await import('./pages/page-user.js')`)。終わるまで画面が切り替わらないので、`render` の時点で要素は定義済み。デプロイで古くなった画面で取得に失敗したときは、自動で通常のページ遷移に切り替えて復旧する(`no-chunk-reload` で止められる)。
- `html` は、npm なら `@hidemikimura/jimble-ui/router`、CDN なら `JimbleUI.html`。
- リンクの `<a href>` は、そのまま SPA の遷移になる(除外は `data-router-ignore`)。
- `data` は遷移先に **1 回だけ**渡る値(戻る・進む・リロードでは `undefined`)。`state` は履歴に保存され、戻る・進むで復元される。
- スクロール位置は、戻る・進む・リロードで復元される。内側の要素がスクロールするレイアウトは `scroll-container="#main"`。
- **`title` を必ず付ける**(遷移のたびに読み上げる)。サーバーは、どのパスでも同じ HTML を返す必要がある。離脱前の確認・ルートのネストは未対応。

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

```html
<form onsubmit="event.preventDefault()" class="stack">
  <jimble-field label="お名前" required>
    <jimble-input name="name" autocomplete="name"></jimble-input>
  </jimble-field>
  <jimble-field label="メールアドレス" required hint="例: taro@example.com">
    <jimble-input type="email" name="email" autocomplete="email"></jimble-input>
  </jimble-field>
  <div><jimble-button type="submit" variant="primary">送信</jimble-button></div>
</form>
```

### 確認ダイアログ（破壊的な操作）

```html
<jimble-button variant="danger" onclick="document.getElementById('dlg-alert').show()">
  削除する
</jimble-button>

<jimble-dialog id="dlg-alert" alert size="sm" heading="この注文を削除しますか？">
  削除すると元に戻せません。
  <jimble-button slot="footer" autofocus data-dialog-close>キャンセル</jimble-button>
  <jimble-button
    slot="footer"
    variant="danger"
    data-dialog-close
    onclick="JimbleUI.toast({ message: '注文を削除しました', variant: 'success' })"
  >
    削除する
  </jimble-button>
</jimble-dialog>
```

### メニュー

```html
<jimble-dropdown-menu id="menu-basic">
  <jimble-button slot="trigger">
    操作
    <svg
      slot="suffix"
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  </jimble-button>
  <jimble-menu-item value="edit">編集</jimble-menu-item>
  <jimble-menu-item value="copy">複製</jimble-menu-item>
  <jimble-menu-item value="archive" disabled>アーカイブ（無効）</jimble-menu-item>
  <jimble-menu-separator></jimble-menu-separator>
  <jimble-menu-item value="delete" variant="danger">削除</jimble-menu-item>
</jimble-dropdown-menu>
<script>
  document.getElementById('menu-basic').addEventListener('jimble-select', (e) => {
    JimbleUI.toast('選ばれた項目: ' + e.detail.value)
  })
</script>
```

### セレクト

```html
<div class="stack">
  <jimble-field label="プラン" hint="あとから変更できます">
    <jimble-select name="plan" placeholder="プランを選択">
      <jimble-option value="free">無料</jimble-option>
      <jimble-option value="pro">Pro</jimble-option>
      <jimble-option value="biz" disabled>Business（準備中）</jimble-option>
      <jimble-option value="ent">Enterprise</jimble-option>
    </jimble-select>
  </jimble-field>
  <jimble-field label="都道府県" required>
    <jimble-select name="pref" value="tokyo">
      <jimble-option value="hokkaido">北海道</jimble-option>
      <jimble-option value="tokyo">東京都</jimble-option>
      <jimble-option value="osaka">大阪府</jimble-option>
      <jimble-option value="fukuoka">福岡県</jimble-option>
    </jimble-select>
  </jimble-field>
</div>
```

### 並べ替えできる表

```html
<jimble-table id="tbl-basic" label="注文一覧">
  <jimble-table-header>
    <jimble-table-row>
      <jimble-table-head-cell sortable>注文番号</jimble-table-head-cell>
      <jimble-table-head-cell>顧客</jimble-table-head-cell>
      <jimble-table-head-cell>状態</jimble-table-head-cell>
      <jimble-table-head-cell sortable align="end">金額</jimble-table-head-cell>
    </jimble-table-row>
  </jimble-table-header>
  <jimble-table-body>
    <jimble-table-row>
      <jimble-table-cell header>#1024</jimble-table-cell>
      <jimble-table-cell>山田 太郎</jimble-table-cell>
      <jimble-table-cell><jimble-badge variant="success">発送済み</jimble-badge></jimble-table-cell>
      <jimble-table-cell align="end">¥12,800</jimble-table-cell>
    </jimble-table-row>
    <jimble-table-row>
      <jimble-table-cell header>#1023</jimble-table-cell>
      <jimble-table-cell>佐藤 花子</jimble-table-cell>
      <jimble-table-cell><jimble-badge variant="warning">保留</jimble-badge></jimble-table-cell>
      <jimble-table-cell align="end">¥3,400</jimble-table-cell>
    </jimble-table-row>
    <jimble-table-row>
      <jimble-table-cell header>#1022</jimble-table-cell>
      <jimble-table-cell>鈴木 一郎</jimble-table-cell>
      <jimble-table-cell
        ><jimble-badge variant="danger">キャンセル</jimble-badge></jimble-table-cell
      >
      <jimble-table-cell align="end">¥58,000</jimble-table-cell>
    </jimble-table-row>
  </jimble-table-body>
</jimble-table>
<script>
  // 並べ替え自体はアプリの仕事。jimble-sort を受けて行を並べ替える
  document.getElementById('tbl-basic').addEventListener('jimble-sort', (e) => {
    const head = e.target.closest('jimble-table-head-cell')
    const index = [...head.parentElement.children].indexOf(head)
    const body = head.closest('jimble-table').querySelector('jimble-table-body')
    const value = (row) =>
      row.children[index].textContent.replace(/[^\d]/g, '') || row.children[index].textContent
    const sign = e.detail.direction === 'ascending' ? 1 : -1
    ;[...body.children]
      .sort((a, b) => sign * value(a).localeCompare(value(b), 'ja', { numeric: true }))
      .forEach((row) => body.append(row))
  })
</script>
```

### 通知（種別・見出し・操作・表示時間）

```html
<div class="row">
  <jimble-button
    onclick="
      JimbleUI.toast({
        heading: '削除しました',
        message: '注文 #1024',
        variant: 'success',
        action: { label: '元に戻す', onClick: () => JimbleUI.toast('元に戻しました') },
      })
    "
  >
    元に戻せる通知
  </jimble-button>
  <jimble-button onclick="JimbleUI.toast({ message: '2 秒で消えます', duration: 2000 })">
    2 秒で消える
  </jimble-button>
  <jimble-button onclick="JimbleUI.toast({ message: '自分で閉じるまで残ります', duration: 0 })">
    消えない通知
  </jimble-button>
</div>
```

### サイドバーを細くできる管理画面

`jimble-app-shell` に `sidebar-collapsible` を付けると、ヘッダーのボタンで、サイドバーを「アイコンだけの細い表示」と「項目名つきの広い表示」に切り替えられる（広い画面のみ）。細い表示でも、マウスを重ねる・フォーカスすると広がって、項目名と子項目（`jimble-nav-group`）が使える。**項目には `slot="icon"` のアイコンを付ける**（ない項目は頭文字になる）。状態は `sidebar-collapsed` で、切り替わると `jimble-sidebar-toggle`（`detail.collapsed`）が出る。

```html
<jimble-app-shell sidebar-collapsible>
  <strong slot="header">jimble 管理画面</strong>

  <jimble-sidebar-nav slot="sidebar">
    <jimble-nav-item href="#" current>
      <jimble-icon slot="icon" name="home"></jimble-icon>ダッシュボード
    </jimble-nav-item>
    <jimble-nav-item href="#">
      <jimble-icon slot="icon" name="shopping-cart"></jimble-icon>注文
    </jimble-nav-item>
    <jimble-nav-item href="#">
      <jimble-icon slot="icon" name="users"></jimble-icon>顧客
    </jimble-nav-item>
    <jimble-nav-group label="設定">
      <jimble-icon slot="icon" name="cog-6-tooth"></jimble-icon>
      <jimble-nav-item href="#">プロフィール</jimble-nav-item>
      <jimble-nav-item href="#">チーム</jimble-nav-item>
    </jimble-nav-group>
  </jimble-sidebar-nav>

  <jimble-page-header
    heading="ダッシュボード"
    description="ヘッダー左のボタンで、サイドバーを細くできます。細いときも、マウスを重ねると項目名と子項目が出ます。"
  ></jimble-page-header>
  <jimble-card style="margin-top: 1rem">
    <p style="margin: 0">ここに本文が入ります。</p>
  </jimble-card>
</jimble-app-shell>
```

### ヘッダー・サイドバーの色とアイコンの大きさ

`jimble-app-shell`（または `:root`）に、CSS 変数で指定する。`--jimble-app-shell-header-bg` / `-header-text` / `-header-hover-bg` / `-header-ring`、`--jimble-app-shell-sidebar-bg` / `-sidebar-ring`、`--jimble-sidebar-nav-text` / `-icon-color` / `-icon-size` / `-hover-bg` / `-current-bg` / `-current-text` / `-ring-focus`。**背景を暗くするときは、文字・アイコン・ホバー・現在のページ・フォーカスの色も一緒に変える**（文字 4.5:1、アイコン 3:1）。アイコンの大きさは `jimble-icon` にだけ効く。

```html
<jimble-app-shell
  sidebar-collapsible
  style="
    --jimble-app-shell-header-bg: #0f172a;
    --jimble-app-shell-header-text: #f8fafc;
    --jimble-app-shell-header-hover-bg: #1e293b;
    --jimble-app-shell-header-ring: #0f172a;
    --jimble-app-shell-sidebar-bg: #0f172a;
    --jimble-app-shell-sidebar-ring: #0f172a;
    --jimble-sidebar-nav-text: #cbd5e1;
    --jimble-sidebar-nav-icon-color: #94a3b8;
    --jimble-sidebar-nav-icon-size: 1.5rem;
    --jimble-sidebar-nav-hover-bg: #1e293b;
    --jimble-sidebar-nav-current-bg: #4338ca;
    --jimble-sidebar-nav-current-text: #ffffff;
    --jimble-sidebar-nav-ring-focus: #a5b4fc;
  "
>
  <strong slot="header">jimble 管理画面</strong>

  <jimble-sidebar-nav slot="sidebar">
    <jimble-nav-item href="#" current>
      <jimble-icon slot="icon" name="home"></jimble-icon>ダッシュボード
    </jimble-nav-item>
    <jimble-nav-item href="#">
      <jimble-icon slot="icon" name="shopping-cart"></jimble-icon>注文
    </jimble-nav-item>
    <jimble-nav-item href="#">
      <jimble-icon slot="icon" name="users"></jimble-icon>顧客
    </jimble-nav-item>
    <jimble-nav-group label="設定" open>
      <jimble-icon slot="icon" name="cog-6-tooth"></jimble-icon>
      <jimble-nav-item href="#">プロフィール</jimble-nav-item>
      <jimble-nav-item href="#">チーム</jimble-nav-item>
    </jimble-nav-group>
  </jimble-sidebar-nav>

  <jimble-page-header
    heading="ダッシュボード"
    description="ヘッダーとサイドバーの色、アイコンの大きさを、CSS 変数で変えています。"
  ></jimble-page-header>
</jimble-app-shell>
```

### 一覧ページの骨格（app-shell + page-header + tabs + table + pagination）

```html
<jimble-app-shell>
  <strong slot="header">jimble 管理画面</strong>

  <jimble-sidebar-nav slot="sidebar">
    <jimble-nav-item href="#">ダッシュボード</jimble-nav-item>
    <jimble-nav-item href="#" current>注文</jimble-nav-item>
    <jimble-nav-item href="#">顧客</jimble-nav-item>
  </jimble-sidebar-nav>

  <jimble-page-header heading="注文" description="受け付けた注文の一覧です。">
    <jimble-breadcrumb slot="breadcrumb">
      <jimble-breadcrumb-item href="#">ホーム</jimble-breadcrumb-item>
      <jimble-breadcrumb-item>注文</jimble-breadcrumb-item>
    </jimble-breadcrumb>
    <jimble-button slot="actions" variant="primary">新規注文</jimble-button>
  </jimble-page-header>

  <jimble-tabs label="注文の絞り込み" style="margin-top: 1rem">
    <jimble-tab value="all">すべて</jimble-tab>
    <jimble-tab value="open">未処理</jimble-tab>
    <jimble-tab-panel value="all">
      <jimble-card>
        <jimble-table label="注文一覧">
          <jimble-table-header>
            <jimble-table-row>
              <jimble-table-head-cell>注文番号</jimble-table-head-cell>
              <jimble-table-head-cell>顧客</jimble-table-head-cell>
              <jimble-table-head-cell align="end">金額</jimble-table-head-cell>
            </jimble-table-row>
          </jimble-table-header>
          <jimble-table-body>
            <jimble-table-row
              ><jimble-table-cell header>#1024</jimble-table-cell
              ><jimble-table-cell>山田 太郎</jimble-table-cell
              ><jimble-table-cell align="end">¥12,800</jimble-table-cell></jimble-table-row
            >
            <jimble-table-row
              ><jimble-table-cell header>#1023</jimble-table-cell
              ><jimble-table-cell>佐藤 花子</jimble-table-cell
              ><jimble-table-cell align="end">¥3,400</jimble-table-cell></jimble-table-row
            >
            <jimble-table-row
              ><jimble-table-cell header>#1022</jimble-table-cell
              ><jimble-table-cell>鈴木 一郎</jimble-table-cell
              ><jimble-table-cell align="end">¥58,000</jimble-table-cell></jimble-table-row
            >
          </jimble-table-body>
        </jimble-table>
        <div slot="footer">
          <jimble-pagination page="1" total="243" page-size="20" size="sm"></jimble-pagination>
        </div>
      </jimble-card>
    </jimble-tab-panel>
    <jimble-tab-panel value="open">未処理の注文はありません。</jimble-tab-panel>
  </jimble-tabs>
</jimble-app-shell>
```

## やってはいけないこと

- ラベルのない入力欄・アイコンだけのボタンを作る。
- `<table>` / `<select>` / `<dialog>` を、jimble のコンポーネントの代わりに同じ画面へ混ぜて、見た目を CSS で似せる。
- 内部のクラス名（`bg-primary-600` など）や、Shadow DOM の内側の構造に依存した CSS を書く。
- `jimble-button type="submit"` の `name` / `value` に頼る。
- 存在しない属性やイベントを書く（上の早見と `custom-elements.json` にあるものだけを使う）。
- 通知だけに重要な情報を載せる。自動で消えるものは、読み終える前に消えることがある。
- `disabled="false"` のように、真偽値の属性へ値を書いて切り替えようとする（属性の有無で切り替える）。

## 対応ブラウザと既知の制約

Chrome / Edge / Firefox / Safari の最新 2 バージョン。Popover API、`<dialog>`、CSS Anchor Positioning（Chrome/Edge 125+、Firefox 147+、Safari 26+）を使う。未対応: 非モーダルのパネル、Select の複数選択・絞り込み（Combobox を使う）、メニューのサブメニュー、表のセル結合、日付の秒・タイムゾーン、色の透明度、ダークモード、SSR。一覧: <https://hidemikimura.github.io/jimble-ui/guide/limitations/>

## 動作の確かめ方

- ブラウザで開き、キーボードだけで操作してみる（Tab、矢印、Enter、Space、Esc）。
- 入力欄とアイコンボタンに名前があるか、ブラウザの開発者ツールのアクセシビリティ表示、または axe で確認する。
- 色を変えたら、コントラスト比を確認する。
