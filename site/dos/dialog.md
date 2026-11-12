## Do

- 確認・短い入力など、ほかの操作を止めて答えてほしいときに使う。
- `heading` を必ず付ける。
- 削除の確認など、答えが必須のものは `alert` にし、安全な側のボタンに `autofocus` を付ける。
- 閉じるボタンには `data-dialog-close` を付ける（JavaScript なしで閉じる）。

## Don't

- 長いフォームや、一覧を見ながらの編集に使う。それは `jimble-drawer` か、別のページ。
- ダイアログの上に、さらにダイアログを重ねる。
- 閉じる前の確認を、`jimble-close-request` の `preventDefault()` 以外の方法で作る。
