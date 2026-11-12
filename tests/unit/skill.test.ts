// AI 向けの skill が、実装と食い違っていないことを保証する。
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadElements } from '../../scripts/lib/manifest.ts'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const main = read('skills/jimble-ui/SKILL.md')
const refNames = readdirSync(resolve(root, 'skills/jimble-ui/references')).sort()
// SKILL.md と references/ の全体(コード例の検査は、注意書きを移した先も対象にする)
const skill = [main, ...refNames.map((n) => read(`skills/jimble-ui/references/${n}`))].join('\n')
const elements = loadElements()
const byTag = new Map(elements.map((e) => [e.tagName, e]))

// どの要素にも書ける属性(グローバル属性、イベントハンドラー、aria-*、data-*、フォーム関連の form)
const GLOBAL =
  /^(id|class|style|slot|hidden|title|lang|dir|tabindex|autofocus|form|role|on[a-z-]+|aria-[\w-]+|data-[\w-]+)$/

describe('skill(AI 向けの使い方)', () => {
  it('パッケージ同梱の skill と、リポジトリの .claude/skills の skill が同じ', () => {
    expect(read('.claude/skills/jimble-ui/SKILL.md')).toBe(main)
    expect(readdirSync(resolve(root, '.claude/skills/jimble-ui/references')).sort()).toEqual(
      refNames,
    )
    for (const n of refNames)
      expect(read(`.claude/skills/jimble-ui/references/${n}`)).toBe(
        read(`skills/jimble-ui/references/${n}`),
      )
  })

  it('SKILL.md が短く保たれ、すべての references/ を案内している', () => {
    expect(main.length).toBeLessThan(24 * 1024)
    for (const n of refNames) expect(main, n).toContain(`references/${n}`)
  })

  it('frontmatter に name と description(いつ使うか)がある', () => {
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(main)?.[1] ?? ''
    expect(fm).toMatch(/^name: jimble-ui$/m)
    expect(fm).toMatch(/^description: .{60,}$/m)
    expect(fm).toContain('jimble-')
  })

  it('全部の要素が「コンポーネント早見」に載っている', () => {
    for (const e of elements) expect(main, e.tagName).toContain(`**\`${e.tagName}\`**`)
  })

  it('展開されていないプレースホルダーが無い', () => {
    // 目印の形だけを見る(コードエディタの例などの {{customer_name}} は、ふつうの文字)
    expect(skill).not.toMatch(/\{\{(?:components|icons)\}\}|\{\{[a-z]+:/)
  })

  it('コード例に出てくる jimble-* タグは、すべて実在する', () => {
    const used = new Set([...skill.matchAll(/<(jimble-[a-z-]+)/g)].map((m) => m[1]!))
    expect(used.size).toBeGreaterThan(15)
    for (const tag of used) expect(byTag.has(tag), `${tag} は実在しない`).toBe(true)
  })

  it('コード例で jimble-* タグに付けている属性は、すべてその要素の API にある', () => {
    const problems: string[] = []
    for (const m of skill.matchAll(/<(jimble-[a-z-]+)((?:\s+[^\s>=]+(?:="[^"]*")?)*)\s*\/?>/g)) {
      const tag = m[1]!
      const decl = byTag.get(tag)
      if (!decl) continue
      const known = new Set((decl.attributes ?? []).map((a) => a.name))
      for (const a of m[2]!.matchAll(/\s+([^\s>=]+)(?:="[^"]*")?/g)) {
        const name = a[1]!
        if (!known.has(name) && !GLOBAL.test(name)) problems.push(`<${tag}> に未定義の属性 ${name}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('メニュー等の子要素の説明が、親のページ(存在するページ)を指している', () => {
    // 早見では、子の要素にだけ「説明: `親` のページ」を書く(各要素のページの URL は、冒頭に形だけ書く)
    const notes = new Map(
      [
        ...skill.matchAll(
          /- \*\*`jimble-([\w-]+)`\*\*[^\n]*\n(?:  - [^\n]*\n)*?  - 説明: `([\w-]+)` のページ/g,
        ),
      ].map((m) => [m[1]!, m[2]!]),
    )
    expect(notes.get('option')).toBe('select')
    expect(notes.get('tab')).toBe('tabs')
    expect(notes.get('table-row')).toBe('table')
    expect(notes.get('menu-item')).toBe('dropdown-menu')
    expect(notes.get('nav-item')).toBe('sidebar-nav')
    expect(notes.get('radio')).toBe('radio-group')
    expect(notes.get('toast-region')).toBe('toast')
    expect(notes.has('button')).toBe(false) // 自分のページがある要素には書かない
    // ページに存在しない名前を指していない
    const pages = new Set(elements.map((e) => e.tagName.replace(/^jimble-/, '')))
    for (const page of notes.values()) expect(pages.has(page), `${page} のページ`).toBe(true)
    expect(skill).toContain('https://hidemikimura.github.io/jimble-ui/components/<名前>/')
  })
})
