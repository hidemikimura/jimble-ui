---
title: jimble-ui
description: 管理画面向けの UI コンポーネントライブラリ（Web Components）
---

管理画面向けに密度を詰めた Web Components です。素の HTML に `<script>` を 1 行足すだけで使えます。

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui/dist/cdn/jimble-ui.js"
></script>

<jimble-button variant="primary">保存</jimble-button>
```

## 使ってみる

::example button/variants

- Lit 3 と Tailwind CSS v4 で作られていますが、利用者に Tailwind は不要です。
- 見た目は CSS 変数 → `::part()` → スロットの順にカスタマイズできます。
- WCAG 2.2 AA と WAI-ARIA Authoring Practices を目標にしています。
- UI の文言は日本語が既定で、辞書を差し替えれば他の言語にできます。

> 開発中（0.x）です。公開前のため、CDN の URL は公開後に有効になります。
