# jimble-ui（開発者・AI 向けのメモ）

管理画面向けの UI コンポーネントライブラリ（Lit 3 + Tailwind CSS v4 + TypeScript + Vite）。素の HTML で使う Web Components で、npm パッケージは `@hidemikimura/jimble-ui`。P1 の 22 コンポーネントに、date-input・color-input・combobox・drawer を加えた 26 コンポーネントがそろい、0.1.0 を公開済み。

## 最初に読むもの

| ファイル                            | 内容                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/design.md`                    | **設計と判断の記録**（採用案・理由・比較した案）。§16 に各マイルストーンの結果と「テストが見つけた不具合」がある。設計を変えるときは同じ形式で追記する |
| `CONTRIBUTING.md`                   | 日々の流れ、コミット規約、部品を足すときの約束                                                                                                         |
| `docs/manual-checks.md`             | 自動テストで確かめられない項目（スクリーンリーダー・IME の実機・強制色モード）                                                                         |
| `docs/release.md`                   | リリース手順（release-please・Trusted Publishing）                                                                                                     |
| `.claude/skills/jimble-ui/SKILL.md` | jimble-ui の**使い方**（利用者向けの skill。生成物）                                                                                                   |

## コマンド

| 目的                                         | コマンド                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| テスト（単体 + Chromium / Firefox / WebKit） | `npm test`                                                                           |
| ドキュメントサイトの E2E                     | `npm run test:e2e`                                                                   |
| ドキュメントサイトを見ながら作る             | `npm run dev:site`                                                                   |
| lint / 型 / 整形                             | `npm run lint` / `npm run typecheck` / `npm run format`                              |
| ビルドと配布物の検査                         | `npm run build && npm run check-dist && npm run check-package && npm run pack-smoke` |

## 生成物（直接編集しない。変更したら再生成してコミットする）

| 生成物                                                                                   | 元                                                                      | コマンド               |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| `src/styles/theme.generated.css`, `aliases.generated.css`, `tokens/tokens.generated.css` | `tokens/tokens.json`                                                    | `npm run gen:tokens`   |
| `src/icons/*.ts`                                                                         | `icons/svg/*.svg`                                                       | `npm run gen:icons`    |
| `custom-elements.json`（git 管理外）                                                     | 各部品の JSDoc                                                          | `npm run gen:manifest` |
| `skills/jimble-ui/SKILL.md`, `.claude/skills/jimble-ui/SKILL.md`                         | `scripts/skill-template.md` + `custom-elements.json` + `site/examples/` | `npm run gen:skill`    |
| `CHANGELOG.md`, `package.json` の version                                                | release-please が書く                                                   | —                      |

CI は `gen:*:check` で最新かどうかを検査する。**API（属性・スロット・イベント）を変えたら JSDoc を直し、`gen:manifest` → `gen:skill` を実行する。** skill の使い方の説明を変えるときは `scripts/skill-template.md` を編集する（`tests/unit/skill.test.ts` が、skill 内のタグ・属性が実在することを保証する）。

## 守る約束（破ると壊れるもの）

1. **Tailwind のクラスは完全な文字列リテラルで書く**（`` `bg-${x}` `` の組み立て禁止。スキャナが検出できない）。**生の色は使わない**（`bg-indigo-600`、`#4f46e5`）。意味トークン（`bg-primary-600`、`text-fg-muted`、`ring-line-control`）だけ。内部のクラス名は公開 API ではない。
2. **トークンの既定値を `:host` / `:root` に宣言しない**（利用者の `:root` での上書きが負ける）。`var(--jimble-x, 既定値)` のフォールバックで持つ。`*.host.css` から使う色は、生成される `--_c-*`（`aliases.generated.css`）を参照する。
3. **Shadow DOM 内では Tailwind v4 の `@property` が効かない**。`build/postcss-shadow-fix.ts` が補正している。`shadow-*` / `ring-*` を触るときは、ブラウザテストで `box-shadow` が効くことを確認する。
4. **リアクティブプロパティは `static properties: PropertyDeclarations` + `declare` フィールド**。デコレーターは使わない。`value` / `checked` は「属性=初期値、プロパティ=現在値」（利用者が触ったら属性で上書きしない）。
5. **host 自身が意味を持つときは `ElementInternals` の role / aria\*** を使う（`JimbleElement.internals`。`attachInternals` はここでだけ呼ぶ）。host に属性を書き込まない（`tabindex` などの例外あり）。
6. **Shadow DOM の境界**:
   - ARIA の IDREF は境界をまたげない。ラベル・ヒント・エラーは**文字列で渡して、部品側の root に写す**（`jimble-field`）。anchor 名（CSS Anchor Positioning）も同じツリー内でだけ有効。
   - リスナーから見た `event.target` は host に再ターゲットされる。内側の要素を探すときは `event.composedPath()`。
   - light DOM のスロット内容は、Shadow 内の要素の `textContent` に含まれない。
7. **オーバーレイはネイティブ機能に任せる**（`<dialog>` の `showModal()`、Popover API）。popover 要素に `display` を変えるクラスを付けない（UA の非表示が壊れる）。メニュー/セレクトを Tab で閉じるときは、**描画を待たず同期的に `hidePopover()`**（Firefox で tabindex=0 の項目にフォーカスが移る）。toast の領域は、開いているモーダルの `<dialog>` の中へ移動する（モーダルの外は inert）。
8. **IME**: Enter・Esc・先頭文字検索は `ImeController` で変換中を除外する。
9. **アクセシビリティは自動テストで守る**: すべての部品と例に axe（違反ゼロ）。色の組み合わせを足したら `tests/unit/contrast.test.ts` に追加（文字 4.5:1、枠・アイコン 3:1）。入力欄の枠は `ring-line-control`（他より濃い）。強制色モード用に、ring/shadow の要素には透明な `outline` を併用する。
10. **部品には必ずテストと例を付ける**（`src/components/<名前>/*.test.ts`、`site/examples/<名前>/*.html`）。例は自動で axe にかかる。API の表は JSDoc（`@slot` `@csspart` `@cssprop` `@fires`、クラスに `@tag`）から作る。

## テストの落とし穴（過去に踏んだもの）

- **macOS の Firefox / Safari は、既定では Tab がボタンやリンクに止まらない**。Tab の移動先はテキスト入力にする。
- Playwright の `getByRole` は **ElementInternals のロール**と、Shadow 内 `<dialog>` 配下の**スロット内容**を見ない。ホスト要素から探すか、Chromium の CDP（`Accessibility.getFullAXTree`）で確認する。CDP は `aria-sort` を公開しない。
- ブラウザテスト（Vitest）は**ファイルを直列**で実行する（並列だと Firefox でキー入力が不安定）。テスト用 iframe は幅が狭い（約 414px）。`page.viewport()` は Firefox / WebKit で安定しないので、ビューポートに依存しない期待値にする。
- 非 ASCII の実キー入力（`userEvent.keyboard('削')`）はエンジンによって `key` が正しく渡らない。日本語のキーは合成の `KeyboardEvent` で確認する。
- Linux の Chromium は幅のあるスクロールバーを出す。E2E で**画面の端**をクリックしない。
- 無効な要素（`disabled`）への Playwright の `click` は待ち続ける。プログラムから `click()` する。

## コミットとリリース

- **Conventional Commits**（`feat(button): …`）。commitlint が検査する: 件名は **100 文字以内**、**文頭を大文字にしない**（`subject-case`）。末尾に `Co-Authored-By` を付ける。
- **`git push`、タグ、`npm publish`、GitHub / npm の設定、トークン・シークレットは、ユーザーの指示があるまで行わない。** リリースは release-please のリリース PR をマージして行う（`docs/release.md`）。
- 公開したバージョンは同じ番号で出し直せない。バージョン番号の決まり方は release-please に任せる（0.x は `feat` で minor）。
