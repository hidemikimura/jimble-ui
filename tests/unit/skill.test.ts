// AI 向けの skill が、実装と食い違っていないことを保証する。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadElements } from '../../scripts/lib/manifest.ts'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const skill = read('skills/jimble-ui/SKILL.md')
const elements = loadElements()
const byTag = new Map(elements.map((e) => [e.tagName, e]))

// どの要素にも書ける属性(グローバル属性、イベントハンドラー、aria-*、data-*、フォーム関連の form)
const GLOBAL =
  /^(id|class|style|slot|hidden|title|lang|dir|tabindex|autofocus|form|role|on[a-z-]+|aria-[\w-]+|data-[\w-]+)$/

describe('skill(AI 向けの使い方)', () => {
  it('パッケージ同梱の skill と、リポジトリの .claude/skills の skill が同じ', () => {
    expect(read('.claude/skills/jimble-ui/SKILL.md')).toBe(skill)
  })

  it('frontmatter に name と description(いつ使うか)がある', () => {
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? ''
    expect(fm).toMatch(/^name: jimble-ui$/m)
    expect(fm).toMatch(/^description: .{60,}$/m)
    expect(fm).toContain('jimble-')
  })

  it('全部の要素が「コンポーネント早見」に載っている', () => {
    for (const e of elements) expect(skill, e.tagName).toContain(`**\`${e.tagName}\`**`)
  })

  it('展開されていないプレースホルダーが無い', () => {
    expect(skill).not.toMatch(/\{\{|\}\}/)
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

  it('メニュー等の子要素の説明が、親のページ(存在する URL)を指している', () => {
    const urls = new Set(
      [
        ...skill.matchAll(/https:\/\/hidemikimura\.github\.io\/jimble-ui\/components\/([\w-]+)\//g),
      ].map((m) => m[1]!),
    )
    for (const page of [
      'button',
      'sidebar-nav',
      'tabs',
      'table',
      'select',
      'radio-group',
      'dropdown-menu',
      'toast',
    ]) {
      expect(urls.has(page), page).toBe(true)
    }
    // ページに存在しない名前(タグ名そのものなど)を指していない
    const pages = new Set(elements.map((e) => e.tagName.replace(/^jimble-/, '')))
    for (const u of urls) expect(pages.has(u), `${u} のページ`).toBe(true)
  })
})
