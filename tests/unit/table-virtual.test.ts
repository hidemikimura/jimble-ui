// jimble-table の仮想スクロールで、描く行の範囲(src/components/table/virtual.ts)
import { describe, expect, it } from 'vitest'
import { visibleRange } from '../../src/components/table/virtual.ts'

const base = { headerHeight: 40, viewport: 400, rowHeight: 40, total: 10000, overscan: 5 }

describe('描く行の範囲', () => {
  it('先頭では、見えている行と、下の余分だけ', () => {
    // 表示の高さ 400px ぶん(10 行。端で欠ける行を含めて多めに)と、下に 5 行の余分
    expect(visibleRange({ ...base, scrollTop: 0 })).toEqual({ start: 0, end: 15 })
  })

  it('スクロールした位置の前後に、余分を足す', () => {
    // 4000px 下: 見出しの下から (4000 - 40) / 40 = 99 行目が先頭
    expect(visibleRange({ ...base, scrollTop: 4000 })).toEqual({ start: 94, end: 114 })
  })

  it('末尾を越えない', () => {
    const last = visibleRange({ ...base, scrollTop: 10000 * 40 })
    expect(last.end).toBe(10000)
    expect(last.start).toBeLessThan(10000)
  })

  it('行が無い・表示の高さが 0 なら、空', () => {
    expect(visibleRange({ ...base, total: 0, scrollTop: 0 })).toEqual({ start: 0, end: 0 })
    expect(visibleRange({ ...base, viewport: 0, scrollTop: 0 })).toEqual({ start: 0, end: 5 })
  })

  it('行が少なければ、すべて描く', () => {
    expect(visibleRange({ ...base, total: 3, scrollTop: 0 })).toEqual({ start: 0, end: 3 })
  })
})
