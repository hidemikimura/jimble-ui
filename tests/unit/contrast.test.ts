// トークンのコントラスト契約（設計書 §4.6）。既定トークンと、既製のテーマ（§4.9）の組み合わせが WCAG AA を満たすことを保証する。
import { describe, expect, it } from 'vitest'
import { defaultValue, themes, type Scheme, type Theme } from '../../scripts/lib/tokens.ts'

type RGB = [number, number, number]

type Oklab = [number, number, number]

const oklchToOklab = (l: number, c: number, hDeg: number): Oklab => {
  const h = (hDeg * Math.PI) / 180
  return [l, c * Math.cos(h), c * Math.sin(h)]
}

function oklabToSrgb([l, a, b]: Oklab): RGB {
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

const OKLCH = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\)$/
const toOklab = (m: RegExpExecArray): Oklab =>
  oklchToOklab(+m[1]! / 100, +m[2]!, m[3] === 'none' ? 0 : +m[3]!)

function parse(color: string): RGB {
  // 無彩色の色相は none（Tailwind の zinc など）。色相は彩度 0 なら結果に効かない
  const oklch = OKLCH.exec(color)
  if (oklch) return oklabToSrgb(toOklab(oklch))
  // 2 色を同じ割合で混ぜる color-mix(in oklab, A, B)（面の高さの raised）
  const mix = /^color-mix\(in oklab, (oklch\([^)]*\)), (oklch\([^)]*\))\)$/.exec(color)
  if (mix) {
    const [x, y] = [toOklab(OKLCH.exec(mix[1]!)!), toOklab(OKLCH.exec(mix[2]!)!)]
    return oklabToSrgb(x.map((v, i) => (v + y[i]!) / 2) as Oklab)
  }
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
const c = (token: string, scheme: Scheme = 'light', theme?: Theme) =>
  defaultValue(`color-${token}`, scheme, theme)

// [前景, 背景, 必要な比, 用途]。ライトとダークの両方で確かめる（設計書 §4.8）
const PAIRS: [string, string, number, string][] = [
  ['text', 'surface', 4.5, '本文'],
  ['text', 'surface-muted', 4.5, 'ページ背景上の本文'],
  ['text', 'surface-overlay', 4.5, 'メニュー・ダイアログの本文'],
  ['text-muted', 'surface', 4.5, '補助文字'],
  ['text-muted', 'surface-muted', 4.5, '補助文字(背景)'],
  ['text-muted', 'surface-overlay', 4.5, 'メニュー・ダイアログの補助文字'],
  ['text', 'surface-sunken', 4.5, 'カンバンの列の見出し・件数・空の表示'],
  ['text', 'surface-raised', 4.5, 'カンバンのカードの本文'],
  ['text-muted', 'surface-raised', 4.5, 'カンバンのカードの補助文字'],
  ['ring-focus', 'surface-raised', 3, 'フォーカスリング(カンバンのカード)'],
  ['text', 'item-hover', 4.5, 'メニュー・セレクトなどの項目の hover'],
  ['text-danger', 'item-hover', 4.5, 'メニューの危険な項目の hover'],
  ['text-danger', 'surface-overlay', 4.5, 'メニューの危険な項目'],
  ['text-danger', 'surface', 4.5, 'フィールドのエラー'],
  ['text-accent', 'surface', 4.5, 'カンバンの「ここに移動」・タブの選択中'],
  ['text-accent', 'surface-accent', 4.5, 'サイドバーの現在のページ・選択中の行'],
  ['text', 'surface-accent-strong', 4.5, '日付の範囲'],
  ['text', 'surface-accent-stronger', 4.5, '日付の範囲の hover'],
  ['icon-accent', 'surface', 3, 'チェックの印・並べ替えの印'],
  ['icon-accent', 'surface-overlay', 3, 'セレクトの選択中の印'],
  ['ring-control', 'surface-sunken', 3, 'カンバンの受け口の枠 (1.4.11)'],
  ['text-on-primary', 'surface-inverse', 4.5, 'ツールチップ（濃い背景に白い文字）'],
  ['text-placeholder', 'surface', 4.5, 'プレースホルダー'],
  ['text-link', 'surface', 4.5, 'リンク'],
  ['text-on-primary', 'primary-600', 4.5, 'primary ボタン'],
  ['text-on-primary', 'primary-500', 4.5, 'primary ボタン hover'],
  ['text-on-primary', 'danger-600', 4.5, 'danger ボタン'],
  ['text-on-primary', 'danger-700', 4.5, 'danger ボタン hover'],
  ['neutral-900', 'warning-300', 4.5, '警告のバナー（塗りつぶし）'],
  ['ring-control', 'surface', 3, '入力欄の枠 (1.4.11)'],
  ['ring-focus', 'surface', 3, 'フォーカスリング (2.4.13)'],
  ['ring-focus', 'surface-muted', 3, 'フォーカスリング(背景)'],
  ['ring-focus', 'surface-overlay', 3, 'フォーカスリング(メニュー・ダイアログ)'],
  ['ring-invalid', 'surface', 3, 'エラー枠'],
  ['text-secondary', 'surface-sunken', 4.5, 'neutral バッジ'],
  // コードエディタの色分け(タグ・キーワード / 属性名・キー / 文字列 / 数値 / 誤り)と、変数のチップ
  ['text-accent', 'surface', 4.5, 'コードのタグ・キーワード'],
  ['text-info-strong', 'surface', 4.5, 'コードの属性名・キー'],
  ['text-success-strong', 'surface', 4.5, 'コードの文字列'],
  ['text-warning-strong', 'surface', 4.5, 'コードの数値・真偽値'],
  ['text-danger', 'surface', 4.5, 'コードの誤り'],
  ['text-accent', 'surface-accent', 4.5, '変数のチップ'],
  ['text-warning-strong', 'surface-warning', 4.5, '未定義の変数のチップ'],
  ['text-accent', 'surface-accent', 4.5, 'primary バッジ'],
  ['text-accent', 'surface-accent-strong', 4.5, 'アバターの頭文字'],
  ['text-secondary', 'surface-sunken', 4.5, 'アバターの群の「+N」'],
  // 進み具合の棒（満たした部分と溝。1.4.11）と、区切った見た目のラジオ（選ばれていないものの文字）
  ['text-accent', 'surface-track', 3, 'progress の棒（primary）'],
  ['text-success', 'surface-track', 3, 'progress の棒（success）'],
  ['text-warning', 'surface-track', 3, 'progress の棒（warning）'],
  ['text-danger', 'surface-track', 3, 'progress の棒（danger）'],
  ['ring-control', 'surface', 3, '区切った見た目のラジオの、選ばれたものの枠'],
  ['text-muted', 'surface', 4.5, '空の状態の説明'],
  ...(['success', 'warning', 'danger', 'info'] as const).flatMap(
    (t): [string, string, number, string][] => [
      [`text-${t}`, `surface-${t}`, 4.5, `${t} バッジ`],
      [`text-${t}-strong`, `surface-${t}`, 4.5, `${t} アラート`],
      [`icon-${t}`, `surface-${t}`, 3, `${t} アラートのアイコン`],
      [`icon-${t}`, 'surface-overlay', 3, `${t} 通知のアイコン`],
    ],
  ),
]

describe.each(['light', 'dark'] as const)('トークンのコントラスト契約（%s）', (scheme) => {
  it.each(PAIRS)('%s / %s は %d:1 以上（%s）', (fg, bg, min) => {
    expect(contrast(c(fg, scheme), c(bg, scheme))).toBeGreaterThanOrEqual(min)
  })
})

// 既製のテーマも、同じ組み合わせを両方のモードで満たす
describe.each(
  themes.flatMap((t) => (['light', 'dark'] as const).map((s) => [t.name, s, t] as const)),
)('テーマ %s のコントラスト契約（%s）', (_, scheme, theme) => {
  it.each(PAIRS)('%s / %s は %d:1 以上（%s）', (fg, bg, min) => {
    expect(contrast(c(fg, scheme, theme), c(bg, scheme, theme))).toBeGreaterThanOrEqual(min)
  })
})

describe('トークンのコントラスト契約', () => {
  it('danger-500 は白文字で 4.5:1 に届かない（だから danger の hover は 700 を使う）', () => {
    expect(contrast(c('text-on-primary'), c('danger-500'))).toBeLessThan(4.5)
  })
})
