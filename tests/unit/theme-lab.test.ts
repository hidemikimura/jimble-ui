// theme-lab(デザイナーが色を決めるサンプルサイト)が、すべての部品を試せることを保証する。
// 部品を足したら、theme-lab のページにも置く(置かないと、この試験が落ちる)。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
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

  it('ヘッダー・サイドバーの色・アイコンの CSS 変数が、theme.css に全部ある（部品の cssprop と同じ）', () => {
    const theme = readFileSync(resolve(root, 'theme-lab/src/theme.css'), 'utf8')
    const props = elements
      .filter((e) => ['jimble-app-shell', 'jimble-sidebar-nav'].includes(e.tagName))
      .flatMap((e) => e.cssProperties ?? [])
      .map((p) => p.name)
      .filter((n) =>
        /^--jimble-(app-shell-(header|sidebar)|sidebar-nav)-.*(bg|text|ring|color|size|focus)$/.test(
          n,
        ),
      )
    expect(props.length).toBeGreaterThan(8)
    for (const name of props)
      expect(theme, `${name} が theme.css にありません`).toContain(`${name}:`)
  })
})
