// theme-lab の theme.css の整理（同じ変数を 1 回だけにする）と、調整した値の書き込み。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyOverrides, dedupe, findDuplicates, scanDecls } from '../../theme-lab/src/merge.ts'

const root = resolve(import.meta.dirname, '../..')
const decl = (css: string, name: string) => scanDecls(css).find((d) => d.name === name)?.value

// 実際に起きた形: ひな形 → 調整した値 → もう一度、調整した値
const SAMPLE = `/* 先頭のコメント */
:root {
  /* ---- 角丸 ----
     badge = バッジ  --jimble-fake-in-comment: 1px;
  */
  --jimble-badge-radius: var(--jimble-radius-md);
  --jimble-dialog-radius: var(--jimble-radius-overlay);
  --jimble-color-backdrop: color-mix(
    in oklab,
    var(--jimble-color-neutral-900) 50%,
    transparent
  );
  --jimble-sidebar-nav-icon-size: 1.25rem;

  /* ---- 上級（コメントアウト）
  --jimble-button-bg: #4f46e5;
  */

  --jimble-badge-radius: .9rem;
  --jimble-dialog-radius: .75rem;
  --jimble-sidebar-nav-icon-size: 1.25rem;
  --jimble-font-sans: system-ui, 'Noto Sans JP; x', sans-serif;

  --jimble-badge-radius: 9999px;
  --jimble-dialog-radius: .5rem;
  --jimble-color-backdrop: #101828;
}
`

describe('scanDecls', () => {
  it('コメントの中の宣言は数えず、複数行の値と、引用符の中の ; も、1 つの宣言として読む', () => {
    const names = scanDecls(SAMPLE).map((d) => d.name)
    expect(names).not.toContain('--jimble-fake-in-comment')
    expect(names).not.toContain('--jimble-button-bg')
    expect(decl(SAMPLE, '--jimble-color-backdrop')).toContain('color-mix(')
    expect(decl(SAMPLE, '--jimble-font-sans')).toBe("system-ui, 'Noto Sans JP; x', sans-serif")
  })
})

describe('findDuplicates', () => {
  it('同じ変数の、値と行番号を、書かれた順に返す。同じ値の重複も数える', () => {
    const dup = findDuplicates(SAMPLE)
    const badge = dup.find((d) => d.name === '--jimble-badge-radius')!
    expect(badge.values).toEqual(['var(--jimble-radius-md)', '.9rem', '9999px'])
    expect(badge.lines).toHaveLength(3)
    expect(dup.map((d) => d.name)).toContain('--jimble-sidebar-nav-icon-size')
    expect(dup.map((d) => d.name)).not.toContain('--jimble-font-sans')
  })
})

describe('dedupe', () => {
  it('同じ変数を 1 回だけにする。値は、いちばん下の行の値', () => {
    const { css } = dedupe(SAMPLE)
    expect(findDuplicates(css)).toEqual([])
    expect(decl(css, '--jimble-badge-radius')).toBe('9999px')
    expect(decl(css, '--jimble-dialog-radius')).toBe('.5rem')
    expect(decl(css, '--jimble-color-backdrop')).toBe('#101828')
    expect(decl(css, '--jimble-sidebar-nav-icon-size')).toBe('1.25rem')
  })

  it('位置と説明のコメントは、いちばん上の行に残る。コメントアウトした宣言は触らない', () => {
    const { css } = dedupe(SAMPLE)
    expect(css).toContain('/* 先頭のコメント */')
    expect(css).toContain('badge = バッジ')
    expect(css).toContain('--jimble-button-bg: #4f46e5;') // コメントの中
    expect(css.indexOf('--jimble-badge-radius')).toBeLessThan(css.indexOf('--jimble-dialog-radius'))
    expect(css.indexOf('--jimble-badge-radius')).toBeLessThan(css.indexOf('上級'))
  })

  it('消したあとに、空行が連なって残らない。もう一度かけても変わらない', () => {
    const once = dedupe(SAMPLE).css
    expect(once).not.toMatch(/\n[ \t]*\n[ \t]*\n/)
    expect(dedupe(once).css).toBe(once)
  })

  it('重複がなければ、そのまま返す', () => {
    const clean = ':root {\n  --jimble-a: 1px;\n  --jimble-b: 2px;\n}\n'
    expect(dedupe(clean)).toEqual({ css: clean, duplicates: [] })
  })
})

describe('applyOverrides', () => {
  const overrides = new Map([
    ['--jimble-dialog-radius', '1rem'],
    ['--jimble-button-bg', '#0f766e'], // ひな形にない（コメントアウトの中にしかない）
  ])

  it('書いてある変数は、その行の値を置き換える。同じ変数が重なっていれば、1 回にする', () => {
    const css = applyOverrides(SAMPLE, overrides)
    expect(findDuplicates(css)).toEqual([])
    expect(decl(css, '--jimble-dialog-radius')).toBe('1rem')
    expect(decl(css, '--jimble-badge-radius')).toBe('9999px') // 調整していない変数は、いちばん下の値のまま
  })

  it('ひな形にない変数は、:root の最後に足す。コメントは残る', () => {
    const css = applyOverrides(SAMPLE, overrides)
    expect(decl(css, '--jimble-button-bg')).toBe('#0f766e')
    expect(css.indexOf('--jimble-button-bg: #0f766e')).toBeGreaterThan(css.indexOf('上級'))
    expect(css.trimEnd().endsWith('}')).toBe(true)
    expect(css).toContain('badge = バッジ')
  })

  it('何度書き出しても、同じ変数は 1 回だけ（足し続けない）', () => {
    const once = applyOverrides(SAMPLE, overrides)
    const twice = applyOverrides(once, new Map([...overrides, ['--jimble-dialog-radius', '2rem']]))
    expect(findDuplicates(twice)).toEqual([])
    expect(decl(twice, '--jimble-dialog-radius')).toBe('2rem')
    expect(scanDecls(twice).length).toBe(scanDecls(once).length)
  })

  it('調整がなければ、重複の整理だけをする', () => {
    expect(applyOverrides(SAMPLE, new Map())).toBe(dedupe(SAMPLE).css)
  })
})

describe('theme-lab/src/theme.css', () => {
  it('同じ変数が、複数回書かれていない（いちばん下の行だけが効くため）', () => {
    const css = readFileSync(resolve(root, 'theme-lab/src/theme.css'), 'utf8')
    expect(findDuplicates(css).map((d) => d.name)).toEqual([])
  })
})
