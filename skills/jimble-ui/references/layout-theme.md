<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# app-shell とテーマ

管理画面の骨格（app-shell）と、テーマ（CSS 変数）の詳細。

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

### 色・太さ・影・角丸を、テーマで変える

`:root` に CSS 変数を書く。**枠の色は、用途別に分けられる**: `--jimble-color-ring-card`（カードの枠）・`--jimble-color-ring-divider`（区切り線）・`--jimble-color-ring-button`（ボタンの枠）。ほかに、文字の太さ `--jimble-font-weight-medium` / `-semibold`、影 `--jimble-card-shadow` / `--jimble-input-shadow` / `--jimble-button-shadow`、`--jimble-badge-radius`、ツールチップ `--jimble-tooltip-bg` / `-text`、スイッチの丸 `--jimble-switch-thumb-bg` / `-ring`、表の見出し `--jimble-table-header-bg` / `-text`、`--jimble-breadcrumb-justify`（`center` で中央）、`--jimble-page-header-heading-weight`。ボタンの hover の色は、種類ごと（`--jimble-button-primary-bg-hover` / `-fg-hover`。`secondary`・`danger`・`ghost` も同じ）。**文字の色だけ変えるとき**は、`-bg-hover` に元の背景色（ghost なら `transparent`）を書く。メニュー・セレクト・コンボボックス・左右分割の選択の項目の hover は `--jimble-color-item-hover`、ページネーションの影は `--jimble-pagination-shadow`（`none` で影なし。既定はボタンの影と同じ）。表の行の hover は `--jimble-table-row-hover-bg`、暗幕の濃さだけは `--jimble-backdrop-opacity`（色ごと変えるなら `--jimble-color-backdrop`）。一覧は <https://hidemikimura.github.io/jimble-ui/guide/theming/> の「テーマで変えられる項目」を参照。

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
