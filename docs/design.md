# jimble-ui 基盤設計書

- 対象: 全コンポーネント共通の土台（ビルド・スタイル・基底クラス・トークン・フォーム・オーバーレイ・API 規約・i18n・アイコン・ドキュメント・テスト・開発フロー）
- 状態: **ドラフト（§14 の Q1〜Q8 と §0.5 の全項目は 2026-09-29 に決定済み。実装開始の指示待ち）** — OK が出るまで実装コードは書かない
- 作成日: 2026-09-29
- パッケージ: `@hidemikimura/jimble-ui`（MIT） / <https://github.com/hidemikimura/jimble-ui>

この文書のコード片・CSS 片は **設計を説明するためのイメージ**であり、実装ではない。

---

## 0. 概要と読み方

### 0.1 目的

管理画面向けの UI コンポーネントを、**素の HTML に `<script>` を 1 行足すだけで使える** Web Components として提供する。デザインは tailui.in を参考にした「indigo のアクセント・gray のニュートラル・`shadow-sm + ring-1 ring-inset`・`rounded-lg`」で、密度は管理画面向けに詰める。

### 0.2 決定済み要件（依頼文より）

Lit 3 / Tailwind CSS v4 / TypeScript / Vite（ライブラリモード）、`jimble-` 接頭辞、Shadow DOM + 共有 `CSSStyleSheet`、カスタマイズは CSS 変数 → `::part()` → スロット、内部の Tailwind クラス名は非公開、React ラッパーなし、ダークモードは後回し（ただし色は意味トークン経由）、日本語既定 + 辞書差し替え、IME 変換中の Enter は確定扱いにしない、WCAG 2.2 AA + APG、Chrome/Edge/Firefox/Safari の最新 2 バージョン、自作ドキュメントサイト、外部ライブラリは比較提示 → 了承後に採用。

### 0.3 調査で分かり、設計に効いている事実（2026-09-29 時点）

実装前に検証すべきことも含め、設計の前提になっている発見を先に挙げる。

| # | 発見 | 設計への影響 |
|---|------|-------------|
| F1 | **Tailwind v4 は `shadow-*` / `ring-*` の合成に `@property` の `initial-value` を使う。`@property` は Shadow DOM 内の stylesheet では無効**。互換用の `@layer properties` フォールバックは旧ブラウザ限定の `@supports` で囲まれており、最新ブラウザでは適用されない。（tailwindcss 4.3.3 を実際にコンパイルして確認。`@property --tw-shadow` などが出力され、フォールバックは `@supports ((-webkit-hyphens:none) and (not (margin-trim:inline))) or …` の中にあった） | そのまま使うと `shadow-sm` + `ring-1` が**効かない**（未定義の `var(--tw-shadow)` で `box-shadow` 全体が無効になる）。ビルド時に PostCSS で補正する（§2.4） |
| F2 | コンポーネントの `:host { --jimble-…: 既定値 }` にトークン既定値を書くと、**利用者が `:root` や祖先で上書きした値より `:host` の宣言が優先されてしまう**（要素自身の宣言は継承値に勝つ） | 既定値は `:host` に置かず、**`var(--jimble-x, 既定値)` のフォールバックとして持つ**（§4.4） |
| F3 | `ring-gray-300` は白背景に対し約 1.5:1。**入力欄は枠線が唯一の識別手段なので WCAG 1.4.11（非テキストのコントラスト 3:1）を満たさない**。tailui の見た目をそのまま写すと AA 未達になる | 入力系の枠には別トークン（既定 neutral-500 ≒ 4.8:1）を割り当てる。見た目が tailui より締まる。要判断（§4.6、§14 決定済み） |
| F4 | `box-shadow` は Windows のコントラスト強制（forced-colors）で消える。**border を使わない方針だと、強制色モードで枠が全部消える** | `outline: 1px solid transparent` を併用する（強制色モードで可視化される定番手法）（§4.7） |
| F5 | CSS Anchor Positioning は 2026-01 に Baseline（Firefox 147 が追加）。Chrome/Edge 125+、Firefox 147+、Safari 26+ で使える。対象ブラウザ（最新 2 バージョン）はすべて該当 | 位置計算ライブラリは**必須ではなくなった**。ただし Shadow DOM をまたぐ anchor 参照に不確実性がある（§6.6） |
| F6 | Shadow 内の `<input>` は外側の `<form>` に属さないため、**Enter による暗黙の送信が起きない**。`<label for>` や ARIA の IDREF も Shadow 境界をまたげない | 暗黙送信は自前で `requestSubmit()`、ラベル類は文字列で渡す/同一 root に写す（§5.4、§7） |
| F7 | フォーム関連カスタム要素は**送信ボタンになれない**（`requestSubmit(submitter)` に渡せない） | `<jimble-button type="submit">` は `form.requestSubmit()`（submitter なし）を呼ぶ。`name`/`value` は送信されない。制約を仕様に明記（§13.1） |

### 0.4 「決定 / 理由 / 比較した案」の書式

判断が分かれた箇所は次の形で書く。

> **決定** … / **理由** … / **比較した案** …

### 0.5 承認していただきたいこと（一覧）

詳細は本文。**太字が特に判断が必要なもの。**

| 章 | 項目 |
|----|------|
| §6.6 | 位置計算: ~~`@floating-ui/dom`~~ → **M3 のスパイクの結果、ネイティブ CSS Anchor Positioning を採用（依存を増やさない）** |
| §9 | **アイコン: Heroicons v2 から必要分を vendor（同梱は内部用のみ、汎用セットは非同梱）** |
| §4.6 | **入力欄の枠色を tailui より濃くする（WCAG 1.4.11 のため）** |
| §1.5 | ランタイム依存: `lit`、`@lit/context`（**なるべくこの 2 つに留める**。Floating UI は M3 のスパイクで不要と判明したため採用しない） |
| §10 | 例の「コピー」は ARIA の tab ではなくボタンにする |
| §2.3 | 宣言的フィールド（`static properties`）でデコレーターを使わない |
| §12.2, §12.3 | Conventional Commits + release-please、ESLint + Prettier |
| 付録 A | 将来の外部ライブラリ候補（絞り込み・日付・仮想スクロール）— 今回は採用しない |
| §14 | 確認事項 Q1〜Q8 — **決定済み** |

---

## 1. ディレクトリ構成とビルドの出力

### 1.1 リポジトリ構成

```
jimble-ui/
├─ package.json / tsconfig.json / tsconfig.build.json
├─ vite.config.ts              … ライブラリ用（複数エントリ + CDN バンドル）
├─ eslint.config.js / .prettierrc / commitlint.config.js / lefthook.yml
├─ custom-elements-manifest.config.mjs
├─ tokens/
│   └─ tokens.json             … デザイントークンの唯一の情報源
├─ scripts/                    … 生成・検査スクリプト（Node）
│   ├─ gen-tokens.ts           … tokens.json → @theme CSS / 型 / ドキュメント表
│   ├─ gen-icons.ts            … icons/svg/*.svg → src/icons/*.ts
│   ├─ gen-vscode-data.ts      … custom-elements.json → VS Code 用補完データ
│   └─ check-dist.ts           … dist の検査（生パレットの混入、サイズ予算、exports）
├─ icons/
│   ├─ svg/                    … vendor した SVG 原本
│   └─ LICENSE-heroicons       … 原本のライセンス表記
├─ src/
│   ├─ index.ts                … 全コンポーネントを登録して再エクスポート
│   ├─ base/                   … 基底クラスとコントローラー（§3）
│   ├─ styles/
│   │   ├─ index.css           … Tailwind のエントリ（§2）
│   │   ├─ theme.generated.css … @theme（生成物）
│   │   ├─ base.css / hosts.css … 共通の :host と、各 *.host.css の束ね（@import を手で列挙）
│   │   └─ shared-sheet.ts     … 共有 CSSStyleSheet の生成（§2.5）
│   ├─ i18n/                   … 辞書・LocalizeController（§8）
│   ├─ icons/                  … 生成された SVG テンプレート（§9）
│   ├─ locales/en.ts …         … 追加言語の辞書
│   └─ components/
│       └─ button/
│           ├─ index.ts              … 登録 + クラス export（エントリ）
│           ├─ jimble-button.ts
│           ├─ jimble-button.test.ts … テストは同居
│           └─ button.host.css       … 必要な場合のみ
├─ site/                       … ドキュメントサイト（§10。npm には出さない）
├─ tests/                      … 横断テスト（e2e、全例の axe、パッケージ検査）
├─ docs/
│   ├─ design.md               … 本書
│   └─ adr/                    … 設計判断の記録（以後の変更はここに追記）
└─ .github/workflows/          … ci.yml / release.yml / pages.yml
```

複合コンポーネントは 1 フォルダに親子をまとめる。

| フォルダ | 含まれるタグ |
|----------|-------------|
| `tabs/` | `jimble-tabs` / `jimble-tab` / `jimble-tab-panel` |
| `dropdown-menu/` | `jimble-dropdown-menu` / `jimble-menu-item` / `jimble-menu-separator` |
| `select/` | `jimble-select` / `jimble-option` |
| `radio-group/` | `jimble-radio-group` / `jimble-radio` |
| `table/` | `jimble-table` ほか（§15 R5） |
| `sidebar-nav/` | `jimble-sidebar-nav` / `jimble-nav-item` / `jimble-nav-group` |

> **決定** `site/` は同一 package.json 内のフォルダとし、npm workspaces にしない。
> **理由** 単一パッケージの公開で、site は同じ devDependencies とツール設定を使うため。workspaces は依存解決とスクリプトの複雑さが増えるだけ。
> **比較した案** workspaces（`packages/ui`, `packages/site`）— 将来 Router を別パッケージで出す段階になったら移行する。今は不要。

### 1.2 ビルド出力（`dist/`）

```
dist/
├─ index.js                     … "." 全コンポーネント登録
├─ components/
│   ├─ button.js                … "./button" 個別 import（登録 + クラス export）
│   └─ …
├─ chunks/                      … 共有チャンク（共有スタイルシート、基底クラス）
├─ locales/en.js …              … "./locales/en"
├─ types/                       … .d.ts（tsc で生成）
├─ cdn/
│   ├─ jimble-ui.js             … CDN 用（依存を全部含む自己完結 ESM、minify 済み）
│   ├─ jimble-ui.js.map
│   └─ locales/en.js            … CDN からも辞書を読めるよう単体 ESM
├─ tokens.css                   … 既定トークンを :root に展開したもの（任意で読む、§4.5）
├─ cloak.css                    … 未定義要素のちらつき防止（任意）
└─ vscode.html-data.json        … HTML 補完用データ
custom-elements.json            … リポジトリ直下（package.json の "customElements" で参照）
```

### 1.3 exports の方針

```jsonc
{
  "type": "module",
  "sideEffects": ["./dist/index.js", "./dist/components/*.js", "./dist/cdn/*.js"],
  "exports": {
    ".":                  { "types": "./dist/types/index.d.ts",  "default": "./dist/index.js" },
    "./*":                { "types": "./dist/types/components/*/index.d.ts", "default": "./dist/components/*.js" },
    "./locales/*":        { "types": "./dist/types/locales/*.d.ts", "default": "./dist/locales/*.js" },
    "./tokens.css":       "./dist/tokens.css",
    "./cloak.css":        "./dist/cloak.css",
    "./custom-elements.json": "./custom-elements.json",
    "./vscode.html-data.json": "./dist/vscode.html-data.json",
    "./package.json":     "./package.json"
  },
  "customElements": "custom-elements.json"
}
```

- **`import '@hidemikimura/jimble-ui/button'`** は登録（副作用）とクラスの export を兼ねる。素の HTML 利用者が中心なので「import すれば使える」を既定にする。
- CDN は `<script type="module" src=".../dist/cdn/jimble-ui.js"></script>` の 1 行で全部登録される。

> **決定** 出力は ESM のみ。IIFE / CJS は出さない。
> **理由** 対象は最新 2 バージョンのブラウザで `<script type="module">` が使える。Node 側で CJS として読む利用は想定しない（Web Components は DOM が前提）。
> **比較した案** IIFE を追加（`<script>` 単体で使える）— 需要が出たら CDN ビルドに追加できるので今は見送る。

> **決定** ビルドターゲットは `es2023`、CSS は Lightning CSS で最小化。
> **理由** 「最新 2 バージョン」ならすべて ES2023 を満たす。トランスパイルを減らしてバンドルを小さくする。
> **比較した案** browserslist からの自動導出 — 対象が「最新 2 つ」で固定なので、導出の仕組みを持つ意味が薄い。

### 1.4 Vite ライブラリモードの構成

- **2 つのビルド**を `vite build` から順に実行する。
  1. npm 用: `build.lib` の複数エントリ（`index` + `components/*` + `locales/*`）。共有部分は共有チャンクへ自動分割される。`lit` / `@lit/context` / `@floating-ui/dom` は **external**（利用者側の依存解決に任せる）。
  2. CDN 用: 単一エントリ。**依存を全部バンドル**する（external なし）。
- 型定義は **`tsc -p tsconfig.build.json --emitDeclarationOnly`** で出力する。
- `custom-elements.json` は `@custom-elements-manifest/analyzer`（Lit プラグイン）で生成する。
- Vite は現行の 8.3 系（Rolldown ベース）。**バージョンは実装開始時に再確認**して固定する。

> **決定** 型定義は `tsc` で出す。
> **理由** 最も確実で、Vite のバンドラー刷新（Rolldown 化）の影響を受けない。
> **比較した案** `vite-plugin-dts` 5.x（MIT, 活発）/ `rolldown-plugin-dts` — ビルド 1 回で済む利点はあるが、プラグインの挙動が変わりやすい領域。`tsc` の方が壊れにくい。

### 1.5 ランタイム依存（最小に保つ）

**方針**: 下の 3 つを**基本線**とし、確定した固定リストではない。「なるべくこの 3 つに留める」ものとして扱い、増やす場合は理由を示して都度相談する（付録 A の外部ライブラリと同じ扱い）。

| パッケージ | 用途 | サイズ(min+gz) | ライセンス | 状態 |
|-----------|------|---------------|-----------|------|
| `lit` 3.3.3 | 基盤 | 約 6.0 KB | BSD-3-Clause | 2026-05 |
| `@lit/context` 1.1.6 | field ↔ 入力欄の連携（§5.5） | 約 1〜2 KB（未計測） | BSD-3-Clause | 2025-07 |
| ~~`@floating-ui/dom` 1.8.0~~ | 位置計算 → **採用しない**（§6.6 の M3 結果） | — | — | — |

> **決定** `@lit/context` を使う。
> **理由** Lit 公式で、実体は「Community Context Protocol」の CustomEvent。自作しても同じものになり、互換性が取れる利点だけ失う。
> **比較した案** 自作の CustomEvent プロトコル — 依存は 1 つ減るが、車輪の再発明。

---

## 2. Tailwind v4 のコンパイルと共有スタイルシート

### 2.1 全体像

```
tokens/tokens.json ──gen-tokens──▶ theme.generated.css (@theme inline)
                                          │
src/styles/index.css ─ @import ─▶ tailwindcss (preflight + utilities)
src/components/**/*.ts   ─ (クラス名をスキャン) ─┤
src/styles/hosts/*.css   ─ @import ─────────────┘
                                          ▼
                   PostCSS: @tailwindcss/postcss
                          → jimble-shadow-fix（自作、§2.4）
                          → Lightning CSS で minify
                                          ▼
                 `import css from './index.css?inline'`  ← Vite が文字列として渡す
                                          ▼
               shared-sheet.ts:  new CSSStyleSheet() + replaceSync(css)
                                          ▼
       JimbleElement.styles = [sharedSheet]  ── Lit が adoptedStyleSheets に設定
```

### 2.2 Tailwind の使い方

- エントリ `index.css` は Tailwind 全体ではなく、必要な層だけを取り込む。
  ```css
  /* イメージ */
  @layer theme, base, components, utilities;
  @import "tailwindcss/preflight.css" layer(base);
  @import "tailwindcss/utilities.css" layer(utilities);
  @import "./theme.generated.css";          /* @theme inline（§4.4） */
  @import "./hosts.generated.css";          /* hosts/*.css を束ねたもの */
  @source "../components";                  /* クラス名のスキャン対象 */
  ```
- Tailwind 本体の既定パレットは無効化する（`--color-*: initial;`）。**コンポーネントのコードで `bg-indigo-600` のような生の色は書けない**。`bg-primary-600` のような意味トークン経由のクラスだけが存在する（§4）。
- テンプレート内のクラス名は**完全な文字列リテラル**で書く（`` `bg-${x}-600` `` のような組み立て禁止）。バリアントごとの対応表（`Record<Variant, string>`）にまとめる。Tailwind のスキャナが検出できるようにするため。
- `:host(jimble-button) { display: inline-flex }` のような、Tailwind のクラスで書けないもの（`:host`、`::slotted`、`:state()`、`@media (forced-colors)` など）は `src/components/<name>/<name>.host.css` に書き、ビルド時に束ねる。**共有シート 1 枚に全部入る**ため、必ず `:host(jimble-xxx)` で要素を限定する（素の `:host` は全コンポーネントに効いてしまう）。

> **決定** PostCSS 経由（`@tailwindcss/postcss`）+ `?inline` で CSS を文字列として取り込む。
> **理由** 「コンパイル結果を文字列で受け取り、補正を挟み、`CSSStyleSheet` にする」という流れに一番素直に載る。補正プラグイン（§2.4）の順序も制御しやすい。開発時は Vite の HMR で文字列が差し替わり、共有シートを `replaceSync` し直すだけで全コンポーネントが更新される。
> **比較した案**
> 1. `@tailwindcss/vite` — Tailwind の推奨経路だが、CSS を「ページに注入するもの」として扱う前提が強く、`?inline` + 後段の補正との相性が読みにくい。
> 2. Tailwind CLI で `generated.css` を事前生成 — 動くが、ファイルが 1 つ増え、dev サーバーとの二重管理になる。
> 3. 各コンポーネントで `unsafeCSS` + `@apply` — 共有シート方針に反し、CSS が重複する。

### 2.3 Lit の宣言方法

> **決定** リアクティブプロパティは `static properties = {…}` + `declare` フィールドで宣言し、**デコレーターは使わない**。
> **理由** Lit のデコレーターは TS の `experimentalDecorators` と標準デコレーターで挙動が異なり、`useDefineForClassFields` の設定次第でプロパティが壊れる落とし穴がある。ビルダーが Rolldown/oxc に移行している最中でもあり、ツールチェーンの変換に依存しない書き方の方が安全。`custom-elements-manifest` の解析も `static properties` に対応している。
> **比較した案** 標準デコレーター（`@property()` + `accessor`）— 見た目は一般的だが、上記のツール依存リスクがある。

### 2.4 Shadow DOM 用の補正（`jimble-shadow-fix`）

**問題（F1）**: Tailwind v4 の出力には次の 2 種類がある（tailwindcss 4.3.3 で確認）。

1. `@property --tw-shadow { syntax:"*"; inherits:false; initial-value: 0 0 #0000 }` などの登録 — **Shadow DOM 内の stylesheet では無視される**。
2. `@layer properties { @supports (旧ブラウザ判定) { *, ::before, ::after, ::backdrop { --tw-shadow: 0 0 #0000; … } } }` — 最新ブラウザでは `@supports` が偽になり適用されない。

その結果、`shadow-sm ring-1` が使う `box-shadow: var(--tw-inset-shadow), var(--tw-ring-shadow), var(--tw-shadow)` のいずれかが未定義になり、**宣言全体が無効**になる。

**対策**（自作 PostCSS プラグイン、数十行の見込み）:

1. `@layer properties` 内の `@supports` ラッパーを**外して**、常に `*, ::before, ::after, ::backdrop { --tw-…: 初期値 }` を有効にする。
2. `@property --tw-*` の宣言を削除する（無効なので）。
3. `@property` で `inherits:false` だった性質は、**全要素に初期値を再宣言する**ことで代替する（親の `--tw-shadow` が子に漏れない）。
4. `:root, :host` に出力されるテーマ変数はそのまま使える（`:host` が含まれるため）。ただしトークンの既定値は §4.4 の方式で持つ。

**検証を自動化する**: ブラウザテストで「共有シートを適用した Shadow 内の要素で `getComputedStyle(el).boxShadow` が `none` でない」ことを確認する（Chromium / Firefox / WebKit）。Tailwind の更新で出力形式が変わったらここで検知する。

> **決定** 自作プラグインで補正する。
> **理由** 出力形式に対する外科的な対応で、Tailwind の他の機能（`@theme`、ユーティリティ生成）を丸ごと使い続けられる。
> **比較した案**
> 1. `@property` を document 側にも登録する（`document.adoptedStyleSheets` に追加）— レジストリは文書全体で共有されるので効くが、**利用者のページのグローバル状態を汚す**うえ、Shadow だけで完結しなくなる。
> 2. `shadow-sm` / `ring` を使わず `box-shadow` を生値で書く — 動くが Tailwind を使う意味が減る。ring の合成（`ring-inset` + フォーカスの `ring-2`）は Tailwind に任せたい。

### 2.5 共有シートの生成と配布

```ts
// イメージ: src/styles/shared-sheet.ts
import css from './index.css?inline'
const KEY = Symbol.for('jimble-ui.shared-sheet')
function create() { const s = new CSSStyleSheet(); s.replaceSync(css); return s }
export const sharedSheet: CSSStyleSheet = (globalThis as any)[KEY] ??= create()
```

- **シングルトン**: `Symbol.for` でグローバルに 1 つだけ持つ。CDN バンドルと個別 import を併用しても、（同一バージョンなら）同じシートを共有できる。
- **Lit との連携**: `JimbleElement.styles = [sharedSheet]`。Lit は `CSSStyleSheet` をそのまま `adoptedStyleSheets` に設定する（対象ブラウザはすべて対応）ので、フォールバック処理は書かない。
- **個別 import の代償**: どのコンポーネントを 1 つ import しても、**全コンポーネント分のクラスを含む共有シート**が付いてくる。P1 全体で概算 20〜30 KB gz を見込む（暫定、M1 で実測して確定）。
- **開発時**: `import.meta.hot` で共有シートを `replaceSync` し直す。再描画不要。
- **本番**: CSS は JS チャンク内の文字列。別ファイルの CSS は配らない（利用者の `<link>` 忘れを防ぐ）。

> **決定** 共有シート 1 枚 + 全クラス入り。
> **理由** 依頼の決定事項。管理画面は多数のコンポーネントを同時に使うので、重複排除の利益が大きい。
> **比較した案** コンポーネントごとにシートを分ける — 単体の import は軽くなるが、共通部分（preflight、トークン）が重複し、「1 つの共有シート」方針に反する。サイズが問題になったら「コアシート + 追加シート」の 2 段構成へ拡張する余地は残す。

### 2.6 サイズ・品質の予算（M5 で確定）

`scripts/check-dist.ts` が CI とリリースで検査する。実測（2026-09-29、22 コンポーネント + i18n + `toast()`）にゆとりを持たせた値。

| 対象 | 予算（gzip） | 実測 |
|------|-------------|------|
| 共有シート（CSS）+ 基底クラス + i18n を含むチャンク | 13 KB 以下 | 9.9 KB |
| それ以外の JS（コンポーネント 1 つぶんなど） | 8 KB 以下（当初は 4 KB） | 最大 6.5 KB（`combobox`） |
| CDN バンドル全体（22 部品 + Lit + `@lit/context`） | 56 KB 以下 | 39.2 KB |

`check-dist.ts` は他に、(a) 出力 CSS に Tailwind 既定パレットの色が残っていないこと、(b) `@property` が残っていないこと、(c) `exports` の各パスが実在すること、(d) 配布用ファイル（`tokens.css` / `cloak.css` / `vscode.html-data.json` / `custom-elements.json` / `locales/en.js`）が揃っていること、を検査する。配布物そのものは、`publint --strict`、`are-the-types-wrong`、`scripts/pack-smoke.ts`（`npm pack` したものを空のプロジェクトに入れ、Vite でのバンドル・`tsc`・実ブラウザで確認）で検査する。

---

## 3. 基底クラスの構成

### 3.1 継承関係

```
LitElement
 └─ JimbleElement                  … 全コンポーネントの基底
     ├─ (mixin) FormAssociated(JimbleElement) → JimbleFormElement
     │      … jimble-input / textarea / select / checkbox / switch / radio-group
     ├─ JimbleElement を直接継承 … button / badge / card / alert / tabs / …
     └─ オーバーレイは継承ではなくコントローラーで合成（§6）
```

> **決定** フォーム機能は mixin（`FormAssociated`）で提供し、オーバーレイ・ロービング・IME などはコントローラー（Lit の `ReactiveController`）で合成する。継承の深さは最大 3（`LitElement` → `JimbleElement` → 各要素/`JimbleFormElement`）。
> **理由** フォームの値・検証・リセットは「要素が持つ性質」なので継承向き。一方、オーバーレイやキーボード操作は不要なコンポーネントが多く、選択的に組み合わせたい。深い継承は TypeScript の型が壊れやすい。
> **比較した案** すべて継承（`JimbleOverlayElement` など）— 複数の性質を持つ要素（例: select はフォームでもオーバーレイでもある）で多重継承の問題が出る。

### 3.2 `JimbleElement` が提供するもの

| 機能 | 内容 |
|------|------|
| 共有スタイル | `static styles = [sharedSheet]`。サブクラスは `[...super.styles, …]` で追加 |
| `static define(tag)` | `customElements.get(tag)` を確認してから登録。CDN と個別 import の二重登録でも例外にならない（先勝ち + 開発時に警告） |
| `emit(name, options)` | `jimble-` を自動付与して CustomEvent を発火。既定 `bubbles: false, composed: true`（アプリ全体で受ける通知だけ `bubbles: true` を指定。下の追補）。`detail` は型付き |
| `t(key, params)` | i18n の翻訳関数。`LocalizeController` を自動で接続し、ロケール変更で再描画（§8） |
| `uid(prefix)` | 同一 root 内で使う ID 生成（`aria-describedby` 用） |
| `warn(msg)` | 開発ビルドのみのコンソール警告（`__DEV__` を本番で除去）。必須属性の欠落（アイコンのみボタンの `aria-label` など）に使う |
| `hasSlot(name)` | スロットの有無（`SlotController`）。ラベルの有無などで描画を変える |
| 状態の公開 | `internals.states`（`:state(open)` など）を各要素が更新する薄いヘルパー |
| 論理プロパティ | クラス名は `ms-` / `ps-` などの論理プロパティを優先（RTL 対応の余地を安く残す） |

### 3.3 `internals` の使い方（重要な原則）

> **決定** 要素自身が意味（ロール）を持つ場合は、`ElementInternals` の `role` / `aria*` で**既定の意味を付与**し、host の属性は汚さない。対象: `jimble-tab`（tab）、`jimble-tab-panel`、`jimble-option`、`jimble-menu-item`、表の各セル、`jimble-radio-group`（radiogroup）など。利用者が host に書いた `role` / `aria-*` 属性は internals より優先される（ブラウザ仕様）。
> **理由** 利用者の DOM にコンポーネントが属性を書き込むと、テンプレートやテストで差分が出たり、フレームワークの再描画と競合する。internals ならカスタマイズの余地を残したまま既定が与えられる。
> **例外** ロービングフォーカスの `tabindex` だけは host に書く（internals では表現できないため）。

### 3.4 コントローラー一覧（共通部品）

| コントローラー | 役割 | 主な利用先 |
|----------------|------|-----------|
| `LocalizeController` | 翻訳とロケール変更の購読 | 全部 |
| `SlotController` | スロット有無、`slotchange` | card, field, page-header ほか |
| `RovingFocusController` | 矢印キー/Home/End のロービング、`tabindex` 管理 | tabs, radio-group, dropdown-menu, select |
| `TypeaheadController` | 先頭文字検索（IME 変換中は無視） | dropdown-menu, select |
| `ImeController` | 変換中判定（§8.3） | input, textarea, select, dialog |
| `PositionController` | 位置計算の抽象（§6.6） | dropdown-menu, select |
| `LightDismissController` | 外側クリック/Esc で閉じる処理 | 独自ポップアップ用（原則ネイティブに任せる） |
| `ScrollLockController` | モーダル時の背面スクロール停止（参照カウント） | dialog, app-shell の小画面ドロワー |
| `FocusReturnController` | 開く前のフォーカス要素を記憶し、閉じたら戻す | dialog, dropdown-menu, select |
| `FieldControlController` | `jimble-field` との連携（§5.5） | フォーム系全部 |

---

## 4. デザイントークン

### 4.1 二層構造

| 層 | 例 | 用途 |
|----|-----|------|
| **スケール**（パレット） | `--jimble-color-primary-600` | ブランド色の階調。色相に固有の状態（hover、選択色など） |
| **ロール**（意味） | `--jimble-color-surface`, `--jimble-color-text-muted` | 面・文字・線など、**ダークモードで入れ替わるもの** |

> **決定** コンポーネントは「面・文字・枠」には**ロール**を、「アクセント色の階調」にはスケールを使う。ダークモード追加時は、ロールの値を差し替えるだけで済む。
> **理由** 依頼の「色はすべて意味を表すトークン経由」を満たしつつ、`primary-600` を hover で `primary-500` に変えるような階調の指定も自然に書ける。
> **比較した案** ロールのみ（`--color-primary`, `--color-primary-hover`…）— 階調の数だけロールが増えて肥大化し、利用者が微調整しにくい。スケールのみ — ダークモードで面と文字の反転が全コンポーネントに波及する。

### 4.2 命名規則

```
--jimble-{カテゴリ}-{名前}[-{段階/サイズ}]          … 公開トークン
--jimble-{コンポーネント}-{プロパティ}[-{状態}]       … コンポーネント固有の公開変数
--_{名前}                                          … 内部専用（非公開・変更自由）
```

- 小文字 kebab-case、接頭辞は必ず `--jimble-`。
- 色の段階は Tailwind 互換の `50, 100, …, 950`。サイズは `xs|sm|md|lg|xl`。
- 状態は末尾に `-hover` / `-active` / `-disabled` / `-focus`。
- 公開したトークンと公開変数は SemVer の対象（変更は破壊的変更）。`--_` は対象外。

### 4.3 トークン一覧

`tokens/tokens.json` が情報源で、以下は初期セット。P1 の実装で使うものだけを最初から定義し、増やす際は同ファイルに足す。

**カラー（スケール）** — 既定値は Tailwind のパレットを `gen-tokens` が `tailwindcss/theme.css` から読み取って割り当てる（手で写さない）。

| トークン | 既定の元 | 段階 |
|----------|---------|------|
| `--jimble-color-primary-{step}` | indigo | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 |
| `--jimble-color-neutral-{step}` | gray | 同上 |
| `--jimble-color-success-{step}` | green | 50, 100, 200, 500, 600, 700, 800 |
| `--jimble-color-warning-{step}` | amber | 同上 |
| `--jimble-color-danger-{step}` | red | 同上 |
| `--jimble-color-info-{step}` | sky | 同上 |

**カラー（ロール）** — 括弧内は既定の参照先。

| トークン | 既定 | 用途 |
|----------|------|------|
| `--jimble-color-surface` | white | カード、入力欄、ダイアログの面 |
| `--jimble-color-surface-muted` | neutral-50 | ページ背景、テーブルヘッダー |
| `--jimble-color-surface-sunken` | neutral-100 | hover 面、無効状態の面 |
| `--jimble-color-surface-overlay` | white | ダイアログ・メニューの面 |
| `--jimble-color-backdrop` | neutral-900 の 50% | ダイアログの背景幕 |
| `--jimble-color-text` | neutral-900 | 本文 |
| `--jimble-color-text-muted` | neutral-500 | 補助文字（白背景で約 4.8:1） |
| `--jimble-color-text-placeholder` | neutral-500 | プレースホルダー（4.5:1 を確保） |
| `--jimble-color-text-disabled` | neutral-400 | 無効文字（WCAG 上、無効要素は対象外） |
| `--jimble-color-text-on-primary` | white | primary 面上の文字 |
| `--jimble-color-text-link` | primary-600 | リンク |
| `--jimble-color-ring` | neutral-300 | 装飾的な枠（カード、ボタン、区切り） |
| `--jimble-color-ring-control` | neutral-500 | **入力系の枠**（1.4.11 の 3:1 を確保、F3） |
| `--jimble-color-ring-focus` | primary-600 | フォーカスリング |
| `--jimble-color-ring-invalid` | danger-600 | エラー枠 |
| `--jimble-color-primary` | primary-600 | 「主色そのもの」が欲しい場合の別名 |

**寸法・形**

| トークン | 既定 | 備考 |
|----------|------|------|
| `--jimble-spacing` | 0.25rem | Tailwind の `--spacing` に接続。**密度を一括で変えられる** |
| `--jimble-radius-{sm\|md\|lg\|xl\|full}` | 0.25 / 0.375 / 0.5 / 0.75rem / 9999px | |
| `--jimble-radius-control` | radius-lg | ボタン・入力欄 |
| `--jimble-radius-card` | radius-lg | カード |
| `--jimble-radius-overlay` | radius-xl | ダイアログ・メニュー |
| `--jimble-control-height-sm` / `-md` / `-lg` | 2rem / 2.25rem / 2.5rem | 32 / 36 / 40px（既定 md = 36px、§14 で確認） |
| `--jimble-shadow-{xs\|sm\|md\|lg}` | Tailwind の shadow-2xs/sm/md/lg 相当 | |
| `--jimble-focus-ring-width` | 2px | |

**タイポグラフィ・モーション・重なり**

| トークン | 既定 | 備考 |
|----------|------|------|
| `--jimble-font-sans` | `system-ui, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", Meiryo, sans-serif` | 日本語環境を考慮 |
| `--jimble-font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | |
| `--jimble-font-size-{xs\|sm\|base\|lg\|xl}` | 0.75 / 0.875 / 1 / 1.125 / 1.25rem | 本文の基本は `sm`（14px） |
| `--jimble-line-height-{tight\|normal}` | 1.25 / 1.5 | |
| `--jimble-duration-{fast\|base\|slow}` | 100 / 150 / 250ms | `prefers-reduced-motion: reduce` で 0ms に |
| `--jimble-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | |
| `--jimble-z-sticky` / `-drawer` | 10 / 20 | トップレイヤーに入らないもの用（§6.2） |

### 4.4 `@theme` との対応

`gen-tokens` が `tokens.json` から `theme.generated.css` を生成する。要点は **`@theme inline` + `var()` のフォールバックに既定値を持つ**こと（F2 の対策）。

```css
/* イメージ（生成物） */
@theme inline {
  --color-*: initial;                              /* Tailwind 既定パレットを無効化 */

  /* スケール: Tailwind ユーティリティ名 ← 公開トークン（既定値はフォールバック） */
  --color-primary-600: var(--jimble-color-primary-600, oklch(0.511 0.262 276.966));
  --color-neutral-500: var(--jimble-color-neutral-500, oklch(0.551 0.027 264.364));

  /* ロール: 公開トークン → スケールへ連鎖 */
  --color-surface:      var(--jimble-color-surface, #fff);
  --color-text-muted:   var(--jimble-color-text-muted, var(--color-neutral-500));
  --color-ring-control: var(--jimble-color-ring-control, var(--color-neutral-500));

  --radius-lg:   var(--jimble-radius-lg, 0.5rem);
  --spacing:     var(--jimble-spacing, 0.25rem);
  --font-sans:   var(--jimble-font-sans, system-ui, …);
  --text-sm:     var(--jimble-font-size-sm, 0.875rem);
}
```

- `inline` を付けると、`bg-primary-600` は `background-color: var(--jimble-color-primary-600, …)` に**直接**展開される。利用者がページのどこかで `--jimble-color-primary-600` を宣言すれば、継承経由で Shadow 内に届く。
- 既定値は **`:host` にも `:root` にも宣言しない**。宣言が無ければ「利用者の宣言 → フォールバック」の順で解決される。

**Tailwind の名前空間との対応表**

| Tailwind の名前空間 | 生成されるクラスの例 | 元のトークン |
|---------------------|--------------------|-------------|
| `--color-primary-*` `--color-neutral-*` 他 | `bg-primary-600`, `text-neutral-500` | `--jimble-color-{name}-{step}` |
| ロール（`--color-surface*`, `--color-fg*`, `--color-line*`, `--color-focus`, `--color-invalid`） | `bg-surface`, `text-fg-muted`, `ring-line-control`, `ring-focus` | `--jimble-color-{surface,text,ring,…}`（クラス名が `text-text` のように重複しないよう、theme 側の名前は `fg` / `line` を使う） |
| `--radius-*` | `rounded-lg`, `rounded-control` | `--jimble-radius-*` |
| `--shadow-*` | `shadow-sm` | `--jimble-shadow-*` |
| `--spacing` | `p-3`, `h-9`（全ての間隔） | `--jimble-spacing` |
| `--font-*` `--text-*` | `font-sans`, `text-sm` | `--jimble-font-*`, `--jimble-font-size-*` |
| `--ease-*` `--duration-*`（`--default-transition-duration` 含む） | `ease-standard`, `duration-fast` | `--jimble-ease-*`, `--jimble-duration-*` |

> **決定** トークンの既定値は `var()` のフォールバックに持ち、`:host` / `:root` には出さない。任意の `tokens.css`（`:root` に既定値を並べたもの）は**編集の出発点として配布する**が、読み込みは必須にしない。
> **理由** F2 の落とし穴を避けつつ、ゼロ設定で動く。
> **比較した案**
> 1. 既定値を `:host` に書く — 利用者の `:root` 上書きが負けるため不可。
> 2. 読み込み時に `document.adoptedStyleSheets` へ `:root` の既定値を注入する — グローバルを汚し、順序の問題が起きる。
> 3. `@property` で登録する — Shadow 内のシートでは無効（F1）。document 側に置く必要があり 2 と同じ問題。

### 4.5 利用者側の上書き

```css
/* 利用者のページ: 主色を変える（継承で全 jimble 要素に届く） */
:root { --jimble-color-primary-600: #0d9488; --jimble-color-primary-500: #14b8a6; }
/* 一部だけ変える */
.settings jimble-button { --jimble-button-radius: 9999px; }
```

将来のダークモード: ロールだけを差し替える（`[data-theme="dark"] { --jimble-color-surface: …; --jimble-color-text: …; }`）。スケールは色相の階調のまま。

### 4.6 コントラストの取り決め（F3）

> **決定** 入力欄・チェックボックス・ラジオ・スイッチなど、**枠線が識別の唯一の手掛かり**になる部品は `ring-control`（既定 neutral-500）を使う。ボタン・カード・区切り線など、文字や配置で識別できるものは `ring`（neutral-300）を使う。
> **理由** WCAG 1.4.11 は UI コンポーネントの境界に 3:1 を求める。`gray-300` の枠だけの入力欄は白背景で約 1.5:1 となり満たさない。ボタンは文字ラベルで識別できるため枠が淡くてよい。
> **比較した案** tailui の見た目どおり `gray-300` — 見た目は軽いが AA 未達。利用者が `--jimble-color-ring-control` を上書きすれば淡くできる（その場合の責任は利用者）。neutral-400（約 2.5:1）— 3:1 に届かない。

**契約テスト**: 「文字×面のペア」「枠×面のペア」の一覧を持ち、既定トークンのコントラスト比を CI で計算して検証する（テキスト 4.5:1、非テキスト 3:1）。トークン更新で AA が壊れたら落ちる。

### 4.7 フォーカスと強制色モード

- フォーカスは `:focus-visible` のみ。`ring-2 ring-inset ring-ring-focus`（コンポーネントによっては `outline` のオフセット付き）。フォーカスインジケーターは背景に対し 3:1 以上、かつ 2 px 以上（WCAG 2.4.13 の趣旨）。
- **強制色モード（F4）**: ring/shadow で枠を描く要素には `outline: 1px solid transparent` を併用する。フォーカス時は `outline-width` を太くする。ホスト CSS に `@media (forced-colors: active)` を用意し、システム色（`ButtonText`, `Highlight` 等）にマップする。
- **スティッキーヘッダーがフォーカスを隠さない**（WCAG 2.4.11）: app-shell が `scroll-padding-top` を公開変数 `--jimble-app-shell-header-height` から設定する。

---

## 5. フォーム連携の基底

### 5.1 `JimbleFormElement`（`FormAssociated` mixin）

すべてのフォーム部品（input, textarea, select, checkbox, switch, radio-group）が継承する。

```
static formAssociated = true
constructor: this.internals = this.attachInternals()
```

| 機能 | 実装方針 |
|------|---------|
| **値** | `internals.setFormValue(value, state)`。値が変わるたびに呼ぶ。`name` が無い場合は送信されない（ネイティブ準拠） |
| **検証** | `internals.setValidity(flags, message, anchor)`。`anchor` は内部の実コントロール（`reportValidity()` でフォーカスされる先） |
| **リセット** | `formResetCallback()` — **`value` 属性の値**（=デフォルト値）へ戻す。`checked` 系は `checked` 属性の有無へ戻す |
| **disabled** | 有効な disabled = `disabled` 属性 ∥ 祖先 `<fieldset disabled>`。後者は `formDisabledCallback(disabled)` で受ける。内部の実コントロールにも反映 |
| **状態復元** | `formStateRestoreCallback(state, mode)` — bfcache / オートフィル復元 |
| **form 関連付け** | `formAssociatedCallback(form)` — `form` の取得/送信のフックに使う |
| **ラベル** | `internals.labels` を公開（外部の `<label for>` が host を指せる） |

**`value` の意味**: ネイティブの `<input>` と揃える。

- `value` **属性** = デフォルト値（リセット先）。属性は `reflect` しない。
- `value` **プロパティ** = 現在値。変更しても属性は変わらない。
- リセット時は `getAttribute('value')` に戻す。

### 5.2 検証（Constraint Validation）

> **決定** テキスト系は内部に**ネイティブ `<input>` / `<textarea>` を持ち**、その `validity` を `internals.setValidity()` に写す。メッセージは**自前の辞書**から差し替える（§8）。
> **理由** 型（email/url/number）、`pattern`、`min/max`、`step` などの制約検証を再実装せずに済み、IME・選択範囲・オートフィル・モバイルキーボードの挙動がネイティブと同じになる。ブラウザ標準メッセージは UI 言語依存で日本語圏の統一性がないため、辞書で置き換える。
> **比較した案**
> 1. 完全自前（`contenteditable` など）— IME と a11y の再実装コストが桁違い。却下。
> 2. 検証だけ自前 — ネイティブの制約と挙動がずれる。

- **エラーの表示タイミング**: 「一度 blur した（touched）」または「フォームの送信試行で `invalid` が発火した」後に `invalid` 状態を表示する。入力途中で赤くしない。ネイティブの `:user-invalid` と同じ考え方で、`touched` は `:state(touched)` として公開する。
- **`invalid` の表示**: `:state(invalid)` と内部コントロールの `aria-invalid="true"`、枠を `ring-invalid` に。
- **公開メソッド**: `checkValidity()` / `reportValidity()` / `setCustomValidity(msg)` と `validity` / `validationMessage` / `willValidate`（`internals` に委譲）。サーバー側エラーは `setCustomValidity` か `jimble-field` の `error` 属性で渡す。

### 5.3 disabled と readonly

- `disabled`: 内部コントロールを実際に `disabled` にする（フォーカス不可、送信されない）。ボタンの `loading` は**別扱い**（`aria-disabled` + クリック無効、フォーカスは維持）。
- `readonly`: 値は送信される・フォーカスできる・変更不可（ネイティブ準拠）。

### 5.4 暗黙の送信（F6, F7）

Shadow 内のネイティブ入力は外側の `<form>` に属さないので、Enter で送信されない。

- `jimble-input` は Enter の `keydown`（**変換中でない**とき、§8.3）で、ネイティブの規則に合わせて `internals.form?.requestSubmit()` を呼ぶ。「フォームに送信ボタンがある、または送信可能なテキスト欄が 1 つだけ」のとき。`textarea` では発火しない（Enter は改行）。
- `jimble-button type="submit"` は click で `form.requestSubmit()`、`type="reset"` は `form.reset()`。**`submitter` は渡せないため `name/value` は送信されない**、`formaction` / `formmethod` 系の属性はサポートしない。必要な場合は素の `<button>` を併用する。（F7、仕様に明記）

### 5.5 `jimble-field` との連携

`jimble-field` はラベル・ヒント・エラーを描画する。**ARIA の IDREF は Shadow 境界をまたげない**（F6）ので、次の方式にする。

```
<jimble-field label="メール" hint="社用アドレス" required>
  <jimble-input name="email" type="email"></jimble-input>
</jimble-field>
```

1. `FieldControlController`（コントロール側）が `@lit/context` の要求イベントで最寄りの `jimble-field` に**登録**する。
2. field は **文字列**でラベル・ヒント・エラーをコントロールに渡す。
3. コントロールは自分の Shadow 内に**視覚的に隠した（`sr-only`）ヒント/エラーの複製**を描画し、内部 `<input>` に `aria-describedby` で同一 root の ID を張る。field 側の可視テキストは `aria-hidden="true"` にして二重読み上げを避ける。ラベルは内部 `<input>` の `aria-label`（field のラベル文字列）に入れる。
4. ラベルクリック → `control.focus()`（`delegatesFocus: true`）。
5. 優先順位: `error` 属性（明示）＞ コントロールの `validationMessage`（touched 後）。

この方式は、フィールド外で使う `<jimble-input aria-label="…">` や、外側の素の `<label for="id">` でも動く（後者は `internals.labels` から文字列を取得）。

> **決定** 「文字列を渡して、コントロール側 root に複製する」方式（ミラーリング）。
> **理由** 現時点で全対象ブラウザで確実に動く。DOM の複製は視覚的に隠されるだけで、スクリーンリーダーには内部 input の名前・説明として正しく伝わる。
> **比較した案**
> 1. `ariaLabelledByElements` / `ariaDescribedByElements`（ElementInternals の要素参照）— 対象ブラウザでの成熟度と挙動を実装時に検証して、**機能検出できれば段階的に採用**する（現時点では前提にしない）。
> 2. コントロール自身が label/hint/error を描画（field をなくす）— 素の HTML の記述は簡単だが、任意のコントロールとの組み合わせ（checkbox 群、複数入力の行）で破綻する。
> 3. Cross-root ARIA（Reference Target）— 仕様・実装が安定していないため前提にしない。

### 5.6 フォーム部品の DOM 方針

| 部品 | 内部の実体 | host の役割 |
|------|-----------|------------|
| input / textarea | ネイティブ `<input>` / `<textarea>` | FACE（値・検証）。`delegatesFocus: true` |
| checkbox / switch | ネイティブ `<input type=checkbox>`（スイッチは `role="switch"` を付与） | FACE（`checked` を値に）。`indeterminate` は checkbox のみ |
| radio-group | `role="radiogroup"` を internals で付与。子 `jimble-radio` は非 FACE | group が FACE。ロービングは group が管理（矢印キーで移動＝選択） |
| select | `role="combobox"` のボタン風 + ポップオーバーの `role="listbox"`（APG の select-only combobox） | FACE |

> **決定** `jimble-select` は**自前のリストボックス**（select-only combobox）にする。
> **理由** ドロップダウンメニューと見た目・挙動（位置、アニメーション、キーボード）を揃えられ、トークンで統一的に装飾できる。
> **比較した案** ネイティブ `<select>` をラップ — アクセシビリティとモバイル UI は最良だが、開いたリストの装飾ができない（`appearance: base-select` は現時点で全エンジンには無い）。**リスクが高いのは自前実装のほう**なので、M3 のスパイク（§15）で品質を評価し、不十分なら `native` 属性でネイティブ描画へ切り替える逃げ道を用意する。

---

## 6. オーバーレイの共通方針

### 6.1 ネイティブ機能の使い分け

| 部品 | 使うネイティブ機能 | 理由 |
|------|-------------------|------|
| **dialog**（モーダル） | `<dialog>` の `showModal()` | トップレイヤー、背面の `inert` 化、フォーカスの閉じ込めとブラウザ UI への抜け、Esc（`cancel`）が標準で得られる |
| **dropdown-menu**, **select** のリスト | Popover API `popover="auto"` | トップレイヤー、外側クリックと Esc での light dismiss、他の auto ポップオーバーの自動クローズ |
| **toast** の領域 | Popover API `popover="manual"` | 常時トップレイヤーに置き、他のオーバーレイの上に出す。自動では閉じない |
| app-shell の小画面ドロワー | `<dialog>`（モーダル）として実装 | フォーカス管理と背面 inert を標準に任せる |
| tooltip（P2 以降） | 別途設計 | `popover="hint"` は Chrome のみのため使わない |

**使わないもの**: `dialog` の `closedby` 属性、`popover="hint"`、`interestfor`、`appearance: base-select` — 全対象エンジンでの実装が揃っていないため（採用時に MDN / Baseline で再確認）。

> **決定** できる限りネイティブに任せ、自前のフォーカストラップや `z-index` 競争を持たない。
> **理由** フォーカス管理・inert・Esc・トップレイヤーの相互作用をすべて自前で正しく実装するのは難しく、ネイティブの方が支援技術との相性も良い。
> **比較した案** 全部自前（`role="dialog"` + フォーカストラップ + `z-index`）— 挙動を完全に制御できる代わりに、Shadow DOM 内でのフォーカストラップ（`querySelectorAll` が境界を越えない）が特に難しい。

### 6.2 重なり順

トップレイヤーの積み順は「**後から開いたものが上**」。

| 層 | 対象 | 方法 |
|----|------|------|
| 1（通常フロー） | 通常のコンテンツ | — |
| 2（sticky） | app-shell のヘッダー、テーブルの固定ヘッダー | `z-index: var(--jimble-z-sticky)` |
| 3（トップレイヤー） | popover（メニュー、セレクト）、モーダル dialog | 開いた順。ダイアログ内から開いたメニューは自然に上に出る |
| 4（常に最上位） | toast 領域 | 他のオーバーレイが開くたびに `hidePopover()` → `showPopover()` で**再昇格** |

- トップレイヤーの要素には `z-index` を使わない。`--jimble-z-*` は sticky など、トップレイヤー外だけ。
- **Toast とモーダルの関係（リスク R4）**: モーダル dialog が開くと、dialog の外は `inert` になり、**toast の live region が読み上げられなくなる**。対策として、`jimble-toast-region` は開いているモーダル dialog がある間、その `<dialog>` の中へ**自身を移動**し、閉じたら元に戻す。移動によるアナウンス欠落がないか、M3 のスパイクで検証する。

### 6.3 フォーカスの閉じ込めと戻し先

- **閉じ込め**: モーダル dialog はネイティブ（背面 inert）。それ以外のオーバーレイ（メニュー・セレクト）は非モーダルなので閉じ込めない（Tab で閉じる）。
- **開いた直後のフォーカス**:
  - dialog: 標準は「`autofocus` 属性を持つ要素 → なければ最初のフォーカス可能要素」。長い本文のときは見出しやパネル自体にフォーカスさせる（`initial-focus` 属性でセレクター指定可）。破壊的操作の確認ダイアログでは、既定を「キャンセル」側にするのを推奨。
  - メニュー: 最初の項目（ArrowUp で開いたら最後の項目）。
  - セレクト: 選択中の項目、なければ最初の項目。
- **戻し先**: `FocusReturnController` が**開く直前の `document.activeElement`（Shadow を再帰的にたどった深いアクティブ要素）**を記憶し、閉じたら戻す。戻し先が DOM から消えていたら、記録しておいたトリガー → なければ `document.body`。ネイティブの復帰処理に加えて明示的に行う（Shadow 越しや再描画で失われる場合があるため）。
- `focus()` は `preventScroll: true` を使わない（フォーカスされた要素が見えるように）。

### 6.4 閉じる処理

| 操作 | dialog | popover（メニュー/セレクト） |
|------|--------|---------------------------|
| Esc | `cancel` イベント → `jimble-close-request`（`reason: 'escape'`）を発火。`preventDefault()` されなければ閉じる | ネイティブの light dismiss（`toggle` を受けて `open` 同期） |
| 外側クリック | 背景（`::backdrop`）クリックで `reason: 'backdrop'`。**`pointerdown` と `pointerup` の両方が背景上のとき**だけ閉じる（テキスト選択のドラッグで閉じてしまうのを防ぐ） | ネイティブの light dismiss |
| Tab で外へ | — | メニュー: 閉じてフォーカスをトリガーの次へ。セレクト: 値を確定せず閉じる |
| 項目選択 | — | メニュー: 実行して閉じる（`reason: 'action'`） |
| プログラム | `hide()` | `hide()` |

- **確認付きで閉じたくない場合**（未保存の変更など）は、`jimble-close-request` を `preventDefault()` すれば閉じない。`static-backdrop` 属性で背景クリックによる閉じを無効にできる。
- **IME 変換中の Esc**: 変換のキャンセルでダイアログまで閉じないよう、`ImeController` が変換中を追跡し、変換中の `cancel` を抑止できるか検証する（ネイティブの close watcher を止められない場合の代替策は M3 のスパイクで決める）。
- **スクロールロック**: `<dialog>` は背面のスクロールを止めないため、`scroll-lock` が参照カウント式で `<html>` に `overflow: hidden` を設定し、スクロールバーが取っていた幅は `padding-right` で補う（当初の `scrollbar-gutter: stable` は、太いスクロールバーの環境で固定配置の基準が狭くなり、右端に付くドロワーの右に 15px の隙間が空くので、やめた。2026-09-29）。

### 6.5 状態の同期

`open` 属性/プロパティ ↔ ネイティブの状態（`dialog.open`、`popover` の表示）を**片方向に集約**する: 唯一の真実は `open` プロパティ。ネイティブ側の変化（`close`, `toggle` イベント）は `open` へ反映し、`jimble-open` / `jimble-close` を発火する。

### 6.6 位置計算ライブラリの比較と提案

メニューとセレクト（将来はコンボボックス、ツールチップ）のポップアップを、トリガーの近くに置き、画面端で反転・ずらし・サイズ制限する必要がある。

| 観点 | **@floating-ui/dom 1.8.0** | **ネイティブ CSS Anchor Positioning** | @popperjs/core 2.11.8 |
|------|--------------------------|-------------------------------------|-----------------------|
| サイズ(min+gz) | 約 8.2 KB | 0 KB（polyfill 不要） | 約 7 KB 級（未計測） |
| ライセンス | MIT | — | MIT |
| 更新状況 | 2026-07 リリース、活発 | ブラウザ機能。2026-01 に Baseline 入り | **2023-05 が最終**。同作者が Floating UI へ移行を案内 |
| 対応 | 全ブラウザ | Chrome/Edge 125+、Firefox 147+、Safari 26+（対象の最新 2 バージョンは全て該当。要 MDN で再確認） | 全ブラウザ |
| flip / shift / size / arrow | ミドルウェアで完備 | `position-try-fallbacks`、`anchor-size()` などで宣言的に可能 | flip / preventOverflow 等 |
| スクロール追従 | `autoUpdate`（ResizeObserver 等） | 自動（CSS のため） | `eventListeners` |
| Shadow DOM | 合成ツリーを考慮した offsetParent 計算あり | **anchor 名は tree-scoped。light DOM のトリガーを shadow 内のポップアップが参照できるか不確実**（R3） | 一部制約あり |
| 実装コスト | 低い（実績多数） | JS 不要で軽いが、上記の scope 問題と挙動差の検証が必要 | 低い |
| 仮想アンカー（クリック位置など） | あり | なし | あり |

> **提案** `@floating-ui/dom` を採用する。ただし `PositionController` という**薄い抽象**の裏に置き、ネイティブ anchor positioning への差し替えを可能にする。
> **理由** 8 KB で、Shadow DOM・スクロール・反転を確実に扱える。ネイティブ方式は魅力的だが、トリガーがスロット経由の light DOM で、ポップアップが Shadow 内にあるという構造で anchor 名が解決できるかが不確実（同一 root 内に anchor 用ラッパーを描画すれば回避できる可能性はある）。確実性を優先する。
> **代替** ネイティブ方式へ寄せる場合は、M3 の冒頭で「shadow 内のラッパー要素を anchor にする」スパイクを行い、成功すれば Floating UI を外して依存を 1 つ減らす。`PositionController` の API（`anchor`, `floating`, `placement`, `offset`, `flip`, `matchWidth`）は両方式で共通なので、コンポーネント側は無変更で済む。
> **不採用** Popper — 保守が止まっている。
> **M3 の結果（2026-09-29）** スパイクでネイティブ方式が 3 エンジン（Chromium / Firefox / WebKit）で動いたため、**Floating UI は採用しない**（依存は `lit` と `@lit/context` のまま）。
> - **同じ Shadow ツリー内のラッパー要素を anchor にする**方式は、位置指定・画面端での反転（`position-try-fallbacks`）とも動いた。
> - **light DOM のトリガーを、Shadow 内の popover から anchor 参照する方式は 3 エンジンとも動かない**（anchor 名はツリー単位）。そのため `dropdown-menu` は `<slot name="trigger">` を Shadow 内の `<span part="anchor">` で包んで anchor にし、`select` は内部のボタン自体を anchor にしている。
> - `PositionController` の抽象は作らなかった（CSS だけで済み、JavaScript の位置計算が無いため）。位置は各コンポーネントの `*.host.css` の `position-area` / `position-try-fallbacks` で決まる。
> - 制約: サブピクセルの調整や「ずらして収める（shift）」「最大サイズを計算する（size）」は行わない。`max-height` とスクロールで収める。Firefox 147 未満などの未対応ブラウザは対象外。

---

## 7. API の命名規約

### 7.1 大原則

| 対象 | 規約 |
|------|------|
| タグ名 | `jimble-` + kebab-case。複合部品の子も同接頭辞（`jimble-tab`, `jimble-menu-item`） |
| 属性 | kebab-case、小文字。真偽値は**属性の有無**（`disabled`、値は書かない）。列挙値は小文字 kebab（`variant="primary"`） |
| プロパティ | camelCase。属性と 1:1（`full-width` ↔ `fullWidth`）。真偽値の属性は `reflect: true` |
| 反映（reflect） | UI の状態を表し CSS の属性セレクターで使うもの（`disabled`, `open`, `loading`, `size`, `variant`）は reflect する。`value` は reflect しない（§5.1） |
| イベント | `jimble-` + kebab-case。過去形/現在形は下記。**バブルしない**（`composed: true`。ルーターのイベントだけバブル）。`detail` は型付き |
| スロット | kebab-case。既定スロット + 名前付き（`prefix`, `suffix`, `icon`, `header`, `footer`, `actions`, `trigger`） |
| part | kebab-case、**意味を表す名前**（Tailwind のクラスとは無関係）。ルートは必ず `base` |
| CSS 変数 | §4.2 |
| メソッド | camelCase の動詞（`show()`, `hide()`, `toggle()`, `focus()`, `reset()`） |

### 7.2 イベントの命名

- **ネイティブと同じ意味のもの**は、ネイティブと同名を使う。`input` / `change`（フォーム部品）、`click`（ボタン）、`invalid`。`jimble-input` のような重複イベントは作らない。
- **独自イベント**は次の型に統一する。

| 種別 | 名前 | cancelable | `detail` |
|------|------|-----------|----------|
| 開いた後 | `jimble-open` | いいえ | — |
| 閉じた後 | `jimble-close` | いいえ | `{ reason }` |
| 閉じる要求（閉じる前） | `jimble-close-request` | **はい** | `{ reason: 'escape' \| 'backdrop' \| 'action' \| 'outside' }` |
| 選択/変更（値を伴う独自操作） | `jimble-select`（メニュー項目実行）、`jimble-sort`（表の並べ替え）、`jimble-page-change`（ページ切替） | 必要に応じて | 操作に応じた型 |
| 閉じるボタン | `jimble-dismiss`（alert / toast の × 操作） | いいえ | — |

- 形式は「**`jimble-` + 名詞/動詞**」。`jimble-before-open` のような接頭語は作らず、`-request` を使う。
- イベントの型は `HTMLElementEventMap` に宣言して `addEventListener('jimble-close', e => e.detail.reason)` で補完が効くようにする。

### 7.3 全コンポーネント共通の属性

| 属性 | 型 | 既定 | 反映 | 適用先 | 意味 |
|------|-----|------|------|--------|------|
| `variant` | 列挙（部品ごと） | 部品ごと | ✓ | button, badge, alert, card, toast | 見た目/意味の選択肢。**未知の値は既定にフォールバックし、開発時に警告** |
| `size` | `sm`\|`md`\|`lg` | `md` | ✓ | button, input, textarea, select, checkbox, radio-group, switch, badge, pagination | 高さ・文字・余白。§4.3 の `--jimble-control-height-*` に対応 |
| `disabled` | boolean | false | ✓ | フォーム部品、button、menu-item、tab、pagination の項目 | 操作不可。フォーム部品は送信対象外・フォーカス不可 |
| `loading` | boolean | false | ✓ | button、table、card | 処理中。button は `aria-disabled`＋クリック無効（フォーカス維持）、`aria-busy` |
| `open` | boolean | false | ✓ | dialog, dropdown-menu, select, sidebar-nav（小画面） | 開閉。`show()`/`hide()`/`toggle()` も提供 |

- **`variant` の値の語彙**を揃える。

| 分類 | 値 | 適用先 |
|------|-----|--------|
| 強調度 | `primary` `secondary` `ghost` | button |
| 意味（トーン） | `neutral` `primary` `success` `warning` `danger` `info` | badge, alert, toast |
| 破壊的操作 | `danger` | button（強調度の語彙に追加） |

- `size` を持たない部品（card、dialog、table…）に `size` を付けても無視する。将来の追加に備え、属性名を他の意味で使わない。
- **ネイティブ属性との衝突**: `<input size>`（文字数幅）は `jimble-input` では**使わず**、`size` は sm/md/lg を意味する（ネイティブの `size` 相当が必要なら `width` 系は CSS 変数 `--jimble-input-width` で指定）。この逸脱は input の API 表に明記する（§13.2）。

### 7.4 part の命名

- ルート: `base`（全部品に必ず存在）。
- 共通語彙: `label`, `icon`, `prefix`, `suffix`, `spinner`, `input`, `panel`, `header`, `body`, `footer`, `actions`, `title`, `description`, `backdrop`, `item`, `indicator`, `close-button`。
- 部品固有: 状態は part で表さず、**`:state()` と属性**で表す。

```css
/* 利用者の例 */
jimble-button::part(base) { text-transform: none; }
jimble-input:state(invalid)::part(base) { background: #fff5f5; }
```

- **`exportparts` は自動では中継しない**。複合部品が子の part を公開する場合は、ドキュメントに明記して `exportparts` する（例: `jimble-pagination` が内部ボタンの `page` part を公開）。
- part は公開 API なので、追加は minor、名前変更・削除は breaking。

### 7.5 スロットの命名

| スロット | 用途 |
|---------|------|
| （既定） | 主内容 |
| `prefix` / `suffix` | 前後の装飾（アイコン、単位、ボタン） |
| `icon` | 主アイコン（button のアイコンのみ表示、alert のアイコン差し替え） |
| `header` / `footer` / `actions` | 領域（card、dialog、page-header） |
| `trigger` | 開閉の起点（dropdown-menu、dialog を宣言的に使う場合） |
| `label` / `hint` / `error` | field の文言（属性の代わりに HTML を入れたいとき） |

- スロットの既定内容（フォールバック）を持てる場合は持つ（例: alert の `icon` は variant に応じた既定アイコン）。
- 属性で渡せる文字列（`label`）と、スロットで渡せる HTML（`slot="label"`）が両方ある場合は、**スロットが優先**。

### 7.6 プロパティの型・公開範囲

- 公開プロパティにはすべて JSDoc（`@attr`、`@type` は不要で TS 型から）。`custom-elements.json` と API 表がこれから生成される。
- 内部状態は `#private` フィールド。`_underscore` の慣習は使わない。
- 配列/オブジェクトはプロパティ専用（属性からは渡せない）。属性でも渡したい場合は JSON 文字列ではなく、**子要素で宣言的に記述**する（`jimble-option` 等）。

---

## 8. i18n の仕組み

### 8.1 辞書の形式

```ts
// イメージ: src/i18n/messages.ts（日本語 = 既定・同梱）
export default {
  $locale: 'ja',
  'common.loading':        '読み込み中',
  'dialog.close':          '閉じる',
  'alert.dismiss':         '閉じる',
  'toast.dismiss':         '通知を閉じる',
  'pagination.label':      'ページネーション',
  'pagination.previous':   '前のページ',
  'pagination.next':       '次のページ',
  'pagination.page':       '{page} ページ目',
  'pagination.summary':    '{total} 件中 {from}〜{to} 件',
  'breadcrumb.label':      'パンくずリスト',
  'table.sortAscending':   '昇順で並べ替え',
  'select.noOptions':      '選択肢がありません',
  'validation.valueMissing':   'この項目は必須です',
  'validation.typeMismatch.email': 'メールアドレスの形式で入力してください',
  // …
} satisfies Messages
```

- キーは**フラットなドット区切り**の文字列。`Messages` 型（キーの集合）は日本語辞書から推論される。
- 値は **文字列（`{name}` プレースホルダー）** または **関数 `(params) => string`**。複数形・語順が複雑な言語（英語の "1 item / 2 items"）は関数形で書く。ICU MessageFormat のパーサーは持たない。
- 追加言語は `Partial<Messages>` を許す。**不足キーは日本語に落ちる**。開発時は不足キーを警告。
- `$locale` は BCP 47 タグ。`Intl`（日付・数値・複数形）の書式にも使う。

> **決定** 自前の軽量 i18n（フラット辞書 + `{param}` + 関数）。
> **理由** 必要なのは数十個の固定文言で、複雑な ICU は不要。サイズが数百バイトで済み、依存が増えない。型でキー漏れを検知できる。
> **比較した案**
> 1. `@lit/localize` 0.12.2（BSD-3, 最終リリース 2024-08, 0.x）— 抽出・XLIFF ツールが前提で、ランタイム/ビルドの二重設定が重い。更新も止まり気味。
> 2. `intl-messageformat`（ICU）— 表現力は高いが 10 KB 超で過剰。

### 8.2 切り替え方法

```ts
import { setLocale } from '@hidemikimura/jimble-ui/i18n'   // 個別 import
import en from '@hidemikimura/jimble-ui/locales/en'
setLocale(en)              // 以降、全コンポーネントが再描画される
```

```html
<!-- CDN -->
<script type="module">
  import { setLocale } from '.../dist/cdn/jimble-ui.js'
  import en from '.../dist/cdn/locales/en.js'
  setLocale(en)
</script>
```

- **グローバル切り替え**が基本（ページ内で言語が混在することは稀）。`setLocale` は内部の `EventTarget` に通知し、`LocalizeController` を持つ全要素が `requestUpdate()`。
- **部分的な文言の上書き**は `setMessages({ 'dialog.close': '×' })` で辞書にマージ。要素単位の上書きは、その部品の属性で行う（例: `close-label`）。
- **`<html lang>` は自動追従しない**。辞書が無い言語では意味がないため、明示的に設定させる。（利用者が同期したいときのための `syncHtmlLang` オプションは作らない）
- 日付・数値の書式は `Intl.*` に `messages.$locale` を渡す。

### 8.3 IME 変換中の Enter（と Esc・矢印）

> **決定** `ImeController` を用意し、`isComposing` と `keyCode === 229` の両方で「変換中」を判定する。Safari では `compositionend` の後に `keydown(Enter)` が来るため、`compositionend` から**次のタスクの終わりまで**は「変換中」扱いにする。
> **理由** 変換の確定 Enter をフォーム送信・項目選択・メニュー実行として誤処理する不具合は日本語入力の典型的な事故で、ブラウザ間の差（Safari のイベント順序）が原因。
> **比較した案** `event.isComposing` だけ — Safari で取りこぼす。

**適用先**（変換中は次を無効にする）

| 操作 | 対象 |
|------|------|
| Enter による暗黙の送信 | input |
| Enter による項目確定 / 実行 | select（リスト内での絞り込みが入る将来のコンボボックス含む）、dropdown-menu の先頭文字検索 |
| 先頭文字検索（typeahead） | select, dropdown-menu |
| Esc による閉じる | dialog、popover（検証項目、§6.4） |
| 矢印キーによる移動 | 変換候補選択と競合するテキスト入力内 |

**テスト**: Playwright は本物の IME を操作できないため、`compositionstart/update/end` と `keydown`（`isComposing`、`keyCode 229`）の**合成イベントによるテスト**を単体で行い、実機（macOS 日本語入力 × Chrome/Safari/Firefox、Windows MS-IME）の**手動チェックリスト**をリリース前に実施する（§11.7）。

---

## 9. アイコンの扱い

### 9.1 方針

- **内部で使う SVG（〜30 個程度）だけを同梱**する。汎用アイコンセットは同梱しない（サイズ・ライセンス表記・更新追従の負担を避ける）。
- 利用者は、任意のアイコンを **スロット**（`slot="icon"` / `prefix` / `suffix`）で `<svg>` として渡す。`currentColor` と `1em`/`size-4` でサイズが追従するよう、ホスト側で `::slotted(svg)` を整える。

### 9.2 内部アイコンの保持方法

```
icons/svg/*.svg  ──gen-icons──▶  src/icons/chevron-down.ts …（1 アイコン = 1 ファイル）
export const chevronDown = svg`<path d="…"/>`   // Lit の svg テンプレート
```

- 利用箇所は `renderIcon(chevronDown, { size: 'sm' })` のような関数で、`<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">…</svg>` に包む。
- **1 アイコン 1 モジュール**なのでツリーシェイクが効く（使うものだけがバンドルされる）。
- **装飾アイコンは `aria-hidden="true"`**。意味を持つ場合（alert の種別など）は、隣にテキストまたは `role="img"` + `aria-label`（辞書）を付ける。
- 想定する内部アイコン（P1）: chevron-{up,down,left,right}, check, x-mark, minus, exclamation-triangle, exclamation-circle, information-circle, check-circle, x-circle, bars-3, ellipsis-horizontal, magnifying-glass, arrow-up/down（並べ替え）, spinner（自前の SVG アニメーション）。

### 9.3 汎用アイコンセットの候補比較（内部用の元絵と、ドキュメント案内用）

| 観点 | **Heroicons 2.2.0** | Lucide 1.48.0 | Tabler Icons 3.48.0 | Phosphor 2.1.1 | Material Symbols |
|------|--------------------|---------------|---------------------|----------------|------------------|
| ライセンス | MIT | ISC | MIT | MIT | Apache-2.0 |
| 更新状況 | 最終 2024-11（停滞気味だが安定） | 2026-09、活発 | 2026-09、活発 | 最終 2024-03 | 2026-09、活発 |
| 規模 | 約 300 個 × 3 サイズ | 1,500+ | 5,000+ | 1,500+ × 6 ウェイト | 数千 × 可変 |
| スタイル | 24 outline / 20 solid / 16 micro | 24px ストローク（2px） | 24px ストローク | 複数ウェイト | 可変フォント/SVG |
| tailui との整合 | **同じ作者（Tailwind Labs）で見た目が一致** | 近い | やや異なる | 異なる | 異なる |
| 小さいサイズ | **16px の micro セットがあり、密な管理画面に適す** | 縮小して使う | 縮小して使う | 同左 | 可 |
| 個別 SVG の入手 | npm の `heroicons` に SVG あり | `lucide-static` | `@tabler/icons` | `@phosphor-icons/core` | `@material-symbols/svg-*` |

> **提案** **Heroicons v2 から必要な SVG だけを `icons/svg/` に vendor** する（MIT 表記を `icons/LICENSE-heroicons` と配布物の `THIRD_PARTY_LICENSES` に含める）。
> **理由** tailui と同じ系譜で見た目が揃い、16px の micro セットが密な UI に合う。内部用は 30 個程度なので「更新が止まっている」ことの実害がなく、逆に固定できることが利点。ライセンスが MIT で表記義務が軽い。
> **比較した案** Lucide — 更新は活発だが tailui と見た目が異なる（ストロークの太さと角の丸め）。**ドキュメントでは「アイコンは Lucide / Tabler など好きなものを `<svg slot="icon">` で渡せる」と例示する**。Material Symbols — 規模が大きく、内部用途には過剰。
> **要承認**（§0.5）。

---

## 10. ドキュメントサイトの構成と作り方

### 10.1 方針

> **決定** Vite の MPA として自作する。ページは Markdown、例は HTML ファイル、API 表は `custom-elements.json` から生成し、サイト自体を jimble-ui（app-shell / sidebar-nav / tabs …）で組む（**ドッグフーディング**）。
> **理由** 依頼が「自作のドキュメントサイト」。ライブラリのビルド（Vite）と同じ道具で動き、サイトの実装がそのまま総合テストになる。
> **比較した案** Astro 7 / Eleventy 3 / VitePress — 導入は速いが、Web Components を Shadow DOM のまま SSR するための追加設定が要る、あるいはサイトの独自 UI（3 タブの例ブロック）で結局カスタム実装になる。依頼の意図（自作）にも反する。

### 10.2 構成

```
site/
├─ vite.config.ts                … MPA。ライブラリは src/ を alias（ビルド前でも動く）
├─ src/
│   ├─ pages/
│   │   ├─ index.md               … トップ（概要、CDN の 1 行、インストール）
│   │   ├─ guide/*.md             … はじめに、テーマ、フォーム、i18n、アクセシビリティ、Tips
│   │   └─ components/<name>.md   … 部品ごとのページ（frontmatter に例の一覧）
│   ├─ examples/<name>/<例>.html   … **例は 1 ファイル = 1 例**（唯一の情報源）
│   ├─ components/                … サイト専用部品（`docs-` 接頭辞）
│   │   ├─ docs-example.ts        … 例ブロック（プレビュー/ソース + コピー）
│   │   ├─ docs-api-table.ts      … custom-elements.json から表を描画
│   │   └─ docs-token-table.ts    … tokens.json から表を描画
│   └─ plugins/                   … markdown → HTML、例の取り込み、Shiki でのハイライト
└─ public/
```

### 10.3 各部品ページの構成（テンプレート）

1. 概要（1〜2 文）と最小の例
2. 例（プレビュー/ソース/コピー）— 使い方の順に並べる
3. **API**（属性・プロパティ・スロット・イベント・part・CSS 変数・メソッド）— `custom-elements.json` から自動生成
4. **キーボード操作**（表）と**アクセシビリティ**（ロール、ラベル付けの注意）— 手書き
5. **スタイルのカスタマイズ**（CSS 変数 → `::part()` → スロットの順に例）

### 10.4 例ブロック（プレビュー / ソース / コピー）

- 例 `.html` を **Vite の `?raw`** で取り込み、**同じ文字列を** (a) プレビュー用にそのまま描画、(b) ソース表示用にビルド時に Shiki でハイライト、(c) コピー用のテキストとして使う。**情報源は 1 つ**なので表示とコードがずれない。
- UI は 3 項目: **プレビュー**、**ソース**、**コピー**。

> **決定** 「プレビュー」「ソース」だけを ARIA の **tabs パターン**（`jimble-tabs`）にし、「コピー」は同じ見た目の**ボタン**にする（タブバーの右端）。
> **理由** APG の tab は「対応するパネルを切り替える」もので、コピーはパネルを持たない操作。tab ロールで実装するとスクリーンリーダーに「タブ 3/3、パネルなし」と伝わり誤解を招く。見た目は同じにして、意味を正しく保つ。押下後は `aria-live="polite"` で「コピーしました」を通知する。
> **比較した案** 3 つとも tab にする（依頼文の文字どおり）— 実装は単純だが a11y が正しくない。

- **プレビューの描画方式**: 通常は**同一ドキュメント内**にそのまま描画（jimble 要素は Shadow DOM で隔離される）。`app-shell` や `dialog` のようにビューポート全体に依存する部品の例は `frame` 属性で **`<iframe srcdoc>` に隔離**して描画する。iframe 内でも同じライブラリを読み込む。
- **コード表示の言語**: HTML のみ（React などのラッパーを出さない方針に合わせる）。
- **ダウンロード可能な例**: 各例に「このページ単体で開く」リンク（`/examples/<name>/<例>.html` を単体ページとして配信）。

### 10.5 ビルドと配信

- `npm run dev:site` — HMR。共有シートの HMR（§2.5）でデザイン確認が速い。
- `npm run build:site` — 静的サイトを出力。GitHub Pages へ Actions でデプロイ（`pages.yml`）。
- 検索: 静的検索（Pagefind など）は M4 以降に検討。最初はサイドバーとページ内目次のみ。
- **すべての例に自動テストが付く**（§11.4）: 例を列挙して axe を回す。

---

## 11. テスト方針

### 11.1 層と道具

| 層 | 道具 | 対象 | 実行頻度 |
|----|------|------|---------|
| 単体（純ロジック） | Vitest（Node） | i18n、IME 判定、トークン生成、コントラスト計算、ユーティリティ | 常時 |
| **コンポーネント** | **Vitest Browser Mode**（プロバイダー `@vitest/browser-playwright`）× Chromium / Firefox / WebKit | 描画、属性↔プロパティ、イベント、キーボード操作、フォーム連携、フォーカス管理 | 常時 |
| **アクセシビリティ** | **axe-core**（ブラウザ内で `axe.run`）+ 手動 | 全コンポーネントの全状態・全例 | 常時 |
| E2E・ビジュアル | **Playwright Test** → ドキュメントサイトに対して | 複合フロー、キーボード導線、スクリーンショット比較 | PR とリリース |
| 型 | `vitest --typecheck`（expect-type） | 公開型（イベント `detail`、`HTMLElementTagNameMap`） | 常時 |
| パッケージ | `publint`、`@arethetypeswrong/cli` | `exports`、型の解決 | リリース前・CI |

- 現行版: Vitest 5.0 / Playwright 1.63 / axe-core 4.13（MPL-2.0、開発時のみ）。実装開始時に固定。

> **決定** コンポーネントテストは Vitest Browser Mode（実ブラウザ）で行い、jsdom / happy-dom は使わない。
> **理由** Shadow DOM の `adoptedStyleSheets`、`ElementInternals`、`<dialog>` / Popover API、フォーカス、`:state()` は、疑似 DOM ではほぼ動かないか挙動が違う。実ブラウザ 3 エンジンで検証するのが唯一信頼できる。
> **比較した案** Web Test Runner 1.0（`@web/test-runner`）— Web Components 向けの実績はあるが、Vitest と分けて 2 系統のテスト基盤を持つことになる。単体もブラウザも Vitest に一本化する方が保守が軽い。

### 11.2 コンポーネントテストの書き方

- 共通ヘルパー `mount(template)` で Lit の `render` をコンテナに行い、テスト後にクリーンアップ。
- 操作は Vitest のブラウザ `userEvent`（実キー入力に近い）を使う。
- **各コンポーネントで最低限**確認する項目（テンプレート化）:
  1. 既定の描画と ARIA（ロール、名前）
  2. 属性とプロパティの同期（reflect の有無）
  3. `disabled` / `loading` / `open` の状態遷移
  4. キーボード操作（APG の表どおり）
  5. イベント（名前、`detail`、`cancelable`、バブリング/`composed`）
  6. フォーム連携（FACE 部品のみ）: 値、`reset`、`fieldset[disabled]`、検証、暗黙の送信
  7. part / 変数のカスタマイズが効く（`getComputedStyle` で確認）
  8. 共有シートが効いている（`box-shadow` が `none` でない、§2.4）

### 11.3 アクセシビリティ

- **自動**: 各コンポーネントの各状態（通常・disabled・invalid・open…）で `axe.run(element, { runOnly: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] })` が違反 0。axe は Shadow DOM を横断する。
- **全例の一括検証**: `site/src/examples/**/*.html` を列挙し、各例をブラウザで描画して axe を回す。**例を追加すれば自動でテストが付く**。
- **キーボード**: 各部品のキーボード表（ドキュメントと同じデータ）から、テストを生成または手書き。
- **トークンのコントラスト契約**（§4.6）。
- **手動（リリース前）**: NVDA + Firefox（Windows）、VoiceOver + Safari（macOS）で P1 の主要操作を確認。200% ズーム/リフロー（320 px 幅）、強制色モード、`prefers-reduced-motion`。
- axe で見つからないもの（フォーカス順、読み上げ内容、IME）があるため、**自動 = 必要条件であって十分条件ではない**とドキュメントにも書く。

### 11.4 E2E・ビジュアル

- Playwright Test でドキュメントサイトを対象に、ダイアログ→メニュー→トースト等の**跨る操作**を検証（フォーカスの戻り先、重なり順、Esc の入れ子）。
- スクリーンショット比較（`toHaveScreenshot`）は **Linux の固定コンテナ**で基準画像を作る（OS 差の揺れを避ける）。対象は主要な部品の主要な状態のみ（数を絞る）。

### 11.5 サイズ・出力検査

`scripts/check-dist.ts`（§2.6）と `publint` / `attw` を CI で実行。CDN バンドルが実際に `<script type="module">` で読み込め、全タグが定義されることを Playwright で 1 本確認する。

### 11.6 CI の必須チェック

`lint` → `typecheck` → `test`（3 エンジン）→ `build` → `check-dist` → `publint/attw` → `e2e`（PR ではスモーク、main で全量）。すべて通らなければマージ不可。

### 11.7 手動チェックリスト（IME）

macOS（日本語入力）× Chrome/Safari/Firefox、Windows（MS-IME）× Chrome/Edge/Firefox で、input・select・dropdown-menu・dialog の「変換中の Enter / Esc / 矢印 / Space」を確認する表を `docs/manual-checks.md` に置く（実装時に作成）。

---

## 12. 開発フローの規約

### 12.1 lint / format

| 道具 | 用途 |
|------|------|
| **ESLint 10**（flat config）+ `typescript-eslint` + `eslint-plugin-lit` + `eslint-plugin-wc` | 構文・Lit/Web Components 固有のルール（`static properties` の不整合、`connectedCallback` の `super` 忘れ、属性名の規約など） |
| **Prettier 3** | 整形（Lit テンプレート内 HTML も整形） |
| `tsc --noEmit`（strict） | 型 |
| Stylelint はなし | CSS は Tailwind のクラスが中心で、手書き CSS は `hosts/*.css` の少量のため |

> **決定** ESLint + Prettier。
> **理由** Lit / Web Components 固有の lint ルール（`eslint-plugin-lit`、`eslint-plugin-wc`）が使える。
> **比較した案** Biome 2.5 — 高速で 1 ツールで済むが、Lit / Web Components 用のルールが無く、テンプレート内 HTML の整形も限定的。速度は本プロジェクトの規模では問題にならない。

独自ルール（ESLint のローカルルール or ビルド検査）:

- コンポーネント内に **生の色クラス**（`bg-indigo-600`、`#hex`）を書かない（トークン経由のみ）。
- クラス名の**動的組み立て**を検出（§2.2）。
- 公開プロパティに JSDoc が無いものを警告（ドキュメント生成のため）。

### 12.2 コミット規約

- **Conventional Commits**: `feat(button): loading 属性を追加` のように、`type(scope): 概要`。概要は日本語でよい。
  - type: `feat` / `fix` / `perf` / `refactor` / `docs` / `test` / `build` / `ci` / `chore` / `revert`。`!` または `BREAKING CHANGE:` で破壊的変更。
  - scope: コンポーネント名 or 領域（`button`, `tokens`, `i18n`, `site`, `build`）。
- `commitlint` + `lefthook`（コミット時に lint-staged 相当、commit-msg で検証）。
- ブランチ: main を保護、機能ブランチ → PR → squash merge（PR タイトルがコミットメッセージ＝CHANGELOG の元になる）。

### 12.3 バージョニングと CHANGELOG

- **SemVer**。公開 API の範囲 = タグ名、属性、プロパティ、メソッド、イベント名と `detail`、スロット名、part 名、公開 CSS 変数（`--jimble-*`、`--_` は除く）、`exports` のパス、辞書のキー。
- **破壊的 = major**（0.x の間は minor）。これらの**追加は minor**、バグ修正は patch。
- 見た目（余白・色の既定値）の変更は原則 minor、a11y の修正は patch。破壊的になる場合は major。
- **非推奨**: 1 つ前の minor で警告（開発時のコンソール）+ ドキュメントに記載し、次の major で削除。

> **決定** **release-please**（Conventional Commits から CHANGELOG とバージョンを自動生成し、リリース PR を作る）。
> **理由** コミット規約を導入するなら、変更履歴の二重記述を避けられる。個人〜少人数の開発で運用の手間が最小。
> **比較した案** Changesets 3.0 — 変更ごとに `.md` を書くため、利用者向けの文面を丁寧に書ける利点があるが、コミット規約とは別に運用が増える。**PR タイトルを利用者視点で書く**規律で release-please の弱点（コミット文が CHANGELOG になる）を補う。

### 12.4 npm 公開手順

1. main へマージ → release-please が「リリース PR」（バージョンと CHANGELOG 更新）を作成/更新。
2. リリース PR をマージ → タグと GitHub Release が作成される。
3. `release.yml` が起動: `npm ci` → lint/typecheck/test/build/check-dist/publint/attw → **`npm publish --provenance --access public`**。
4. 認証は npm の **Trusted Publishing（OIDC）** を推奨。使えない場合は Actions のシークレット `NPM_TOKEN`（自動化トークン、2FA 要件を満たす種別）。**トークンや認証の登録は利用者（あなた）が行う**。
5. 公開後: CDN（jsDelivr / unpkg）の反映確認、ドキュメントサイトのデプロイ（`pages.yml`）。
- `package.json`: `"files": ["dist", "custom-elements.json", "README.md", "LICENSE", "CHANGELOG.md", "THIRD_PARTY_LICENSES"]`、`"publishConfig": {"access": "public", "provenance": true}`、`"engines": {"node": ">=22"}`（開発用。利用側には要求しない）。
- CDN バンドルには Lit のライセンス（BSD-3-Clause）の表記をバナーに含める。

### 12.5 そのほか

- Node は 22 LTS を開発の基準に（Vite の要件も満たす）。`.nvmrc` を置く。
- 依存の更新は Renovate か Dependabot（週次、グルーピング）。Tailwind・Lit・Vite・Vitest の更新は**共有シート補正のテスト**が落ちないことを条件にする。
- 設計変更は `docs/adr/NNNN-*.md` に 1 判断 1 ファイルで追記し、本書は最新の状態を保つ（履歴は git）。

---

## 13. サンプル API 仕様（規約が機能するかの検証）

button と input を、上記の規約で書き下す。**この表の作成中に見つかった規約の穴は §13.4 にまとめ、本書へ反映した。**

### 13.1 `<jimble-button>`

**説明**: 操作の実行・ページ遷移に使うボタン。`href` があるとリンク（`<a>`）として描画する。
**内部 DOM**: `<button>`（`href` があれば `<a>`）を Shadow 内に持つ。`delegatesFocus`。

**属性 / プロパティ**

| 属性 | プロパティ | 型 | 既定 | 反映 | 説明 |
|------|-----------|-----|------|------|------|
| `variant` | `variant` | `primary` \| `secondary` \| `danger` \| `ghost` | `secondary` | ✓ | 見た目。主要操作は 1 画面 1 つを想定して `primary` を意識的に指定させる |
| `size` | `size` | `sm` \| `md` \| `lg` | `md` | ✓ | 高さ 32 / 36 / 40px |
| `type` | `type` | `button` \| `submit` \| `reset` | **`button`** | ✓ | ネイティブの既定（submit）と異なる。`submit`/`reset` は `form.requestSubmit()` / `form.reset()`（**`name`/`value` は送信されない**） |
| `disabled` | `disabled` | boolean | false | ✓ | 操作不可。フォーカス不可 |
| `loading` | `loading` | boolean | false | ✓ | 処理中。クリック無効・スピナー表示・`aria-busy="true"` + `aria-disabled="true"`、フォーカスは維持 |
| `href` | `href` | string | — | ✓ | 指定するとリンク描画（`<a>`）。`disabled` のときは `href` を外して `aria-disabled` |
| `target` / `rel` / `download` | 同名 | string | — | ✓ | `href` があるときのみ有効。`target="_blank"` なら `rel` に `noopener` を自動付与 |
| `icon-only` | `iconOnly` | boolean | false | ✓ | アイコンのみ（正方形）。**`aria-label` が無いと開発時に警告** |
| `block` | `block` | boolean | false | ✓ | 幅いっぱいに広げる |

**スロット**

| 名前 | 内容 |
|------|------|
| （既定） | ラベル |
| `prefix` | ラベルの前のアイコン/要素 |
| `suffix` | ラベルの後のアイコン/要素 |

**イベント**: 独自イベントなし。`click` はネイティブ。`disabled` / `loading` 中のクリックは capture 段階で `stopImmediatePropagation()` して外へ出さない。

**メソッド**: `focus(options?)` / `blur()` / `click()`。

**part**

| part | 対象 |
|------|------|
| `base` | 内部の `<button>` / `<a>` |
| `label` | ラベルを包む要素 |
| `prefix` / `suffix` | スロットを包む要素 |
| `spinner` | ローディングのスピナー |

**状態（`:state()`）**: `loading`, `disabled`, `icon-only`。

**CSS 変数**（公開。未指定なら括弧内へフォールバック）

| 変数 | 既定 | 説明 |
|------|------|------|
| `--jimble-button-radius` | `var(--jimble-radius-control)` | 角丸 |
| `--jimble-button-height` | サイズに応じた `--jimble-control-height-*` | 高さ（`min-height`） |
| `--jimble-button-padding-x` | サイズに応じる（sm 2.5 / md 3 / lg 4 単位） | 左右余白 |
| `--jimble-button-gap` | 1.5〜2 単位 | アイコンとラベルの間 |
| `--jimble-button-font-weight` | 600 | 太さ |
| `--jimble-button-bg` | variant に応じる（primary: `primary-600`） | 背景 |
| `--jimble-button-bg-hover` | variant に応じる（primary: `primary-500`） | hover 背景 |
| `--jimble-button-fg` | variant に応じる | 文字色 |
| `--jimble-button-ring` | variant に応じる（secondary: `ring`） | 枠（ring）の色 |

**variant の見た目（既定、tailui 準拠）**

| variant | 背景 | 文字 | 枠 / 影 |
|---------|------|------|--------|
| `primary` | `primary-600`（hover `primary-500`） | `text-on-primary` | `shadow-sm` |
| `secondary` | `surface`（hover `surface-muted`） | `text` | `shadow-sm` + `ring-1 ring-inset ring-ring` |
| `danger` | `danger-600`（hover **`danger-700`**。`danger-500` は白文字で 4.5:1 に届かないため） | `text-on-primary` | `shadow-sm` |
| `ghost` | 透明（hover `surface-sunken`） | `text` | なし |

**アクセシビリティ / キーボード**

| 項目 | 内容 |
|------|------|
| ロール | ネイティブ `button` / `link` |
| キー | Enter / Space で実行（ネイティブ）。リンク時は Enter のみ |
| フォーカス | `:focus-visible` で `ring-2 ring-inset ring-ring-focus`、強制色モードでは `outline` |
| 名前 | ラベルテキスト。`icon-only` は `aria-label` 必須 |
| ターゲットサイズ | sm でも 32px（WCAG 2.5.8 の 24px 以上） |

**使用例**

```html
<jimble-button variant="primary" type="submit">保存</jimble-button>
<jimble-button variant="danger" size="sm">
  <svg slot="prefix" …></svg>削除
</jimble-button>
<jimble-button icon-only aria-label="設定" href="/settings"><svg slot="prefix" …></svg></jimble-button>
```

```css
jimble-button.brand { --jimble-button-bg: #0d9488; --jimble-button-bg-hover: #14b8a6; }
jimble-button::part(label) { letter-spacing: .02em; }
```

### 13.2 `<jimble-input>`

**説明**: 1 行のテキスト入力。フォーム関連カスタム要素（FACE）。
**内部 DOM**: ラッパー（`base`）の中にネイティブ `<input>`。`delegatesFocus`。

**属性 / プロパティ**

| 属性 | プロパティ | 型 | 既定 | 反映 | 説明 |
|------|-----------|-----|------|------|------|
| `type` | `type` | `text` \| `email` \| `password` \| `search` \| `tel` \| `url` \| `number` | `text` | ✓ | 日付系は P1 の対象外（ネイティブ `type=date` を別途検討） |
| `name` | `name` | string | — | ✓ | フォーム送信名 |
| `value` | `value` | string | `""` | ✗ | 属性=デフォルト値、プロパティ=現在値（§5.1） |
| `placeholder` | `placeholder` | string | — | ✓ | 4.5:1 のトークンで描画 |
| `size` | `size` | `sm` \| `md` \| `lg` | `md` | ✓ | **ネイティブの `size`（文字数幅）とは別**。幅は `--jimble-input-width` |
| `disabled` | `disabled` | boolean | false | ✓ | |
| `readonly` | `readonly` | boolean | false | ✓ | 送信対象・フォーカス可・変更不可 |
| `required` | `required` | boolean | false | ✓ | |
| `minlength` / `maxlength` | 同名 | number | — | ✓ | |
| `min` / `max` / `step` | 同名 | number \| string | — | ✓ | `type=number` |
| `pattern` | `pattern` | string | — | ✓ | |
| `autocomplete` | `autocomplete` | string | — | ✓ | WCAG 1.3.5 のため、氏名・住所・メール等では指定を推奨 |
| `inputmode` / `enterkeyhint` | 同名 | string | — | ✓ | |
| `spellcheck` | `spellcheck` | boolean | — | ✓ | |
| `autofocus` | `autofocus` | boolean | false | ✓ | |
| `invalid` | `invalid` | boolean | false | ✓（読み取り専用） | 検証の結果（touched 後）。外部から強制設定はしない |

**その他プロパティ（読み取り）**: `validity`, `validationMessage`, `willValidate`, `form`, `labels`, `valueAsNumber`, `selectionStart/End`。

**スロット**

| 名前 | 内容 |
|------|------|
| `prefix` | 入力欄の前のアイコン/単位（例: `¥`、検索アイコン） |
| `suffix` | 入力欄の後の要素（例: 単位、クリアボタン） |

**イベント**

| イベント | 発火元 | 説明 |
|---------|-------|------|
| `input` | ネイティブ（composed、target は host に再ターゲット） | 入力のたび |
| `change` | host（内部の `change` を **bubbles + composed で再発火**） | blur/確定時 |
| `invalid` | host | 検証失敗（`reportValidity()` や送信時） |
| `focus` / `blur` / `focusin` / `focusout` | ネイティブ | |

独自イベントなし（ネイティブと同義のものは同名を使う、§7.2）。

**メソッド**: `focus(options?)`, `blur()`, `select()`, `setSelectionRange(start, end, direction?)`, `checkValidity()`, `reportValidity()`, `setCustomValidity(message)`。

**part**

| part | 対象 |
|------|------|
| `base` | 枠（ring）を持つラッパー |
| `input` | 内部の `<input>` |
| `prefix` / `suffix` | スロットを包む要素 |

**状態（`:state()`）**: `invalid`, `touched`, `disabled`, `readonly`, `focused`。

**CSS 変数**

| 変数 | 既定 | 説明 |
|------|------|------|
| `--jimble-input-radius` | `var(--jimble-radius-control)` | 角丸 |
| `--jimble-input-height` | サイズに応じた `--jimble-control-height-*` | 高さ |
| `--jimble-input-padding-x` | sm 2.5 / md 3 / lg 3.5 単位 | 左右余白 |
| `--jimble-input-width` | `100%` | 幅（host は `display:block`） |
| `--jimble-input-bg` | `var(--jimble-color-surface)` | 背景 |
| `--jimble-input-fg` | `var(--jimble-color-text)` | 文字色 |
| `--jimble-input-ring` | `var(--jimble-color-ring-control)` | 枠の色（§4.6） |
| `--jimble-input-ring-focus` | `var(--jimble-color-ring-focus)` | フォーカス時の枠の色 |
| `--jimble-input-ring-invalid` | `var(--jimble-color-ring-invalid)` | エラー時の枠の色 |
| `--jimble-input-placeholder` | `var(--jimble-color-text-placeholder)` | プレースホルダーの色 |

**フォーム連携**

| 項目 | 内容 |
|------|------|
| 値 | `internals.setFormValue(value)`。`name` が無ければ送信されない |
| 検証 | 内部 `<input>` の `validity` を `setValidity` に反映。メッセージは辞書（`validation.*`） |
| リセット | `value` 属性へ戻す。touched を解除 |
| disabled | `disabled` 属性 ∥ 祖先 `fieldset[disabled]` |
| 暗黙の送信 | Enter（変換中を除く）で `form.requestSubmit()` |
| ラベル | `jimble-field` または外側 `<label for>`（`internals.labels`）から名前を取得して内部 `<input>` に反映（§5.5） |

**アクセシビリティ / キーボード**

| 項目 | 内容 |
|------|------|
| ロール | 内部ネイティブ `textbox`（`type` に応じて `searchbox` など） |
| キー | ネイティブに従う。Enter は暗黙の送信。IME 変換中は送信しない |
| 状態 | `aria-invalid`、`aria-required`（`required`）、`aria-describedby`（ヒント/エラーのミラー） |
| フォーカス | `:focus-within` でなく内部 `<input>` の `:focus-visible` に連動し、`base` にリングを描く |

**使用例**

```html
<jimble-field label="メールアドレス" hint="社用アドレスを入力してください" required>
  <jimble-input type="email" name="email" autocomplete="email">
    <span slot="prefix">@</span>
  </jimble-input>
</jimble-field>
```

```css
jimble-input { --jimble-input-width: 20rem; }
jimble-input::part(input) { font-variant-numeric: tabular-nums; }
jimble-input:state(invalid)::part(base) { background: var(--jimble-color-danger-50); }
```

### 13.3 規約が機能した点

- 共通属性（`variant` / `size` / `disabled` / `loading`）と part（`base` を必ず持つ、`prefix` / `suffix`）、イベント（ネイティブ優先、独自は `jimble-` + `-request`）、CSS 変数（`--jimble-{component}-{property}` + フォールバック）が、2 つのまったく性質の違う部品（操作系とフォーム系）に**無理なく当てはまった**。
- CSS 変数は「公開変数 → 内部で `--_bg` に受ける → ユーティリティが `--_bg` を使う」という一貫したパターンで書ける（`bg-(--_bg)` のような Tailwind の任意値構文。`[--_bg:var(--jimble-button-bg,var(--jimble-color-primary-600))]` を variant ごとの対応表に持つ）。

### 13.4 サンプルを書いて見つかった規約の穴（本書に反映済み）

| # | 穴 | 反映先 |
|---|----|--------|
| G1 | ネイティブの `<input size>` と共通属性 `size` が衝突する | §7.3 に「逸脱は API 表に明記」、input の `size` は sm/md/lg、幅は `--jimble-input-width` |
| G2 | button の `type` の既定がネイティブ（submit）と逆 | §14 Q5 で確認事項に、API 表に明記 |
| G3 | フォーム関連要素は送信ボタンになれず `name/value` が送信できない | F7 / §5.4 |
| G4 | `value` 属性の意味（デフォルト値）とプロパティ（現在値）の分離 | §5.1 |
| G5 | ネイティブイベントと同義のものを `jimble-*` にすると二重になる | §7.2「ネイティブと同義は同名」 |
| G6 | 状態（invalid など）を part では表せない | §7.4 `:state()` を状態の公開手段に |
| G7 | 小さいサイズのアイコンのみボタンで `aria-label` 忘れが起きやすい | `warn()` による開発時警告（§3.2） |
| G8 | ラベル/ヒント/エラーの IDREF が Shadow 境界をまたげない | §5.5 ミラーリング |

---

## 14. 確認事項と決定

設計時点で答えが出せなかったもの。**Q1〜Q8 はすべて「私の推奨」どおりに決定（2026-09-29）。**

| # | 質問 | 決定（推奨どおり） |
|---|------|------------------|
| Q1 | 既定サイズ md の高さ | **36px**（sm 32 / md 36 / lg 40）。「約 36〜40」の下限。40px のほうが操作しやすいが、密度は下がる。`--jimble-control-height-md` で利用者が変更できる |
| Q2 | ドキュメントと README の言語 | サイトは日本語を先に、英語は後追い。README は日本語＋簡単な英語。CHANGELOG は日本語（release-please が生成する見出しは英語）でよいか |
| Q3 | 入力欄の枠を濃くする（§4.6） | AA 準拠を優先。tailui より締まって見える。見た目を優先する場合は利用者側の上書きに任せる |
| Q4 | `jimble-select` は自前リストボックス（§5.6） | 自前。品質不足ならネイティブ `<select>` 描画への逃げ道（`native` 属性）を用意する |
| Q5 | `jimble-button` の既定 `type` | **`button`**（ネイティブは `submit`）。誤送信を避けるため。素の HTML 利用者に周知する |
| Q6 | 位置計算に Floating UI を採用（§6.6） | 採用（承認済み）→ **ただし M3 のスパイクでネイティブ方式が 3 エンジンで動いたため、承認の条件どおり Floating UI は外した** |
| Q7 | アイコンを Heroicons から vendor（§9.3） | 採用 |
| Q8 | 0.x の間のバージョニング | 0.x は **minor が破壊的変更を含み得る**。API が固まった段階（P1 完了＋フィードバック後）で 1.0.0 |

---

## 15. リスクと事前スパイク

「実装に入ってから設計が崩れる」可能性が高いものを、対応するマイルストーンの冒頭で先に検証する。いずれも**設計変更が起きうる**ので、結果は ADR に残す。

| # | リスク | 検証内容 | 失敗時の代替 |
|---|--------|---------|-------------|
| R1 | 共有シートで `shadow-sm ring-1` が効かない（F1） | 補正プラグインの出力を 3 エンジンでテスト | ring/shadow を `box-shadow` の生値で書く |
| R2 | FACE のラベル/エラー連携（F6） | field ↔ input のミラー方式で NVDA / VoiceOver の読み上げ確認 | `ariaLabelledByElements` の機能検出採用、あるいは各コントロールが label を持つ |
| R3 | ネイティブ anchor positioning が shadow 越しに使えるか（F5） | 同一 root 内ラッパー要素を anchor にする構造で検証 | Floating UI を維持（既定） ｜ **解決（M3）**: 同一 Shadow ツリー内のラッパーを anchor にする方式が 3 エンジンで動く。light DOM の anchor は不可 |
| R4 | モーダル dialog の中で toast が読み上げられない | toast 領域を dialog 内へ移動する方式の検証 | dialog 内専用の toast API（`dialog.toast()`）を追加 ｜ **解決（M3）**: 領域を開いているモーダルの中へ移動する方式で、3 エンジンとも操作でき、Chromium の実アクセシビリティツリーにも出る |
| R5 | **table の構造を Shadow DOM で成立させる** | カスタム要素に `role=table/row/cell` と `display: table*` を与える方式で、sticky ヘッダー・横スクロール・並べ替えが動くか | データ駆動（`columns`/`rows` プロパティ）で Shadow 内に `<table>` を描画（宣言的な HTML 記述を犠牲にする） ｜ **解決（M4）**: 第一案（カスタム要素 + `ElementInternals` のロール + `display: table*`）が 3 エンジンで動く。データ駆動へのフォールバックは不要 |
| R6 | IME 変換中の Esc がダイアログを閉じる | close watcher を止められるか | 変換中は `cancel` を受けても再度 `showModal` するなどの回避 ｜ **対策済み（M3）**: Chromium で変換中の Esc がダイアログを閉じることを確認。`cancel` を変換中だけ `preventDefault()` して防止 |
| R7 | 自前 select の品質（Q4） | APG の select-only combobox の全キー操作と読み上げ | ネイティブ `<select>` 描画（`native`） ｜ **解決（M3）**: 自前のリストボックスで APG のキー操作を実装。ネイティブ描画への逃げ道（`native`）は今のところ不要 |
| R8 | Tailwind / Vite の大型更新（Vite 8 は Rolldown 化、Tailwind は 4.x で出力が変わりうる） | 依存更新の PR で R1 のテストが落ちれば検知 | 固定バージョン運用 |

**table の補足（R5）**: `<table>` を Shadow DOM の外側（light DOM）に置くと、セル要素へ外部から Shadow の CSS が届かない。そのため P1 では `jimble-table`（`role="table"`）・`jimble-table-row`（`role="row"`）・`jimble-table-cell`（`role="cell"`）・`jimble-table-head-cell`（`role="columnheader"`、`sort` 属性 ↔ `aria-sort`）などのカスタム要素を、`:host { display: table-cell }` 等で表レイアウトにする方式を第一案とする（Spectrum Web Components の表と同じ発想）。ネイティブ `<table>` より支援技術での堅牢性は下がるため、R5 の検証で決める。`description-list` も同様に `role="term"` / `role="definition"` を使うカスタム要素で構成する。

---

## 16. マイルストーン（承認後）

| M | 内容 | 完了条件 |
|---|------|---------|
| **M0** ✅ | 土台: リポジトリ初期化、Vite/Tailwind/TS/lint/CI、共有シート + 補正、トークン生成、**R1 スパイク** | 空の `jimble-button` が 3 エンジンで `shadow-sm ring-1` を描画。CI が緑 |

**M0 実施結果（2026-09-29）**

- R1 は**解決**。`build/postcss-shadow-fix.ts` で補正すると、Chromium / Firefox / WebKit で `shadow-sm` + `ring-1 ring-inset` が効く。補正を外すと 2 エンジンでテストが落ちる（F1 が実在し、テストが検知できることを確認済み）。
- 実測: 共有シート（CSS）約 16.5 KB（min）。CDN バンドル 10.3 KB gz（Lit を含む）。個別 import 用の共有チャンク 4.4 KB gz。§2.6 の予算内。
- トークンは `tokens/tokens.json` → `scripts/gen-tokens.ts` で生成済み（`@theme inline` + `var()` フォールバック方式、F2 の上書きもテストで確認）。
- 設計からの小さな変更: `hosts/*.css` の自動束ねはやめ、`src/styles/hosts.css` で手書き `@import`（コンポーネント数が少ないうちは自動化の利益が小さい）。
- `jimble-button` は基盤検証用の最小実装（variant / size / type / disabled / block）。`loading` / `href` / `icon-only` は M1。
- 未実施（M0 の範囲外）: release-please・公開ワークフロー、`custom-elements.json` 生成、ドキュメントサイト。
| **M1** ✅ | 基底: `JimbleElement`、コントローラー、i18n、`button` / `badge` / `card` / `alert`、ドキュメントサイトの骨格（例ブロック、API 表） | サイトに 4 部品のページ。全例が axe 0 件 |

**M1 実施結果（2026-09-29）**

- 実装: `JimbleElement`（`t()` / `uid()` / `internals` / `setState()` / `emit()` / `warn()`）、`LocalizeController`、`SlotController`、i18n（`setLocale` / `setMessages`、`ja` 同梱・`en` 追加）、内部アイコン生成（Heroicons 20/solid を vendor、`npm run gen:icons`）、`jimble-button`（§13.1 の仕様どおり）、`badge`、`card`、`alert`。
- ドキュメントサイト（`site/`）: Markdown → 静的 HTML、例ブロック（プレビュー / ソース / コピー）、API 表（`custom-elements.json`）、トークン表。例は `site/examples/**/*.html` の 1 ファイルが唯一の情報源。
- テスト: 単体 + 3 エンジンのコンポーネントテスト 260 件、Playwright E2E 37 件（2 件は Chromium のみ）。トークンのコントラスト契約（27 ペア）と、全例・全ページの axe が緑。
- 実測: CDN バンドル 15.7 KB gz（Lit・4 部品・i18n を含む）、最大の共有チャンク（共有シート + 基底）6.1 KB gz。
- **テストが見つけた不具合**（いずれも修正済み）: (1) `sideEffects` が `dist` しか列挙しておらず、`src` を参照するドキュメントサイトでライブラリがツリーシェイクで消えた → `./src/**` を追加。(2) 私が書いた「カスタマイズ」の例（`#0d9488` に白文字）が 3.74:1 で AA 未達 → 例とガイドの色を修正。(3) ドキュメントの見出し飛び・同名リージョン・シンタックスハイライトの低コントラスト → 修正（高コントラストテーマ `github-light-high-contrast`）。
- 設計からの変更:
  - `alert` は `open` ではなく **`dismissible`** で閉じるボタンを出す（`open` の既定値 false と「表示中」の意味が逆になるため）。閉じると host に `hidden` が付く。`variant` は `info`（既定）/ `success` / `warning` / `danger`（`neutral` は無し）。
  - `--jimble-button-shadow` は公開変数から外した（Tailwind の `shadow-*` は合成変数を使うため、任意の値を安全に受けられない）。影が不要なら `ghost` を使うか `::part(base)` で `box-shadow` を上書きする。
  - `custom-elements.json` は git 管理外の生成物（`prebuild` で生成）。`define()` 経由の登録はアナライザーが認識しないため、各クラスに JSDoc `@tag` を付ける。
  - ドキュメントの例ブロックのタブは、`jimble-tabs`（M4）ができるまでは docs 専用の実装（同じ ARIA tabs パターン）。M4 で置き換える。
  - `frame`（iframe 隔離）は未実装。`app-shell` / `dialog` の例が必要になる M3〜M4 で追加する。
  - Safari は既定でタブキーがリンクにフォーカスしないため、E2E のスキップリンク検証は `focus()` してから行う。
| **M2** ✅ | フォーム: FACE 基底、`input` / `textarea` / `checkbox` / `radio-group` / `switch` / `field`、**R2 スパイク**、IME | フォーム送信・reset・fieldset disabled・IME のテストが緑 |

**M2 実施結果（2026-09-29）**

- 実装: `JimbleFormElement`（値・検証・reset・disabled・状態復元・field 連携）、`ImeController`、`FieldControlController`（`@lit/context`）、`input` / `textarea` / `checkbox` / `switch` / `radio-group`（+ `radio`）/ `field`、検証メッセージの辞書（日本語・英語）。ドキュメントに「フォームとの連携」ガイドと 6 コンポーネントのページ。
- **R2 は解決**: field のラベルが名前、ヒントとエラーが説明になる（文字列を渡して部品の Shadow 内に写す方式）。Playwright の `toHaveAccessibleName` / `toHaveAccessibleDescription` で Chromium / Firefox / WebKit の実計算を確認。ラジオのロールは Chromium の実アクセシビリティツリー（CDP）で確認。NVDA / VoiceOver での読み上げは [manual-checks.md](manual-checks.md) の手動項目。
- IME: 変換中の Enter は送信しない。`isComposing` / `keyCode 229` / `compositionend` 直後の 3 つで判定し、合成イベントでテスト（Safari 型を含む）。実機は手動チェックリスト。
- テスト: ブラウザ 3 エンジン × 単体・コンポーネント・全例の axe で 527 件、E2E 77 件（4 件は Chromium のみ）。
- 実測: CDN バンドル 24.4 KB gz（Lit・`@lit/context`・11 部品・i18n）、最大の共有チャンク 7.1 KB gz。
- 設計からの変更:
  - フォーム基底は mixin（`FormAssociated(Base)`）ではなく **通常の継承**（`JimbleFormElement`、その下に `JimbleTextControl` / `JimbleToggleControl`）にした。mixin が返すクラス式は `#private` を持てず（TS4094）、型定義の出力が壊れるため。
  - Enter による送信は、ネイティブと同じく**既定動作として、イベント配信の後**に行う（祖先の `keydown` の `preventDefault()` で止められる）。`jimble-button` の submit/reset も同じ方針（M1 で対応済み）。
  - checkbox / radio / switch のフォーカスは、ring ではなく **`outline`（offset 2px）**で描く。チェック時の背景（primary-600）とフォーカスリングの色が同じになり、リングが見えなくなるため。強制色モードでも有効。
  - `spellcheck` / `autofocus` 属性は M2 では未対応（ネイティブの `autofocus` は host に対して動かない場合がある）。
  - checkbox / switch / radio の色の CSS 変数（`--jimble-checkbox-*` など）は M2 では公開していない。トークン（`--jimble-color-primary-*`、`--jimble-color-ring-control`）で変える。
  - ラジオの選択状態は `ElementInternals` の `ariaChecked` で持つ（host の属性は汚さない）。Playwright の `getByRole` は internals を見ないので、E2E は CDP で確認する。
- テスト基盤の教訓: ブラウザテストのファイルを同じブラウザで並列に走らせると、Firefox でキー入力が不安定になった（キー入力はフォーカスのあるページにしか届かない）。ブラウザプロジェクトは `fileParallelism: false` にした。
| **M3** ✅ | オーバーレイ: `dialog` / `dropdown-menu` / `select` / `toast`、**R3 / R4 / R6 / R7 スパイク**、`PositionController` | 入れ子（ダイアログ内メニュー、メニューから toast）の E2E が緑 |

**M3 実施結果（2026-09-29）**

- 実装: `dialog`（ネイティブ `<dialog>` の `showModal()`）、`dropdown-menu`（+ `menu-item` / `menu-separator`）、`select`（+ `option`）、`toast`（`toast()` 関数 + `jimble-toast` + `jimble-toast-region`）。共通部品として `modal-stack`（開いているモーダルの重なり）、`scroll-lock`（参照カウント式）、`typeahead`、`focus`（深いアクティブ要素・フォーカスの復帰）。素の HTML 向けに、CDN バンドルが `globalThis.JimbleUI`（`toast`、`setLocale` ほか）を置く。
- **スパイクの結果（実装前に 3 エンジンで検証）**: (R3) ネイティブ anchor positioning は同一ツリー内の anchor なら動き、light DOM の anchor は動かない。(R4) モーダルの外にある toast の領域は inert（操作 0 回）、`<dialog>` の中へ移すと操作できる。(R6) Chromium で IME の変換中に Esc を押すと `cancel` が発火してダイアログが閉じる → `cancel` を `preventDefault()` すれば防げる。
- テスト: 単体 + 3 エンジンのブラウザテストで 800 件（例・全部品の axe を含む）、E2E 122 件（4 件は Chromium のみ）。実操作: ダイアログ（Esc・背景クリック・フォーカス復帰・alertdialog・フォーム入り）、メニュー（キーボード・位置）、セレクト（キーボード・フォーム値）、通知（モーダル内で押せる・Chromium の実アクセシビリティツリー）。
- 実測: CDN バンドル 31.3 KB gz（Lit・`@lit/context`・16 部品・i18n・`toast()` を含む）、最大の共有チャンク 8.1 KB gz。
- **テストが見つけた不具合（修正済み）**:
  1. `toast()` がリージョンを `document.querySelector` で探していたため、リージョンがモーダルの中（Shadow DOM の内側）へ移ると見つからず、**2 つ目が作られていた** → 参照を共通に保持。
  2. モーダルを開いたあとの**最初の**通知で、リージョンが `<body>` に作られたまま（モーダルの中へ移動しない）だった → 接続時にも移動する。
  3. リージョンを移動するとポップオーバーの表示状態が失われ、通知が見えなくなった → 接続のたびに再表示する。
  4. メニューを Tab で閉じるとき、まだ表示中の項目（roving の `tabindex=0`）へ Firefox の Tab が移り、フォーカスが失われた → 閉じる処理でポップオーバーを同期的に隠す。開閉の通知は 1 回だけにする。
  5. 単発の先頭文字検索が「現在の項目自身」に当たっていた → 現在の次から探す（ネイティブの `<select>` と同じ）。
  6. `select` の `role=button` に `aria-required` を付けていた（axe の critical）→ 外し、必須は読み上げ用のラベルに含める。
  7. `data-dialog-close` が `jimble-button` の内側のクリックを拾えなかった → `event.target` を使う。
- 設計からの変更:
  - **Floating UI を採用しない**（§6.6）。`PositionController` は作らない。
  - `select` の一覧は **フォーカスを選択肢へ移す**方式（APG の collapsible dropdown listbox）。`aria-activedescendant` は、選択肢が light DOM にあり ID が Shadow 境界をまたげないため使えない。ボタンの名前は `aria-labelledby`（同じ root の「ラベル」と「現在の値」）で組み立てる。
  - トリガーがポップアップを開くことは、`jimble-button` の `haspopup` / `expanded` プロパティで内部のボタンへ渡す（host に `aria-expanded` を付けると axe が指摘するため）。それ以外の要素には属性を付ける。
  - ダイアログの名前は `heading` 属性 / `title` スロット（同じ root の `h2` を `aria-labelledby` で参照）/ `aria-label`。宣言的に閉じるため `data-dialog-close` を用意した。
  - Toast の通知領域は `role="status"` と `role="alert"` のライブリージョンを、通知が来る前から表示状態で持つ（空でも常に表示）。danger と操作付きの通知は自動では消えない。
- テスト基盤の教訓: macOS の Firefox / Safari は、既定ではボタンやリンクに Tab で止まらない（Tab の移動先は必ずテキスト入力にする）。`page.viewport()` は Firefox / WebKit で安定しないので、ビューポートに依存しない期待値にする。Playwright の `getByRole` は ElementInternals のロールと、Shadow 内の `<dialog>` 配下にスロットされた内容を見ないので、ホストから探すか CDP を使う。
| **M4** ✅ | レイアウトとデータ: `app-shell` / `sidebar-nav` / `page-header` / `tabs` / `breadcrumb` / `pagination` / `table`（**R5**）/ `description-list` | 管理画面のサンプルページが組める |

**M4 実施結果（2026-09-29）**

- 実装: `app-shell`、`sidebar-nav`（+ `nav-item` / `nav-group`）、`page-header`、`tabs`（+ `tab` / `tab-panel`）、`breadcrumb`（+ `item`）、`pagination`、`table`（+ `header` / `body` / `row` / `head-cell` / `cell`）、`description-list`（+ `item`）。これで **P1 の 22 コンポーネントがそろった**。
- **R5（表）は第一案で解決**（実装前に 3 エンジンでスパイク）: カスタム要素が `ElementInternals` で表のロールを持ち、`display: table*` でレイアウトする方式。列位置が行をまたいでそろう、縦横にスクロールできる、固定ヘッダー（`position: sticky`）がスクロールしても残る、Chromium の実アクセシビリティツリーに `table` / `rowgroup` / `row` / `columnheader` / `cell` / `rowheader` が出る、までを確認。制約: `colspan` / `rowspan` は使えない。
- テスト: 単体 + 3 エンジンのブラウザテストで 1046 件、E2E 190 件（8 件は Chromium のみ）。実操作: 広い/狭い画面での app-shell（サイドバー/ドロワー・Esc・背景クリック・幅の切り替え・スキップリンク・固定ヘッダーにフォーカスが隠れない）、表の実アクセシビリティツリーと並べ替え、タブの矢印キー、ページネーション、パンくず、ナビ、説明リストの広い/狭い画面での配置。
- 実測: CDN バンドル 39.2 KB gz（22 部品 + i18n + `toast()`）、最大の共有チャンク 9.9 KB gz。
- **テストが見つけた不具合（修正済み）**:
  1. スキップリンクの遷移先が Shadow 内にあり、axe（と実際のブラウザの遷移）に見つからない → `<a href="#main">` をやめ、クリックで `main` にフォーカスする `<button>` にした。
  2. Safari 系はボタンをクリックしてもフォーカスしないため、ドロワー/ダイアログを閉じたあとに戻す先が無い → 直近にポインターで押した要素を戻し先の候補にする共通処理（`getReturnFocusTarget`）を追加。`dialog` にも適用。
  3. ドロワー内のリンクのクリックで閉じる処理が、`jimble-nav-item` の Shadow の内側のリンクを拾えなかった → `event.target` ではなく `composedPath()` で探す。
  4. `pagination` の例で同名の `nav` が並んでいた（axe）→ 例のラベルを分け、複数置くときは `label` を変えるよう明記。
- 設計からの変更・追加:
  - `app-shell` のサイドバーは、`<slot name="sidebar">` を 1 つだけ作り、広い画面では `aside` の位置、狭い画面ではドロワーの中へ**付け替えて**使い回す（同じスロットを 2 か所に置けないため）。ドロワーもモーダルスタックに登録するので、開くと通知の領域がドロワーの中へ移る。
  - スキップリンクは `<button>`（上記）。固定ヘッダーの補正は `focusin` で行い、文書全体のスクロール位置を補正する。
  - ホスト用 CSS（`*.host.css`）から使う色は、`tokens.json` の `aliases` から生成する `--_c-*`（`:host` に置く私的な別名）で参照する。既定値を CSS に二重に書かない。
  - ブレークポイントを `@theme` に追加（`--breakpoint-sm/md/lg/xl`）。`app-shell` の切り替えは 48rem（Tailwind の `md:`）。
  - ドキュメントの例に `<!-- frame: 高さ -->` を追加。指定した例は、単体ページ（`/frames/<id>/`）として生成して iframe に表示し、「別のタブで開く」で幅を変えて確認できる。ページ単位の axe は iframe を除外し、単体ページを別に検査する。
  - `tabs` の `jimble-tab` は、`slot="tab"` を自分で付ける（利用者が書かなくてよい）。`tab` と `panel` は light DOM の兄弟なので、`aria-controls` / `aria-labelledby` は属性の IDREF で結ぶ。
  - 表の選択（`selected` の行）は見た目だけで、`aria-selected` は付けない（`table` のロールの行には使えないため）。意味づけは行頭のチェックボックスなどで行う。
- 未対応（各ページに明記）: 表のセルの結合、`pagination` の「ページ番号を入力して移動」、`tabs` の追加/削除、`sidebar-nav` の矢印キー操作（Tab で順に移動）。
| **M5** ✅（公開の操作以外） | 仕上げ: 手動 a11y/IME チェック、ドキュメントの穴埋め、サイズ予算、**0.1.0 公開** | チェックリスト完了、npm 公開 |

**M5 実施結果（2026-09-29）**

- **配布物**: `exports` を整理（`.`、個別 import、`i18n`、`locales/*`、`tokens.css`、`cloak.css`、`custom-elements.json`、`vscode.html-data.json`）。`private` を外し、`prepublishOnly`（lint・型・ビルド・検査）を付けた。`publint --strict` と `are-the-types-wrong`（esm-only）は問題なし（CSS の 2 エントリは JS/型ではないので attw の対象外）。
- **配布用ファイルの生成**（`scripts/postbuild.ts`）: `dist/tokens.css`（既定トークン）、`dist/cloak.css`（未定義要素を隠してちらつきを防ぐ）、`dist/vscode.html-data.json`（VS Code の補完。`variant` などの候補値は、ソースの型別名から解決）。
- **`scripts/pack-smoke.ts`**: `npm pack` したものを空のプロジェクトに入れ、(1) サブパスの import を Vite でバンドル、(2) `tsc` で型の解決と `@ts-expect-error`、(3) 実ブラウザでバンドル済みアプリの動作、(4) CDN バンドルを `<script type="module">` で動かして `JimbleUI` グローバルを確認、までを一度に行う。CI とリリースの必須ステップ。
- **リリース自動化**: `release-please`（`release-please-config.json`、`.release-please-manifest.json`。0.x は `feat` で minor）、`.github/workflows/release.yml`（リリース PR → タグ → 検査 → `npm publish --provenance`）、`pages.yml`（ドキュメントサイトを GitHub Pages へ。`SITE_BASE=/jimble-ui/` でのビルドを確認）、`ci.yml` に配布物の検査を追加、`dependabot.yml`（Tailwind・Lit・Vite・Vitest は 1 つの PR にまとめて検証）、PR テンプレート。
- **ドキュメント**: README を全面的に書き直し（CDN・npm・VS Code・カスタマイズ・言語・開発・英語の要約）。`CONTRIBUTING.md`、`docs/release.md`（初回の準備を含むリリース手順）を追加。ドキュメントサイトに、トップ（コンポーネント一覧・特長）、はじめに（CDN の固定・cloak・VS Code）、アクセシビリティ、既知の制約を追加。
- テスト: 単体 + 3 エンジンのブラウザテストで 1046 件、E2E 197 件（10 件は Chromium のみ。サイト内リンクの切れ検査を含む）。
- 設計からの変更:
  - **npm の Trusted Publishing は、パッケージが存在しないと設定できない**。そのため公開の順序を「初回は Automation トークンで公開 → Trusted Publisher を設定 → トークンを削除」とした（§12.4 の手順を `docs/release.md` に反映）。
  - 公開ジョブは `npm publish --ignore-scripts` とし、検査は明示的なステップとして先に行う（`prepublishOnly` の二重実行を避ける）。
  - `custom-elements.json` はリポジトリ直下の生成物のまま `files` に含める（`prebuild` で生成）。
- **私が行っていないこと（利用者の操作が必要）**: 実際の `npm publish`、GitHub の Settings（Actions の権限・Pages の Source）、npm のトークンと Trusted Publisher の登録、`git push`、および [docs/manual-checks.md](manual-checks.md) の手動確認（スクリーンリーダー・IME の実機・強制色モード・ズーム）。手順は `docs/release.md` にある。

**追補: 公開後の対応（2026-09-29）**

- **公開**: 0.1.0 を npm に公開した（provenance 付き、release-please のリリース PR #6 をマージ）。以後は Trusted Publishing（OIDC）で公開する。
- **リリース周りの不具合と対処**: (1) release-please は、リリースが無いと既定で 1.0.0 にする → `initial-version: 0.1.0` を設定。(2) 初回のトークンが 2FA を要求して `EOTP` で失敗 → 2FA を回避する Granular Token を作り直した。(3) 生成物の `CHANGELOG.md` が Prettier の検査で落ちた → 対象外にした。(4) Linux の Chromium で、E2E が画面の右端（スクロールバーの隙間）をクリックして失敗 → クリック位置を端から離した。
- **警告について**: `warn()` は `__DEV__` が真のときだけ出力する。配布物は本番ビルドなので、**利用者には警告が出ない**（呼び出し自体は残るが何もしない）。ドキュメントの「開発時に警告します」を、そのとおりに直した。ラベルの付け忘れなどは、利用者が自分で確認する必要がある。
- **AI 向けの資料**:
  - `skills/jimble-ui/SKILL.md`（パッケージに同梱）と `.claude/skills/jimble-ui/SKILL.md`（リポジトリ用）: 利用者の AI 向けの使い方。手書きのテンプレート（`scripts/skill-template.md`）に、`custom-elements.json` から作る「コンポーネント早見」（全 41 要素の属性・候補値・スロット・イベント）と、axe 検査済みのドキュメントの例を埋め込む生成物（`npm run gen:skill`）。`tests/unit/skill.test.ts` が、skill 内のタグ・属性が実在することを保証する。CI は最新かどうかを検査する。
  - `CLAUDE.md`: 開発する人・AI 向けの約束と、テストの落とし穴。
  - ドキュメントに「AI から使う」を追加。利用者は `cp -r node_modules/@hidemikimura/jimble-ui/skills/jimble-ui .claude/skills/` で skill を入れられる。

**追補: 日付入力・色選択・コンボボックスの追加（2026-09-29）**

- **範囲**: `jimble-date-input`、`jimble-color-input`、`jimble-combobox` の 3 部品（41 要素）。外部ライブラリは使っていない（付録 A.2 の「日付は ISO 文字列 + 自前の APG date picker」の方針どおり。dayjs / cally / Floating UI は不要だった）。
- **日付入力**: 値は `YYYY-MM-DD` の文字列。年月日だけで計算し（`src/base/date.ts`）、`Date` のタイムゾーン問題を避ける。表示・入力は `Intl` の書式（日本語 `2026/09/29`）。入力は全角・`年月日`・8 桁も受け付け、blur / Enter で整える。カレンダーは APG の date picker dialog（グリッド、矢印・Home / End・PageUp / PageDown）。`popover="auto"`、位置は CSS Anchor Positioning。時刻・期間・和暦は対象外。
- **色選択**: 値は小文字の `#rrggbb`（`src/base/color.ts`）。ポップアップは、HSL のスライダー（ネイティブの `<input type="range">`）と候補の色。色相は内部に持つので、彩度 0 にしても失われない。色は `style` 属性ではなく CSSOM（`style.setProperty`）で渡す（CSP で `style-src` を絞っていても動く）。透明度・他の色空間は対象外。
- **コンボボックス**: APG の combobox（list autocomplete）。フォーカスは入力欄に残し、`aria-activedescendant` で候補を指す。ARIA の参照は Shadow 境界をまたげないため、`jimble-option` は「データ」として使い（`<slot hidden>`）、候補は同じ Shadow root 内に写して描画する。**自由入力は値にしない**（離れると選択中の表示に戻す）。絞り込みは `src/base/text-match.ts`（NFKC・大文字小文字・ひらがな/カタカナ・空白を無視、`keywords` で読みに対応）。`popover="manual"` + 入力欄の blur で閉じる。文字の入力では `input` / `change` を出さず、`jimble-search` を出す（値が変わっていないため）。
- **共通の整理**: Enter での暗黙の送信を `src/base/implicit-submit.ts` に切り出し（`jimble-input` も使う）。`setCustomValidity` を `computeValidity` を上書きする部品でも効かせた（`commit()` で反映）。
- **不具合の発見と対処**: (1) 新部品が `src/index.ts`（CDN・ドキュメントサイトの入口）から抜けていた → E2E の axe で発見。全部品の再エクスポートと `hosts.css` の読み込みを検査する単体テスト `tests/unit/entry.test.ts` を追加。(2) **`jimble-field` より先に登録された部品には、field の情報（ラベル・ヒント）が届かない**（コンテキストの提供側が後から現れるため）。アルファベット順の入口では、`checkbox` や `combobox` が `field` より前に来る。→ `base/form-element.ts` が `jimble-field` を先に import するようにした（個別 import でも順序に依存しない）。(3) 日付入力を ↓ で開いたときにカレンダーの表示月を初期化していなかった → 単体テストで開いたあとのフォーカスも確認するようにした。
- **サイズ**: 部品チャンクの予算を 4 KB から 6 KB に上げた（`date-input` が 5.1 KB。カレンダーの描画と日付の計算を含む）。CDN バンドルは 48.3 KB gz（予算 50 KB）。次に部品を足すときは、予算の見直しか分割が要る。

**追補: コンボボックスの拡張（tom-select 相当、2026-09-29）**

- **範囲**: `load`（入力から関数で候補を取得。同期・非同期とも。サーバーへの問い合わせも同じ）、`multiple`（複数選択）、`creatable`（一覧にない値の追加）。tom-select 自体は使わず（依存を増やさない方針）、既存の `jimble-combobox` を拡張した。ドラッグ並べ替え・選択数の上限・グループは対象外。
- **load**: `(query, signal) => 項目[] | Promise`。デバウンス（`load-delay` 250ms）、古い検索の破棄（要求 ID と `AbortController`）、取得中・失敗・最小文字数の表示、`jimble-load-error`。返した項目はそのまま表示（部品側では絞り込まない）。選択済みの表示は `items` で補う。内部は `jimble-option` の要素ではなく `ComboboxItem` を単位にして、DOM の選択肢・`items`・取得結果・追加した項目を同じ形で扱う。
- **multiple**: チップ（`ul`/`li`、削除ボタンに名前）、Backspace で最後を外す、選択後も開いたまま。送信は `setFormValue(FormData)` で同じ `name` を複数送る（`formValue` の型を `string | FormData | null` に拡げた）。状態復元は JSON。読み上げは `role=status` に「選択しました / 解除しました」。
- **creatable**: 同じ表示・値の項目が無いとき、末尾に追加用の行を出す。`create` 関数（非同期可、`null` で中止）と `jimble-create`。追加した項目は部品内に保持する。
- **サイズ**: CDN バンドルが 50.6 KB gz になり、予算を 50 KB から 56 KB に上げた（部品チャンクは combobox 5.3 KB で 6 KB 内）。
- **見つかった不具合**: ページの `<script>` が、部品の登録前に `el.load = fn` と代入すると、コンストラクターの初期化で消えていた（Lit はリアクティブプロパティしか、登録前に代入された値を引き継がない）。`load` / `filter` / `create` を `attribute: false` のリアクティブプロパティにして解決（E2E で発見）。
- 見つかった設計上の注意: 候補の識別を要素の参照から文字列のキーに変えた（描画のたびに項目を作り直すため）。

**追補: コンボボックスの上限・並べ替え・グループ（2026-09-29）**

- **max-items**: 上限に達したら、未選択の候補と追加行を `aria-disabled` にして、矢印キーも飛ばす。選ぼうとしたら `role=status` で案内する。
- **reorderable**: チップを `tabindex=-1` の `li` にして、入力が空のとき ← で移る（フォーカスは入力欄 ↔ チップを行き来する単純な形）。Alt+←/→/Home/End で入れ替え、Delete で削除。ドラッグは HTML5 の Drag and Drop（外部ライブラリなし）。挿入位置は `data-drop` と box-shadow で示す。入れ替えは `jimble-reorder` + `change`、読み上げは「n 件中 m 番目」。**ドラッグの代替（WCAG 2.5.7）**: タッチでのドラッグは非対応。代わりに、フォーカス中のチップだけに「前へ / 後ろへ」ボタン（`chip-move`、端では無効）を出す（`:not(:focus-within)` で非表示。タップでチップにフォーカスが移るので、ポインター 1 本で完結する）。
- **group**: `jimble-option` の `group` 属性。新しい要素（`jimble-option-group`）は作らず、属性にした（入れ子の DOM を読む必要がなく、`load` の項目と同じ形で扱える）。同じ名前を最初の出現位置にまとめ、`role=group` + 見出しの `aria-labelledby`。表示順と矢印キーの移動順が一致するよう、行の並びを先にグループ化して作る。
- **サイズ**: 部品チャンクの予算を 6 KB から 8 KB に上げた（`combobox` が 6.5 KB。取得・複数選択・追加・並べ替え・グループを持つ、最も大きい部品）。

**追補: ドロワー（サイドモーダル、2026-09-29）**

- **範囲**: `jimble-drawer`（42 要素）。モーダルは既存の `jimble-dialog` で足りるため、新しい部品にしていない。
- **実装**: `JimbleDrawer extends JimbleDialog`。開閉・`jimble-close-request`・`data-dialog-close`・IME・フォーカス復帰・スクロールロック・モーダルスタック（toast の移動）をそのまま継承し、`dialog` 側に足した 2 つのフック（`dialogClasses()` / `panelClasses()`）でクラスだけを置き換える。差分は `placement`（`end` / `start` / `top` / `bottom`）と、画面の端に付くレイアウト・角丸だけ。
- **動き**: `translate` と `::backdrop` の `opacity` を CSS の遷移で動かし、`overlay` / `display` の `allow-discrete` と `@starting-style` で出入りとも動く（未対応のブラウザでは動きなしで開閉する）。`prefers-reduced-motion` では遷移を止める。
- **対象外**: 背面を操作できる非モーダルのパネル（フォーカスの閉じ込めをしない別の設計が要る）、RTL。

**追補: スピナー（2026-09-29）**

- `jimble-spinner`（43 要素）。既存の内部アイコン（`spinner`、ボタンの loading と同じ）を単独の部品にした。既定は `role=status` + 「読み込み中」（`common.loading`）を `sr-only` で持ち、隣に文字があるときは `decorative`（`role` なし・読み上げから外す）。色は `currentColor`、`variant="primary"` で主色。`motion-safe` で回転、`motion-reduce` では点滅（動きを止めても読み込み中と分かるように）。

**追補: 公開アイコン `jimble-icon`（2026-09-29）**

- **方針の変更**: 当初（§9）は「同梱は内部用のみ、汎用セットは非同梱」だったが、管理画面でアイコンを別途用意する手間をなくすため、Heroicons v2 の 20/solid から**管理画面でよく使う約 100 個**（内部用 + 追加分）を公開した。`icons/svg/` に vendor（MIT 表記は既存のまま）。線画（outline）や他のセットは対象外。
- **仕組み**: アイコンを 1 つずつ登録する登録簿（`src/icons/registry.ts`、`registerIcon` / `getIcon`）に、`jimble-icon` が `name` で引く。登録が増えたら描き直す（個別 import の順序に依存しない）。`gen:icons` が、アイコン本体（`src/icons/<id>.ts`）に加えて登録用の入口（`src/icons/register/<name>.ts` と全部の `index.ts`）と名前の一覧（`names.ts`: `ICON_NAMES` / `IconName`）を生成する。
- **読み込み**: 全部品の入口（`@hidemikimura/jimble-ui`・CDN）には全アイコンが入る。個別 import は `.../icon`（要素）+ `.../icons/<name>`（1 つ）または `.../icons`（全部）。`package.json` の `exports` に `./icons`・`./icons/names`・`./icons/*` を追加し、`sideEffects` に `dist/icons/*.js` を加えた。
- **アクセシビリティ**: 既定は装飾（`aria-hidden`）。`label` を付けると `role=img`。アイコンだけのボタンは、ボタン側の `aria-label`（ドキュメントと skill で明記）。
- **サイズ**: CDN バンドルは 53.4 KB → 64.8 KB gz（アイコン約 100 個で +11 KB）。予算を 56 KB から 70 KB に上げた。npm の個別 import では、使うアイコンだけが入る。
- **独自アイコン**: `registerIcon(name, { viewBox, fill, body })`（`body` は Lit の `svg` テンプレート。文字列の SVG は XSS の恐れがあるので受け付けない）。

**追補: ツールチップ `jimble-tooltip`（2026-09-29）**

- **構造**: 既定スロットに入れた要素をアンカー（`[part=trigger]`）にし、Popover API（`manual`）+ CSS Anchor Positioning で表示する。位置は `placement`（top / bottom / left / right）で、`position-try-fallbacks` により画面の端では反対側に出る。折り返しは `multiline`（`white-space: pre-line` + 最大幅 20rem）。
- **アクセシビリティ（WCAG 1.4.13）**: 表示はホバーとフォーカスの両方。Esc で消せる（開いている間だけ、document のキャプチャで受けて `preventDefault` する。ダイアログの Esc には渡さない）。ポインターを対象からツールチップへ移しても、少し待ってから消すので消えない。フォーカスまたはホバーが残る間は出続ける。
- **説明の伝え方**: ARIA の参照は Shadow の境界をまたげない（ツールチップは Shadow 内、対象は light DOM）。そこで、ネイティブの対象には `hidden` の `span` を light DOM に置いて（名前のあるスロット指定で描画されないようにする）、対象の `aria-describedby` にトークンを足す。もとの値は残し、取り外すとトークンだけを消す。**`jimble-*` の対象は別**: 実際にフォーカスされるのは Shadow 内の要素で、host の `aria-describedby` は届かない（E2E の CDP で、button に description が付かないことで発見）。そこで host に `aria-description`（文字列）を付け、`jimble-button` が内側の要素へ渡す（`aria-label` と同じ方式）。他の部品は未対応で、ドキュメントに明記した。ポップアップ自体は `aria-hidden`（二重に読まれない）。
- **タッチ**: ホバーの `pointerenter` は `pointerType=touch` を無視し、タップによるフォーカスで出す。
- **制約**: 囲めるのは 1 つのフォーカスできる要素。文字だけの要素は開発ビルドで警告。ツールチップの中にリンク・ボタンは入れられない。

**追補: ファイル添付 `jimble-file-input`（FilePond 相当、2026-09-29）**

- FilePond 自体は使わず（依存を増やさない方針）、自作した。範囲: ドロップエリア、ボタンでの選択、一覧（サイズ・状態・サムネイル・削除）、`accept` / `max-size` / `max-files` の検査、`upload` 関数による自動アップロード（進捗・中止・再試行）。画像編集、プラグイン、フォルダー、チャンク分割、並べ替えは対象外。
- **フォーム**: FACE。`upload` なしでは `File` を `FormData` に入れて `setFormValue`（同じ name で複数）。`upload` ありでは、サーバーが返した値（ID）を送り、ファイルは送らない（FilePond の server id と同じ考え方）。アップロード中・失敗は `customError` で検証を通さない。状態復元はしない（ファイルは復元できない）。
- **アクセシビリティ**: キーボードの操作先は「ファイルを選択」ボタン（隠した `input[type=file]` を `click()`）。ドロップは追加の手段であって必須ではない。追加・削除・拒否・完了は `role=status` で通知。拒否したファイルは一覧に理由つきで出す（色だけに頼らず文字で）。進捗は `<progress>`（名前つき）。
- **サイズ**: CDN バンドルが 70.2 KB gz になり、予算を 70 KB から 76 KB に上げた。
- **見つかった不具合**: 選ぶボタン（`role=button`）に `aria-required` を付けると axe の `aria-allowed-attr` 違反 → 外した（必須はラベルと検証メッセージで伝える）。
- **見つかった型の衝突**: `Element.remove()` と同名の `remove(file)` は定義できない → `removeFile()`。`nativeControl` の型を `HTMLButtonElement` まで拡げ、テキスト系（`JimbleTextControl`）は狭い型で上書きした。

**追補: 日付選択の拡張（flatpickr 相当、2026-09-29）**

- **方針**: 新しい部品にせず、`jimble-date-input` を拡張した（flatpickr 自体は使わない）。単一の日付の挙動と値の書式は変えず（既存テスト 54 件がそのまま通る）、`time`（日時）・`range`（期間）・`months`（複数の月）を追加した。
- **値**: 日付 `YYYY-MM-DD`、日時 `YYYY-MM-DDTHH:mm`、期間 `開始/終了`（ISO 8601 の期間の書き方）。タイムゾーンなしの「場所の時刻」として扱う（`Date` を介さないので、時差で日がずれない）。期間は 1 つの `name` に 1 つの文字列で送る（2 つに分けたいときはアプリで分割する）。開始と終了がそろうまでは値が空（未完成の入力は検証エラー）。
- **入力**: `base/date.ts` に日時と期間の解釈を追加（時刻 `14:30` / `14時30分`、期間の区切り `〜 ～ ~ – — to` と空白つきの `-`。日付の区切りの `-` とは、前後の空白で区別する）。
- **カレンダー**: 期間は 2 回のクリックで開始→終了（逆順なら入れ替え）。ホバー・キーボード移動で間の日をプレビューし、端の日は読み上げで「開始日 / 終了日」。`aria-multiselectable`。時刻ありは開いたままにして「完了」で閉じる（時刻を入れる前に閉じないため）。change は「値が変わって確定した時点」ごとに 1 回（期間は終了まで選んだとき）。既定の時刻は、開始 00:00・終了 23:59（その日全体）。
- **時刻の欄**: ネイティブの `<input type=number>`（spinbutton）を「時」「分」の 2 つ。24 時間表記のみ（12 時間表記・秒は対象外）。範囲外は丸める。
- **対象外**: 特定日の無効化、インライン表示、期間の候補（過去 7 日間など）、和暦、祝日、週番号。

**追補: 表示・絞り込み・日付入力の調整（2026-09-29）**

- **ツールチップの余白**: `multiline` の `white-space: pre-line` は、テンプレートの空白と改行もそのまま余白にする。Prettier が Lit のテンプレートを整形して、文字の前後に改行とインデントを入れていたため、複数行のときだけ余分な余白が出ていた。文字は `.textContent` で入れて、テンプレートの空白の影響を受けないようにした（単体テストで、内容が完全に一致し、高さが行数 × 20px + 12px になることを確認）。
- **combobox `search-group`**: グループ名も絞り込みの対象にするか（既定は対象外）。一致の規則（全角半角・かな・空白の無視、`match`）は候補の文字と同じ。`filter` 関数を指定しているときは、関数が全部決めるので効かない。
- **date-input**: `picker-only` のときだけ、入力欄のクリックでカレンダーを開く（フォーカスは入力欄に残す。ボタン・↓ は従来どおり日にフォーカス）。通常の入力では、クリックは文字の位置決めなので開かない（当初は両方で開く実装にしたが、手入力中心の用途で邪魔になるため、picker-only に限った）。`picker-only` は入力欄を `readonly` にした上で、クリック・Space・↓ で開き、Backspace / Delete で消せるようにした（読み取り専用の入力欄はそのままだと消せないため）。開いたまま入力したときは、解釈できた日に表示を合わせる。

**追補: 左右分割の選択 `jimble-dual-listbox`（2026-09-29）**

- **範囲**: 左に未選択・右に選択済みを並べて、ボタンで移す選択（デュアルリストボックス / transfer list）。項目は `jimble-option`（`select` / `combobox` と共通）と `items`。値は `combobox multiple` と同じ扱い（`value="a,b"`、`values`、`FormData` で同じ name を複数送信）。
- **a11y**: 各リストは `role=listbox` + `aria-multiselectable`、行は `role=option`（roving tabindex）。APG の rearrangeable listbox に沿って、Space で選択・Enter で移動・Shift/Ctrl+A で複数選択。行の右の ＋ / − は、`option` の中に操作できる要素を入れられない（axe の `nested-interactive`）ので、`aria-hidden` の装飾 + マウス用の近道にし、キーボードには Enter と「追加」「削除」ボタンを用意。ボタンの名前は「追加」を含む文（「選んだ項目を{選択済みの見出し}に追加」）で、見えている文字が名前に含まれる（WCAG 2.5.3）。移したあと、ボタンが無効になってフォーカスが消えないよう、元のリストの次の行へ戻す。件数は `role=status` で通知。
- **絞り込み**: 左右それぞれの検索欄。見えなくなった項目は選択から外す（見えていないものを移してしまわない）。
- **レイアウト**: コンテナークエリー（`@[36rem]`）で、広いときは左右 + 中央のボタン、狭いときは上下 + 横並びのボタン（矢印を 90 度回す）。
- **サイズ**: CDN バンドルが 77.3 KB gz になり、予算を 76 KB から 84 KB に上げた。部品を足すたびに数 KB ずつ増えているので、さらに増えるなら、CDN を「本体」と「アイコン」（約 11 KB）などに分ける案を検討する。
- **グループ**: `jimble-option` の `group` 属性（combobox と同じ）。同じ名前を最初の出現位置にまとめ、`role=group` + 見出し。表示順と矢印キーの順を一致させるため、行の並びを先にグループ化して作る。`search-group` でグループ名も絞り込み対象。
- **並べ替え（`reorderable`）**: 右の一覧の順序は `values` の順そのもの。ドラッグは HTML5 DnD（外部ライブラリなし）、ドラッグの代わりに「上へ」「下へ」ボタン（選んだ項目をブロックで 1 つずつ。WCAG 2.5.7）、キーボードは Alt+↑↓。並べ替えできるときの右の一覧は選んだ順を見せるため、グループではまとめず、グループ名を項目の後ろに小さく出す。右の一覧を絞り込んでいる間は、見えない項目との前後が定まらないので並べ替えを無効にする。
- **対象外**: サーバーからの取得、左の一覧の並べ替え、複数項目のドラッグ。

**追補: CDN バンドルの予算を 92 KB に（2026-10-09）**

- カンバン・サイドバーの切り替え・テーマ変数・イベントの修正で、90 KB にほぼ達し、イベントの修正（約 20 バイト）で超えたため、92 KB に上げた（利用者の判断）。これ以上の部品の追加は、また予算に当たる。根本的な対処は、アイコン（約 11 KB）を CDN の本体から分けること。
- 共有チャンクの予算は 14 KB（変更なし）。

**追補: `jimble-*` イベントを、既定でバブルさせない（2026-10-09・破壊的変更）**

- **症状**: ドロワーの中の select を閉じると、ドロワーの `jimble-close` のリスナーが呼ばれた（ドロワーは閉じていない）。同じ名前（`jimble-open` / `jimble-close` / `jimble-close-request` / `jimble-dismiss` など）を多くの部品が使い、しかも `emit()` の既定が `bubbles: true` だったため、入れ子にすると、どの部品の通知か区別できなかった（タブの中のタブの `jimble-tab-change` なども同じ）。
- **判断**: 「この部品自身の状態の通知」は、ネイティブの `close` / `toggle` と同じく、バブルさせない。`emit()` の既定を `bubbles: false`（`composed: true` のまま）にして、アプリ全体で受ける通知だけ `bubbles: true` を指定できるようにした。**ルーターの `jimble-route-*` は、計測やエラー表示をアプリ全体で受けるので、バブルのまま**。フォーム部品の `input` / `change` は、`emit()` ではなくネイティブ相当の再発火で、これまでどおりバブルする。
- **互換性**: 親や `document` で、イベントの委譲（`container.addEventListener('jimble-close', …)`）をしていたコードは、届かなくなる。**キャプチャ段階のリスナー（`addEventListener(name, fn, true)`）は、バブルしないイベントでも届く**ので、委譲が要るときは、これで移行できる。リポジトリ内・サイト・theme-lab のリスナーは、すべて発火元の部品に付いていて、影響しなかった。0.x なので、`feat!` の minor で出す。
- **検証**: `src/base/jimble-element.test.ts`（修正前の実装では、9 件が失敗することを確認）。ドロワーの中の select、入れ子のタブ、`bubbles: true` の指定を確かめる。

**追補: app-shell のフォーカス補正が、Shadow DOM の中で大きく跳んでいた不具合（2026-10-08）**

- **症状**: ページをスクロールしたあと、Shadow DOM を持つ背の高い要素（独自の部品、表、かんばんなど）の中で、最初にフォーカスすると、画面が大きく上へ跳んだ。ヘッダーの中の要素（ユーザーメニューなど）にフォーカスしたときも、約 50px 上へ動いた。（別のアプリ aiColle での報告で発覚）
- **原因**: 固定ヘッダーに隠れないようにする補正（WCAG 2.4.11）が `event.target` を使っていた。リスナーは app-shell 自身についているので、Shadow DOM の中のフォーカスでは、`target` が外側の要素（背の高いホスト）に置き換わる。その上端は画面のはるか上にあり、`top < limit` が成り立って、ホストの上端まで戻ろうとした。ヘッダーの中は固定で、上端が常にヘッダーの下端より上なので、補正の条件に常に当てはまった。
- **対策**: 実際にフォーカスされた要素を `event.composedPath()` の先頭から取る（CLAUDE.md の約束 6 の「`event.target` は host に再ターゲットされる」の、実際の被害）。ヘッダーの中（経路にヘッダーを含む）は、補正しない。回帰試験は、背の高い Shadow DOM のホストの中の入力欄と、ヘッダー内のボタン（修正前は 3 エンジンとも失敗することを確認）。
- **教訓**: `event.target` を、見た目の位置の計算に使わない。上端を使う補正は、「その要素が固定された領域の中か」も確かめる。

**追補: `z-sticky` / `z-drawer` が CSS に出ていなかった不具合（2026-10-08）**

- **症状**: app-shell のヘッダーに、z-index が付いていなかった。本文の中の sticky な要素（表の見出し `sticky-header` など）が、ヘッダーより前に出る可能性があった。細いサイドバーを広げたときも、表の見出しがサイドバーの上に重なった（theme-lab で発見）。
- **原因**: `z-sticky` / `z-drawer` は、トークン（`tokens.json`）に `theme` の対応がなく、Tailwind のユーティリティとして存在しない。存在しないクラスは、エラーも警告もなく、CSS が出ない（calc の空白の件と同じ種類）。
- **対策**: `z-(--jimble-z-sticky,10)` / `z-(--jimble-z-drawer,20)` に直した（`--jimble-z-*` は、`tokens.generated.css` にある）。ヘッダーの z-index が計算結果で 10 であることを、単体テストで確かめる。
- **教訓**: Tailwind のクラスは、書いただけでは CSS が出るかが分からない。**新しい種類のクラス（任意の値、トークンの名前を使ったもの）は、ビルド後の CSS か、計算結果（`getComputedStyle`）で確かめる**（CLAUDE.md の約束 1）。

**追補: ヘッダー・サイドバーのテーマ変数（2026-10-08）**

- **要件**: Sidebar Nav の背景・文字・アイコンの大きさ、app-shell のヘッダーの背景・文字を、テーマとして変えられるようにする。
- **変数**: 部品ごとの CSS 変数で、既定値は**意味トークンへのフォールバック**（`var(--jimble-app-shell-header-bg, var(--color-surface))`）。指定しなければ見た目は変わらない（約束 2）。ヘッダー: `--jimble-app-shell-header-bg` / `-header-text` / `-header-hover-bg` / `-header-ring`。サイドバーの面: `--jimble-app-shell-sidebar-bg` / `-sidebar-ring`。項目: `--jimble-sidebar-nav-text` / `-icon-color` / `-icon-size` / `-hover-bg` / `-current-bg` / `-current-text` / `-ring-focus`。
- **背景はどちらの部品か**: `jimble-sidebar-nav` は背景を持たない（枠を作るのは app-shell）ので、サイドバーの背景は app-shell の `--jimble-app-shell-sidebar-bg`。ドロワー（狭い画面）と、細い表示で広がる面も同じ変数に従う。
- **暗い背景のために必要になった変数**: 背景だけを変えると、文字・ホバー・現在のページ・フォーカスの色が合わなくなる。そのため、ホバーの背景・現在のページの色・フォーカスの色・ヘッダーの中のボタンのホバーを、変数にした。ヘッダーの中のボタンは、`text-fg` の固定から `inherit` に変え、ヘッダーの文字色に従う。
- **アイコンの大きさ**: `--jimble-sidebar-nav-icon-size` を、アイコンのラッパーの `--jimble-icon-size`（`jimble-icon` が読む変数）に渡す。未指定のときは、変数が無効（guaranteed-invalid）になり、`jimble-icon` 自身の大きさ（`size` 属性）が使われる。副作用: ラッパーの中では、`:root` に書いた `--jimble-icon-size` は届かない。`<svg>` を直接入れた場合は効かない。
- **サイズ**: 変数の指定が共有の CSS に入り、共有チャンクが 13.6 KB になったので、共有チャンクの予算を 13.5 KB から 14 KB に上げた。CDN バンドルは 89.9 KB で、予算（90 KB）にほぼ達している。次の機能の前に、予算を上げるか、アイコンの分離（約 11 KB）を決める必要がある。
- **theme-lab**: ヘッダー・サイドバーの変数を、`theme.css`（ダークの例つき）、調整パネル、コントラストのページに足した。全部品を試せるよう、かんばんのページと、入力部品の状態の一覧（通常・入力済み・無効・読み取り専用・エラー）を足した。`tests/unit/theme-lab.test.ts` が、全部品が theme-lab にあることと、ヘッダー・サイドバーの変数が `theme.css` にそろっていることを保証する（部品を足したら、theme-lab にも置く）。
- **対象外**: 項目の文字サイズ・角丸・余白。必要になったら足す。コントラストは、変数を変えた利用者の責任（`theme-lab` のコントラストのページで確かめられる）。

**追補: app-shell のサイドバーを細くする機能 `sidebar-collapsible`（2026-10-08）**

- **要件**: ヘッダーのボタンで、サイドバーを「アイコンだけの細い表示」と「項目名つきの広い表示」に切り替える。細い表示でも、マウスを重ねると項目名が出て、子項目も開ける。
- **広げ方**: 広がるのは、サイドバーの**中身（`sidebar-panel`）だけ**で、グリッドの列の幅（本文の位置）は変えない。本文に重なる面として、`absolute` + `width` の変更と影で見せる。列の幅ごと広げると、マウスを重ねるたびに本文が動いて読めなくなる。サイドバーの枠（`part=sidebar`）は列の幅を取ったままにし、従来の `::part(sidebar)` の上書きが効くようにした。重なる間は `z-sticky`（本文の中の position 付きの要素より上）にする。
- **項目への伝え方**: `jimble-sidebar-nav` の `compact` を、`jimble-nav-item` / `jimble-nav-group` に **プロパティで渡す**（`MutationObserver` で、あとから足した項目にも）。CSS のカスタムプロパティの継承では、「項目名を画面から隠して、読み上げには残す」（複数のプロパティが要る `sr-only`）が書けないため。app-shell は、サイドバーの中の `jimble-sidebar-nav` に、「細い表示で、広げて見せていない間」だけ `compact` を付ける。
- **項目名は消さない**: `display: none` ではなく `sr-only`。アイコンのない項目は、頭文字（`aria-hidden`）を出す。グループは、compact の間は子項目を隠し、`aria-expanded` も「閉じている」と伝える（開いていたことは `open` に残る）。
- **広がる条件**: マウスを重ねて 80ms（通り過ぎただけでは広げない）、離れて 150ms で戻す。フォーカスは、**キーボードで入ったとき（`:focus-visible`）だけ**広げる（マウスでクリックしたボタンにフォーカスが残っても、マウスが離れたら戻る）。タッチは広げない（タップで、そのまま項目を開く）。
- **範囲**: 広い画面（48rem 以上）のみ。狭い画面のドロワーは、いつも項目名つき。状態の保存はアプリの役目（`jimble-sidebar-toggle` で受けて、`sidebar-collapsed` で渡す）。
- **検証の限界**: 単体テストの iframe は狭いので、`wide` を直接立ててロジックだけを確かめている。見た目（幅・重なり・本文が動かないこと）は、広い画面の E2E で確かめる。キーボードでの広がり・読み上げは手動確認（`docs/manual-checks.md` の 11u）。

**追補: app-shell のサイドバーの高さが効いていなかった不具合（2026-10-08）**

- **症状**: 本文が長いと、サイドバーが本文と同じ高さに伸びて、スクロールと一緒に動いた（ヘッダーの下を通る見え方になる）。0.4.0 以前の全バージョンで起きていた。
- **原因**: サイドバーに付けた `h-[calc(100dvh-var(--_hh))]` が、CSS に出力されていなかった。`calc()` の演算子の前後に空白がないと、Tailwind は何も言わずにその CSS を捨てる。単体テストの iframe は狭く、サイドバーが非表示（`hidden md:block`）なので、見つからなかった。
- **対策**: `h-[calc(100dvh_-_var(--_hh))]` に直した。広い画面の E2E（本文 3000px でスクロールしても、サイドバーの上端が 56px・高さが 644px）を足した。新しい任意の値を足したときは、ビルド後の CSS に出ているかを確かめる（CLAUDE.md の約束 1）。
- **リリースへの影響**: この修正のコミット本文にクラス名（`名前(` を含む行）を書いたため、release-please がコミットを解釈できず、リリース PR が作られなかった。本文にコードを書かないことにした（CLAUDE.md）。

**追補: カンバンボード `jimble-kanban`（2026-10-08）**

- **範囲**: 列（`jimble-kanban-column`）の中にカード（`jimble-kanban-card`）を並べ、列の間・列の中で動かす。値は **DOM そのもの**（動かすと、カードの要素が別の列へ入れ替わる）。状態を別に持つ案（`columns` の配列をプロパティで渡す）は、カードの中身を自由な HTML で書けなくなり、利用者の状態管理と二重になるので採らなかった。並びは `board`（`{ 列: [カード] }`）で取れる。
- **動かす前のフック**: `jimble-card-move`（キャンセル可）を DOM の入れ替えの直前に出す。サーバーが断ったときに、カードを動かさないで済む（動かしてから戻すと、フォーカスと読み上げが乱れる）。
- **操作は 4 通り**: ①マウス・ペンのドラッグ、②タッチの長押し→ドラッグ、③カードの移動ボタン→「ここに移動」（**ポインター 1 本での代わり。WCAG 2.5.7**）、④キーボード（Alt + 矢印で動かす、矢印でフォーカスを移す、Space / Enter で③と同じ移動先の選択）。HTML5 DnD ではなく **Pointer Events** にした: HTML5 DnD はタッチで動かず、カード全体をドラッグ元にすると、中のテキスト選択・リンクと衝突する。ドラッグ中は、カードを `translate` で動かし（元の場所が空いたまま残り、そのまま置き場所の目印になる）、挿入位置は線で示す。
- **タッチ**: 動かさずに 300ms 押し続けたらドラッグを始める。その前に 10px 動いたら、画面のスクロールとして手放す。ドラッグ中だけ `touchmove` を `preventDefault` する（`passive: false` のリスナーを、始まる前に登録しておく必要がある）。**実機のタッチは未確認**（自動テストは、合成の PointerEvent で長押しの流れだけ確かめている）。
- **a11y**: 列は `role=group`（名前は「見出し（n 件）」）、中は `role=list`、カードは `role=listitem`。カードは roving tabindex（ボードで Tab 停止は 1 枚）。移動ボタンは、入口のカードのものだけ Tab で止まる（全カード分止まると、Tab 停止が増えすぎる）。動かすと `role=status` で「「○○」を「△△」の n 件中 m 番目に移動しました」。
- **コントラスト**: 列の背景は `surface-sunken`。この上では `text-muted` が 4.39:1 で足りないので、見出し・件数・空の表示は `text` を使う（`tests/unit/contrast.test.ts` に追加）。
- **サイズ**: CDN バンドルは 88.1 KB gz（予算 90 KB まで残り約 2 KB）。i18n の文言を足して共有チャンクが 13.0 KB に達したので、共有チャンクの予算を 13 KB から 13.5 KB に上げた。次の部品で CDN の予算に当たるはず（アイコンの分離などを検討する）。
- **対象外**: 仮想スクロール（列のカードが数百枚になる場合）、複数カードのまとめてのドラッグ、列自体の並べ替え。

**追補: フィールド単位の独自の検証 `jimble-field` の `validate`（2026-09-29）**

- **API**: `field.validate = (value, control) => メッセージ | null`（Promise も可）。属性は関数を持てないので JS のプロパティ（Lit では `.validate=`）。呼ばれるのは、`input` / `change` / `focusout`（子の部品のイベントは field まで届く）と、最初に 1 回（部品が登録されたとき）、`validate` の差し替え時、`validateNow()`。**空の値でも呼ぶ**（必須かどうかを関数に任せるため。空を許すなら `null` を返す）。
- **結果の渡し方**: 中の部品（`JimbleFormElement`）の新しい口 `setValidatorMessage()` に渡す。`setCustomValidity`（アプリのサーバーエラー）とは別のフィールドに持ち、`commit()` で `customError` として反映する。これで、(1) フォームの検証（`checkValidity` / `requestSubmit`）が通らず送信されない、(2) 表示は既存の仕組み（触れた後に、部品の検証メッセージが field のエラーになる）のまま、(3) `error` 属性・`setCustomValidity` と互いに上書きしない。
- **非同期**: Promise を返すと「確認中です」（`field.validating`）で検証を保留し、送信を止める。部品ごとの連番で古い結果を捨てる。Promise を返す検証は、入力のたびには呼ばない（直前の呼び出しが Promise だったかを覚えて、`input` では飛ばす。サーバーへの問い合わせを打鍵ごとに出さないため）。例外・拒否は「検証できませんでした」。
- **値**: 文字列、チェックボックス・スイッチは真偽値、複数選択（combobox・dual-listbox）は配列、file-input は `File[]`。
- **1 つの field に複数の部品**（姓と名）: 試して 3 つの問題が見つかり、直した。(1) 各部品が `field.report()` で自分のメッセージを送っていたので、最後に更新した部品（有効）が、無効な部品のエラー表示を消していた → `report(control, message)` にして、field が部品ごとのメッセージを持ち、並びで最初の空でないものを表示する。(2) 全部品の読み上げの名前が field のラベルになり、部品の `aria-label` が負けていた → 複数のときは「ラベル + 部品の aria-label」。(3) `validate` がほかの部品の値を見られなかった → 3 つ目の引数 `context.get(name)`。あわせて、どれかが変わったら、同期の検証のほかの部品も再検証する（依存する検証のため）。
- **Lit の落とし穴**: 部品の登録は、field の更新の途中（コンテキストの提供中）に起きるので、そこでの `requestUpdate()` は次の更新にならない。部品の数（`count`）を渡し直すため、登録・解除のあとに `queueMicrotask` でもう一度更新する。
- **外から実行する（フリガナの自動入力）**: (1) 検証だけ = `validateNow()`、検証して表示 = `showErrors()`（全部品を `setTouched(true)`）、表示を隠す = `hideErrors()`（`setTouched(false)`。値と検証結果は変えない）。`setTouched` は部品の公開メソッドにした（従来は `invalid` と `focusout` でだけ内部的に「触れた」にしていた）。(2) プログラムからの値の変更（イベントなし）は、部品が `commit()` で `formState` の変化を見て field に知らせ（`valueChanged`）、field が再検証する。**入力イベント経由の変更と二重に検証しない**ため、直前に検証した値（`#lastKey`）と比べ、比較は次のタスクに遅らせる（部品はイベントを field に届ける前に値を確定して通知するので、その場で比べると、まだ検証されていない値に見える）。(3) Autokana.js のような、`value` を直接書き換えるライブラリと組み合わせられる（実ライブラリでの動作は未確認で、変換表による真似で確認）。
- **`jimble-validator`（囲む案）は作らない**（2026-09-29 に決定）。1 つの field の中の複数項目は `field.validate` + `context` で足りる。別々の field にまたがる検証は、必要になった時に別途検討する。
- **依頼の書き方との違い**: 依頼の例では `change` で自分の状態に値を保存してから検証する形だったが、関数に値を渡すので、アプリは値を持たなくても検証できる（保存したいときだけ `@change` を使う）。

**追補: ルーター `jimble-router`（Navigation API、2026-09-29）**

- **由来**: 利用者の自作ルーター（History API 版から Navigation API 版へ移行済み）を参考にした。**捨てたもの**: ページ用の基底クラス（`RouterPage`）、ダイアログの状態の復元（`createState` の永続化）、`click` の横取り（Navigation API の `navigate` イベントが同じオリジンのリンクを受ける）、URLPattern の polyfill（対象ブラウザは、すべてネイティブで対応。テスト用の 3 ブラウザで、`navigation`・`URLPattern`・`intercept` を確認）。**残したもの**: 名前つきルート、遷移時の値の受け渡し、スクロールの復元、URL だけの差し替え。**入れなかったもの**（今は不要）: 離脱ガード、ルートのネスト。
- **構造**: `<jimble-router>` は、light DOM に入れ物（`div[data-jimble-outlet]`）を 1 つ作り、その中へ Lit の `render()` でページを描く（ページが、アプリの CSS の影響を受けるように、Shadow の外に置く）。Shadow 内は `<slot>` と、読み上げ用の `role=status` だけ。遷移のたびに `keyed` で要素を作り直す。1 ドキュメントに 1 つ（静的な `#active`）。
- **遷移**: `navigate` イベントを `intercept`。**リダイレクト**は、`cancelable` なら遷移の前に `preventDefault` して、`replace` で作り直す（URL のちらつきを防ぐ）。**中止**は、`e.signal` が abort されたら、こちらの `AbortController` も abort して、`load` の `signal` に渡す。あとの遷移が先に終わっても、古い結果が上書きしない。
- **値の受け渡し**: `data` は `navigate()` の `info`（履歴に残らない・1 回だけ・戻る、進む、リロードでは `undefined`）、`state` は `navigate()` の `state`（履歴エントリに保存され、`navigation.currentEntry.getState()` で読む）。`info` は、このルーターの値と区別できるよう、`{ jimble: { data, queryOnly } }` の名前空間に入れる。
- **`setQuery`**: `info.jimble.queryOnly` つきの `navigate()` を、`scroll: 'manual'`・`focusReset: 'manual'` で `intercept` して、何も描かずに終える（`current.url` の更新と `jimble-route-change`（`queryOnly`）だけ）。既定は `replace`。
- **スクロール**: window は、`intercept({ scroll: 'after-transition' })` でブラウザに任せる（戻る・進む・リロードで、ページの中身が入ったあとに復元される。そのために `load` の完了を待つ）。内側の要素（`scroll-container`）は、ブラウザが復元しないので、離れるとき（`navigate` イベント・`pagehide`）に `scrollTop` を `sessionStorage`（キーは履歴エントリの `key`）へ保存して、描画のあとに、戻る・進む・リロードなら復元、新しい遷移なら先頭にする。存在しなくなったエントリの値は、`navigatesuccess` で捨てる。App Shell は本文が window でスクロールするので、指定は要らない。
- **a11y**: SPA ではブラウザがページの切り替わりを伝えないので、遷移（最初の表示と `setQuery` を除く）のたびに、`document.title` を `role=status` で読み上げ、フォーカスを入れ物（`tabindex=-1`）か、中の `autofocus` へ移す（`focusReset: 'manual'` にして自前で行う）。
- **Navigation API がないブラウザ**: 最初の表示だけ行い、リンクは通常のページ遷移（サーバーが、どのパスでもアプリを返す前提）。polyfill は入れない。
- **見つかった型の問題**: `setState` は `JimbleElement` の CSS 状態用メソッドと衝突するので、`setEntryState` にした。`RouteConfig` は、`load` の戻り値の型がルートごとに違うため、型引数の既定を `any` にした。
- **動的 import と復旧**: ページの部品の `import()` は `load` で行う（`render` は同期。`load` の完了まで画面を切り替えないので、`render` 時に要素が定義済みで、スクロールの復元も内容の確定後になる）。利用者の自作ルーターが `enter` で行っていた「動的 import の失敗 → 通常のページ遷移で復旧」を組み込んだ。文言がブラウザごとに違う（Chromium・Firefox・Safari）ので、正規表現で見分ける。**無限の読み込み直しを避ける**ため、同じ URL で 10 秒以内に続けて失敗したときは、復旧せずに通常のエラーにする（`sessionStorage` に URL と時刻）。`jimble-route-error` は cancelable にして、`preventDefault()` で止められる。切り替えは `static hardNavigate` を経由する（テストで差し替えるため）。
- **CDN の `JimbleUI.html`**: `render` でテンプレートを書けるよう、Lit の `html` を `JimbleUI` に足した。

**追補: CDN バンドルの予算を 90 KB に（2026-09-29）**

- ルーターの追加で 82.8 KB gz になり、予算（84 KB）にほぼ達したため、90 KB に上げた。部品の追加で増え続けるので、さらに増えるなら、CDN を「本体」と「アイコン」（約 11 KB）に分ける案を検討する（アイコンは npm では使う分だけ入る）。

**追補: 強制色モードの修正（2026-09-29）**

- 利用者が Chromium のエミュレーション（`forced-colors: active`）で確認して、3 つの見落としが見つかった。強制色モードは、背景色・影を消し、`color` や枠の色をシステムカラーに置き換える。**背景色や影だけで状態を表している部品**が、見えなくなる。
  - **スイッチ**: 白いつまみ（背景色）と、オンの主色のトラックが消え、オンとオフの区別がつかなかった → トラック・つまみに `forced-color-adjust: none` を付け、オフ = `Canvas` のトラック + `CanvasText` の枠とつまみ、オン = `Highlight` のトラック + `HighlightText` のつまみ。
  - **ラジオ**: 丸の主色の背景と白い点が消えた → 丸は枠（`outline`）、点は `CanvasText`、選択中は `Highlight`。
  - **タブ**: 選択中の下線・文字色が消え、全部同じに見えた → 選択中は `Highlight` の背景と `HighlightText`。
  - **カラーピッカーのスライダー**: グラデーションのトラックが消えた → `forced-color-adjust: none`。
- Tailwind のクラス（`utilities` レイヤー）が `components` レイヤーのホスト CSS より優先されるため、強制色モードでの上書きには `!important` を付けた（強制色モードのときだけ効く）。
- Windows がなくても、開発者ツールの「Emulate CSS media feature forced-colors」で確認できる（`docs/manual-checks.md`）。システムカラーの実際の値は、OS・ブラウザーごとに違う（Chromium の暗い強制色では、`Highlight` は水色、`GrayText` は緑）。

**追補: 日付入力の年・月の選択（2026-09-29）**

- カレンダーの見出し（最初の月）に、月の `<select>` と年の `<input type=number>` を置いた（前後ボタンは残す）。ネイティブの部品にしたのは、キーボード・スクリーンリーダー・タッチの操作を、追加の実装なしで満たすため（月・年のグリッドを開く方式は、グリッドの a11y の実装が増える）。
- 月の名前と、年・月の並び（日本語は「年 → 月」、英語は「月 → 年」）と、年の直後の「年」は、`Intl.DateTimeFormat#formatToParts` から作る。
- `grid` の名前と `aria-live` は、隠した見出し（`part=title`。「2026年9月」）が担う。選択欄・入力欄は、別にラベル（月・年）を持つ。
- `min` / `max` の外の月は `option` を無効にし、範囲の外へは移らない（端の月に収める）。年は `change`（Enter・フォーカスを外す・矢印）で確定し、入力途中の値（`20` など）では動かさない。2 か月目以降は文字の見出しのまま。

---

## 付録 A. 将来の外部ライブラリ候補（今回は採用しない・了承後に採用）

いずれも P1 の範囲外。P1 は**自前で足りる**ため依存を増やさない。以下は採用が必要になった時点の候補で、採用時は改めて承認を得る。数値は 2026-09-29 に npm レジストリ / bundlephobia で取得（サイズは min+gz）。

### A.1 コンボボックスの絞り込み

| 観点 | **自前**（`normalize('NFKC')` + かな統一 + 部分一致/前方一致のスコア） | uFuzzy 1.0.19 | Fuse.js 7.5.0 | match-sorter 8.3.0 |
|------|------|------|------|------|
| サイズ | 約 0.5〜1 KB | 約 4.0 KB | 約 9.4 KB | 約 3.3 KB |
| ライセンス | — | MIT | Apache-2.0 | MIT |
| 更新 | — | 2025-08 | 2026-07 | 2026-04 |
| 日本語 | 全角半角・ひらがな/カタカナの正規化を制御できる | 主に英数字向け（CJK の分かち書きは弱い） | あいまい一致は可能だが正規化は別途必要 | 英語の語境界を前提 |

**提案**: 自前（依存ゼロ）。`filter` 関数プロパティを公開し、利用者が Fuse.js などを差し込めるようにする。

### A.2 日付

| 観点 | **自前**（ISO 文字列 `YYYY-MM-DD` + `Date`/`Intl`） | dayjs 1.11.23 | date-fns 4.4.0 | temporal-polyfill 1.0.5 |
|------|------|------|------|------|
| サイズ | 0 KB | 約 3.1 KB | 全体 17.5 KB（関数単位でツリーシェイク可） | 約 19.9 KB |
| ライセンス | — | MIT | MIT | MIT |
| 更新 | — | 2026-08 | 2026-05 | 2026-09 |
| 備考 | 値をタイムゾーン無しの ISO 文字列で扱えば足りる | 小さい | 関数型、型が良い | ネイティブ Temporal の普及状況は採用時に再調査 |

カレンダーの UI は `cally`（0.9.2, MIT, 約 9.5 KB）を土台にする案もあるが、a11y と日本語ロケール対応の品質を確認してから判断。**提案**: まず値は ISO 文字列、UI は自前の APG date picker dialog パターン。ライブラリが必要になれば dayjs。

### A.3 仮想スクロール

| 観点 | **@tanstack/virtual-core 3.17.11** | @lit-labs/virtualizer 2.1.1 | 自前（固定行高のみ） |
|------|------|------|------|
| サイズ | 約 7.3 KB | 未計測 | 約 1 KB |
| ライセンス | MIT | BSD-3-Clause | — |
| 更新 | 2026-09 | 2025-07（"labs"、API 変更の可能性を明示） | — |
| 性格 | フレームワーク非依存のヘッドレス | Lit ネイティブ、レイアウトも提供 | 可変高さ非対応 |

**提案**: 採用が必要になったら `@tanstack/virtual-core`。ただし仮想化は「ページ内検索が効かない」「スクリーンリーダーの行数が不正確」（`aria-rowcount` / `aria-rowindex` で補う）という a11y の代償があり、**P1 の答えはページネーション**。仮想化は 500 行を超える表など、必要が明確なときだけ。

---

## 付録 B. 用語

| 用語 | 意味 |
|------|------|
| FACE | Form-Associated Custom Element。`ElementInternals` でフォームに参加するカスタム要素 |
| APG | WAI-ARIA Authoring Practices Guide |
| トップレイヤー | `<dialog>` の `showModal()` や Popover API が要素を置く、`z-index` に依存しない最前面の層 |
| ロービングフォーカス | グループ内で 1 要素だけが `tabindex="0"` を持ち、矢印キーで移動する方式 |
| 共有シート | 全コンポーネントの Shadow root に適用する、1 つの `CSSStyleSheet` |

## 付録 C. 参照

- CSS Anchor Positioning の Baseline: <https://github.com/web-platform-dx/web-features/issues/3558> / <https://www.oddbird.net/2025/10/13/anchor-position-area-update/>（実装前に MDN で再確認）
- 各パッケージの版・ライセンス・更新日は npm レジストリ（2026-09-29 取得）
- Tailwind v4 の出力確認: `tailwindcss` 4.3.3 をコンパイルして `@property` と `@supports` フォールバックの構造を実測
