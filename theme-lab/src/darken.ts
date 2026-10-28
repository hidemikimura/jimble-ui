// ライトの色から、ダークの色を作る(テーマ調整の「ライトからダークを作る」)。DOM に依存しない(試験からも読む)。
//
// 方針: ライブラリの既定のダーク(tokens.css の light-dark の右側)を土台にして、デザイナーがライトで
// 既定から変えた分だけを、ダークに引き継ぐ。明るさの関係(面は暗く、文字は明るく)は、既定のダークのまま保つ。
// - 段階の参照(var(--jimble-color-neutral-100) など)は、段階をずらした分だけ、ダークでは逆向きにずらす
//   (ライトで濃くした文字は、ダークでは明るくする)
// - 色そのもの(#fafaf9 など)は、OKLCH で、既定のライトとの差(明るさは逆向き・彩度・色相)を、既定のダークにかける

export type RGB = [number, number, number]
export interface Oklch {
  l: number // 0〜1
  c: number
  h: number // 度
}

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const SCALE_REF = /^var\(--jimble-color-(primary|neutral|success|warning|danger|info)-(\d+)\)$/

/** 彩度がこれより低い色は、灰色とみなす(色相が意味を持たない) */
const GRAY_CHROMA = 0.02
/** 明るさを、コントラストのために動かす幅(1 回ぶん) */
const L_STEP = 0.01

// ---- sRGB(0〜255) と OKLCH ----
const toLinear = (v: number) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, s)) * 255)
}

export function rgbToOklch([r8, g8, b8]: RGB): Oklch {
  const [r, g, b] = [toLinear(r8), toLinear(g8), toLinear(b8)]
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h }
}

export function oklchToRgb({ l, c, h }: Oklch): RGB {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number, d: number) => Number(v.toFixed(d))

export const formatOklch = ({ l, c, h }: Oklch): string =>
  `oklch(${round(clamp(l, 0, 1) * 100, 1)}% ${round(Math.max(0, c), 3)} ${round(h, 1)})`

// ---- WCAG 2.x のコントラスト比 ----
const luminance = ([r, g, b]: RGB) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
export function contrast(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// ---- 段階の参照 ----
interface ScaleRef {
  scale: string
  index: number
}
const scaleRef = (value: string): ScaleRef | null => {
  const m = SCALE_REF.exec(value.trim())
  if (!m) return null
  const index = STEPS.indexOf(Number(m[2]))
  return index < 0 ? null : { scale: m[1]!, index }
}
const refText = ({ scale, index }: ScaleRef) =>
  `var(--jimble-color-${scale}-${STEPS[clamp(index, 0, STEPS.length - 1)]})`

/** 書き方の違い(改行・かっこの内側の空白)を無視して比べるための形 */
export const normalizeValue = (v: string): string =>
  v.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')').trim()

/** 色相の差(-180〜180) */
const hueDelta = (to: number, from: number) => ((to - from + 540) % 360) - 180

export interface DarkInput {
  /** いまのライトの値(theme.css の light-dark の左側) */
  light: string
  /** ライブラリの既定のライト・ダークの値 */
  defaultLight: string
  defaultDark: string
}

/**
 * 1 つの変数の、ダークの値を作る。
 * resolve は、値をそのモードの色(RGB)にする(透明・解決できない値は null)。
 */
export function deriveDark(
  { light, defaultLight, defaultDark }: DarkInput,
  resolve: (value: string, scheme: 'light' | 'dark') => RGB | null,
): string {
  const now = light.trim()
  if (normalizeValue(now) === normalizeValue(defaultLight)) return defaultDark
  if (now === 'transparent') return 'transparent'

  // 段階の参照どうし: ライトでずらした分だけ、ダークで逆向きにずらす
  const [cur, defL, defD] = [scaleRef(now), scaleRef(defaultLight), scaleRef(defaultDark)]
  if (cur && defL && defD)
    return refText({ scale: cur.scale, index: defD.index - (cur.index - defL.index) })

  // 色そのもの: 既定のライトとの差を、既定のダークにかける
  const [c, l, d] = [
    resolve(now, 'light'),
    resolve(defaultLight, 'light'),
    resolve(defaultDark, 'dark'),
  ]
  if (!c || !l || !d) return now // 透けた色など、計算できないものは、ライトと同じ
  const [oc, ol, od] = [rgbToOklch(c), rgbToOklch(l), rgbToOklch(d)]
  const l2 = clamp(od.l - (oc.l - ol.l), 0, 1)
  // 既定のライトが灰色(白など)で、選んだ色に色みがあれば、その色相と彩度をそのまま使う
  // (既定のダークの色み(青みの灰色など)に、選んだ色みを足すと、濁った色になる)
  if (ol.c < GRAY_CHROMA)
    return formatOklch(oc.c >= GRAY_CHROMA / 4 ? { l: l2, c: oc.c, h: oc.h } : { ...od, l: l2 })
  // 色のある既定(主色など): 彩度の差と、色相のずれを引き継ぐ
  return formatOklch({
    l: l2,
    c: Math.max(0, od.c + (oc.c - ol.c)),
    h: (od.h + hueDelta(oc.h, ol.h) + 360) % 360,
  })
}

/**
 * fg の明るさだけを動かして、bg とのコントラスト比を min 以上にした色を返す(色相・彩度は保つ)。
 * bg から遠ざかる向き(bg が暗ければ明るく)に動かす。届かなければ null。
 */
export function liftContrast(fg: RGB, bg: RGB, min: number): string | null {
  if (contrast(fg, bg) >= min) return formatOklch(rgbToOklch(fg))
  const o = rgbToOklch(fg)
  const dir = rgbToOklch(bg).l < 0.5 ? 1 : -1
  for (let l = o.l; l >= 0 && l <= 1; l += dir * L_STEP) {
    const next = { ...o, l }
    if (contrast(oklchToRgb(next), bg) >= min) return formatOklch(next)
  }
  return null
}
