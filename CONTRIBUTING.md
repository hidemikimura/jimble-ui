# コントリビューションの手引き

## 準備

```sh
npm ci
npx playwright install chromium firefox webkit
npx lefthook install   # コミット時に整形とコミットメッセージの検査を行う
```

Node は 22 以上（`.nvmrc`）。

## 日々の流れ

| 目的                                       | コマンド                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| ドキュメントサイトを見ながら作る           | `npm run dev:site`                                                                   |
| テスト(単体 + Chromium / Firefox / WebKit) | `npm test`                                                                           |
| ドキュメントサイトの E2E                   | `npm run test:e2e`                                                                   |
| lint / 型 / 整形                           | `npm run lint` / `npm run typecheck` / `npm run format`                              |
| ビルドと配布物の検査                       | `npm run build && npm run check-dist && npm run check-package && npm run pack-smoke` |

トークン(`tokens/tokens.json`)とアイコン(`icons/svg/`)を変えたら、`npm run gen:tokens` / `npm run gen:icons` で生成物を更新します（CI は最新かどうかを検査します）。

## コミットと PR

- **Conventional Commits**: `feat(button): loading 属性を追加`。概要は日本語でよく、件名は 100 文字以内。
  - `feat` / `fix` / `perf` / `docs` は CHANGELOG に載ります。`refactor` / `test` / `build` / `ci` / `chore` は載りません。
  - 破壊的変更は `feat(button)!:` のように `!` を付けるか、本文に `BREAKING CHANGE:` を書きます。
- **PR のタイトルがそのまま CHANGELOG になります。** 利用者から見て何が変わるかを書いてください（squash merge）。
- 公開 API（タグ名・属性・プロパティ・メソッド・イベント・スロット・part・`--jimble-*` 変数・`exports` のパス・辞書のキー）を変えるときは、SemVer の扱いが変わります。設計書の §12.3 を参照してください。

## 部品を足す・変えるときの約束

設計書（[docs/design.md](docs/design.md)）の §7（API の命名規約）と §13（サンプル API）に従います。特に:

1. **内部の Tailwind クラス名は公開 API ではありません。** クラス名は完全な文字列リテラルで書き（動的に組み立てない）、色は意味トークン（`bg-primary-600`、`text-fg-muted` など）だけを使います。生の色（`bg-indigo-600`、`#4f46e5`）は使いません。
2. **テストを必ず付けます。** 属性とプロパティ、キーボード操作、イベント、`axe` の違反ゼロ、`::part()` / CSS 変数が効くこと。フォーム部品はさらに、値・reset・`fieldset[disabled]`・検証・IME。
3. **ドキュメントの例を書きます**（`site/examples/<部品>/*.html`）。例は自動で `axe` にかかります。API の表は JSDoc（`@slot` / `@csspart` / `@cssprop` / `@fires`、クラスに `@tag`）から生成されるので、JSDoc を書いてください。
4. **色の組み合わせを足したら**、`tests/unit/contrast.test.ts` に追加してコントラスト比を保証します（文字 4.5:1、枠・アイコン 3:1）。
5. **ブラウザ固有の落とし穴**: Safari / Firefox の macOS 既定では Tab がボタンやリンクに止まりません。Shadow DOM 内のイベントは `event.target` がホストに再ターゲットされます。テストは `docs/design.md` の「テスト基盤の教訓」を参照してください。
6. **手動確認**が必要な変更（読み上げ・IME・強制色モード）は、[docs/manual-checks.md](docs/manual-checks.md) の該当項目を確認します。

## 設計判断の記録

判断が分かれた箇所は、採用した案・理由・比較した案を [docs/design.md](docs/design.md) に書いてあります。設計を変えるときは、同じ形式で追記してください。
