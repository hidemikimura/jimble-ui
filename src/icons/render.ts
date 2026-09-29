import { svg, type SVGTemplateResult } from 'lit'

export interface Icon {
  viewBox: string
  fill: string
  body: SVGTemplateResult
}

/**
 * 内部アイコンを描画する。装飾扱い（aria-hidden）。意味を持たせる場合は隣にテキストを置く。
 * サイズは呼び出し側のクラス（size-4 など）で決める。
 */
export function renderIcon(icon: Icon, className = 'size-5') {
  return svg`<svg class=${className} viewBox=${icon.viewBox} fill=${icon.fill} aria-hidden="true" focusable="false">${icon.body}</svg>`
}
