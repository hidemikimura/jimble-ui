---
title: テーマとカスタマイズ
order: 2
description: CSS 変数、::part()、スロットによるカスタマイズ
---

カスタマイズの手段は次の順に用意されています。手前のものほど安定していて、変更の影響が小さくなります。まずは既製のテーマから選び、足りないところを CSS 変数で変えるのが手早い方法です。

## 既製のテーマ

色（主色と灰色）と角丸をまとめて変える、既製のテーマがあります。CSS を 1 つ読み込むだけで、すべての部品の見た目が、ライトとダークの両方で変わります。どのテーマも、文字 4.5:1、枠・アイコン 3:1 のコントラストを満たすことを自動テストで確かめています（`high-contrast` は、文字 7:1、枠・アイコン 4.5:1）。

::example themes/preview

| 名前            | 見た目                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ocean`         | 青と、青みのある灰色。角丸を小さくした、落ち着いた見た目                                                                       |
| `forest`        | 深い緑と、暖かい灰色。目に優しい、自然な見た目                                                                                 |
| `plum`          | 紫と、紫みのある灰色。角丸を大きくした、柔らかい見た目                                                                         |
| `sand`          | 橙と、砂のような灰色。暖かみのある見た目                                                                                       |
| `high-contrast` | 文字と枠を濃くした高コントラスト。文字 7:1、枠・アイコン・フォーカスの輪 4.5:1 以上（WCAG AAA の 1.4.6）。フォーカスの輪は 3px |

```html
<!-- CDN -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/themes/ocean.css"
/>
```

```ts
// npm（Vite などのバンドラー）
import '@hidemikimura/jimble-ui/themes/ocean.css'
```

- **`high-contrast` を、OS の設定に合わせて使う**: OS で「コントラストを上げる」を選んだ利用者にだけ当てるなら、`media` 属性で読み込みます。Windows のハイコントラスト（強制色モード）は、OS が色を決める別の仕組みで、テーマが無くても部品は対応しています。

  ```html
  <link
    rel="stylesheet"
    media="(prefers-contrast: more)"
    href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/themes/high-contrast.css"
  />
  ```

- **一部だけ変える**: テーマの上に、`:root` で CSS 変数を書きます。テーマより先に書いても、利用者の指定が勝ちます。

  ```css
  :root {
    --jimble-radius-control: 9999px; /* ocean のまま、ボタンと入力欄だけ丸く */
  }
  ```

- **ページの一部だけ別のテーマにする**: テーマの CSS を読み込んだうえで、要素に `data-jimble-theme="名前"` を付けます。その中の部品（中から開くダイアログ・メニューも）が、そのテーマになります。上の例は、この方法で 4 つを並べています。
- **JS で切り替える**: 使うテーマの CSS をすべて読み込み、`<html>` の `data-jimble-theme` を書き換えます。

  ```js
  document.documentElement.dataset.jimbleTheme = 'forest'
  ```

- **`tokens.css` と一緒に読み込まない**でください。`tokens.css` は全トークンの既定値を並べたもので、テーマより強く効きます。
- テーマは、ページ自体の背景と文字の色は変えません（[ダークモード](#ダークモード) と同じです）。

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

## 余白の段階（密度）

ボタン・入力欄の高さと、すべての余白を、4 つの段階から選べます。既定（`default`）は、管理画面向けに詰めた表示です。`density.css` を読み込み、`<html>` か、変えたい範囲の要素に `data-jimble-density` を付けます。

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/density.css"
/>
<html data-jimble-density="comfortable"></html>
```

```ts
// npm
import '@hidemikimura/jimble-ui/density.css'
```

- `compact`: 余白の単位 3px、ボタン・入力欄の高さ 28 / 32 / 36px（sm / md / lg）。1 画面に多く並べる一覧・表に。
- `default`: 4px、32 / 36 / 40px。既定（付けないときと同じ）。
- `comfortable`: 5px、36 / 40 / 44px。入力の多いフォーム・ときどき使う画面に。
- `spacious`: 6px、40 / 44 / 48px。タッチ操作・大きな画面・読みやすさを優先する画面に。

::example density/levels

- **ページの一部だけ変える**: 要素に付けると、その中だけが変わります。入れ子にした段階が優先するので、ゆとりのあるページの中に、詰めた表を置けます。
- **JS で切り替える**: `<html>` の `data-jimble-density` を書き換えます。利用者に選ばせるなら、[区切った見た目のラジオ](../../components/radio-group/)が向いています。

  ```js
  document.documentElement.dataset.jimbleDensity = 'compact'
  ```

- 変わるのは、余白の基準（`--jimble-spacing`）と、ボタン・入力欄の高さ（`--jimble-control-height-*`）です。チェックボックスやアイコンなどの小さな印も、余白と一緒に大きさが変わります（`spacious` では大きく、タッチしやすくなります）。文字の大きさは変わりません（`--jimble-font-size-scale` で変えます）。
- `:root` などに書いた CSS 変数は、段階より優先します。段階を出発点に、一部だけ変えられます。

## 全体の倍率

角丸と文字の大きさは、倍率 1 つでまとめて変えられます。余白の `--jimble-spacing`（既定 `0.25rem`）と合わせると、3 つの数で、全体の印象を大きく変えられます。

| CSS 変数                   | 既定      | 効くもの                                                                  |
| -------------------------- | --------- | ------------------------------------------------------------------------- |
| `--jimble-radius-scale`    | `1`       | 角丸の `sm`〜`xl`（ボタン・入力欄・カード・ダイアログなど）。`0` で角なし |
| `--jimble-font-size-scale` | `1`       | 文字の大きさの `xs`〜`xl` と、その行の高さ                                |
| `--jimble-spacing`         | `0.25rem` | すべての余白（密度）                                                      |

```css
:root {
  --jimble-radius-scale: 0.5; /* 角丸を半分に */
  --jimble-font-size-scale: 1.1; /* 文字を 1 割大きく */
}
```

- 段階ごとの変数（`--jimble-radius-lg`、`--jimble-radius-control` など）を指定すると、そちらが倍率より優先します。
- 文字を大きくしても、ボタン・入力欄の高さは変わりません（1.25 倍までなら収まります）。高さは `--jimble-control-height-*` で変えます。

## 面の高さ

画面の面は、低い順に 4 つの高さに分けています。高い面ほど、影が大きくなります。ダークモードでは影が見えにくいので、高い面ほど少し明るい色にして区別します。

| 高さ                     | 使う場所                                                                           | 背景                             | 影                         |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| 沈んだ面（sunken）       | カンバンの列など、ほかの面を載せる下地                                             | `--jimble-color-surface-sunken`  | なし                       |
| 既定（surface）          | ページの本文・カード・入力欄                                                       | `--jimble-color-surface`         | なし（カードは枠と細い影） |
| 持ち上がった面（raised） | 動かせるカード（カンバンのカード）                                                 | `--jimble-color-surface-raised`  | `--jimble-shadow-raised`   |
| 重なる面（overlay）      | ダイアログ・ドロワー・メニュー・セレクト・ポップオーバー・通知・ドラッグ中のカード | `--jimble-color-surface-overlay` | `--jimble-shadow-overlay`  |

- **背景と影は組みで変えます。** たとえば重なる面の影を変えるときは `--jimble-shadow-overlay` を、背景を変えるときは `--jimble-color-surface-overlay` を書きます。片方だけ別の高さのものにすると、ダークモードで面の区別がつかなくなります。
- 持ち上がった面は、目立たせたい 1 か所に限って使います。まとめるだけなら、枠か余白で足ります。

## 無効と読み込み中の薄さ

無効にした部品（ボタン・入力欄・メニューの項目・タブなど）は `--jimble-opacity-disabled`（既定 `0.5`）、読み込み中の表の中身は `--jimble-opacity-loading`（既定 `0.6`）の不透明度で、薄く表示します。

```css
:root {
  --jimble-shadow-overlay: 0 20px 25px -5px rgb(0 0 0 / 0.15); /* 重なる面の影を深く */
  --jimble-opacity-disabled: 0.4; /* 無効をもっと薄く */
}
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

## ダークモード

部品の色は、ページの CSS の `color-scheme` に従って、ライトとダークが切り替わります。**何も書かなければ、これまでどおりライトです。**

```css
/* OS の設定に従う */
:root {
  color-scheme: light dark;
}
/* 常にダーク */
:root {
  color-scheme: dark;
}
/* ページの一部だけダーク */
.preview {
  color-scheme: dark;
}
```

ダイアログ・メニュー・ツールチップも、置いた場所の `color-scheme` に従います。スクロールバーなど、ブラウザが描く部分も同じ指定でそろいます。**ページ自体の背景と文字の色は、利用者が指定してください**（部品はページの `body` を塗りません）。

色の変数を 1 つの値で上書きすると、その色は両方のモードで同じになります。モードごとに変えるときは、`light-dark()` で書きます。

```css
:root {
  --jimble-color-primary-600: #0f766e; /* 両方のモードで同じ */
  --jimble-color-surface: light-dark(#ffffff, #0b1220); /* ライト, ダーク */
}
```

主ボタンなど、白い文字が乗る塗りつぶしの色（`primary-600` など）は、両方のモードで同じです。ダークで変わるのは、面・文字・枠と、選択中・状態の淡い色です（下の表の「ダークモード」の列）。

### JS で切り替える

ページの `color-scheme` を書き換えると、部品の色がすぐに切り替わります（開いているダイアログやメニューも）。部品の側に、専用の関数はありません。

```js
document.documentElement.style.colorScheme = 'dark' // 常にダーク
document.documentElement.style.colorScheme = 'light' // 常にライト
document.documentElement.style.colorScheme = 'light dark' // OS の設定に従う
```

切り替えの選択肢を置き、選んだモードを覚えておく例です。

```html
<jimble-select id="scheme" aria-label="表示モード">
  <jimble-option value="light dark">OS に従う</jimble-option>
  <jimble-option value="light">ライト</jimble-option>
  <jimble-option value="dark">ダーク</jimble-option>
</jimble-select>

<script type="module">
  const KEY = 'color-scheme'
  const select = document.getElementById('scheme')
  const apply = (v) => (document.documentElement.style.colorScheme = v)

  const saved = localStorage.getItem(KEY) ?? 'light dark'
  apply(saved)
  select.value = saved

  select.addEventListener('change', () => {
    apply(select.value)
    localStorage.setItem(KEY, select.value)
  })
</script>
```

- 「OS に従う」のときに、いまダークで表示しているかは、`matchMedia('(prefers-color-scheme: dark)').matches` で分かります。
- ページの一部だけを切り替えるときは、その要素の `style.colorScheme` を書き換えます。
- 読み込み直後に、ライトで一瞬描かれてから切り替わるのを避けるには、`apply(saved)` までを、`<head>` の中の普通の `<script>`（`type="module"` なし）に書きます。描画の前に実行されます。

## トークン一覧

色はすべて意味を表すトークンを通して指定されています。面・文字・枠などのロールは、ダークモードの値を持っています。

::tokens
