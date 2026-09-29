---
title: はじめに
order: 1
description: jimble-ui の導入方法
---

## CDN から使う（素の HTML）

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/jimble-ui.js"
></script>
```

1 行で全てのコンポーネントが登録されます。依存（Lit）も同梱されています。`@0` はバージョンの範囲です。1.0 までは、マイナーバージョンが変わると互換性が壊れることがあるので、`@0.1` のように固定するのを勧めます。

CDN バンドルは、グローバルの `JimbleUI`（`toast`、`setLocale`、`setMessages`）も置きます。HTML の `onclick` から使えます。

```html
<jimble-button onclick="JimbleUI.toast.success('保存しました')">保存</jimble-button>
```

### 一瞬のちらつきを防ぐ

スクリプトの読み込みが終わる前は、まだ登録されていない要素の中身が素のまま見えます。`<head>` に次を足すと、登録されるまで隠せます。

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cloak.css"
/>
```

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
import { toast } from '@hidemikimura/jimble-ui/toast'
```

型定義（`HTMLElementTagNameMap` とイベントの型を含む）が付いています。

```ts
const button = document.querySelector('jimble-button')! // JimbleButton 型
button.variant = 'primary'
```

### VS Code で HTML の補完を効かせる

`.vscode/settings.json` に次を足すと、`jimble-*` のタグ・属性・属性値の補完が出ます。

```json
{ "html.customData": ["./node_modules/@hidemikimura/jimble-ui/dist/vscode.html-data.json"] }
```

## 属性・イベント・命名

- 属性は kebab-case、真偽値は属性の有無で表します（`disabled`、`loading`）。
- 共通の属性: `variant`（見た目）、`size`（`sm` / `md` / `lg`）、`disabled`、`loading`、`open`。
- 独自イベントは `jimble-` で始まります（例: `jimble-close-request`）。ネイティブと同じ意味のものは同名です（`input`、`change`）。
- 内部のクラス名は公開 API ではありません。見た目の調整は [テーマ](../theming/) の方法を使ってください。

## 対応ブラウザ

Chrome / Edge / Firefox / Safari の最新 2 バージョンです。Popover API、`<dialog>`、`ElementInternals`、CSS Anchor Positioning を使うため、これより古いブラウザでは動きません。
