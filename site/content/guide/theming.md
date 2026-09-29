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

## トークン一覧

色はすべて意味を表すトークンを通して指定されています。ダークモードは将来、ロール（`surface` や `text`）の値を差し替えるだけで追加できる設計です。

::tokens
