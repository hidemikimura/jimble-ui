// ビルド後に、dist へ配布用ファイルを足す。`npm run build` の最後に実行される。
//   dist/tokens.css          … 既定トークンを :root に並べたもの（編集の出発点。読み込みは必須ではない）
//   dist/themes/<名前>.css    … 既製のテーマ（tokens/themes/<名前>.generated.css。設計書 §4.9）
//   dist/density.css         … 余白の段階（tokens/density.generated.css。設計書 §23）
//   dist/templates/<名前>.html … ページのテンプレート（site/examples/templates の写し。CLI の template が読む。設計書 §18）
//   dist/cloak.css           … 未定義(まだ登録されていない)要素を隠して、ちらつきを防ぐ
//   dist/vscode.html-data.json … VS Code の HTML 補完用データ（custom-elements.json から生成）
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadElements, vscodeData } from './lib/manifest.ts'
import { themes } from './lib/tokens.ts'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')

const elements = loadElements()

// 1. tokens.css
copyFileSync(resolve(root, 'tokens/tokens.generated.css'), resolve(dist, 'tokens.css'))
copyFileSync(resolve(root, 'tokens/density.generated.css'), resolve(dist, 'density.css'))
mkdirSync(resolve(dist, 'themes'), { recursive: true })
for (const t of themes)
  copyFileSync(
    resolve(root, `tokens/themes/${t.name}.generated.css`),
    resolve(dist, `themes/${t.name}.css`),
  )

// テンプレート
const templates = readdirSync(resolve(root, 'site/examples/templates')).filter((f) =>
  f.endsWith('.html'),
)
mkdirSync(resolve(dist, 'templates'), { recursive: true })
for (const f of templates)
  copyFileSync(resolve(root, 'site/examples/templates', f), resolve(dist, 'templates', f))

// 2. cloak.css
const tags = elements.map((d) => d.tagName!).sort()
writeFileSync(
  resolve(dist, 'cloak.css'),
  `/* jimble-ui: 要素が登録される前の一瞬、中身が崩れて見えるのを防ぐ。\n   <link rel="stylesheet" href="…/cloak.css"> を <head> に置く。 */\n${tags.map((t) => `${t}:not(:defined)`).join(',\n')} {\n  visibility: hidden;\n}\n`,
)

// 3. VS Code の HTML カスタムデータ
writeFileSync(
  resolve(dist, 'vscode.html-data.json'),
  JSON.stringify(vscodeData(elements), null, 2) + '\n',
)

console.log(
  `postbuild: ${elements.length} 要素の tokens.css / cloak.css / vscode.html-data.json と、${themes.length} 個のテーマ、${templates.length} 個のテンプレートを出力`,
)
