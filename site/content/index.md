---
title: jimble-ui
description: 管理画面向けの UI コンポーネントライブラリ（Web Components）
---

管理画面向けに密度を詰めた Web Components です。素の HTML に `<script>` を 1 行足すだけで使えます。

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/jimble-ui.js"
></script>

<jimble-button variant="primary">保存</jimble-button>
```

## 使ってみる

::example button/variants

## 特長

- **依存なしで使える。** Lit 3 と Tailwind CSS v4 で作られていますが、利用者に Tailwind は不要です。React などのラッパーはありません。
- **カスタマイズ** は CSS 変数 → `::part()` → スロットの順にできます。内部のクラス名は公開 API ではないので、更新で壊れません。
- **アクセシビリティ** は WCAG 2.2 AA と WAI-ARIA Authoring Practices を目標に、キーボード操作・フォーカス管理・コントラストを自動テストで守っています（[詳しく](guide/accessibility/)）。
- **日本語が既定** で、辞書を差し替えれば他の言語にできます。IME の変換中の Enter / Esc で誤動作しません。
- 対応ブラウザは Chrome / Edge / Firefox / Safari の **最新 2 バージョン** です。

## コンポーネント

| 分類         | コンポーネント                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 枠組み       | [App Shell](components/app-shell/) · [Sidebar Nav](components/sidebar-nav/) · [Page Header](components/page-header/) · [Breadcrumb](components/breadcrumb/) · [Tabs](components/tabs/)                                                                                                                                                                                                 |
| 表示         | [Card](components/card/) · [Badge](components/badge/) · [Alert](components/alert/) · [Table](components/table/) · [Description List](components/description-list/) · [Pagination](components/pagination/)                                                                                                                                                                              |
| 入力         | [Button](components/button/) · [Input](components/input/) · [Textarea](components/textarea/) · [Select](components/select/) · [Combobox](components/combobox/) · [Date Input](components/date-input/) · [Color Input](components/color-input/) · [Checkbox](components/checkbox/) · [Radio Group](components/radio-group/) · [Switch](components/switch/) · [Field](components/field/) |
| オーバーレイ | [Dialog](components/dialog/) · [Drawer](components/drawer/) · [Dropdown Menu](components/dropdown-menu/) · [Toast](components/toast/)                                                                                                                                                                                                                                                  |

> 開発中（0.x）です。1.0 までは、マイナーバージョンが変わると互換性が壊れることがあります。
