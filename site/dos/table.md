## Do

- 行と列に意味のあるデータ（注文の一覧など）に使い、表に `label` を付ける。
- 数値の列は `align="end"`。並べ替えは見出しに `sortable` を付け、`jimble-sort` を受けて、アプリが並べ替える。
- 行を選ばせるときは `selectable`（行に `value`）。数千行を超えるときは `columns` / `rows` プロパティで渡す。

## Don't

- `<table>` を書いて、見た目を jimble-table に似せる。
- チェックボックスの列を自分で作る（`selectable` を使う）。
- セルの `width` で列の幅を決めようとする（`--jimble-table-columns`）。
