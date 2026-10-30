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

## データから描く（仮想スクロール）

行が多い（数千〜数万行）ときは、HTML に行を書かず、`columns`（列の定義）と `rows`（行のデータの配列）を**プロパティ**で渡します。表が自分で行を描き、**見えている行と、その前後だけ**を描くので、数万行でも軽く動きます。

```js
table.columns = [
  { key: 'id', label: '注文番号', header: true, width: '8rem', sortable: true },
  { key: 'name', label: '顧客' },
  { key: 'amount', label: '金額', align: 'end', render: (row) => `¥${row.amount}` },
]
table.rows = orders
```

::example table/virtual

- 列の定義: `key`（行のデータのキー）・`label`（見出し）・`width`（列の幅。`8rem`・`2fr` など。省略すると均等）・`align`・`header`（行見出しの列）・`sortable`・`render`（セルの中身。文字列か Lit の `html`）。
- **行の高さは固定**です（`row-height`、既定 40px）。長い文字は 1 行に収めて省略します。**列の幅も固定**です（行が入れ替わっても、列の幅が動かないように）。
- 表の高さは `--jimble-table-max-height`（既定 24rem）で、見出しは固定されます。
- 並べ替えは、`jimble-sort` の `detail.key`（列の `key`）と `detail.direction` を受けて、アプリが並べ替えた配列を `rows` に渡します。
- `selectable` の選択は、行のキー（`row-key`、既定 `id`）で覚えます。スクロールで行が描き直されても残り、「すべて選択」・Shift の範囲選択は、描いていない行も含めたデータの並びで選びます。選んだ行のデータは `selectedItems`、キーは `selectedValues` です。
- 行の総数と、各行の位置は、`aria-rowcount` / `aria-rowindex` でスクリーンリーダーに伝わります。
- **ページ内検索（Ctrl+F）は、描いている行だけ**にかかります。検索が必要なら、表の上に絞り込みの入力欄を置いてください。行が数百行までなら、HTML で書く方が向いています。
- 行の中のボタンなどにフォーカスしたまま、マウスでスクロールして行が描かれなくなると、フォーカスは外れます。

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
