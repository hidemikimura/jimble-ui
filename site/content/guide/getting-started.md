---
title: はじめに
order: 1
description: jimble-ui の導入方法
---

## CDN から使う（素の HTML）

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui/dist/cdn/jimble-ui.js"
></script>
```

1 行で全てのコンポーネントが登録されます。依存（Lit）も同梱されています。

## npm から使う

```bash
npm install @hidemikimura/jimble-ui
```

すべてを登録する:

```ts
import '@hidemikimura/jimble-ui'
```

使うものだけを登録する（個別 import）:

```ts
import '@hidemikimura/jimble-ui/button'
import '@hidemikimura/jimble-ui/alert'
```

## 属性・イベント・命名

- 属性は kebab-case、真偽値は属性の有無で表します（`disabled`、`loading`）。
- 共通の属性: `variant`（見た目）、`size`（`sm` / `md` / `lg`）、`disabled`、`loading`、`open`。
- 独自イベントは `jimble-` で始まります（例: `jimble-dismiss`）。ネイティブと同じ意味のものは同名です（`input`、`change`）。
- 内部のクラス名は公開 API ではありません。見た目の調整は [テーマ](../theming/) の方法を使ってください。

## 対応ブラウザ

Chrome / Edge / Firefox / Safari の最新 2 バージョンです。
