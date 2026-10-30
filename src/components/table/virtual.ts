// 仮想スクロール(jimble-table の columns / rows)で、描く行の範囲を決める。DOM に依存しない(試験からも読む)

export interface RangeInput {
  /** スクロール領域の scrollTop(見出しを含む) */
  scrollTop: number
  /** スクロール領域の見えている高さ */
  viewport: number
  /** 見出しの高さ(本文は、この下から始まる) */
  headerHeight: number
  /** 1 行の高さ(すべての行で同じ) */
  rowHeight: number
  /** 行の数 */
  total: number
  /** 上下に余分に描く行の数(速くスクロールしても、空白が見えないように) */
  overscan: number
}

/** 描く行の範囲 [start, end)。見えている行と、その前後の余分 */
export function visibleRange({
  scrollTop,
  viewport,
  headerHeight,
  rowHeight,
  total,
  overscan,
}: RangeInput): { start: number; end: number } {
  if (total <= 0 || rowHeight <= 0) return { start: 0, end: 0 }
  const first = Math.max(0, Math.floor((scrollTop - headerHeight) / rowHeight))
  // 端で欠ける行を含めて、表示の高さぶんを多めに描く
  const count = Math.ceil(viewport / rowHeight)
  const start = Math.min(Math.max(0, first - overscan), Math.max(0, total - 1))
  const end = Math.min(total, first + count + overscan)
  return { start, end: Math.max(start, end) }
}
