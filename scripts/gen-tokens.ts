// tokens/tokens.json → src/styles/theme.generated.css (@theme inline) と tokens/tokens.generated.css (:root)
// tokens/themes/<名前>.json → tokens/themes/<名前>.generated.css（既製のテーマ。dist/themes/<名前>.css として配る）
// 実行: node scripts/gen-tokens.ts [--check]   （--check は生成物が最新か確認するだけ）
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  aliases,
  all,
  byName,
  themeCss,
  themeRaw,
  themes,
  tokenDefault,
  tokenRef,
} from './lib/tokens.ts'

const root = resolve(import.meta.dirname, '..')
const banner =
  '/* 生成物: scripts/gen-tokens.ts が tokens/tokens.json から作る。直接編集しない。 */\n'

let theme = `${banner}@theme inline {\n  --color-*: initial;\n`
for (const t of all) {
  if (!t.theme) continue
  // 既定値は :host / :root に置かず var() のフォールバックで持つ（設計書 §4.4 / F2）
  theme += `  ${t.theme}: var(--jimble-${t.name}, ${tokenDefault(t)});\n`
  for (const [k, v] of Object.entries(t.themeExtra ?? {})) theme += `  ${k}: ${v};\n`
}
theme += themeRaw
theme += '}\n'

let tokensCss = `${banner}:root {\n`
for (const t of all) tokensCss += `  --jimble-${t.name}: ${tokenRef(t)};\n`
tokensCss += '}\n'

// ホスト用 CSS(*.host.css)から使う色のエイリアス。既定値を二重に書かずに済む。
// `:host` に `--_c-*` として置く（利用者が上書きする `--jimble-*` は宣言せず、var() で読むだけ）
let aliasCss = `${banner}@layer base {\n  :host {\n`
for (const name of aliases) {
  if (!byName.has(name)) throw new Error(`aliases に未定義のトークン: ${name}`)
  aliasCss += `    --_c-${name.replace(/^color-/, '')}: var(--jimble-${name}, ${tokenDefault(byName.get(name)!)});\n`
}
aliasCss += '  }\n}\n'

// 既製のテーマ（設計書 §4.9）
const themeOutputs = themes.map((t): [string, string] => [
  `tokens/themes/${t.name}.generated.css`,
  `/* 生成物: scripts/gen-tokens.ts が tokens/themes/${t.name}.json から作る。直接編集しない。 */
/* jimble-ui テーマ「${t.name}」: ${t.description}
   ページ全体に: <link rel="stylesheet" href="…/themes/${t.name}.css"> を読み込む。
   ページの一部だけ: 読み込んだうえで、要素に data-jimble-theme="${t.name}" を付ける。 */
${themeCss(t)}`,
])

const outputs: [string, string][] = [
  ['src/styles/aliases.generated.css', aliasCss],
  ['src/styles/theme.generated.css', theme],
  ['tokens/tokens.generated.css', tokensCss],
  ...themeOutputs,
]

const check = process.argv.includes('--check')
let stale = false
for (const [rel, content] of outputs) {
  const path = resolve(root, rel)
  if (check) {
    let cur = ''
    try {
      cur = readFileSync(path, 'utf8')
    } catch {
      /* 無ければ古い扱い */
    }
    if (cur !== content) {
      stale = true
      console.error(`古い生成物: ${rel}（npm run gen:tokens を実行してください）`)
    }
  } else {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
    console.log(`生成: ${rel}`)
  }
}
// 元の .json を消したテーマの、残った生成物
const expected = new Set(themeOutputs.map(([rel]) => rel))
for (const f of readdirSync(resolve(root, 'tokens/themes'))) {
  const rel = `tokens/themes/${f}`
  if (!f.endsWith('.generated.css') || expected.has(rel)) continue
  if (check) {
    stale = true
    console.error(`元のないテーマの生成物: ${rel}（npm run gen:tokens を実行してください）`)
  } else {
    rmSync(resolve(root, rel))
    console.log(`削除: ${rel}`)
  }
}
if (stale) process.exit(1)
