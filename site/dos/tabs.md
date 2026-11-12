## Do

- 同じ対象の情報を、見る観点で分ける（注文の商品・履歴）。
- `jimble-tab` と `jimble-tab-panel` を、同じ `value` で対応させる。タブのまとまりに `label` を付ける。
- 切り替えを URL に残したいときは、`jimble-tab-change` を受けて URL を変える。

## Don't

- 段階を踏む入力に使う。それは `jimble-stepper`。
- ページの移動（別の画面へのリンク）をタブにする。それは `jimble-sidebar-nav` などのナビゲーション。
- タブを 7 つ以上並べる。
