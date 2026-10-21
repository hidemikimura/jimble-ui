# app-shell とテーマ

管理画面の骨格（app-shell）と、テーマ（CSS 変数）の詳細。

### 一覧ページの骨格（app-shell + page-header + tabs + table + pagination）

{{example:app-shell/admin-page}}

### サイドバーを細くできる管理画面

`jimble-app-shell` に `sidebar-collapsible` を付けると、ヘッダーのボタンで、サイドバーを「アイコンだけの細い表示」と「項目名つきの広い表示」に切り替えられる（広い画面のみ）。細い表示でも、マウスを重ねる・フォーカスすると広がって、項目名と子項目（`jimble-nav-group`）が使える。**項目には `slot="icon"` のアイコンを付ける**（ない項目は頭文字になる）。状態は `sidebar-collapsed` で、切り替わると `jimble-sidebar-toggle`（`detail.collapsed`）が出る。

{{example:app-shell/collapsible}}

### 色・太さ・影・角丸を、テーマで変える

`:root` に CSS 変数を書く。**枠の色は、用途別に分けられる**: `--jimble-color-ring-card`（カードの枠）・`--jimble-color-ring-divider`（区切り線）・`--jimble-color-ring-button`（ボタンの枠）。ほかに、文字の太さ `--jimble-font-weight-medium` / `-semibold`、影 `--jimble-card-shadow` / `--jimble-input-shadow` / `--jimble-button-shadow`、`--jimble-badge-radius`、ツールチップ `--jimble-tooltip-bg` / `-text`、スイッチの丸 `--jimble-switch-thumb-bg` / `-ring`、表の見出し `--jimble-table-header-bg` / `-text`、`--jimble-breadcrumb-justify`（`center` で中央）、`--jimble-page-header-heading-weight`。一覧は <https://hidemikimura.github.io/jimble-ui/guide/theming/> の「テーマで変えられる項目」を参照。

### ヘッダー・サイドバーの色とアイコンの大きさ

`jimble-app-shell`（または `:root`）に、CSS 変数で指定する。`--jimble-app-shell-header-bg` / `-header-text` / `-header-hover-bg` / `-header-ring`、`--jimble-app-shell-sidebar-bg` / `-sidebar-ring`、`--jimble-sidebar-nav-text` / `-icon-color` / `-icon-size` / `-hover-bg` / `-current-bg` / `-current-text` / `-ring-focus`。**背景を暗くするときは、文字・アイコン・ホバー・現在のページ・フォーカスの色も一緒に変える**（文字 4.5:1、アイコン 3:1）。アイコンの大きさは `jimble-icon` にだけ効く。

{{example:app-shell/theme}}
