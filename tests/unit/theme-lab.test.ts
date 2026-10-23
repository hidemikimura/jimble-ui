// theme-lab(デザイナーが色を決めるサンプルサイト)が、すべての部品を試せることを保証する。
// 部品を足したら、theme-lab のページにも置く(置かないと、この試験が落ちる)。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL } from '../../theme-lab/src/catalog.ts'
import { loadElements } from '../../scripts/lib/manifest.ts'

const root = resolve(import.meta.dirname, '../..')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name)
    if (name === 'node_modules' || name === 'dist') return []
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
const labSource = [...walk(resolve(root, 'theme-lab/src')), resolve(root, 'theme-lab/index.html')]
  .filter((f) => /\.(ts|html)$/.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

// 利用者が直接は書かない部品(別の API が作る)
const IMPLICIT: Record<string, string> = {
  'jimble-toast': 'JimbleUI.toast() が作る。「部品一覧」の通知のボタンで確かめられる',
  'jimble-toast-region': 'JimbleUI.toast() が作る。「部品一覧」の通知のボタンで確かめられる',
}

describe('theme-lab', () => {
  const elements = loadElements()

  it.each(elements.map((e) => e.tagName))('%s を、ページのどこかで使っている', (tag) => {
    if (IMPLICIT[tag]) return
    expect(labSource, `${tag} が theme-lab にありません`).toMatch(new RegExp(`<${tag}[\\s>/]`))
  })

  // ---- 変数のカタログ(theme-lab/src/catalog.ts)が、公開されている変数と、theme.css に、過不足なく対応している ----
  const theme = readFileSync(resolve(root, 'theme-lab/src/theme.css'), 'utf8')
  const published = new Set(
    elements
      .flatMap((e) => e.cssProperties ?? [])
      .map((p) => p.name)
      .filter((n) => /^--jimble-[a-z0-9-]+$/.test(n)),
  )
  const tokens = new Set(
    [
      ...readFileSync(resolve(root, 'tokens/tokens.generated.css'), 'utf8').matchAll(
        /^\s*(--jimble-[a-z0-9-]+):/gm,
      ),
    ].map((m) => m[1]!),
  )
  const catalog = new Map(ALL.map((e) => [e.name, e]))

  it('カタログに、重複がなく、種類ごとの必要な情報がそろっている', () => {
    expect(catalog.size).toBe(ALL.length) // 名前の重複なし
    for (const e of ALL) {
      expect(e.label, `${e.name} の説明がありません`).not.toBe('')
      if (e.kind === 'select')
        expect(e.options?.length, `${e.name} の選択肢がありません`).toBeGreaterThan(0)
    }
  })

  it('公開されているすべての CSS 変数（部品の cssprop）が、カタログにある', () => {
    expect(published.size).toBeGreaterThan(60)
    const missing = [...published].filter((n) => !catalog.has(n))
    expect(missing, `カタログにない変数: ${missing.join(', ')}`).toEqual([])
  })

  it('すべてのトークン（--jimble-color-* ・角丸・影・文字・動きなど）が、カタログにある', () => {
    expect(tokens.size).toBeGreaterThan(90)
    const missing = [...tokens].filter((n) => !catalog.has(n))
    expect(missing, `カタログにないトークン: ${missing.join(', ')}`).toEqual([])
  })

  it('カタログにあって、ライブラリに無い変数（古い名前・書き間違い）がない', () => {
    const stale = ALL.map((e) => e.name).filter((n) => !published.has(n) && !tokens.has(n))
    expect(stale, `存在しない変数: ${stale.join(', ')}`).toEqual([])
  })

  it('theme.css に、カタログのすべての変数がある（上級以外は、有効な宣言。上級は、コメントアウト）', () => {
    const active = new Set([...theme.matchAll(/^\s*(--jimble-[a-z0-9-]+):/gm)].map((m) => m[1]!))
    const anywhere = new Set([...theme.matchAll(/(--jimble-[a-z0-9-]+):/g)].map((m) => m[1]!))
    for (const e of ALL) {
      if (e.opt)
        expect(anywhere.has(e.name), `${e.name} が theme.css にありません（上級）`).toBe(true)
      else
        expect(active.has(e.name), `${e.name} が theme.css に、有効な宣言としてありません`).toBe(
          true,
        )
    }
  })
})

describe('theme-lab: 「透明」ボタンを出す変数', () => {
  const transparentOk = ALL.filter((e) => e.transparent)
  it('色の変数だけで、hover の背景などが入っている', () => {
    for (const e of transparentOk) expect(e.kind, e.name).toBe('color')
    const names = transparentOk.map((e) => e.name)
    for (const n of [
      '--jimble-icon-button-hover-bg',
      '--jimble-button-ghost-bg-hover',
      '--jimble-table-row-hover-bg',
      '--jimble-color-item-hover',
    ])
      expect(names, n).toContain(n)
  })
  it('文字の色や、ふつうの背景には出さない', () => {
    const names = ALL.filter((e) => e.transparent).map((e) => e.name)
    for (const n of ['--jimble-color-text', '--jimble-color-surface', '--jimble-button-fg'])
      expect(names, n).not.toContain(n)
  })
})
