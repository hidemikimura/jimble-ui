// dist の検査（設計書 §2.6）。`npm run build` の後に実行する。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

if (!existsSync(dist)) {
  console.error('dist がありません。先に npm run build を実行してください。')
  process.exit(1)
}

const files = walk(dist)
const js = files.filter((f) => f.endsWith('.js') && !f.includes(`${join('dist', 'cdn')}/`))
const cdn = join(dist, 'cdn', 'jimble-ui.js')

// (a) CSS は JS に文字列で入る。@property の残り・生パレットの混入を検出する
const cssHolder = js
  .map((f) => [f, readFileSync(f, 'utf8')] as const)
  .filter(([, s]) => s.includes('@layer'))
if (cssHolder.length === 0) fail('共有シートの CSS を含むチャンクが見つかりません')
for (const [f, s] of cssHolder) {
  if (/@property\s+--tw-/.test(s))
    fail(`${f}: @property --tw-* が残っています（jimble-shadow-fix が効いていない）`)
  // Tailwind 既定パレットは無効化してあるので、生の色名クラスやトークン外の色変数は出ないはず
  const raw = s.match(
    /--color-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|stone)-\d+/,
  )
  if (raw) fail(`${f}: 生のパレット変数が出力に含まれています (${raw[0]})`)
  if (!/--jimble-color-primary-600/.test(s)) fail(`${f}: トークン参照が見つかりません`)
}

// (b) exports の各パスが実在する
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  exports: Record<string, string | { types?: string; default?: string }>
}
for (const [key, val] of Object.entries(pkg.exports)) {
  if (key.includes('*')) continue
  const targets = typeof val === 'string' ? [val] : Object.values(val)
  for (const t of targets)
    if (!existsSync(join(root, t))) fail(`exports["${key}"] の ${t} がありません`)
}

// (c) サイズ予算（暫定・設計書 §2.6）。M1 で実測して見直す
const kb = (n: number) => (n / 1024).toFixed(1)
const gz = (f: string) => gzipSync(readFileSync(f)).length
const budgets: [string, string, number][] = [['CDN バンドル', cdn, 100 * 1024]]
for (const [label, file, max] of budgets) {
  if (!existsSync(file)) {
    fail(`${label}: ${file} がありません`)
    continue
  }
  const size = gz(file)
  console.log(`${label}: ${kb(size)} KB gz (予算 ${kb(max)} KB)`)
  if (size > max) fail(`${label} が予算超過: ${kb(size)} KB > ${kb(max)} KB`)
}
const chunk = files
  .filter((f) => /chunks\/.*\.js$/.test(f))
  .sort((a, b) => statSync(b).size - statSync(a).size)[0]
if (chunk) console.log(`最大の共有チャンク(共有シート+基底): ${kb(gz(chunk))} KB gz`)

if (errors.length) {
  console.error('\ncheck-dist 失敗:\n' + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
console.log('check-dist OK')
