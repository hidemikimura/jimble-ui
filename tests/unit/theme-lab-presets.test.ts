// theme-lab の「出発点」（既製のテーマ・余白の段階）が、配布する CSS を読めることを確かめる。
// 配布する CSS は tokens/*.generated.css の写しなので、ここではそれを読む。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { densities, themes } from '../../scripts/lib/tokens.ts'
import { parseDensityCss, parseThemeCss } from '../../theme-lab/src/presets.ts'

const root = resolve(import.meta.dirname, '../..')
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

describe('theme-lab の出発点', () => {
  it.each(themes.map((t) => t.name))('テーマ %s: 名前・説明・すべての上書きを読める', (name) => {
    const preset = parseThemeCss(read(`tokens/themes/${name}.generated.css`))
    const theme = themes.find((t) => t.name === name)!
    expect(preset.name).toBe(name)
    expect(preset.description).toBe(theme.description)
    expect(preset.decls.map((d) => d.name)).toEqual(
      [...theme.overrides.keys()].map((k) => `--jimble-${k}`),
    )
  })

  it('余白の段階: 4 段階の名前と、それぞれの値を読める', () => {
    const levels = parseDensityCss(read('tokens/density.generated.css'))
    expect(levels.map((l) => l.name)).toEqual(densities.map((d) => d.name))
    for (const level of levels) {
      const d = densities.find((x) => x.name === level.name)!
      expect(level.description).toBe(d.description)
      expect(Object.fromEntries(level.decls.map((x) => [x.name, x.value]))).toEqual(
        Object.fromEntries(Object.entries(d.tokens).map(([k, v]) => [`--jimble-${k}`, v])),
      )
    }
  })

  it('形の違う CSS は、黙って空にせず失敗する', () => {
    expect(() => parseThemeCss(':root { --x: 1; }')).toThrow()
    expect(() => parseDensityCss(':root { --x: 1; }')).toThrow()
  })
})
