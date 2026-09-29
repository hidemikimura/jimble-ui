import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleTable, JimbleTableHeadCell } from './jimble-table.js'
import './jimble-table.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))

function rows(n: number) {
  return Array.from(
    { length: n },
    (_, i) =>
      `<jimble-table-row><jimble-table-cell header>#${1000 + i}</jimble-table-cell><jimble-table-cell>顧客 ${'あ'.repeat((i % 5) + 1)}</jimble-table-cell><jimble-table-cell align="end">¥${(i + 1) * 1234}</jimble-table-cell></jimble-table-row>`,
  ).join('')
}
async function table(attrs = '', n = 5, style = '') {
  const c = await mount<HTMLElement>(html`<div style=${style}></div>`)
  c.innerHTML = `<jimble-table label="注文" ${attrs}>
    <jimble-table-header><jimble-table-row>
      <jimble-table-head-cell sortable id="h-id">番号</jimble-table-head-cell>
      <jimble-table-head-cell>顧客</jimble-table-head-cell>
      <jimble-table-head-cell align="end" sortable id="h-amount">金額</jimble-table-head-cell>
    </jimble-table-row></jimble-table-header>
    <jimble-table-body>${rows(n)}</jimble-table-body>
  </jimble-table>`
  await tick()
  const el = c.querySelector('jimble-table') as JimbleTable
  return {
    c,
    el,
    heads: [...c.querySelectorAll('jimble-table-head-cell')] as JimbleTableHeadCell[],
  }
}
const sortBtn = (h: Element) => h.shadowRoot!.querySelector<HTMLButtonElement>('button')!

describe('レイアウト(R5: カスタム要素 + display: table*)', () => {
  it('各要素が表の display になる', async () => {
    const { el } = await table()
    const d = (sel: string) => getComputedStyle(el.querySelector(sel)!).display
    expect(d('jimble-table-header')).toBe('table-header-group')
    expect(d('jimble-table-body')).toBe('table-row-group')
    expect(d('jimble-table-row')).toBe('table-row')
    expect(d('jimble-table-head-cell')).toBe('table-cell')
    expect(d('jimble-table-cell')).toBe('table-cell')
  })

  it('見出しと本文で列の位置がそろう(列幅が行をまたいで共有される)', async () => {
    const { el } = await table('', 8)
    const lefts = (sel: string) =>
      [...el.querySelectorAll(sel)].map((c) => Math.round(c.getBoundingClientRect().left))
    const head = lefts('jimble-table-head-cell')
    const row1 = lefts('jimble-table-body jimble-table-row:nth-child(1) jimble-table-cell')
    const row8 = lefts('jimble-table-body jimble-table-row:nth-child(8) jimble-table-cell')
    expect(head).toEqual(row1)
    expect(head).toEqual(row8)
  })

  it('align="end" は右寄せ。行見出し(header)は太字', async () => {
    const { el } = await table()
    const cells = el.querySelectorAll(
      'jimble-table-body jimble-table-row:first-child jimble-table-cell',
    )
    expect(getComputedStyle(cells[2]!).textAlign).toBe('end')
    expect(Number(getComputedStyle(cells[0]!).fontWeight)).toBeGreaterThanOrEqual(600)
  })

  it('セルに区切り線(inset の影)、見出しは背景色が違う', async () => {
    const { el } = await table()
    const cell = el.querySelector('jimble-table-body jimble-table-cell')!
    const head = el.querySelector('jimble-table-head-cell')!
    expect(getComputedStyle(cell).boxShadow).toContain('inset')
    expect(getComputedStyle(head).backgroundColor).not.toBe(getComputedStyle(cell).backgroundColor)
  })

  it('striped: 偶数行に背景。selected の行は primary の背景。行にマウスを乗せると背景が付く', async () => {
    const { el } = await table('striped')
    const [r1, r2] = el.querySelectorAll('jimble-table-body jimble-table-row')
    expect(getComputedStyle(r1!).backgroundColor).not.toBe(getComputedStyle(r2!).backgroundColor)
    ;(r1 as HTMLElement & { selected: boolean }).selected = true
    await tick()
    expect(getComputedStyle(r1!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })
})

describe('固定ヘッダーとスクロール', () => {
  it('sticky-header + max-height: 縦にスクロールしても見出しが上に残る', async () => {
    const { el } = await table('sticky-header style="--jimble-table-max-height: 160px"', 40)
    const scroller = el.shadowRoot!.querySelector<HTMLElement>('[part="scroller"]')!
    const head = el.querySelector('jimble-table-head-cell')!
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    const top0 = Math.round(head.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
    scroller.scrollTop = 200
    await tick()
    const top1 = Math.round(head.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
    expect(top1).toBe(top0)
    expect(getComputedStyle(head).position).toBe('sticky')
  })

  it('sticky-header が無ければ固定しない', async () => {
    const { el } = await table()
    expect(getComputedStyle(el.querySelector('jimble-table-head-cell')!).position).toBe('static')
  })

  it('はみ出すときだけ、スクロール領域がキーボードで操作できる(tabindex=0)', async () => {
    const wide = await table('', 5, 'width: 120px')
    await tick(100)
    const s = wide.el.shadowRoot!.querySelector<HTMLElement>('[part="scroller"]')!
    expect(s.scrollWidth).toBeGreaterThan(s.clientWidth)
    expect(s.getAttribute('tabindex')).toBe('0')
    const roomy = await table('', 3, 'width: 900px')
    await tick(100)
    expect(roomy.el.shadowRoot!.querySelector('[part="scroller"]')!.hasAttribute('tabindex')).toBe(
      false,
    )
  })
})

describe('並べ替え(sortable)', () => {
  it('見出しはボタンになる(sortable のときだけ)。押すと昇順 → 降順。jimble-sort が出る', async () => {
    const { heads } = await table()
    expect(heads[1]!.shadowRoot!.querySelector('button')).toBeNull()
    const on = vi.fn()
    heads[0]!.addEventListener('jimble-sort', on)
    expect(heads[0]!.sort).toBe('none')
    await userEvent.click(sortBtn(heads[0]!))
    expect(heads[0]!.sort).toBe('ascending')
    await userEvent.click(sortBtn(heads[0]!))
    expect(heads[0]!.sort).toBe('descending')
    expect(on.mock.calls.map((c) => (c[0] as CustomEvent).detail.direction)).toEqual([
      'ascending',
      'descending',
    ])
  })

  it('別の見出しを押すと、ほかの見出しの並び順は解除される。preventDefault() すると変わらない', async () => {
    const { heads } = await table()
    await userEvent.click(sortBtn(heads[0]!))
    await userEvent.click(sortBtn(heads[2]!))
    expect(heads[0]!.sort).toBe('none')
    expect(heads[2]!.sort).toBe('ascending')
    heads[2]!.addEventListener('jimble-sort', (e) => e.preventDefault())
    await userEvent.click(sortBtn(heads[2]!))
    expect(heads[2]!.sort).toBe('ascending')
  })

  it('キーボード(Enter / Space)で並べ替えできる。アイコンで状態が分かる', async () => {
    const { heads } = await table()
    sortBtn(heads[0]!).focus()
    await userEvent.keyboard('{Enter}')
    expect(heads[0]!.sort).toBe('ascending')
    const svgBefore = heads[0]!.shadowRoot!.querySelector('svg')!.innerHTML
    await userEvent.keyboard(' ')
    await heads[0]!.updateComplete
    expect(heads[0]!.sort).toBe('descending')
    expect(heads[0]!.shadowRoot!.querySelector('svg')!.innerHTML).not.toBe(svgBefore)
  })
})

describe('読み込み中と axe', () => {
  it('loading: 表が薄くなり、読み込み中の読み上げ用テキストが出る', async () => {
    const { el } = await table('loading')
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')!
    expect(Number(getComputedStyle(grid).opacity)).toBeLessThan(1)
    expect(el.shadowRoot!.textContent).toContain('読み込み中')
  })

  it('axe 違反なし(通常・固定ヘッダー・並べ替え後)', async () => {
    const { c, heads } = await table()
    await expectNoA11yViolations(c)
    await userEvent.click(sortBtn(heads[0]!))
    await expectNoA11yViolations(c)
    const s = await table('sticky-header', 30)
    await expectNoA11yViolations(s.c)
  })
})
