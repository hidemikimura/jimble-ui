---
name: jimble-ui
description: jimble-ui（`<jimble-button>` など `jimble-` で始まる Web Components）で管理画面の HTML を書く・直すときに使う。コンポーネントの選び方、属性・イベント・スロットの書き方、フォームのラベル付けと送信、表・ダイアログ・メニュー・通知・app-shell の組み立て、見た目のカスタマイズ（CSS 変数 → ::part() → スロット）、アクセシビリティ上の注意を含む。
---

<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# jimble-ui の使い方

`@hidemikimura/jimble-ui` は、管理画面向けの Web Components です。素の HTML に書けて、React などのラッパーはありません。内部は Shadow DOM で、Tailwind は利用者側に不要です。UI の文言は日本語が既定です。

- ドキュメントとすべての例: <https://hidemikimura.github.io/jimble-ui/>
- 属性・スロット・イベント・part・CSS 変数の完全な一覧（機械可読）: `node_modules/@hidemikimura/jimble-ui/custom-elements.json`
- 下の「コンポーネント早見」は、その一覧から生成した要約です。**細かい仕様（各属性の意味、既定値、キー操作）は各コンポーネントのページを見てください。推測で属性を作らないこと。**
- 1 つの要素の属性・スロット・イベント・CSS 変数を確かめる: `npx @hidemikimura/jimble-ui component <名前>`。何を使うか分からないときは `npx @hidemikimura/jimble-ui search <ことば>`（どちらも `--json` で JSON。`npx jimble-ui` と略さない）。
- **余白は `jimble-stack`（縦・横）と `jimble-grid`（格子）でそろえる**: `gap` は 4px の何倍か（2 = ボタンの並び、4 = フォームの項目・カードの間、6 = まとまりの間）。`style="display: flex; gap: 12px"` のような値を場所ごとに書かない。`jimble-grid min-column-width="12rem"` で、幅に合わせて列の数が変わる。
- **ページ全体を作るときは、まずテンプレートから始める**: `npx @hidemikimura/jimble-ui template` で一覧（一覧・詳細・編集フォーム・設定・ログイン・ダッシュボード）、`template <名前>` でそのまま開ける HTML、`--fragment` で本文だけ。axe を通った組み立てなので、文言とデータを差し替えて使う。

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

各要素の詳しい説明と例は `https://hidemikimura.github.io/jimble-ui/components/<名前>/`（`jimble-` を除いた名前。子の要素は「説明」に書いたページ）、または `npx @hidemikimura/jimble-ui component <名前>`。**（試験的）**の部品は、マイナーバージョンで属性・イベントが変わることがある。使ってよいが、更新したら変更点（CHANGELOG）を確かめる。**（非推奨）**の部品は、新しく書かない。

### 枠組み

- **`jimble-app-shell`** — 管理画面の枠組み: 上部のヘッダー、左のサイドバー、本文。
  - 属性: `sidebar-open`, `sidebar-collapsible`, `sidebar-collapsed`
  - スロット: `banner`, `header`, `sidebar`, (既定)
  - イベント: `jimble-open`, `jimble-close`, `jimble-sidebar-toggle`
- **`jimble-sidebar-nav`** — サイドバーのナビゲーション。
  - 属性: `label=値`, `compact`
  - スロット: (既定)
- **`jimble-nav-item`** — ナビゲーションの項目（リンク）。
  - 属性: `href=値`, `current`, `target=値`
  - スロット: (既定), `icon`
  - 状態: `:state(current)`
  - 説明: `sidebar-nav` のページ
- **`jimble-nav-group`** — 折りたためる項目のまとまり（disclosure パターン）。
  - 属性: `label=値`, `open`
  - スロット: (既定), `icon`
  - イベント: `jimble-open`, `jimble-close`
  - 状態: `:state(flat)`
  - 説明: `sidebar-nav` のページ
- **`jimble-page-header`** — ページの見出し領域。
  - 属性: `heading=値`, `description=値`, `level=数値`
  - スロット: `breadcrumb`, `title`, `description`, `actions`, (既定)
- **`jimble-breadcrumb`** — パンくずリスト。
  - 属性: `label=値`
  - スロット: (既定)
- **`jimble-breadcrumb-item`** — パンくずの 1 項目。
  - 属性: `href=値`, `current`
  - スロット: (既定)
  - 説明: `breadcrumb` のページ
- **`jimble-tabs`** — タブ。
  - 属性: `value=値`, `activation=auto|manual`, `orientation=horizontal|vertical`, `label=値`
  - スロット: (既定), `tab`
  - イベント: `jimble-tab-change`
- **`jimble-tab`** — タブ 1 つ。
  - 属性: `value=値`, `disabled`
  - スロット: (既定)
  - 状態: `:state(selected)`
  - 説明: `tabs` のページ
- **`jimble-tab-panel`** — タブのパネル。
  - 属性: `value=値`
  - スロット: (既定)
  - 説明: `tabs` のページ
- **`jimble-router`** — シングルページアプリのルーター（Navigation API を使う）。
  - 属性: `scroll-container=値`, `no-chunk-reload`, `busy`
  - スロット: (既定)
  - イベント: `jimble-route-loading`, `jimble-route-change`, `jimble-route-error`
- **`jimble-stack`**（試験的） — 子の要素を、同じ間隔で縦（または横）に並べる。
  - 属性: `direction=vertical|horizontal`, `gap=数値`, `align=値`, `justify=start|center|end|between`, `wrap`
  - スロット: (既定)
- **`jimble-grid`**（試験的） — 子の要素を、同じ間隔の格子に並べる。
  - 属性: `columns=数値`, `min-column-width=値`, `gap=数値`
  - スロット: (既定)

### 表示

- **`jimble-card`** — 関連する情報をまとめる面。
  - 属性: `sticky-footer`, `sticky-header`
  - スロット: (既定), `header`, `footer`
  - 状態: `:state(stuck-header)`, `:state(stuck-footer)`
- **`jimble-badge`** — 状態やカテゴリを示す小さなラベル。
  - 属性: `variant=neutral|primary|success|warning|danger|info`, `size=sm|md`, `dot`
  - スロット: (既定), `prefix`
- **`jimble-avatar`**（試験的） — 人（担当者・作成者・ユーザー）を、画像か頭文字の小さな丸で示す。
  - 属性: `name=値`, `src=値`, `size=sm|md|lg`, `shape=circle|square`, `decorative`
- **`jimble-avatar-group`**（試験的） — アバターを重ねて並べる。
  - 属性: `max=数値`, `label=値`
  - スロット: (既定)
  - 説明: `avatar` のページ
- **`jimble-tag`**（試験的） — もの・条件に付ける、外せる名札（絞り込みの条件・付けたラベル・選んだ宛先）。
  - 属性: `value=値`, `removable`, `size=sm|md`
  - スロット: (既定)
  - イベント: `jimble-remove`
- **`jimble-tag-group`**（試験的） — タグを折り返して並べる。
  - 属性: `label=値`
  - スロット: (既定)
  - 説明: `tag` のページ
- **`jimble-alert`** — ページ内の通知。
  - 属性: `variant=info|success|warning|danger`, `dismissible`
  - スロット: (既定), `title`, `icon`, `actions`
  - イベント: `jimble-dismiss`
- **`jimble-banner`**（試験的） — 画面のいちばん上に、幅いっぱいで出す知らせ（保守の予定・契約の期限切れ・障害など、アプリ全体に関わること）。
  - 属性: `variant=info|warning|danger`, `dismissible`
  - スロット: (既定), `icon`, `actions`
  - イベント: `jimble-dismiss`
- **`jimble-spinner`** — 読み込み中を示すスピナー。
  - 属性: `size=sm|md|lg`, `variant=current|primary`, `label=値`, `decorative`
- **`jimble-progress`**（試験的） — 処理の進み具合を、横の棒で示す（ファイルの取り込み・一括の処理・設定の完了の度合い）。
  - 属性: `value=値`, `max=数値`, `label=値`, `variant=primary|success|warning|danger`, `size=sm|md`, `show-value`
  - 状態: `:state(indeterminate)`
- **`jimble-skeleton`**（試験的） — 読み込み中に、あとから出る内容と同じ形の、仮の面を出す（表の行・カード・文章）。
  - 属性: `variant=text|rect|circle`, `lines=数値`
- **`jimble-empty-state`**（試験的） — 表示するものがないことを伝え、次の一歩を示す（空の一覧・検索の結果なし・まだ作っていない）。
  - 属性: `heading=値`, `description=値`, `level=数値`
  - スロット: `icon`, `title`, `description`, `actions`, (既定)
- **`jimble-stepper`** — 段階を踏む入力（予約の登録など）の、今の位置と進み具合を見せる。
  - 属性: `value=値`, `orientation=horizontal|vertical`, `size=sm|md`, `navigable`, `label=値`
  - スロット: (既定)
  - イベント: `jimble-step-change`
- **`jimble-step`** — ステッパーの 1 段階。
  - 属性: `value=値`, `error`, `disabled`
  - スロット: (既定), `description`
  - 状態: `:state(vertical)`
- **`jimble-icon`** — アイコン。
  - 属性: `name=値`, `size=sm|md|lg|xl`, `label=値`
- **`jimble-table`** — データテーブル。
  - 属性: `label=値`, `sticky-header`, `striped`, `no-empty`, `loading`, `selectable`, `row-height=数値`, `row-key=値`
  - スロット: (既定), `empty`
  - イベント: `jimble-sort`, `jimble-selection-change`
  - 状態: `:state(virtual)`, `:state(empty)`
- **`jimble-table-header`** — 表の見出し行のまとまり（rowgroup）。
  - スロット: (既定)
  - 説明: `table` のページ
- **`jimble-table-body`** — 表の本体の行のまとまり（rowgroup）。
  - スロット: (既定)
  - 説明: `table` のページ
- **`jimble-table-row`** — 表の行（row）。
  - 属性: `selected`, `value=値`
  - スロット: (既定)
  - 説明: `table` のページ
- **`jimble-table-head-cell`** — 表の見出しセル（columnheader）。
  - 属性: `align=start|center|end`, `sortable`, `sort=ascending|descending|none`, `colspan=数値`, `key=値`
  - スロット: (既定)
  - イベント: `jimble-sort`
  - 説明: `table` のページ
- **`jimble-table-cell`** — 表のセル（cell）。
  - 属性: `align=start|center|end`, `header`, `colspan=数値`
  - スロット: (既定)
  - 説明: `table` のページ
- **`jimble-description-list`** — 項目名と値の一覧（詳細画面など）。
  - 属性: `layout=horizontal|vertical`
  - スロット: (既定)
- **`jimble-description-item`** — 一覧の 1 項目。
  - 属性: `label=値`
  - スロット: (既定), `label`
  - 説明: `description-list` のページ
- **`jimble-pagination`** — ページネーション。
  - 属性: `page=数値`, `total-pages=値`, `total=値`, `page-size=数値`, `sibling-count=数値`, `href-template=値`, `size=sm|md|lg`, `label=値`
  - イベント: `jimble-page-change`
- **`jimble-kanban`** — カンバンボード。
  - 属性: `label=値`, `readonly`
  - スロット: (既定)
  - イベント: `jimble-card-move`
- **`jimble-kanban-column`** — カンバンの列。
  - 属性: `value=値`, `heading=値`
  - スロット: (既定), `actions`, `empty`
  - 状態: `:state(over)`
  - 説明: `kanban` のページ
- **`jimble-kanban-card`** — カンバンのカード。
  - 属性: `value=値`, `label=値`, `locked`
  - スロット: (既定)
  - 状態: `:state(moving)`, `:state(dragging)`, `:state(locked)`
  - 説明: `kanban` のページ

### 入力

- **`jimble-button`** — ボタン。
  - 属性: `variant=primary|secondary|danger|ghost`, `size=sm|md|lg`, `type=button|submit|reset`, `disabled`, `loading`, `href=値`, `target=値`, `rel=値`, `download=値`, `icon-only`, `block`, `aria-label=値`, `aria-description=値`
  - スロット: (既定), `prefix`, `suffix`
  - 状態: `:state(loading)`, `:state(disabled)`, `:state(icon-only)`
- **`jimble-field`** — ラベル・ヒント・エラーを付けるための入れ物。
  - 属性: `label=値`, `hint=値`, `error=値`, `required`
  - スロット: (既定), `label`, `hint`, `error`
- **`jimble-input`** — 1 行のテキスト入力。
  - 属性: `type=text|email|password|search|tel|url|number`, `min=値`, `max=値`, `step=値`, `pattern=値`, `value=値`, `placeholder=値`, `readonly`, `minlength=値`, `maxlength=値`, `autocomplete=値`, `inputmode=値`, `enterkeyhint=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: `prefix`, `suffix`
  - イベント: `input`, `change`
  - 状態: `:state(readonly)`
- **`jimble-textarea`** — 複数行のテキスト入力。
  - 属性: `rows=数値`, `autosize`, `value=値`, `placeholder=値`, `readonly`, `minlength=値`, `maxlength=値`, `autocomplete=値`, `inputmode=値`, `enterkeyhint=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`
  - 状態: `:state(readonly)`
- **`jimble-code-editor`** — コード・テンプレートの編集欄(CodeMirror 6)。
  - 属性: `value=値`, `placeholder=値`, `readonly`, `language=text|html|json`, `rows=数値`, `line-numbers`, `variable-prefix=値`, `variable-suffix=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`
  - 状態: `:state(readonly)`
- **`jimble-select`** — セレクト(WAI-ARIA の collapsible dropdown listbox パターン)。
  - 属性: `value=値`, `placeholder=値`, `open`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `input`, `change`, `input`, `change`
- **`jimble-option`** — セレクトの選択肢。
  - 属性: `value=値`, `disabled`, `keywords=値`, `group=値`
  - スロット: (既定)
  - 状態: `:state(selected)`
  - 説明: `select` のページ
- **`jimble-combobox`** — 絞り込みできるセレクト(WAI-ARIA の combobox・list autocomplete パターン)。
  - 属性: `value=値`, `placeholder=値`, `readonly`, `clearable`, `multiple`, `creatable`, `match=contains|starts-with`, `search-group`, `open`, `load-delay=数値`, `load-min-length=数値`, `max-items=値`, `reorderable`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `jimble-search`, `jimble-create`, `jimble-load-error`, `jimble-reorder`, `jimble-open`, `jimble-close`, `input`, `change`
- **`jimble-dual-listbox`** — 左右に分かれた選択(デュアルリストボックス)。
  - 属性: `value=値`, `available-label=値`, `selected-label=値`, `move-all`, `max-items=値`, `match=contains|starts-with`, `reorderable`, `search-group`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`, `jimble-reorder`, `input`, `change`
- **`jimble-date-input`** — 日付・日時・期間の入力。
  - 属性: `value=値`, `min=値`, `max=値`, `placeholder=値`, `readonly`, `picker-only`, `range`, `time`, `months=数値`, `minute-step=数値`, `first-day-of-week=数値`, `open`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `type`, `input`, `change`, `input`, `change`
- **`jimble-color-input`** — 色の入力。
  - 属性: `value=値`, `placeholder=値`, `readonly`, `presets=値`, `alpha`, `open`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `type`, `input`, `change`, `input`, `change`
- **`jimble-file-input`** — ファイルの添付。
  - 属性: `accept=値`, `multiple`, `max-size=値`, `max-files=値`, `preview`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - イベント: `input`, `change`, `jimble-reject`, `jimble-upload-start`, `jimble-upload-complete`, `jimble-upload-error`, `input`, `change`
  - 状態: `:state(has-files)`, `:state(dragging)`
- **`jimble-checkbox`** — チェックボックス。
  - 属性: `indeterminate`, `checked`, `value=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `change`
- **`jimble-radio-group`** — ラジオのグループ。
  - 属性: `value=値`, `orientation=vertical|horizontal`, `appearance=default|segmented`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `input`, `change`, `input`, `change`
- **`jimble-radio`** — ラジオ。
  - 属性: `value=値`, `disabled`, `size=sm|md|lg`
  - スロット: (既定)
  - 状態: `:state(checked)`, `:state(disabled)`, `:state(segmented)`
  - 説明: `radio-group` のページ
- **`jimble-switch`** — オン/オフのスイッチ。
  - 属性: `checked`, `value=値`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `change`, `input`, `change`
- **`jimble-tree`**（試験的） — 開閉できる階層の一覧（WAI-ARIA の Tree View パターン）。
  - 属性: `value=値`, `selection=none|single|multiple`, `checked-values=all|leaves`, `guides`, `name=値`, `disabled`, `required`, `size=sm|md|lg`, `aria-label=値`
  - スロット: (既定)
  - イベント: `input`, `change`, `jimble-selection-change`, `jimble-expand`, `jimble-collapse`, `input`, `change`
- **`jimble-tree-item`**（試験的） — 木の項目。
  - 属性: `label=値`, `value=値`, `expanded`, `lazy`, `disabled`
  - スロット: (既定), `icon`, `end`
  - 状態: `:state(expanded)`, `:state(selected)`, `:state(checked)`, `:state(mixed)`, `:state(disabled)`
  - 説明: `tree` のページ

### オーバーレイ

- **`jimble-dialog`** — モーダルダイアログ。
  - 属性: `open`, `heading=値`, `size=sm|md|lg`, `alert`, `static-backdrop`, `hide-close-button`, `aria-label=値`
  - スロット: (既定), `title`, `footer`
  - イベント: `jimble-open`, `jimble-close-request`, `jimble-close`
- **`jimble-drawer`** — 画面の端から出るモーダルのパネル(サイドモーダル・ドロワー・スライドパネル・ボトムシート)。
  - 属性: `placement=end|start|top|bottom`, `open`, `heading=値`, `size=sm|md|lg`, `alert`, `static-backdrop`, `hide-close-button`, `aria-label=値`
  - スロット: (既定), `title`, `footer`
  - イベント: `jimble-open`, `jimble-close-request`, `jimble-close`
- **`jimble-dropdown-menu`** — ドロップダウンメニュー(WAI-ARIA の menu button パターン)。
  - 属性: `open`, `placement=bottom-start|bottom-end|top-start|top-end`, `label=値`
  - スロット: `trigger`, (既定)
  - イベント: `jimble-open`, `jimble-close`, `jimble-select`
- **`jimble-menu-item`** — メニューの項目。
  - 属性: `value=値`, `disabled`, `href=値`, `target=値`, `variant=default|danger`
  - スロット: (既定), `prefix`, `submenu`
  - 説明: `dropdown-menu` のページ
- **`jimble-menu-separator`** — メニューの区切り線。
  - 説明: `dropdown-menu` のページ
- **`jimble-popover`**（試験的） — ボタンの近くに開く、操作できる小さなパネル（ポップオーバー）。
  - 属性: `open`, `placement=bottom-start|bottom-end|top-start|top-end`, `heading=値`, `label=値`, `hide-close-button`
  - スロット: `trigger`, (既定), `title`
  - イベント: `jimble-open`, `jimble-close`
- **`jimble-command-palette`**（試験的） — コマンドパレット。
  - 属性: `open`, `label=値`, `placeholder=値`, `hotkey=値`, `load-delay=数値`, `load-min-length=数値`
  - スロット: (既定)
  - イベント: `jimble-select`, `jimble-open`, `jimble-close`, `jimble-search`, `jimble-load-error`
- **`jimble-command`**（試験的） — コマンドパレットのコマンド 1 つ。
  - 属性: `value=値`, `keywords=値`, `group=値`, `icon=値`, `shortcut=値`, `href=値`, `disabled`
  - スロット: (既定)
  - 説明: `command-palette` のページ
- **`jimble-toast`** — 通知1件。
  - 属性: `variant=info|success|warning|danger`, `duration=値`, `dismissible`
  - スロット: (既定), `title`, `actions`
  - イベント: `jimble-dismiss`
- **`jimble-toast-region`** — 通知(`jimble-toast`)の置き場。
  - 属性: `placement=top-start|top|top-end|bottom-start|bottom|bottom-end`
  - スロット: `polite`, `assertive`
  - 説明: `toast` のページ
- **`jimble-tooltip`** — 囲んだ要素にマウスを重ねる、またはフォーカスすると、短い補足説明を出すツールチップ。
  - 属性: `text=値`, `placement=top|bottom|left|right`, `multiline`, `delay=数値`, `disabled`, `open`
  - スロット: (既定)
  - イベント: `jimble-open`, `jimble-close`

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

`jimble-table` > `jimble-table-header` / `jimble-table-body` > `jimble-table-row` > `jimble-table-head-cell` / `jimble-table-cell`。横の結合は `colspan`（2 段の見出し・合計の行）。`rowspan` は使えない。列の幅は表の `--jimble-table-columns`（`grid-template-columns` の書き方。セルの `width` は効かない）。表には `label` を付ける。数値の列は `align="end"`。**数千行を超えるときは、HTML に行を書かず**、`table.columns`（`{ key, label, width, align, header, sortable, render }`）と `table.rows`（配列）をプロパティで渡す（見えている行だけ描く。行の高さは `row-height` で固定）。並べ替えは `sortable` を付け、`jimble-sort`（`detail.direction`）を受けて**アプリが行を並べ替える**（部品は並べ替えない）。行を選ぶなら表に `selectable`（行頭にチェックボックス。行に `value` を付け、`jimble-selection-change` の `detail.values` か `selectedValues` で読む。自前でチェックボックスの列を作らない）。

### 4. 部品ごとの使い方（オーバーレイ・選択・通知など）

**使う部品の参照ファイルを、書き始める前に読む**（`SKILL.md` と同じフォルダの `references/`）。注意書きと、そのまま使える例がある。

- **ダイアログ・ドロワー・ポップオーバー・コマンドパレット・ツールチップ・メニュー・通知** → `references/overlays.md`（結果・警告・エラー・空の状態を、どの部品で知らせるかもここ）。コマンドパレットは全部入りに含まれず、別に import する。ダイアログ・ドロワーは `heading` が必須。通知は要素を自分で置かず `JimbleUI.toast()`。
- **セレクト・コンボボックス・左右分割の選択・木・日付・色・ファイル添付・コードエディタ** → `references/inputs.md`。コードエディタは全部入りに含まれず、別に import する。セレクトは最初の選択肢が自動で選ばれない。コンボボックスは自由入力が値にならず、`jimble-search` が出る。日付の値は文字列で、`jimble-input` に `type="date"` はない。
- **表（並べ替え）・アイコン・スピナー・カンバン** → `references/display.md`。**アイコンの `name` は、そこにある一覧のものだけ**（推測しない）。
- **独自の検証（`jimble-field` の `validate`）** → `references/form-validation.md`。属性ではなく JS のプロパティ。
- **ルーター（SPA）** → `references/router.md`。`title` を必ず付ける。
- **app-shell（サイドバー・ヘッダー）・一覧ページの骨格・テーマの CSS 変数** → `references/layout-theme.md`。
- **部品ごとの Do / Don't**（こうする・避ける）→ `references/dos.md`。部品の選び方に迷ったら読む。
- **Playwright での E2E テスト** → `references/testing.md`。操作の関数 `import { jimble } from '@hidemikimura/jimble-ui/testing'` を使う（`getByRole` の落とし穴もそこにある）。

### 5. ナビゲーション

- 現在のページの項目に `current` を付ける（`jimble-nav-item`、`jimble-breadcrumb-item`）。判定はアプリの仕事。
- 段階を踏む入力の進み具合は `jimble-stepper`（`value` = 今の `jimble-step` の `value`。前は済・後は未。`navigable` で済の段階を選べて `jimble-step-change`。`value` はアプリが変える）。
- 1 ページに `nav` の部品（パンくず・サイドバー・ページネーション）を複数置くときは、`label` で名前を変える。
- `jimble-tabs` の `jimble-tab` と `jimble-tab-panel` は `value` で対応させる。`slot` 属性は不要。

### 5b. ルーター（SPA）

`<jimble-router>` に `routes` を渡す（JS のプロパティ。1 ドキュメントに 1 つ）。書き方・`load`・`data` / `state`・スクロールの復元は `references/router.md` を読む。**`title` を必ず付ける**。

### 6. 見た目のカスタマイズ（この順で）

0. **余白の段階**: `density.css` を読み込み、`data-jimble-density="compact|default|comfortable|spacious"` を `<html>` か要素に付ける（詳しくは `references/layout-theme.md`）。
1. **既製のテーマ**: `ocean`・`forest`・`plum`・`sand`・`high-contrast`（文字 7:1・枠 4.5:1 の高コントラスト）。`@hidemikimura/jimble-ui/themes/<名前>.css`（CDN は `dist/themes/<名前>.css`）を読み込むだけで、色と角丸がライト・ダークともに変わる。要素に `data-jimble-theme="名前"` を付けると、その中だけ。`tokens.css` とは併用しない。詳しくは `references/layout-theme.md`。
2. **CSS 変数**: 色・角丸・高さなど。`:root { --jimble-color-primary-600: #0f766e; }` はページのどこにでも書け、全部品に届く。部品固有の変数（`--jimble-button-radius` など）は、その部品のページの「CSS 変数」の表にある。
3. **`::part()`**: `jimble-button::part(label) { … }`。part の名前は各ページの表にある。状態は `:state()`（`jimble-button:state(loading)`）。各部品の状態は「コンポーネント早見」にあり、フォーム部品はすべて `:state(invalid)`（誤りを表示中）・`:state(touched)`・`:state(disabled)` を持つ。
4. **スロット**: アイコンや操作を自分の HTML に置き換える。

内部の Tailwind クラス名は非公開で、ページの CSS から狙えない・狙ってはいけない。**色を変えるときは、コントラストを確かめる**（主ボタンの背景は白い文字が乗るので 4.5:1 以上、入力欄の枠は 3:1 以上）。

**ダークモード**は CSS の `color-scheme` で切り替える（`:root { color-scheme: light dark }` で OS に従う、`dark` で常にダーク。要素に書けば、その中だけ）。何も書かなければライト。部品はページの `body` を塗らないので、ページの背景・文字の色は自分で指定する。色の変数を 1 つの値で上書きすると両方のモードで同じ色になるので、モードで変えるなら `light-dark(明, 暗)` で書く。ダークモードを切り替える属性はない（`data-jimble-theme` は既製のテーマの選択で、モードは変えない）。

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

Chrome / Edge / Firefox / Safari の最新 2 バージョン。Popover API、`<dialog>`、CSS Anchor Positioning（Chrome/Edge 125+、Firefox 147+、Safari 26+）を使う。未対応: 非モーダルのパネル、Select の複数選択・絞り込み（Combobox を使う）、メニューのチェック付き項目、表の縦のセル結合（rowspan）、日付の秒・タイムゾーン、色の oklch などの色空間、SSR。一覧: <https://hidemikimura.github.io/jimble-ui/guide/limitations/>

## 動作の確かめ方

- ブラウザで開き、キーボードだけで操作してみる（Tab、矢印、Enter、Space、Esc）。
- 入力欄とアイコンボタンに名前があるか、ブラウザの開発者ツールのアクセシビリティ表示、または axe で確認する。
- 色を変えたら、コントラスト比を確認する。
