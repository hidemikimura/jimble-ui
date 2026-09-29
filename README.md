# @hidemikimura/jimble-ui

管理画面向けの UI コンポーネントライブラリ（Lit 3 + Tailwind CSS v4）。素の HTML で使える Web Components です。

> **開発中（M0: 基盤の検証段階）。** まだ公開していません。設計は [docs/design.md](docs/design.md) を参照してください。

```html
<script type="module" src="…/dist/cdn/jimble-ui.js"></script>
<jimble-button variant="primary">保存</jimble-button>
```

## 開発

```sh
npm ci
npx playwright install chromium firefox webkit
npm test            # Vitest(ブラウザモード: Chromium / Firefox / WebKit)
npm run build       # dist/ を作る
npm run check-dist  # dist の検査
```

## ライセンス

MIT
