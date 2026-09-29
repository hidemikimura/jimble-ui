// icons/svg/*.svg → src/icons/<name>.ts（1 アイコン 1 モジュール。ツリーシェイクできる）
// 実行: node scripts/gen-icons.ts [--check]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const srcDir = resolve(root, 'icons/svg')
const outDir = resolve(root, 'src/icons')
const check = process.argv.includes('--check')
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
const banner = '// 生成物: scripts/gen-icons.ts が icons/svg から作る。直接編集しない。\n'

const outputs: [string, string][] = []
const names: string[] = []
for (const file of readdirSync(srcDir)
  .filter((f) => f.endsWith('.svg'))
  .sort()) {
  const name = file.replace(/\.svg$/, '')
  const svg = readFileSync(resolve(srcDir, file), 'utf8').trim()
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1]
  const fill = /<svg[^>]*\sfill="([^"]+)"/.exec(svg)?.[1] ?? 'currentColor'
  const body = svg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .trim()
  if (!viewBox) throw new Error(`${file}: viewBox がありません`)
  const id = camel(name)
  names.push(name)
  outputs.push([
    `${id}.ts`,
    `${banner}import { svg } from 'lit'\nimport type { Icon } from './render.js'\n\n` +
      `export const ${id}: Icon = {\n  viewBox: '${viewBox}',\n  fill: '${fill}',\n  body: svg\`${body}\`,\n}\n`,
  ])
}

let stale = false
mkdirSync(outDir, { recursive: true })
for (const [file, content] of outputs) {
  const path = resolve(outDir, file)
  if (check) {
    let cur = ''
    try {
      cur = readFileSync(path, 'utf8')
    } catch {
      /* 無ければ古い */
    }
    if (cur !== content) {
      stale = true
      console.error(`古い生成物: src/icons/${file}（npm run gen:icons を実行してください）`)
    }
  } else {
    writeFileSync(path, content)
  }
}
if (!check) console.log(`生成: src/icons/ (${names.join(', ')})`)
if (stale) process.exit(1)
