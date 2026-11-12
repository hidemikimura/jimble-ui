## Do

- 1 行の文字の入力に使い、`jimble-field` で名前を付ける。
- 内容に合う `type`（email・tel・url・number・password）と `autocomplete` を付ける。
- 単位や記号は `slot="prefix"` / `slot="suffix"` に置く。

## Don't

- 日付に使う。それは `jimble-date-input`（`type="date"` はない）。
- 複数行の文章に使う。それは `jimble-textarea`。
- `placeholder` をラベルの代わりにする。
