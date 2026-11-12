## Do

- 複数行の文章（メモ・説明）の入力に使い、`jimble-field` で名前を付ける。
- 書く量に合わせて高さを変えるなら `autosize`、最初の高さは `rows`。
- 上限があるときは `maxlength` を付ける。

## Don't

- Enter で送信されると考える（Enter は改行）。
- 1 行で足りる入力に使う。それは `jimble-input`。
- コードやテンプレートの編集に使う。それは `jimble-code-editor`。
