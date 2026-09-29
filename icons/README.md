# icons/svg

部品の内部と、公開アイコン（`jimble-icon`）で使う SVG の原本。`npm run gen:icons` が `src/icons/*.ts`（アイコン本体）、`src/icons/register/*.ts`（`jimble-icon` に登録する入口）、`src/icons/names.ts`（名前の一覧）を生成する。ファイル名がそのまま `jimble-icon` の `name` になる。

- `spinner.svg` 以外は [Heroicons](https://github.com/tailwindlabs/heroicons) v2.2.0 の `20/solid`（MIT、`LICENSE-heroicons`）
- `spinner.svg` は jimble-ui のオリジナル
- 追加するときは、この README と配布物の `THIRD_PARTY_LICENSES` の表記を確認すること
