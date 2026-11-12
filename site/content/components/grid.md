---
title: Grid
order: 37
description: 子の要素を、同じ間隔の格子に並べる
---

`<jimble-grid>` は、子の要素を格子に並べます。数字のカード、カードの一覧、2 列のフォームなどに使います。

- `min-column-width` を付けると、その幅を下回らない範囲で、入るだけの列に並べます。画面の幅に合わせて列の数が変わり、狭い画面では 1 列になります。
- `columns` で列の数を決めます（既定 1）。`min-column-width` があれば、そちらを優先します。
- 間隔（`gap`）は [Stack](../stack/) と同じく、`--jimble-spacing`（既定 4px）の何倍かで指定します。

## 使い方

::example grid/basic

::example grid/columns

## API

::api jimble-grid
