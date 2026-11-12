// 余白の段階（密度。設計書 §23）。tokens/density.json の決まりを確かめる。
import { describe, expect, it } from 'vitest'
import { byName, densities, densityCss, tokenDefault } from '../../scripts/lib/tokens.ts'

const px = (rem: string) => parseFloat(rem) * 16

describe('余白の段階（密度）', () => {
  it('compact・default・comfortable・spacious の 4 段階が、この順にある', () => {
    expect(densities.map((d) => d.name)).toEqual(['compact', 'default', 'comfortable', 'spacious'])
  })

  it('どの段階も、同じトークンを上書きする（段階を入れ子にしたとき、外側の値が残らない）', () => {
    const keys = (i: number) => Object.keys(densities[i]!.tokens).sort()
    for (let i = 1; i < densities.length; i++) expect(keys(i)).toEqual(keys(0))
  })

  it('default は、tokens.json の既定値と同じ（段階を付けないときと同じ見た目）', () => {
    const d = densities.find((x) => x.name === 'default')!
    for (const [name, value] of Object.entries(d.tokens))
      expect(value, name).toBe(tokenDefault(byName.get(name)!))
  })

  it('段階が上がるほど、余白と高さが大きい。高さは sm < md < lg', () => {
    for (let i = 1; i < densities.length; i++) {
      const [a, b] = [densities[i - 1]!.tokens, densities[i]!.tokens]
      for (const t of Object.keys(a))
        expect(px(b[t]!), `${densities[i]!.name} ${t}`).toBeGreaterThan(px(a[t]!))
    }
    for (const d of densities) {
      const t = d.tokens
      expect(px(t['control-height-sm']!)).toBeLessThan(px(t['control-height-md']!))
      expect(px(t['control-height-md']!)).toBeLessThan(px(t['control-height-lg']!))
    }
  })

  it('いちばん詰めた段階でも、ボタン・入力欄の高さは 24px 以上（WCAG 2.5.8 の最小のターゲット）', () => {
    for (const d of densities)
      expect(px(d.tokens['control-height-sm']!), d.name).toBeGreaterThanOrEqual(24)
  })

  it('CSS は詳細度 0 の :where() で書く（利用者が書いた変数が勝つ）', () => {
    const css = densityCss()
    for (const d of densities) expect(css).toContain(`:where([data-jimble-density='${d.name}'])`)
    expect(css).not.toMatch(/^\[data-jimble-density/m)
  })
})
