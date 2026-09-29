---
title: Table
order: 21
description: データテーブル
---

`<jimble-table>` は、データテーブルです。`jimble-table-header`、`jimble-table-body`、`jimble-table-row`、`jimble-table-head-cell`、`jimble-table-cell` を組み合わせます。

## 使い方

::example table/basic

## 仕組みと制約

ネイティブの `<table>` は、Shadow DOM を使う部品からは、セルのスタイルを整えられません。そのため、各要素が `ElementInternals` で表の**ロール**（`table` / `rowgroup` / `row` / `columnheader` / `cell` / `rowheader`）を持ち、CSS の `display: table*` で表のレイアウトにしています。スクリーンリーダーには本物の表として伝わります。

- `colspan` / `rowspan`（セルの結合）は使えません。
- 列の幅は、ネイティブの表と同じく内容から決まります。幅を指定するには、見出しセルに `style="width: 12rem"` のように指定します。
- 表の名前は `label` で付けます。
- 並べ替え・絞り込み・選択は、アプリが行います。部品は状態の表示と、イベントの通知だけを担当します。

## 固定ヘッダーとスクロール

`sticky-header` を付け、`--jimble-table-max-height` で高さを制限すると、縦にスクロールしても見出しが上に残ります。表が横にはみ出す場合は横にスクロールし、**はみ出しているときだけ**、キーボードで操作できます（`tabindex="0"`）。

::example table/sticky

## 並べ替え

見出しセルに `sortable` を付けると、ボタンになります。押すと `jimble-sort`（`detail.direction`）が発火し、見出しの `sort`（`aria-sort`）が変わって、同じ表の他の見出しは解除されます。実際に行を並べ替えるのはアプリの仕事です（上の基本の例を参照）。`preventDefault()` すると見出しの状態を変えません。

## 状態

::example table/states

## API

::api jimble-table

### jimble-table-head-cell

::api jimble-table-head-cell

### jimble-table-row

::api jimble-table-row

### jimble-table-cell

::api jimble-table-cell
