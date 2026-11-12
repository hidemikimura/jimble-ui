## Do

- 2〜6 個ほどの中から 1 つを選ばせる。選択肢は `jimble-radio`。
- グループに名前を付ける（`jimble-field` の `label`、または `aria-label`）。
- 短い選択肢を横に並べるときは `orientation="horizontal"`。

## Don't

- 選択肢が多いときに使う。それは `jimble-select` か `jimble-combobox`。
- 複数を選ばせる。それは `jimble-checkbox`。
- 既定の選択がないまま、必須にもしない（送られない値ができる）。
