// 同じ要素に、`rounded-*` と `[border-radius:var(--jimble-…-radius,…)]` を両方付けると、
// 生成される CSS で後に出る `rounded-*` が勝ち（どちらも @layer utilities で、詳細度が同じ）、
// 部品固有の角丸の変数が効かなくなる。ソースの文字列から、この組み合わせを見つける。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// 文字列リテラル、または `'a ' + 'b'` のように連結された文字列(1 つの class になる)
const LITERAL = String.raw`(?:'[^'\n]*'|"[^"\n]*"|` + '`[^`]*`)'
const CHAIN = new RegExp(`${LITERAL}(?:\\s*\\+\\s*${LITERAL})*`, 'g')
const PIECE = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g

/** 文字列リテラルの連結を、1 つの class として、`rounded-*` と `[border-radius:…]` の両方を含むものを返す */
export function conflicts(
  source: string,
): { rounded: string[]; borderRadius: string[]; line: number }[] {
  const found: { rounded: string[]; borderRadius: string[]; line: number }[] = []
  for (const chain of source.matchAll(CHAIN)) {
    const body = [...chain[0].matchAll(PIECE)]
      .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
      .join(' ')
      .replace(/\$\{[^}]*\}/g, ' ')
    const tokens = body.split(/\s+/).filter(Boolean)
    // before: / hover: などの variant つきは、別の要素（疑似要素・状態）なので、対象外
    const rounded = tokens.filter((t) => /^rounded(-|$)/.test(t))
    const borderRadius = tokens.filter((t) => t.startsWith('[border-radius:'))
    if (rounded.length && borderRadius.length)
      found.push({ rounded, borderRadius, line: source.slice(0, chain.index).split('\n').length })
  }
  return found
}

describe('rounded-* と [border-radius:…] を、同じ要素に付けない', () => {
  it('検出の自己テスト: 衝突する組み合わせを見つけ、別の要素（疑似要素）や片方だけは見逃す', () => {
    const bad = `const A = 'flex rounded-overlay bg-surface [border-radius:var(--jimble-x-radius,var(--radius-overlay))]'`
    expect(conflicts(bad)).toHaveLength(1)
    const concatenated = `const A =\n  'rounded-md p-2 ' +\n  '[border-radius:var(--jimble-x-radius,var(--radius-md))]'`
    expect(conflicts(concatenated)).toHaveLength(1)
    const pseudo = `const A = 'before:rounded-[inherit] [border-radius:var(--jimble-x-radius,var(--radius-md))]'`
    expect(conflicts(pseudo)).toHaveLength(0)
    expect(conflicts(`const A = 'rounded-md p-2'`)).toHaveLength(0)
    expect(
      conflicts(`const A = '[border-radius:var(--jimble-x-radius,var(--radius-md))]'`),
    ).toHaveLength(0)
  })

  it('src の部品に、衝突している箇所がない', () => {
    const files = walk(join(root, 'src')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    )
    const problems = files.flatMap((f) =>
      conflicts(readFileSync(f, 'utf8')).map(
        (c) => `${relative(root, f)}:${c.line}  ${c.rounded.join(' ')} と ${c.borderRadius[0]}`,
      ),
    )
    expect(
      problems,
      '同じ要素に rounded-* と [border-radius:…] があります。rounded-* を外してください（既定値は、任意値のフォールバックが持ちます）',
    ).toEqual([])
  })
})
