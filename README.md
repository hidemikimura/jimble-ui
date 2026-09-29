# @hidemikimura/jimble-ui

管理画面向けの UI コンポーネントライブラリです。**素の HTML に `<script>` を 1 行足すだけ**で使える Web Components（Lit 3 + Tailwind CSS v4）で、React などのラッパーは同梱していません。

- 30 種類のコンポーネント: app-shell、sidebar-nav、page-header、card、button、badge、spinner、icon、input、textarea、select、combobox、date-input、color-input、file-input、checkbox、radio-group、switch、field、table、description-list、dialog、drawer、toast、tooltip、alert、dropdown-menu、tabs、breadcrumb、pagination
- **密度を詰めたデザイン**（既定のコントロールの高さは 36px）。インディゴのアクセント、`shadow-sm` + `ring` の縁取り
- **アクセシビリティ**: WCAG 2.2 AA と WAI-ARIA Authoring Practices を目標に、キーボード操作・フォーカス管理・コントラストを自動テストで守っています
- **日本語が既定**で、辞書を差し替えれば他の言語にできます。IME の変換中の Enter / Esc で誤動作しません
- **カスタマイズ**は CSS 変数 → `::part()` → スロットの順（内部のクラス名は公開 API ではありません）
- 対応ブラウザ: Chrome / Edge / Firefox / Safari の**最新 2 バージョン**

ドキュメントとすべての例: <https://hidemikimura.github.io/jimble-ui/>

## 使い方

### CDN から（素の HTML）

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/jimble-ui.js"
></script>

<jimble-button variant="primary" onclick="JimbleUI.toast.success('保存しました')"
  >保存</jimble-button
>
```

依存（Lit）も同梱されています。`0` の部分はバージョンの範囲です（1.0 までは、マイナーバージョンが変わると互換性が壊れることがあるため、`@0.1` のように固定するのを勧めます）。要素が登録される前の一瞬のちらつきが気になる場合は、`<head>` に次を足します。

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cloak.css"
/>
```

### npm から

```sh
npm install @hidemikimura/jimble-ui
```

```ts
import '@hidemikimura/jimble-ui' // すべてを登録
import '@hidemikimura/jimble-ui/button' // 使うものだけ(個別 import)
import { toast } from '@hidemikimura/jimble-ui/toast'
```

型定義（`HTMLElementTagNameMap` を含む）が付いています。VS Code で HTML の補完を効かせるには、`.vscode/settings.json` に次を足します。

```json
{ "html.customData": ["./node_modules/@hidemikimura/jimble-ui/dist/vscode.html-data.json"] }
```

## AI（Claude Code など）から使う

AI が jimble-ui を正しく使うための **skill** を同梱しています。プロジェクトの `.claude/skills/` に置くと、Claude Code が自動で使います。

```sh
mkdir -p .claude/skills
cp -r node_modules/@hidemikimura/jimble-ui/skills/jimble-ui .claude/skills/
```

全要素の属性・イベント、間違えやすい点、そのまま使える断片が入っています。詳しくは、ドキュメントの「AI から使う」を参照してください。

## カスタマイズ

```css
/* 1. CSS 変数: 色・角丸・高さなど。ページのどこかに書けば全部品に届きます */
:root {
  --jimble-color-primary-600: #0f766e;
}
jimble-button.round {
  --jimble-button-radius: 9999px;
}

/* 2. ::part(): 変数で足りない調整 */
jimble-button::part(label) {
  letter-spacing: 0.05em;
}
```

3 つ目の手段はスロットです（アイコンや操作を自分の HTML に置き換えられます）。トークンの一覧と詳しい説明は、ドキュメントの「テーマとカスタマイズ」にあります。

## 言語

```ts
import { setLocale } from '@hidemikimura/jimble-ui/i18n'
import en from '@hidemikimura/jimble-ui/locales/en'
setLocale(en)
```

## 開発

```sh
npm ci
npx playwright install chromium firefox webkit
npm test              # 単体 + 3 エンジンのブラウザテスト(axe を含む)
npm run test:e2e      # ドキュメントサイトに対する E2E
npm run dev:site      # ドキュメントサイトを起動
npm run build         # dist/ を作る
```

設計は [docs/design.md](docs/design.md)、手順は [CONTRIBUTING.md](CONTRIBUTING.md)、リリースは [docs/release.md](docs/release.md) を参照してください。

## ライセンス

MIT。同梱物のライセンス表記は [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) にあります。

---

## English (summary)

A UI component library for admin screens, built as Web Components (Lit 3 + Tailwind CSS v4). Add one `<script type="module">` line to plain HTML and use `<jimble-button>`, `<jimble-table>`, `<jimble-dialog>` and 19 more. Japanese is the default UI language; call `setLocale(en)` for English. Targets WCAG 2.2 AA and the WAI-ARIA Authoring Practices, and supports the latest two versions of Chrome, Edge, Firefox and Safari. Documentation is currently in Japanese. MIT licensed.
