---
title: Breadcrumb
order: 19
description: パンくずリスト
---

`<jimble-breadcrumb>` は、現在のページの階層を示します。`nav` ランドマークで、名前は「パンくずリスト」（辞書）です。

## 使い方

::example breadcrumb/basic

## 注意

- `href` のある項目はリンクになります。`href` の無い**最後の項目**が現在のページ（`aria-current="page"`）です。`current` 属性でも指定できます。
- 区切りのアイコンは装飾で、支援技術には読み上げられません。

## API

::api jimble-breadcrumb

### jimble-breadcrumb-item

::api jimble-breadcrumb-item
