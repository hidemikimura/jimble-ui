// 色の変換。値は `#rrggbb`(小文字。透明度を持つときは `#rrggbbaa`)。HSL は h: 0〜360、s・l: 0〜100。

export interface RGB {
  r: number
  g: number
  b: number
}
export interface HSL {
  h: number
  s: number
  l: number
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** アルファ(0〜255)の不透明 */
export const OPAQUE = 255

export interface NormalizeOptions {
  /** 透明度を許す(`#rgba`・`#rrggbbaa`)。不透明なら `#rrggbb` に縮める */
  alpha?: boolean
}

/**
 * 入力された文字を `#rrggbb`(alpha なら `#rrggbbaa` も)に直す。`#rgb` `rgb` `#RRGGBB` `ff0000`、全角も可。
 * 空 → ''、解釈できない → null
 */
export function normalizeHex(
  text: string,
  { alpha = false }: NormalizeOptions = {},
): string | null {
  const s = text.normalize('NFKC').trim().replace(/^#/, '').toLowerCase()
  if (s === '') return ''
  if (!/^[0-9a-f]+$/.test(s)) return null
  const short = s.length === 3 || (alpha && s.length === 4)
  const full = s.length === 6 || (alpha && s.length === 8)
  if (!short && !full) return null
  const hex = short ? [...s].map((c) => c + c).join('') : s
  return hex.endsWith('ff') && hex.length === 8 ? '#' + hex.slice(0, 6) : '#' + hex
}

/** `#rrggbb` / `#rrggbbaa` を、色(`#rrggbb`)とアルファ(0〜255)に分ける */
export function splitAlpha(hex: string): { rgb: string; alpha: number } {
  if (hex.length !== 9) return { rgb: hex, alpha: OPAQUE }
  return { rgb: hex.slice(0, 7), alpha: Number.parseInt(hex.slice(7), 16) }
}

/** 色(`#rrggbb`)にアルファ(0〜255)を付ける。不透明なら `#rrggbb` のまま */
export function withAlpha(rgb: string, alpha: number): string {
  const a = Math.round(clamp(alpha, 0, OPAQUE))
  return a === OPAQUE ? rgb : rgb + hex2(a)
}

export function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
export const rgbToHex = ({ r, g, b }: RGB): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: l * 100 }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rr) h = ((gg - bb) / delta) % 6
  else if (max === gg) h = (bb - rr) / delta + 2
  else h = (rr - gg) / delta + 4
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const [ss, ll] = [clamp(s, 0, 100) / 100, clamp(l, 0, 100) / 100]
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const hh = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const [r1, g1, b1] =
    hh < 1
      ? [c, x, 0]
      : hh < 2
        ? [x, c, 0]
        : hh < 3
          ? [0, c, x]
          : hh < 4
            ? [0, x, c]
            : hh < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = ll - c / 2
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 }
}

export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex))
export const hslToHex = (hsl: HSL): string => rgbToHex(hslToRgb(hsl))
