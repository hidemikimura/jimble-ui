// tokens/tokens.json の読み込みと参照解決。gen-tokens とテスト(コントラスト契約)が共有する。
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)

export type Token = {
  name: string
  theme?: string
  value: string
  themeExtra?: Record<string, string>
}
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

/** var(--jimble-x, <x の解決済み既定値>) に展開（フォールバックまで含めて完全に展開） */
export const resolveFull = (raw: string, seen: string[] = []): string =>
  expand(raw, (ref, s) => `var(--jimble-${ref}, ${resolveFull(byName.get(ref)!.value, s)})`, seen)

/** tokens.css 用: 参照は var(--jimble-x) のまま（スケールを編集すればロールが追従する） */
export const resolveRef = (raw: string): string => expand(raw, (ref) => `var(--jimble-${ref})`)

/** 参照を全て既定値のリテラルに解決した値（テスト用） */
export const defaultValue = (name: string): string => {
  const t = byName.get(name)
  if (!t) throw new Error(`未定義のトークン: ${name}`)
  const walk = (raw: string, seen: string[]): string =>
    expand(raw, (ref, s) => walk(byName.get(ref)!.value, s), seen)
  return walk(t.value, [name])
}
