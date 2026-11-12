## Do

- 2〜6 個ほどの中から 1 つを選ばせる。選択肢は `jimble-radio`。
- グループに名前を付ける（`jimble-field` の `label`、または `aria-label`）。
- 短い選択肢を横に並べるときは `orientation="horizontal"`。表示の切り替えなど 2〜5 個の短い選択肢は `appearance="segmented"`。

## Don't

- 選択肢が多いときに使う。それは `jimble-select` か `jimble-combobox`。
- 複数を選ばせる。それは `jimble-checkbox`。
- `appearance="segmented"` を、その場の操作（保存・削除）のボタンの並びに使う。それは `jimble-button`。
- 既定の選択がないまま、必須にもしない（送られない値ができる）。
