// tokens/tokens.json の読み込みと参照解決。gen-tokens とテスト(コントラスト契約)が共有する。
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)

export type Token = {
  name: string
  theme?: string
  value: string
  /** ダークモード（color-scheme: dark）での値。あれば既定値を light-dark(value, dark) にする */
  dark?: string
  themeExtra?: Record<string, string>
}
export type Scheme = 'light' | 'dark'
type Scale = { from: string; steps: number[] }
type Source = {
  scales: Record<string, Scale>
  tokens: Token[]
  themeRaw?: string
  aliases?: string[]
}

const src = JSON.parse(readFileSync(resolve(root, 'tokens/tokens.json'), 'utf8')) as Source

// tailwindcss/theme.css から `--name: value;` を全部拾う
const twTheme = new Map<string, string>()
for (const m of readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8').matchAll(
  /^\s*(--[\w-]+):\s*([^;]+);/gm,
)) {
  twTheme.set(m[1]!, m[2]!.trim().replace(/\s+/g, ' '))
}
const tw = (name: string): string => {
  const v = twTheme.get(name)
  if (!v) throw new Error(`tailwindcss/theme.css に ${name} がありません`)
  return v
}

export const themeRaw = src.themeRaw ?? ''
export const aliases = src.aliases ?? []

export const all: Token[] = []
for (const [scale, { from, steps }] of Object.entries(src.scales)) {
  for (const step of steps) {
    all.push({
      name: `color-${scale}-${step}`,
      theme: `--color-${scale}-${step}`,
      value: `@tw(--color-${from}-${step})`,
    })
  }
}
all.push(...src.tokens)

export const byName = new Map(all.map((t) => [t.name, t]))
if (byName.size !== all.length) throw new Error('トークン名が重複しています')

const literal = (raw: string): string => {
  const m = /^@tw\((--[\w-]+)\)$/.exec(raw)
  return m ? tw(m[1]!) : raw
}

const expand = (
  raw: string,
  replacer: (ref: string, seen: string[]) => string,
  seen: string[] = [],
): string =>
  literal(raw).replace(/\{([\w-]+)\}/g, (_, ref: string) => {
    if (!byName.has(ref)) throw new Error(`未定義のトークン参照: {${ref}}`)
    if (seen.includes(ref)) throw new Error(`循環参照: ${[...seen, ref].join(' → ')}`)
    return replacer(ref, [...seen, ref])
  })

/** トークン自身の既定値。dark があれば light-dark(明, 暗) で包む（設計書 §4.8） */
const withScheme = (t: Token, resolve: (raw: string) => string): string =>
  t.dark ? `light-dark(${resolve(t.value)}, ${resolve(t.dark)})` : resolve(t.value)

/** var(--jimble-x, <x の解決済み既定値>) に展開（フォールバックまで含めて完全に展開） */
export const resolveFull = (raw: string, seen: string[] = []): string =>
  expand(
    raw,
    (ref, s) => `var(--jimble-${ref}, ${withScheme(byName.get(ref)!, (r) => resolveFull(r, s))})`,
    seen,
  )

/** トークンの既定値（var() のフォールバックに置く値） */
export const tokenDefault = (t: Token): string => withScheme(t, (r) => resolveFull(r, [t.name]))

/** tokens.css 用: 参照は var(--jimble-x) のまま（スケールを編集すればロールが追従する） */
export const resolveRef = (raw: string): string => expand(raw, (ref) => `var(--jimble-${ref})`)

/** tokens.css 用のトークンの値 */
export const tokenRef = (t: Token): string => withScheme(t, resolveRef)

/**
 * 参照を全て既定値のリテラルに解決した値（テスト用）。scheme でライト・ダークを選ぶ。
 * theme を渡すと、そのテーマが上書きするトークンはテーマの値を使う（設計書 §4.9）
 */
export const defaultValue = (name: string, scheme: Scheme = 'light', theme?: Theme): string => {
  const lookup = (n: string): Token => theme?.overrides.get(n) ?? byName.get(n)!
  const pick = (t: Token) => (scheme === 'dark' && t.dark ? t.dark : t.value)
  if (!byName.has(name)) throw new Error(`未定義のトークン: ${name}`)
  const walk = (raw: string, seen: string[]): string =>
    expand(raw, (ref, s) => walk(pick(lookup(ref)), s), seen)
  return walk(pick(lookup(name)), [name])
}

// ---- 既製のテーマ（設計書 §4.9）: tokens/themes/<名前>.json ----

type ThemeSource = {
  $comment?: string
  /** テーマの説明（ドキュメントに載せる） */
  description: string
  /** スケールの差し替え。値は Tailwind のパレット名（例: "slate"） */
  scales?: Record<string, string>
  /** 個別のトークンの上書き。値の書き方は tokens.json と同じ（{name} の参照、@tw()、dark） */
  tokens?: Record<string, string | { value: string; dark?: string }>
}
export type Theme = {
  name: string
  description: string
  /** テーマが上書きするトークン（tokens.json の順） */
  overrides: ReadonlyMap<string, Token>
}

const loadTheme = (name: string, theme: ThemeSource): Theme => {
  const found = new Map<string, Token>()
  for (const [scale, from] of Object.entries(theme.scales ?? {})) {
    const def = src.scales[scale]
    if (!def) throw new Error(`テーマ ${name}: 未定義のスケール: ${scale}`)
    for (const step of def.steps) {
      const n = `color-${scale}-${step}`
      found.set(n, { name: n, value: `@tw(--color-${from}-${step})` })
    }
  }
  for (const [n, v] of Object.entries(theme.tokens ?? {})) {
    if (!byName.has(n)) throw new Error(`テーマ ${name}: 未定義のトークン: ${n}`)
    found.set(n, typeof v === 'string' ? { name: n, value: v } : { name: n, ...v })
  }
  // 値の参照と @tw() が解決できることを、ここで確かめる
  for (const t of found.values()) {
    expand(t.value, () => '')
    if (t.dark) expand(t.dark, () => '')
  }
  const overrides = new Map(
    all.filter((t) => found.has(t.name)).map((t) => [t.name, found.get(t.name)!]),
  )
  return { name, description: theme.description, overrides }
}

const themesDir = resolve(root, 'tokens/themes')
export const themes: Theme[] = readdirSync(themesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) =>
    loadTheme(
      f.replace(/\.json$/, ''),
      JSON.parse(readFileSync(resolve(themesDir, f), 'utf8')) as ThemeSource,
    ),
  )

/**
 * テーマの CSS。`:where(:root)`（詳細度 0。利用者の :root の上書きが、読み込む順によらず勝つ）と、
 * `[data-jimble-theme="名前"]`（ページの一部だけ、または切り替え）の両方に効く。
 * 参照はフォールバックまで展開する（テーマが上書きしないトークンを参照しても、既定値で解決される）
 */
export const themeCss = (theme: Theme): string => {
  let css = `:where(:root),\n[data-jimble-theme='${theme.name}'] {\n`
  for (const t of theme.overrides.values())
    css += `  --jimble-${t.name}: ${withScheme(t, (r) => resolveFull(r))};\n`
  return css + '}\n'
}

// ---- 余白の段階（密度。設計書 §23）: tokens/density.json ----

export interface DensityLevel {
  name: string
  description: string
  /** 段階が上書きするトークン（名前 → 値） */
  tokens: Record<string, string>
}

const densitySrc = JSON.parse(readFileSync(resolve(root, 'tokens/density.json'), 'utf8')) as {
  levels: Record<string, { description: string; tokens: Record<string, string> }>
}
export const densities: DensityLevel[] = Object.entries(densitySrc.levels).map(([name, level]) => {
  for (const t of Object.keys(level.tokens))
    if (!byName.has(t)) throw new Error(`密度 ${name}: 未定義のトークン: ${t}`)
  return { name, description: level.description, tokens: level.tokens }
})

/**
 * 密度の CSS。`:where([data-jimble-density="名前"])`（詳細度 0）なので、利用者が書いた変数が、読み込む順によらず勝つ。
 * 入れ子の要素の宣言は、外側から継承した値より優先されるので、ページの一部だけ別の段階にもできる
 */
export const densityCss = (levels: DensityLevel[] = densities): string =>
  levels
    .map(
      (d) =>
        `/* ${d.name}: ${d.description} */\n:where([data-jimble-density='${d.name}']) {\n` +
        Object.entries(d.tokens)
          .map(([t, v]) => `  --jimble-${t}: ${v};\n`)
          .join('') +
        '}\n',
    )
    .join('\n')
