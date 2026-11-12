// 部品ごとの Do / Don't（設計書 §20）。すべての部品のページに、両方の箇条書きがあり、ページに載っている。
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOS_DIR, dosNames, parseDos, readDos } from '../../scripts/lib/dos.ts'

const root = resolve(import.meta.dirname, '../..')
const pages = readdirSync(resolve(root, 'site/content/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort()

describe("Do / Don't", () => {
  it('すべての部品のページに、site/dos/<名前>.md がある（余分なファイルもない）', () => {
    expect(dosNames()).toEqual(pages)
  })

  it.each(pages)('%s: Do と Don’t が、それぞれ 2〜6 項目ある', (name) => {
    const { doItems, dontItems } = readDos(resolve(DOS_DIR, `${name}.md`))
    for (const list of [doItems, dontItems]) {
      expect(list.length).toBeGreaterThanOrEqual(2)
      expect(list.length).toBeLessThanOrEqual(6)
    }
  })

  it.each(pages)('%s: 部品のページに ::dos がある', (name) => {
    const page = readFileSync(resolve(root, 'site/content/components', `${name}.md`), 'utf8')
    expect(page).toContain(`::dos ${name}\n`)
  })

  it('続きの行は前の項目につなぎ、見出しが欠けていれば失敗する', () => {
    const text = "## Do\n\n- 一つ目\n  続き\n- 二つ目\n\n## Don't\n\n- だめ\n"
    expect(parseDos(text)).toEqual({ doItems: ['一つ目 続き', '二つ目'], dontItems: ['だめ'] })
    expect(() => parseDos('## Do\n\n- a\n', 'x.md')).toThrow(/Don't/)
  })
})
