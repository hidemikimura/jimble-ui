// theme-lab の「ライトからダークを作る」の計算(theme-lab/src/darken.ts)
import { describe, expect, it } from 'vitest'
import {
  contrast,
  deriveDark,
  liftContrast,
  oklchToRgb,
  rgbToOklch,
  type RGB,
} from '../../theme-lab/src/darken.ts'

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const parseOklch = (s: string) => {
  const m = /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/.exec(s)
  if (!m) throw new Error(`oklch ではない: ${s}`)
  return { l: +m[1]! / 100, c: +m[2]!, h: +m[3]! }
}

// 既定の色(tokens.json の neutral の段階と、白)を、色の値として解決する。試験用の resolve
const COLORS: Record<string, string> = {
  '#ffffff': '#ffffff',
  'var(--jimble-color-neutral-900)': '#101828',
  'var(--jimble-color-neutral-50)': '#f9fafb',
  'var(--jimble-color-neutral-950)': '#030712',
}
const resolve = (v: string): RGB | null =>
  v.startsWith('#') ? hex(v) : COLORS[v] ? hex(COLORS[v]) : null

describe('OKLCH の変換', () => {
  it('白・黒・既定の濃い灰色を、往復しても同じ色に戻る', () => {
    for (const c of ['#ffffff', '#000000', '#101828', '#4f46e5', '#fafaf9'])
      expect(oklchToRgb(rgbToOklch(hex(c)))).toEqual(hex(c))
  })
  it('白は明るさ 1・彩度 0', () => {
    const w = rgbToOklch(hex('#ffffff'))
    expect(w.l).toBeCloseTo(1, 3)
    expect(w.c).toBeCloseTo(0, 3)
  })
})

describe('ダークの値を作る', () => {
  it('ライトを既定から変えていなければ、既定のダークのまま', () => {
    const input = {
      light: 'var(--jimble-color-neutral-100)',
      defaultLight: 'var(--jimble-color-neutral-100)',
      defaultDark: 'var(--jimble-color-neutral-800)',
    }
    expect(deriveDark(input, resolve)).toBe('var(--jimble-color-neutral-800)')
  })

  it('段階の参照は、ライトでずらした分だけ、ダークで逆向きにずらす（濃くした文字は、ダークで明るく）', () => {
    const muted = {
      defaultLight: 'var(--jimble-color-neutral-500)',
      defaultDark: 'var(--jimble-color-neutral-400)',
    }
    expect(deriveDark({ ...muted, light: 'var(--jimble-color-neutral-600)' }, resolve)).toBe(
      'var(--jimble-color-neutral-300)',
    )
    expect(deriveDark({ ...muted, light: 'var(--jimble-color-neutral-400)' }, resolve)).toBe(
      'var(--jimble-color-neutral-500)',
    )
  })

  it('段階の参照で、別の色の段階に変えたら、その色の段階を使う', () => {
    const input = {
      light: 'var(--jimble-color-primary-50)',
      defaultLight: 'var(--jimble-color-neutral-50)',
      defaultDark: 'var(--jimble-color-neutral-950)',
    }
    expect(deriveDark(input, resolve)).toBe('var(--jimble-color-primary-950)')
  })

  it('段階の端を越えない', () => {
    const input = {
      light: 'var(--jimble-color-neutral-950)',
      defaultLight: 'var(--jimble-color-neutral-100)',
      defaultDark: 'var(--jimble-color-neutral-800)',
    }
    expect(deriveDark(input, resolve)).toBe('var(--jimble-color-neutral-50)')
  })

  it('色そのものは、既定のライトとの差を、既定のダークにかける（暖かい白 → 暖かい黒）', () => {
    const warm = '#fdf6e8'
    const out = deriveDark(
      { light: warm, defaultLight: '#ffffff', defaultDark: 'var(--jimble-color-neutral-900)' },
      resolve,
    )
    const o = parseOklch(out)
    const base = rgbToOklch(hex('#101828'))
    expect(o.l).toBeLessThan(0.3) // 面は、暗いまま
    expect(o.l).toBeGreaterThan(base.l) // ライトで暗くした分だけ、ダークでは明るく
    expect(Math.abs(o.h - rgbToOklch(hex(warm)).h)).toBeLessThan(1) // 色相は、選んだ色から
    expect(o.c).toBeCloseTo(rgbToOklch(hex(warm)).c, 2) // 彩度も、選んだ色のまま（濁らせない）
  })

  it('書き方の違い（改行・空白）だけなら、変えていないとみなす', () => {
    const input = {
      light: 'color-mix(\n    in oklab,\n    var(--x) 50%,\n    transparent\n  )',
      defaultLight: 'color-mix(in oklab, var(--x) 50%, transparent)',
      defaultDark: 'var(--dark)',
    }
    expect(deriveDark(input, resolve)).toBe('var(--dark)')
  })

  it('色のある既定（主色など）は、色相のずれを引き継ぐ', () => {
    const blue = '#4f46e5'
    const teal = '#0d9488'
    const r = (v: string) => (v.startsWith('#') ? hex(v) : null)
    const out = parseOklch(
      deriveDark({ light: teal, defaultLight: blue, defaultDark: '#a5b4fc' }, r),
    )
    const shift = rgbToOklch(hex(teal)).h - rgbToOklch(hex(blue)).h
    const expected = (rgbToOklch(hex('#a5b4fc')).h + shift + 360) % 360
    expect(out.h).toBeCloseTo(expected, 0)
  })

  it('透明はそのまま。計算できない値は、ライトと同じにする', () => {
    const base = { defaultLight: '#ffffff', defaultDark: 'var(--jimble-color-neutral-900)' }
    expect(deriveDark({ ...base, light: 'transparent' }, resolve)).toBe('transparent')
    expect(deriveDark({ ...base, light: 'var(--unknown)' }, resolve)).toBe('var(--unknown)')
  })
})

describe('コントラストを満たすまで、明るさを動かす', () => {
  it('暗い面の上の文字は、明るくして 4.5:1 に届かせる', () => {
    const bg = hex('#101828')
    const fg = hex('#4b5563')
    expect(contrast(fg, bg)).toBeLessThan(4.5)
    const out = liftContrast(fg, bg, 4.5)!
    const rgb = oklchToRgb(parseOklch(out))
    expect(contrast(rgb, bg)).toBeGreaterThanOrEqual(4.5)
    expect(parseOklch(out).l).toBeGreaterThan(rgbToOklch(fg).l)
  })

  it('明るい面の上なら、暗くする', () => {
    const bg = hex('#ffffff')
    const out = liftContrast(hex('#9ca3af'), bg, 4.5)!
    expect(contrast(oklchToRgb(parseOklch(out)), bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('どう動かしても届かなければ null', () => {
    expect(liftContrast(hex('#777777'), hex('#777777'), 22)).toBeNull()
  })
})
