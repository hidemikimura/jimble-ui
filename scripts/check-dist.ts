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

// (c) サイズ予算（設計書 §2.6。2026-09-29 の実測: 共有チャンク 10.0 KB / 最大の部品 2.9 KB / CDN 39.8 KB gz にゆとりを持たせた値）
const kb = (n: number) => (n / 1024).toFixed(1)
const gz = (f: string) => gzipSync(readFileSync(f)).length
const BUDGET = {
  /** 共有シート(CSS) + 基底クラス + i18n を含むチャンク */
  shared: 16 * 1024,
  /** それ以外の JS(部品 1 つぶんなど) */
  each: 9 * 1024,
  /** CDN バンドル(全部品 + Lit + @lit/context) */
  cdn: 100 * 1024,
}
const sizes = js.map((f) => [f, gz(f)] as const)
const sharedFile = cssHolder[0]?.[0]
for (const [f, size] of sizes) {
  const limit = f === sharedFile ? BUDGET.shared : BUDGET.each
  if (size > limit)
    fail(`${f.replace(dist + '/', '')} が予算超過: ${kb(size)} KB > ${kb(limit)} KB (gz)`)
}
if (!existsSync(cdn)) fail(`CDN バンドル: ${cdn} がありません`)
else {
  const size = gz(cdn)
  console.log(`CDN バンドル: ${kb(size)} KB gz (予算 ${kb(BUDGET.cdn)} KB)`)
  if (size > BUDGET.cdn) fail(`CDN バンドルが予算超過: ${kb(size)} KB > ${kb(BUDGET.cdn)} KB`)
}
const shared = sizes.find(([f]) => f === sharedFile)
if (shared)
  console.log(
    `共有チャンク(共有シート + 基底): ${kb(shared[1])} KB gz (予算 ${kb(BUDGET.shared)} KB)`,
  )
const largest = [...sizes].filter(([f]) => f !== sharedFile).sort((a, b) => b[1] - a[1])[0]
if (largest)
  console.log(
    `最大の部品チャンク: ${kb(largest[1])} KB gz (予算 ${kb(BUDGET.each)} KB) ${largest[0].replace(dist + '/', '')}`,
  )

// (e) src の Tailwind クラスが、すべて CSS に出ている。
// Tailwind は、定義のないクラス(theme に無い色・太さ・z-index、空白のない calc など)の CSS を、エラーも出さずに捨てる。
// 「書いたのに効いていない」クラスを、公開の前に見つける(bg-white・font-semibold・z-sticky で実際に起きた)
{
  const css = readFileSync(cdn, 'utf8').replaceAll('\\\\', '\\')
  // クラスの先頭の部分(ユーティリティ名)。これに当てはまるものだけを、クラスとして検査する
  const UTILITY =
    /^(bg|text|ring|border|shadow|outline|rounded|p|px|py|pt|pb|ps|pe|m|mx|my|mt|mb|ms|me|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h|size|flex|grid|inline|items|justify|self|place|col|row|top|left|right|bottom|inset|inset-x|inset-y|start|end|z|overflow|opacity|transition|duration|cursor|select|font|leading|tracking|truncate|whitespace|rotate|translate|scale|shrink|grow|order|aspect|space|divide|accent|fill|stroke|underline|appearance|pointer-events|list|object|tabular)(-|$)/
  const srcFiles = walk(join(root, 'src')).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  )
  const missing = new Map<string, Set<string>>()
  for (const file of srcFiles) {
    // コメント(JSDoc など)の中の言葉は、クラスではない
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    for (const lit of text.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
      const body = (lit[1] ?? lit[2] ?? lit[3] ?? '').replace(/\$\{[^}]*\}/g, ' ')
      // クラスを含む文字列だけを見る(日本語の文言・属性名などを除く)
      if (
        !/\b(flex|grid|bg-|text-|ring-|px-|py-|rounded|size-|gap-|border|shadow|items-|justify-)/.test(
          body,
        )
      )
        continue
      for (const raw of body.split(/[\s"'`<>]+/)) {
        let token = raw.replace(/^[,;:]+|[,;:)}\\]+$/g, '')
        while (
          token.endsWith(')') &&
          (token.match(/\(/g)?.length ?? 0) < (token.match(/\)/g)?.length ?? 0)
        )
          token = token.slice(0, -1)
        if (!token || token.includes('${')) continue
        // 先頭の variant(hover: / md: / [&_x]: など)を外して、ユーティリティ名を見る
        const core = token
          .replace(/^(?:(?:\[[^\]]*\]|[a-z@\d\-*=&>.%_()[\]]+?):)+/, '')
          .replace(/^[!-]+/, '')
        if (!UTILITY.test(core)) continue
        const escaped = token.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
        if (!css.includes('.' + escaped)) {
          const set = missing.get(token) ?? new Set<string>()
          set.add(file.replace(root + '/', ''))
          missing.set(token, set)
        }
      }
    }
  }
  for (const [token, where] of missing)
    fail(
      `CSS が出ていないクラス: ${token}（${[...where].join(', ')}）。Tailwind に定義がないか、書き方が違う`,
    )
}

// (d) 配布用ファイルが揃っている
for (const f of [
  'tokens.css',
  'cloak.css',
  'vscode.html-data.json',
  'cdn/locales/en.js',
  'i18n.js',
  'locales/en.js',
]) {
  if (!existsSync(join(dist, f))) fail(`dist/${f} がありません`)
}
if (!existsSync(join(root, 'custom-elements.json'))) fail('custom-elements.json がありません')
if (!existsSync(join(root, 'skills/jimble-ui/SKILL.md')))
  fail('skills/jimble-ui/SKILL.md がありません(npm run gen:skill)')
if (!existsSync(join(root, 'skills/jimble-ui/references')))
  fail('skills/jimble-ui/references/ がありません(npm run gen:skill)')

if (errors.length) {
  console.error('\ncheck-dist 失敗:\n' + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
console.log('check-dist OK')
