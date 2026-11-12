## Do

- 多くの候補から、いくつかを選んで並べる（表示する列・権限）に使う。
- 左右の一覧の名前を `available-label` / `selected-label` で付ける。
- 選んだ順に意味があるときは `reorderable`。

## Don't

- 選択肢が少ないときに使う。それは `jimble-checkbox` の並び、または `jimble-combobox multiple`。
- 値を `values` 以外（右の一覧の DOM）から読む。
- 上限があるのに `max-items` を付けず、送信してから断る。
