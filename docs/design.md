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
| `emit(name, options)` | `jimble-` を自動付与して CustomEvent を発火。既定 `bubbles: true, composed: true`。`detail` は型付き |
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
- **スクロールロック**: `<dialog>` は背面のスクロールを止めないため、`ScrollLockController` が参照カウント式で `<html>` に `overflow: hidden` と `scrollbar-gutter: stable` を設定する。

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
| イベント | `jimble-` + kebab-case。過去形/現在形は下記。`bubbles: true, composed: true`。`detail` は型付き |
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
