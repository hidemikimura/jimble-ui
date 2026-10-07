// トークンのコントラスト契約（設計書 §4.6）。既定トークンの組み合わせが WCAG AA を満たすことを保証する。
import { describe, expect, it } from 'vitest'
import { defaultValue } from '../../scripts/lib/tokens.ts'

type RGB = [number, number, number]

function oklchToSrgb(l: number, c: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
  return lin.map((v) => Math.min(1, Math.max(0, v))) as RGB // 線形 sRGB(0..1)
}

function parse(color: string): RGB {
  const oklch = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/.exec(color)
  if (oklch) return oklchToSrgb(+oklch[1]! / 100, +oklch[2]!, +oklch[3]!)
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (hex) {
    const n = parseInt(hex[1]!, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }) as RGB
  }
  throw new Error(`解釈できない色: ${color}`)
}
const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b
export function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(parse(fg)), luminance(parse(bg))]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
const c = (token: string) => defaultValue(`color-${token}`)

// [前景, 背景, 必要な比, 用途]
const PAIRS: [string, string, number, string][] = [
  ['text', 'surface', 4.5, '本文'],
  ['text', 'surface-muted', 4.5, 'ページ背景上の本文'],
  ['text-muted', 'surface', 4.5, '補助文字'],
  ['text-muted', 'surface-muted', 4.5, '補助文字(背景)'],
  ['text', 'surface-sunken', 4.5, 'カンバンの列の見出し・件数・空の表示'],
  ['primary-700', 'surface', 4.5, 'カンバンの「ここに移動」'],
  ['ring-control', 'surface-sunken', 3, 'カンバンの受け口の枠 (1.4.11)'],
  ['text-placeholder', 'surface', 4.5, 'プレースホルダー'],
  ['text-link', 'surface', 4.5, 'リンク'],
  ['text-on-primary', 'primary-600', 4.5, 'primary ボタン'],
  ['text-on-primary', 'primary-500', 4.5, 'primary ボタン hover'],
  ['text-on-primary', 'danger-600', 4.5, 'danger ボタン'],
  ['text-on-primary', 'danger-700', 4.5, 'danger ボタン hover'],
  ['ring-control', 'surface', 3, '入力欄の枠 (1.4.11)'],
  ['ring-focus', 'surface', 3, 'フォーカスリング (2.4.13)'],
  ['ring-invalid', 'surface', 3, 'エラー枠'],
  ['neutral-700', 'neutral-100', 4.5, 'neutral バッジ'],
  ['primary-700', 'primary-50', 4.5, 'primary バッジ'],
  ['success-700', 'success-50', 4.5, 'success バッジ'],
  ['warning-700', 'warning-50', 4.5, 'warning バッジ'],
  ['danger-700', 'danger-50', 4.5, 'danger バッジ'],
  ['info-700', 'info-50', 4.5, 'info バッジ'],
  ['info-800', 'info-50', 4.5, 'info アラート'],
  ['success-800', 'success-50', 4.5, 'success アラート'],
  ['warning-800', 'warning-50', 4.5, 'warning アラート'],
  ['danger-800', 'danger-50', 4.5, 'danger アラート'],
  ['info-600', 'info-50', 3, 'info アイコン'],
  ['success-600', 'success-50', 3, 'success アイコン'],
  ['warning-600', 'warning-50', 3, 'warning アイコン'],
  ['danger-600', 'danger-50', 3, 'danger アイコン'],
]

describe('トークンのコントラスト契約', () => {
  it.each(PAIRS)('%s / %s は %d:1 以上（%s）', (fg, bg, min) => {
    expect(contrast(c(fg), c(bg))).toBeGreaterThanOrEqual(min)
  })

  it('danger-500 は白文字で 4.5:1 に届かない（だから danger の hover は 700 を使う）', () => {
    expect(contrast(c('text-on-primary'), c('danger-500'))).toBeLessThan(4.5)
  })
})
