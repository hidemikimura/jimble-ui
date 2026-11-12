## Do

- 商品カテゴリ・部署・フォルダなど、データの階層を見て選ぶのに使う。
- 木に名前を付ける（`jimble-field` の `label`、または `aria-label`）。
- 項目には `label` と `value` を付ける。よく見る枝は `expanded` で開いておく。
- 子が多い・遅い枝は `lazy` にし、`jimble-expand` で読み込む（子が無いと分かったら `lazy` を外す）。

## Don't

- ページの移動（サイドバー）に使う。それは `jimble-sidebar-nav` の `jimble-nav-group`。
- 階層の無い一覧に使う。それは `jimble-table` や `jimble-checkbox` の並び。
- 階層を 5 段より深くする。浅くまとめるか、別の画面に分ける。
- 項目の中に、ボタンやリンクを置く（項目そのものが操作の対象になる）。
