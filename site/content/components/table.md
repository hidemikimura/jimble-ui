---
title: Table
order: 21
description: データテーブル
---

`<jimble-table>` は、データテーブルです。`jimble-table-header`、`jimble-table-body`、`jimble-table-row`、`jimble-table-head-cell`、`jimble-table-cell` を組み合わせます。

## 使い方

::example table/basic

## 仕組みと制約

ネイティブの `<table>` は、Shadow DOM を使う部品からは、セルのスタイルを整えられません。そのため、各要素が `ElementInternals` で表の**ロール**（`table` / `rowgroup` / `row` / `columnheader` / `cell` / `rowheader`）を持ち、CSS グリッド（行のまとまりと行は `subgrid`）で表のレイアウトにしています。スクリーンリーダーには本物の表として伝わります。

- 横の結合（`colspan`）はできます（下の「セルの結合」）。縦の結合（`rowspan`）は使えません。
- 列の数は、行ごとのセルの数（`colspan` を含む）のうち、いちばん多いものです。
- 列の幅は、内容から決まります。幅を指定するには、表に `--jimble-table-columns` を、CSS グリッドの `grid-template-columns` の書き方で指定します（例: `style="--jimble-table-columns: 12rem 1fr auto"`。`selectable` の選択の列は含めません）。セルに `width` を指定しても、列の幅は決まりません。
- 表の名前は `label` で付けます。
- 並べ替え・絞り込みは、アプリが行います。部品は状態の表示と、イベントの通知だけを担当します。

## 固定ヘッダーとスクロール

`sticky-header` を付け、`--jimble-table-max-height` で高さを制限すると、縦にスクロールしても見出しが上に残ります。表が横にはみ出す場合は横にスクロールし、**はみ出しているときだけ**、キーボードで操作できます（`tabindex="0"`）。

::example table/sticky

## 並べ替え

見出しセルに `sortable` を付けると、ボタンになります。押すと `jimble-sort`（`detail.direction`）が発火し、見出しの `sort`（`aria-sort`）が変わって、同じ表の他の見出しは解除されます。実際に行を並べ替えるのはアプリの仕事です（上の基本の例を参照）。`preventDefault()` すると見出しの状態を変えません。

## セルの結合

見出しセル・セルに `colspan` を付けると、その数の列ぶんに広がります。2 段の見出しや、合計の行に使います。結合は `aria-colspan` として伝わります。

::example table/colspan

- 縦の結合（`rowspan`）は使えません。2 段の見出しで、上の段に置く見出しが無い列にも、見出しセルを置いてください（空の見出しは、スクリーンリーダーで分かりにくくなります）。

## 行の選択

表に `selectable` を付けると、行頭にチェックボックスの列が出ます。

::example table/selectable

- 見出しのチェックボックスは「すべての行を選択」です。一部だけ選んでいるときは、中間の状態になります。
- **Shift を押しながらクリック**すると、前にクリックした行からの範囲を、同じ状態にします。
- 選んだ行は `selected` になります。利用者が選択を変えると、表から `jimble-selection-change`（`detail.values` は選ばれている行の `value`、`detail.rows` は行）が出ます。いつでも `selectedValues`・`selectedRows` で読めます。
- プログラムから行の `selected` を変えると、チェックボックスも追従します（イベントは出ません）。
- 各行のチェックボックスの名前は「(行見出しのセル) を選択」です。行見出し（`header` のセル）を 1 つ置くと、何の行かが伝わります。
- 表のロールの行には `aria-selected` を使えないため、選択の状態はチェックボックスで伝わります。

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
