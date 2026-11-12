# app-shell とテーマ

管理画面の骨格（app-shell）と、テーマ（CSS 変数）の詳細。

### 一覧ページの骨格（app-shell + page-header + tabs + table + pagination）

{{example:app-shell/admin-page}}

### サイドバーを細くできる管理画面

`jimble-app-shell` に `sidebar-collapsible` を付けると、ヘッダーのボタンで、サイドバーを「アイコンだけの細い表示」と「項目名つきの広い表示」に切り替えられる（広い画面のみ）。細い表示でも、マウスを重ねる・フォーカスすると広がって、項目名と子項目（`jimble-nav-group`）が使える。**項目には `slot="icon"` のアイコンを付ける**（ない項目は頭文字になる）。状態は `sidebar-collapsed` で、切り替わると `jimble-sidebar-toggle`（`detail.collapsed`）が出る。

{{example:app-shell/collapsible}}

### 既製のテーマを使う

`ocean`（青・角丸小）・`forest`（緑）・`plum`（紫・角丸大）・`sand`（橙）がある。CSS を 1 つ読み込むと、主色・灰色・角丸が、ライトとダークの両方で変わる（コントラストは自動テストで保証済み）。

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/themes/ocean.css"
/>
```

npm では `import '@hidemikimura/jimble-ui/themes/ocean.css'`。テーマの上に `:root { --jimble-…: … }` を書けば、読み込む順によらず、そちらが勝つ（テーマを出発点に一部だけ変えられる）。ページの一部だけ別のテーマにするには、テーマの CSS を読み込んだうえで、要素に `data-jimble-theme="forest"` を付ける。JS で切り替えるなら、使うテーマを全部読み込み、`document.documentElement.dataset.jimbleTheme` を書き換える。**`tokens.css` と一緒に読み込まない**（`tokens.css` が勝ち、テーマが効かない）。存在しないテーマ名を書かない（上の 4 つだけ）。

{{example:themes/preview}}

### 余白の段階（密度）

`density.css`（npm は `@hidemikimura/jimble-ui/density.css`、CDN は `dist/density.css`）を読み込み、`<html>` か要素に `data-jimble-density` を付ける: `compact`（余白 3px・高さ 28/32/36）・`default`（既定。4px・32/36/40）・`comfortable`（5px・36/40/44）・`spacious`（6px・40/44/48）。要素に付ければその中だけ、入れ子は内側が優先。変わるのは `--jimble-spacing` と `--jimble-control-height-*` だけ（文字の大きさは変わらない）。利用者が書いた CSS 変数が優先する。

### 角丸・文字・余白を、倍率でまとめて変える

`--jimble-radius-scale`（角丸の sm〜xl にかける。既定 1、0 で角なし）、`--jimble-font-size-scale`（文字の xs〜xl と行の高さにかける。既定 1）、`--jimble-spacing`（余白の基準。既定 0.25rem）。段階ごとの変数（`--jimble-radius-lg` など）を書くと、そちらが優先する。文字を大きくしてもボタン・入力欄の高さは変わらない（`--jimble-control-height-*` で変える）。

### 色・太さ・影・角丸を、テーマで変える

`:root` に CSS 変数を書く。**枠の色は、用途別に分けられる**: `--jimble-color-ring-card`（カードの枠）・`--jimble-color-ring-divider`（区切り線）・`--jimble-color-ring-button`（ボタンの枠）。ほかに、文字の太さ `--jimble-font-weight-medium` / `-semibold`、影 `--jimble-card-shadow` / `--jimble-input-shadow` / `--jimble-button-shadow`、`--jimble-badge-radius`、ツールチップ `--jimble-tooltip-bg` / `-text`、スイッチの丸 `--jimble-switch-thumb-bg` / `-ring`、表の見出し `--jimble-table-header-bg` / `-text`、`--jimble-breadcrumb-justify`（`center` で中央）、`--jimble-page-header-heading-weight`。ボタンの背景と hover の色は、種類ごと（`--jimble-button-primary-bg` / `-bg-hover` / `-fg-hover`。`secondary`・`danger`・`ghost` も同じ。種類ごとの変数は、共通の `--jimble-button-bg` より優先）。色の付いた面（アラートなど）で白ボタンを馴染ませるなら `--jimble-button-secondary-bg: transparent`。**文字の色だけ変えるとき**は、`-bg-hover` に元の背景色（ghost なら `transparent`）を書く。メニュー・セレクト・コンボボックス・左右分割の選択の項目の hover は `--jimble-color-item-hover`、ページネーションの影は `--jimble-pagination-shadow`（`none` で影なし。既定はボタンの影と同じ）。小さなアイコンボタン（コンボボックスの × と開閉、日付のカレンダー、ファイルの削除、ダイアログ・通知の閉じる）の hover は `--jimble-icon-button-hover-bg`（`transparent` で背景なし）と `--jimble-icon-button-hover-fg`、「ファイルを選択」は `--jimble-file-input-button-hover-bg` / `-fg`。カンバンの列の「+」は `jimble-button variant="ghost"` なので、`jimble-kanban-column { --jimble-button-ghost-bg-hover: transparent; --jimble-button-ghost-fg-hover: 色; }` のように、列に限って指定できる。表の行の hover は `--jimble-table-row-hover-bg`、暗幕の濃さだけは `--jimble-backdrop-opacity`（色ごと変えるなら `--jimble-color-backdrop`）。一覧は <https://hidemikimura.github.io/jimble-ui/guide/theming/> の「テーマで変えられる項目」を参照。

### ヘッダー・サイドバーの色とアイコンの大きさ

`jimble-app-shell`（または `:root`）に、CSS 変数で指定する。`--jimble-app-shell-header-bg` / `-header-text` / `-header-hover-bg` / `-header-ring`、`--jimble-app-shell-sidebar-bg` / `-sidebar-ring`、`--jimble-sidebar-nav-text` / `-icon-color` / `-icon-size` / `-hover-bg` / `-current-bg` / `-current-text` / `-ring-focus`。**背景を暗くするときは、文字・アイコン・ホバー・現在のページ・フォーカスの色も一緒に変える**（文字 4.5:1、アイコン 3:1）。アイコンの大きさは `jimble-icon` にだけ効く。

{{example:app-shell/theme}}
