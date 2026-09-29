import { describe, expect, it } from 'vitest'
import { hexToHsl, hexToRgb, hslToHex, normalizeHex, rgbToHex } from '../../src/base/color.ts'

describe('色の変換', () => {
  it('入力を #rrggbb に正規化する(#rgb・大文字・全角・# なし)', () => {
    expect(normalizeHex('#FF0000')).toBe('#ff0000')
    expect(normalizeHex('f00')).toBe('#ff0000')
    expect(normalizeHex('#0F8')).toBe('#00ff88')
    expect(normalizeHex('ＦＦ８０００')).toBe('#ff8000')
    expect(normalizeHex('  #123abc ')).toBe('#123abc')
    expect(normalizeHex('')).toBe('')
    expect(normalizeHex('#')).toBe('')
  })

  it('解釈できないものは null', () => {
    for (const t of ['#ggg', '#12345', '#1234567', 'red', 'rgb(0,0,0)', '12', '#ff00zz'])
      expect(normalizeHex(t), t).toBeNull()
  })

  it('hex ↔ rgb', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000')
    expect(rgbToHex({ r: 0.4, g: 254.6, b: 12 })).toBe('#00ff0c') // 四捨五入
  })

  it('hex → hsl の代表値', () => {
    const near = (a: number, b: number) => Math.abs(a - b) < 0.6
    const red = hexToHsl('#ff0000')
    expect([red.h, red.s, red.l]).toEqual([0, 100, 50])
    const green = hexToHsl('#00ff00')
    expect([green.h, green.s, green.l]).toEqual([120, 100, 50])
    const blue = hexToHsl('#0000ff')
    expect([blue.h, blue.s, blue.l]).toEqual([240, 100, 50])
    const white = hexToHsl('#ffffff')
    expect([white.h, white.s, white.l]).toEqual([0, 0, 100])
    const gray = hexToHsl('#808080')
    expect(gray.s).toBe(0)
    expect(near(gray.l, 50.2)).toBe(true)
  })

  it('hsl → hex の代表値', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00')
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 60, s: 100, l: 50 })).toBe('#ffff00')
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff')
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000')
    expect(hslToHex({ h: 360, s: 100, l: 50 })).toBe('#ff0000') // 360° は 0° と同じ
    expect(hslToHex({ h: -120, s: 100, l: 50 })).toBe('#0000ff') // 負の角度
  })

  it('往復しても、1 段階以内の誤差に収まる(代表的な色)', () => {
    for (const hex of [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#06b6d4',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#111827',
      '#6b7280',
    ]) {
      const back = hexToRgb(hslToHex(hexToHsl(hex)))
      const orig = hexToRgb(hex)
      expect(Math.abs(back.r - orig.r), hex).toBeLessThanOrEqual(1)
      expect(Math.abs(back.g - orig.g), hex).toBeLessThanOrEqual(1)
      expect(Math.abs(back.b - orig.b), hex).toBeLessThanOrEqual(1)
    }
  })
})
