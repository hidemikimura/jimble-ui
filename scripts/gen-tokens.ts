// tokens/tokens.json → src/styles/theme.generated.css (@theme inline) と tokens/tokens.generated.css (:root)
// 実行: node scripts/gen-tokens.ts [--check]   （--check は生成物が最新か確認するだけ）
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { all, resolveFull, resolveRef, themeRaw } from './lib/tokens.ts'

const root = resolve(import.meta.dirname, '..')
const banner =
  '/* 生成物: scripts/gen-tokens.ts が tokens/tokens.json から作る。直接編集しない。 */\n'

let theme = `${banner}@theme inline {\n  --color-*: initial;\n`
for (const t of all) {
  if (!t.theme) continue
  // 既定値は :host / :root に置かず var() のフォールバックで持つ（設計書 §4.4 / F2）
  theme += `  ${t.theme}: var(--jimble-${t.name}, ${resolveFull(t.value)});\n`
  for (const [k, v] of Object.entries(t.themeExtra ?? {})) theme += `  ${k}: ${v};\n`
}
theme += themeRaw
theme += '}\n'

let tokensCss = `${banner}:root {\n`
for (const t of all) tokensCss += `  --jimble-${t.name}: ${resolveRef(t.value)};\n`
tokensCss += '}\n'

const outputs: [string, string][] = [
  ['src/styles/theme.generated.css', theme],
  ['tokens/tokens.generated.css', tokensCss],
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
if (stale) process.exit(1)
