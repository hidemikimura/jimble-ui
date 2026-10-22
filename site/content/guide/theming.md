---
title: テーマとカスタマイズ
order: 2
description: CSS 変数、::part()、スロットによるカスタマイズ
---

カスタマイズの手段は次の順に用意されています。手前のものほど安定していて、変更の影響が小さくなります。

## 1. CSS 変数

色・角丸・余白の基準は `--jimble-*` の変数です。ページのどこかで宣言すれば、継承によってすべてのコンポーネントに届きます。

```css
:root {
  --jimble-color-primary-600: #0f766e;
  --jimble-color-primary-500: #0e8074;
}
```

主ボタンは背景に `primary-600`、hover に `primary-500` を使い、文字は白です。**色を変えるときは、白文字とのコントラストが 4.5:1 以上になる濃さにしてください**（上の例は満たしています）。

コンポーネント固有の変数（`--jimble-button-radius` など）は、各ページの「CSS 変数」の表を参照してください。一部のコンポーネントだけを変えるには、そのコンポーネントに直接指定します。

```css
jimble-button.round {
  --jimble-button-radius: 9999px;
}
```

## 2. `::part()`

各コンポーネントは `base` をはじめとする part を公開しています。CSS 変数で足りない調整に使います。

```css
jimble-button::part(label) {
  text-transform: uppercase;
}
```

状態は `:state()` で選べます。

```css
jimble-button:state(loading) {
  opacity: 0.8;
}
```

## 3. スロット

アイコンや操作など、部品の一部を自分の HTML に置き換えられます。

```html
<jimble-alert variant="danger">
  <svg slot="icon" aria-hidden="true">…</svg>
  保存できませんでした。
</jimble-alert>
```

## テーマで変えられる項目

次の項目は、`:root`（または部品）に CSS 変数を書くだけで変えられます。指定しなければ、これまでと同じ見た目です。

| 変えたいもの                                                                                                                                                 | CSS 変数                                                                                                                                          | 既定                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| カードの枠の色                                                                                                                                               | `--jimble-color-ring-card`                                                                                                                        | `--jimble-color-ring`            |
| 区切り線の色（カードの見出しの下・表の行・メニューの区切り・タブの線）                                                                                       | `--jimble-color-ring-divider`                                                                                                                     | `--jimble-color-ring`            |
| ボタン（secondary・ページ送り）の枠の色                                                                                                                      | `--jimble-color-ring-button`                                                                                                                      | `--jimble-color-ring`            |
| 文字の太さ（ラベル・見出しなど）                                                                                                                             | `--jimble-font-weight-medium` / `-semibold` / `-bold` / `-normal`                                                                                 | 500 / 600 / 700 / 400            |
| ページの見出しの太さ（見出しだけ）                                                                                                                           | `--jimble-page-header-heading-weight`                                                                                                             | `--jimble-font-weight-semibold`  |
| カード・入力欄・ボタンの影（`none` で影なし）                                                                                                                | `--jimble-card-shadow` / `--jimble-input-shadow` / `--jimble-button-shadow`                                                                       | `--jimble-shadow-sm`             |
| バッジの角丸                                                                                                                                                 | `--jimble-badge-radius`                                                                                                                           | `--jimble-radius-md`             |
| ツールチップの背景・文字色                                                                                                                                   | `--jimble-tooltip-bg` / `--jimble-tooltip-text`                                                                                                   | 濃い灰色・白                     |
| スイッチの丸（つまみ）の塗り・縁                                                                                                                             | `--jimble-switch-thumb-bg` / `--jimble-switch-thumb-ring`                                                                                         | 面の色・薄い縁                   |
| 表の見出しの行の背景・文字色                                                                                                                                 | `--jimble-table-header-bg` / `--jimble-table-header-text`                                                                                         | ページの背景と同じ・補助の文字色 |
| ボタンの hover の色（種類ごと。文字の色だけ変えるときは bg-hover を元の色にする）                                                                            | `--jimble-button-{primary,secondary,danger,ghost}-bg-hover` / `-fg-hover`（全種類共通は `--jimble-button-bg-hover` / `--jimble-button-fg-hover`） | 種類ごとに違う・文字は変えない   |
| 表の行にマウスを重ねたときの背景                                                                                                                             | `--jimble-table-row-hover-bg`                                                                                                                     | `--jimble-color-surface-muted`   |
| ダイアログ・ドロワーの背後の暗幕の濃さ（色は変えない）                                                                                                       | `--jimble-backdrop-opacity`                                                                                                                       | `50%`                            |
| メニュー・セレクト・コンボボックス・左右分割の選択の項目の hover の背景                                                                                      | `--jimble-color-item-hover`                                                                                                                       | `--jimble-color-surface-sunken`  |
| ページネーションのボタンの影（`none` で影なし）                                                                                                              | `--jimble-pagination-shadow`                                                                                                                      | `--jimble-button-shadow`         |
| 小さなアイコンボタンの hover（背景なしにして、アイコンの色だけ変えるなど。コンボボックス・日付・ファイル・カンバンのカード・ダイアログと通知の閉じるボタン） | `--jimble-icon-button-hover-bg` / `--jimble-icon-button-hover-fg`                                                                                 | 場所ごとに違う背景・濃い文字     |
| 「ファイルを選択」ボタンの hover の背景・文字色                                                                                                              | `--jimble-file-input-button-hover-bg` / `--jimble-file-input-button-hover-fg`                                                                     | 沈んだ背景・本文の色             |
| パンくずの横の位置                                                                                                                                           | `--jimble-breadcrumb-justify`                                                                                                                     | `flex-start`（`center` で中央）  |
| サイドバーの現在のページのアイコンの色                                                                                                                       | `--jimble-sidebar-nav-current-icon-color`                                                                                                         | アイコンの色と同じ               |
| ヘッダー・サイドバーの色・アイコンの大きさ                                                                                                                   | [App Shell](../../components/app-shell/) と [Sidebar Nav](../../components/sidebar-nav/) を参照                                                   |                                  |

```css
:root {
  --jimble-color-ring-card: #d1d5db; /* カードの枠 */
  --jimble-color-ring-divider: #e5e7eb; /* 区切り線は、もっと薄く */
  --jimble-color-ring-button: #6b7280; /* ボタンの枠は、濃く */
  --jimble-font-weight-semibold: 700; /* 見出しを bold に */
  --jimble-card-shadow: none;
  --jimble-badge-radius: 9999px;
}
```

部品ごとの変数は、各ページの「CSS 変数」の表にも載っています。**色を変えるときは、文字 4.5:1、枠・アイコン 3:1 のコントラストを保ってください。**

## トークン一覧

色はすべて意味を表すトークンを通して指定されています。ダークモードは将来、ロール（`surface` や `text`）の値を差し替えるだけで追加できる設計です。

::tokens
