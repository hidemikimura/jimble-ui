## Do

- 10 個ほどまでの選択肢から、1 つを選ばせる。選択肢は `jimble-option`。
- `jimble-field` で名前を付け、未選択を許さないなら `required`。
- 未選択のときの案内は `placeholder` に書く。

## Don't

- 最初の選択肢が自動で選ばれると考える（未選択から始まる）。
- 選択肢が多いときに使う。それは `jimble-combobox`。
- その場の操作（編集・削除）を選ばせる。それは `jimble-dropdown-menu`。
