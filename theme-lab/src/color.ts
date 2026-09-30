// 色の解決とコントラスト比の計算(WCAG 2.x の相対輝度)。oklch() や color-mix() も、ブラウザに解決させる

const probe = document.createElement('span')
probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
document.body?.append(probe)
const canvas = document.createElement('canvas')
canvas.width = canvas.height = 1
const ctx = canvas.getContext('2d', { willReadFrequently: true })!

export type RGB = [number, number, number]

/** CSS の変数を、その時点の色の文字列に解決する(例: `--jimble-color-primary-600`) */
export function resolveVar(name: string): string {
  if (!probe.isConnected) document.body.append(probe)
  probe.style.color = ''
  probe.style.color = `var(${name})`
  return getComputedStyle(probe).color
}

/** 任意の CSS の色を sRGB(0〜255)にする。解釈できなければ null */
export function toRgb(color: string): RGB | null {
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#010203'
  ctx.fillStyle = color
  if (ctx.fillStyle === '#010203' && color.replace(/\s/g, '') !== '#010203') return null
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!]
}

export const toHex = (rgb: RGB): string =>
  `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`

export function varHex(name: string): string {
  const rgb = toRgb(resolveVar(name))
  return rgb ? toHex(rgb) : '#000000'
}

const linear = (v: number) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: RGB) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

export function contrastRatio(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** 変数 2 つのコントラスト比(解決できなければ null) */
export function contrastOfVars(fg: string, bg: string): number | null {
  const [a, b] = [toRgb(resolveVar(fg)), toRgb(resolveVar(bg))]
  return a && b ? contrastRatio(a, b) : null
}
