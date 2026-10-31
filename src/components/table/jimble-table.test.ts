import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleTable, JimbleTableHeadCell, JimbleTableRow } from './jimble-table.js'
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

describe('レイアウト(CSS グリッド + subgrid)', () => {
  it('表はグリッド、行のまとまりと行は subgrid（列を共有する）', async () => {
    const { el } = await table()
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')!
    expect(getComputedStyle(grid).display).toBe('grid')
    for (const sel of ['jimble-table-header', 'jimble-table-body', 'jimble-table-row']) {
      const style = getComputedStyle(el.querySelector(sel)!)
      expect(style.display, sel).toBe('grid')
      expect(style.gridTemplateColumns, sel).not.toBe('none')
    }
    // 列の数は、セルの数から決まる
    expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(3)
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

describe('行の hover の色', () => {
  it('--jimble-table-row-hover-bg で、マウスを重ねた行の背景を変えられる（縞の行でも効く）', async () => {
    const { el } = await table('striped style="--jimble-table-row-hover-bg: rgb(1, 2, 3)"')
    for (const row of el.querySelectorAll('jimble-table-body jimble-table-row')) {
      await userEvent.hover(row)
      await tick()
      expect(getComputedStyle(row).backgroundColor, row.textContent ?? '').toBe('rgb(1, 2, 3)')
    }
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
    // 固定するのは、見出しの行のまとまり(グリッドでは、セルは行の中でしか固定できない)
    expect(getComputedStyle(el.querySelector('jimble-table-header')!).position).toBe('sticky')
  })

  it('sticky-header が無ければ固定しない', async () => {
    const { el } = await table()
    expect(getComputedStyle(el.querySelector('jimble-table-header')!).position).toBe('static')
  })

  it('縦に長いセルがあっても、同じ行のほかのセルは縦の中央にそろう', async () => {
    const { el } = await table('', 2)
    const cells = [
      ...el.querySelectorAll('jimble-table-body jimble-table-row:first-child jimble-table-cell'),
    ]
    cells[1]!.innerHTML = '1 行目<br>2 行目<br>3 行目'
    await tick()
    const mid = (c: Element) => {
      const r = c.getBoundingClientRect()
      return Math.round(r.top + r.height / 2)
    }
    // セルの箱は行の高さいっぱい、文字は中央
    expect(Math.round(cells[0]!.getBoundingClientRect().height)).toBe(
      Math.round(cells[1]!.getBoundingClientRect().height),
    )
    const range = document.createRange()
    range.selectNodeContents(cells[0]!)
    const text = range.getBoundingClientRect()
    expect(Math.abs(text.top + text.height / 2 - mid(cells[0]!))).toBeLessThan(3)
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

describe('jimble-sort の伝わり方', () => {
  it('見出しセルの jimble-sort は、表のリスナーに届くが、表の外側には漏れない(入れ子の表を含む)', async () => {
    const { c, el, heads } = await table()
    const onTable = vi.fn()
    const onOuter = vi.fn()
    el.addEventListener('jimble-sort', onTable)
    c.addEventListener('jimble-sort', onOuter) // 表を囲む要素
    document.addEventListener('jimble-sort', onOuter)
    try {
      sortBtn(heads[2]!).click()
      await tick()
      expect(onTable).toHaveBeenCalledTimes(1)
      expect((onTable.mock.calls[0]![0] as CustomEvent).detail).toEqual({ direction: 'ascending' })
      expect(onOuter).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('jimble-sort', onOuter)
    }
  })

  it('表に付けたリスナーで preventDefault() すると、見出しの並び順は変わらない', async () => {
    const { el, heads } = await table()
    el.addEventListener('jimble-sort', (e) => e.preventDefault())
    sortBtn(heads[2]!).click()
    await tick()
    expect(heads[2]!.sort).toBe('none')
  })
})

describe('行の選択（selectable）', () => {
  async function selectable(n = 4, attrs = 'selectable') {
    const c = await mount<HTMLElement>(html`<div></div>`)
    const body = Array.from(
      { length: n },
      (_, i) =>
        `<jimble-table-row value="r${i + 1}"><jimble-table-cell header>#${i + 1}</jimble-table-cell><jimble-table-cell>顧客 ${i + 1}</jimble-table-cell></jimble-table-row>`,
    ).join('')
    c.innerHTML = `<jimble-table label="注文" ${attrs}>
      <jimble-table-header><jimble-table-row>
        <jimble-table-head-cell>番号</jimble-table-head-cell>
        <jimble-table-head-cell>顧客</jimble-table-head-cell>
      </jimble-table-row></jimble-table-header>
      <jimble-table-body>${body}</jimble-table-body>
    </jimble-table>`
    await tick()
    const el = c.querySelector('jimble-table') as JimbleTable
    const bodyRows = [
      ...el.querySelectorAll('jimble-table-body jimble-table-row'),
    ] as JimbleTableRow[]
    const headRow = el.querySelector('jimble-table-header jimble-table-row') as JimbleTableRow
    return { c, el, bodyRows, headRow }
  }
  // 行頭のチェックボックス（jimble-checkbox）と、その中の input
  const box = (row: Element) => row.shadowRoot!.querySelector('jimble-checkbox')!
  const input = (row: Element) => box(row).shadowRoot!.querySelector<HTMLInputElement>('input')!
  const settle = async (el: JimbleTable) => {
    await tick()
    await el.updateComplete
  }

  it('selectable がなければ、チェックボックスの列は出ない', async () => {
    const { headRow, bodyRows } = await selectable(2, '')
    expect(headRow.shadowRoot!.querySelector('jimble-checkbox')).toBeNull()
    expect(bodyRows[0]!.shadowRoot!.querySelector('jimble-checkbox')).toBeNull()
  })

  it('見出しに「すべての行を選択」、各行に「(行見出し) を選択」のチェックボックスが出る', async () => {
    const { headRow, bodyRows } = await selectable()
    expect(input(headRow).getAttribute('aria-label')).toBe('すべての行を選択')
    expect(input(bodyRows[0]!).getAttribute('aria-label')).toBe('#1 を選択')
    // 見出しの列・本文のセルとして並ぶ（列の位置がそろう）
    const sel = (row: Element) => row.shadowRoot!.querySelector<HTMLElement>('[part="select"]')!
    expect(Math.round(sel(headRow).getBoundingClientRect().width)).toBe(
      Math.round(sel(bodyRows[0]!).getBoundingClientRect().width),
    )
  })

  it('行のチェックで selected になり、jimble-selection-change が選ばれた行の value を渡す', async () => {
    const { el, bodyRows } = await selectable()
    const onChange = vi.fn()
    el.addEventListener('jimble-selection-change', onChange)
    await userEvent.click(input(bodyRows[1]!))
    await settle(el)
    expect(bodyRows[1]!.selected).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    const detail = (onChange.mock.calls[0]![0] as CustomEvent).detail
    expect(detail.values).toEqual(['r2'])
    expect(detail.rows).toEqual([bodyRows[1]])
    expect(el.selectedValues).toEqual(['r2'])
    expect(el.selectedRows).toEqual([bodyRows[1]])
  })

  it('すべて選択: 一部なら中間の状態、押すとすべて選択、もう一度で解除', async () => {
    const { el, headRow, bodyRows } = await selectable()
    await userEvent.click(input(bodyRows[0]!))
    await settle(el)
    expect(input(headRow).indeterminate).toBe(true)
    expect(input(headRow).checked).toBe(false)
    await userEvent.click(input(headRow))
    await settle(el)
    expect(bodyRows.every((r) => r.selected)).toBe(true)
    expect(input(headRow).checked).toBe(true)
    expect(input(headRow).indeterminate).toBe(false)
    expect(el.selectedValues).toEqual(['r1', 'r2', 'r3', 'r4'])
    await userEvent.click(input(headRow))
    await settle(el)
    expect(bodyRows.some((r) => r.selected)).toBe(false)
    expect(input(headRow).checked).toBe(false)
  })

  it('Shift を押しながらクリックすると、前にクリックした行からの範囲を、同じ状態にする', async () => {
    const { el, bodyRows } = await selectable(5)
    const onChange = vi.fn()
    el.addEventListener('jimble-selection-change', onChange)
    await userEvent.click(input(bodyRows[0]!))
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(input(bodyRows[3]!))
    await userEvent.keyboard('{/Shift}')
    await settle(el)
    expect(bodyRows.map((r) => r.selected)).toEqual([true, true, true, true, false])
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('プログラムから selected を変えると、チェックボックスと「すべて選択」が追従する（イベントは出ない）', async () => {
    const { el, headRow, bodyRows } = await selectable(2)
    const onChange = vi.fn()
    el.addEventListener('jimble-selection-change', onChange)
    bodyRows[0]!.selected = true
    await settle(el)
    expect(input(bodyRows[0]!).checked).toBe(true)
    expect(input(headRow).indeterminate).toBe(true)
    bodyRows[1]!.selected = true
    await settle(el)
    expect(input(headRow).checked).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('行を足す・消すと「すべて選択」の状態が追従する', async () => {
    const { el, headRow, bodyRows } = await selectable(2)
    bodyRows.forEach((r) => (r.selected = true))
    await settle(el)
    expect(input(headRow).checked).toBe(true)
    const extra = document.createElement('jimble-table-row')
    extra.innerHTML =
      '<jimble-table-cell header>#9</jimble-table-cell><jimble-table-cell>追加</jimble-table-cell>'
    el.querySelector('jimble-table-body')!.append(extra)
    await settle(el)
    expect(input(headRow).indeterminate).toBe(true)
    extra.remove()
    await settle(el)
    expect(input(headRow).checked).toBe(true)
  })

  it('チェックボックスの change は、表の外に漏れない', async () => {
    const { c, el, bodyRows } = await selectable(2)
    const onNativeChange = vi.fn()
    c.addEventListener('change', onNativeChange)
    await userEvent.click(input(bodyRows[0]!))
    await settle(el)
    expect(onNativeChange).not.toHaveBeenCalled()
  })

  it('selectable を後から付け外しできる', async () => {
    const { el, bodyRows } = await selectable(2, '')
    el.selectable = true
    await settle(el)
    expect(box(bodyRows[0]!)).toBeTruthy()
    el.selectable = false
    await settle(el)
    expect(bodyRows[0]!.shadowRoot!.querySelector('jimble-checkbox')).toBeNull()
  })

  it('行を描いても、選んでも、描画の直後に描き直しを予約しない（Lit の change-in-update の警告が出ない）', async () => {
    const warn = vi.spyOn(console, 'warn')
    const { el, bodyRows } = await selectable(3)
    await userEvent.click(input(bodyRows[0]!))
    await settle(el)
    const changeInUpdate = warn.mock.calls.filter((args) =>
      String(args[0]).includes('change-in-update'),
    )
    warn.mockRestore()
    expect(changeInUpdate).toEqual([])
  })

  it('axe の違反がない', async () => {
    const { el, bodyRows } = await selectable(3)
    await userEvent.click(input(bodyRows[0]!))
    await settle(el)
    await expectNoA11yViolations(el)
  })
})

describe('セルの結合（colspan）', () => {
  async function spanned(attrs = '') {
    const c = await mount<HTMLElement>(html`<div style="width: 600px"></div>`)
    c.innerHTML = `<jimble-table label="売上" ${attrs}>
      <jimble-table-header>
        <jimble-table-row>
          <jimble-table-head-cell>店舗</jimble-table-head-cell>
          <jimble-table-head-cell colspan="2" align="center" id="h-period">上期</jimble-table-head-cell>
        </jimble-table-row>
        <jimble-table-row>
          <jimble-table-head-cell></jimble-table-head-cell>
          <jimble-table-head-cell align="end" id="h-q1">1Q</jimble-table-head-cell>
          <jimble-table-head-cell align="end" id="h-q2">2Q</jimble-table-head-cell>
        </jimble-table-row>
      </jimble-table-header>
      <jimble-table-body>
        <jimble-table-row value="a"><jimble-table-cell header>渋谷</jimble-table-cell><jimble-table-cell align="end">120</jimble-table-cell><jimble-table-cell align="end">140</jimble-table-cell></jimble-table-row>
        <jimble-table-row value="b"><jimble-table-cell header>新宿</jimble-table-cell><jimble-table-cell align="end">90</jimble-table-cell><jimble-table-cell align="end">110</jimble-table-cell></jimble-table-row>
        <jimble-table-row id="total"><jimble-table-cell header>合計</jimble-table-cell><jimble-table-cell colspan="2" align="end" id="sum">460</jimble-table-cell></jimble-table-row>
      </jimble-table-body>
    </jimble-table>`
    await tick()
    const el = c.querySelector('jimble-table') as JimbleTable
    const q = (sel: string) => el.querySelector<HTMLElement>(sel)!
    return { el, q }
  }
  const rect = (e: Element) => e.getBoundingClientRect()
  const internals = (e: Element) => (e as unknown as { internals: ElementInternals }).internals

  it('colspan="2" のセルは、2 列ぶんの幅になる（見出しも本文も）', async () => {
    const { q } = await spanned()
    const [q1, q2, period, sum] = [q('#h-q1'), q('#h-q2'), q('#h-period'), q('#sum')]
    expect(Math.round(rect(period).left)).toBe(Math.round(rect(q1).left))
    expect(Math.round(rect(period).right)).toBe(Math.round(rect(q2).right))
    expect(Math.round(rect(sum).left)).toBe(Math.round(rect(q1).left))
    expect(Math.round(rect(sum).right)).toBe(Math.round(rect(q2).right))
  })

  it('aria-colspan として伝わる', async () => {
    const { q } = await spanned()
    expect(internals(q('#h-period')).ariaColSpan).toBe('2')
    expect(internals(q('#sum')).ariaColSpan).toBe('2')
    expect(internals(q('#h-q1')).ariaColSpan).toBeNull()
  })

  it('selectable と組み合わせても、列がそろう', async () => {
    const { q } = await spanned('selectable')
    expect(Math.round(rect(q('#sum')).left)).toBe(Math.round(rect(q('#h-q1')).left))
    expect(Math.round(rect(q('#sum')).right)).toBe(Math.round(rect(q('#h-q2')).right))
  })

  it('colspan を後から変えると、幅が変わる。列の数はセルの増減に追従する', async () => {
    const { el, q } = await spanned()
    const sum = q('#sum')
    sum.setAttribute('colspan', '1')
    await tick()
    expect(Math.round(rect(sum).right)).toBe(Math.round(rect(q('#h-q1')).right))
    const extra = document.createElement('jimble-table-cell')
    extra.textContent = '追加の列'
    q('#total').append(extra)
    await tick()
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')!
    expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(3)
    extra.setAttribute('colspan', '3')
    await tick()
    // 合計の行 = 1 + 1 + 3 列。いちばん多い行に合わせて、列が増える
    expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(5)
  })

  it('axe の違反がない', async () => {
    const { el } = await spanned()
    await expectNoA11yViolations(el)
  })
})

describe('データから描く（columns / rows・仮想スクロール）', () => {
  interface Order {
    id: string
    name: string
    amount: number
  }
  const data = (n: number): Order[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `o${i + 1}`,
      name: `顧客 ${i + 1}`,
      amount: (i + 1) * 100,
    }))
  async function virtual(n = 10000, attrs = '') {
    const c = await mount<HTMLElement>(html`<div style="width: 500px"></div>`)
    c.innerHTML = `<jimble-table label="注文" ${attrs} style="--jimble-table-max-height: 400px"></jimble-table>`
    const el = c.querySelector('jimble-table') as JimbleTable
    el.columns = [
      { key: 'id', label: '番号', header: true, width: '6rem', sortable: true },
      { key: 'name', label: '顧客' },
      { key: 'amount', label: '金額', align: 'end', render: (row) => `¥${(row as Order).amount}` },
    ]
    el.rows = data(n)
    await tick(80)
    return { c, el }
  }
  const scroller = (el: JimbleTable) =>
    el.shadowRoot!.querySelector<HTMLElement>('[part="scroller"]')!
  const bodyRows = (el: JimbleTable) =>
    [...el.querySelectorAll('jimble-table-body > jimble-table-row')] as JimbleTableRow[]
  const firstCell = (r: Element) => r.querySelector('jimble-table-cell')!.textContent!.trim()
  const scrollTo = async (el: JimbleTable, top: number) => {
    scroller(el).scrollTop = top
    scroller(el).dispatchEvent(new Event('scroll'))
    await tick(80)
  }
  const internals = (e: Element) => (e as unknown as { internals: ElementInternals }).internals

  it('見出しと、見えている行だけを描く（1 万行でも、描く行は少ない）', async () => {
    const { el } = await virtual()
    const heads = [...el.querySelectorAll('jimble-table-head-cell')].map((h) =>
      h.textContent!.trim(),
    )
    expect(heads).toEqual(['番号', '顧客', '金額'])
    const rows = bodyRows(el)
    expect(rows.length).toBeGreaterThan(5)
    expect(rows.length).toBeLessThan(30)
    expect(firstCell(rows[0]!)).toBe('o1')
    // render の結果・行見出し(header)・align
    const cells = rows[0]!.querySelectorAll('jimble-table-cell')
    expect(cells[2]!.textContent!.trim()).toBe('¥100')
    expect(cells[0]!.hasAttribute('header')).toBe(true)
    expect(cells[2]!.getAttribute('align')).toBe('end')
  })

  it('スクロール領域の高さは、すべての行ぶん。スクロールすると、その位置の行を描く', async () => {
    const { el } = await virtual()
    const s = scroller(el)
    expect(s.scrollHeight).toBeGreaterThan(10000 * 40 - 100)
    await scrollTo(el, 40 * 5000)
    const rows = bodyRows(el)
    const ids = rows.map(firstCell)
    expect(ids).toContain('o5001')
    // 描いた行は、見えている位置に並ぶ
    const target = rows.find((r) => firstCell(r) === 'o5001')!
    const top = target.getBoundingClientRect().top - s.getBoundingClientRect().top
    expect(top).toBeGreaterThan(-80)
    expect(top).toBeLessThan(400)
  })

  it('行の総数と位置を aria-rowcount / aria-rowindex で伝える（見出しの行が 1 行目）', async () => {
    const { el } = await virtual(200)
    expect(internals(el).ariaRowCount).toBe('201')
    await scrollTo(el, 40 * 100)
    const target = bodyRows(el).find((r) => firstCell(r) === 'o101')!
    expect(target.getAttribute('aria-rowindex')).toBe('102')
  })

  it('列の幅は columns の width（無ければ均等）。行の高さは row-height', async () => {
    const { el } = await virtual(50, 'row-height="48"')
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')!
    const widths = getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat)
    expect(widths).toHaveLength(3)
    expect(Math.round(widths[0]!)).toBe(96) // 6rem
    expect(Math.abs(widths[1]! - widths[2]!)).toBeLessThan(2)
    expect(Math.round(bodyRows(el)[0]!.getBoundingClientRect().height)).toBe(48)
  })

  it('長い文字は 1 行に収め、省略する（行の高さを変えない）', async () => {
    const { el } = await virtual(5)
    el.rows = [{ id: 'x', name: '長い名前 '.repeat(40), amount: 1 }]
    await tick(80)
    const row = bodyRows(el)[0]!
    expect(Math.round(row.getBoundingClientRect().height)).toBe(40)
    expect(getComputedStyle(row.querySelectorAll('jimble-table-cell')[1]!).textOverflow).toBe(
      'ellipsis',
    )
  })

  it('rows を差し替えると描き直す。行が減ったら、スクロール位置に合わせて描く', async () => {
    const { el } = await virtual()
    await scrollTo(el, 40 * 9000)
    el.rows = data(20)
    await tick(80)
    const ids = bodyRows(el).map(firstCell)
    expect(ids).toContain('o20')
    expect(internals(el).ariaRowCount).toBe('21')
  })

  it('見出しは固定される。並べ替えの jimble-sort に列の key が付く', async () => {
    const { el } = await virtual()
    expect(getComputedStyle(el.querySelector('jimble-table-header')!).position).toBe('sticky')
    const onSort = vi.fn()
    el.addEventListener('jimble-sort', onSort)
    const head = el.querySelector('jimble-table-head-cell')!
    head.shadowRoot!.querySelector('button')!.click()
    expect((onSort.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      direction: 'ascending',
      key: 'id',
    })
  })

  it('selectable: 選択は row-key（既定 id）で覚え、スクロールで行が描き直されても残る', async () => {
    const { el } = await virtual(1000, 'selectable')
    const onChange = vi.fn()
    el.addEventListener('jimble-selection-change', onChange)
    const box = (r: Element) =>
      r
        .shadowRoot!.querySelector('jimble-checkbox')!
        .shadowRoot!.querySelector<HTMLInputElement>('input')!
    box(bodyRows(el)[1]!).click()
    await tick()
    expect(el.selectedValues).toEqual(['o2'])
    expect(el.selectedItems).toEqual([data(1000)[1]])
    await scrollTo(el, 40 * 600)
    await scrollTo(el, 0)
    const again = bodyRows(el).find((r) => firstCell(r) === 'o2')!
    expect(again.selected).toBe(true)
    expect(box(again).checked).toBe(true)
    // すべて選択は、描いていない行も含めた、すべての行
    const head = el.querySelector('jimble-table-header > jimble-table-row')!
    box(head).click()
    await tick()
    expect(el.selectedValues).toHaveLength(1000)
    expect((onChange.mock.calls.at(-1)![0] as CustomEvent).detail.values).toHaveLength(1000)
  })

  it('selectable の範囲選択（Shift）は、データの並びで選ぶ', async () => {
    const { el } = await virtual(100, 'selectable')
    const box = (r: Element) =>
      r
        .shadowRoot!.querySelector('jimble-checkbox')!
        .shadowRoot!.querySelector<HTMLInputElement>('input')!
    await userEvent.click(box(bodyRows(el)[0]!))
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(box(bodyRows(el)[3]!))
    await userEvent.keyboard('{/Shift}')
    await tick()
    expect(el.selectedValues).toEqual(['o1', 'o2', 'o3', 'o4'])
  })

  it('axe の違反がない', async () => {
    const { el } = await virtual(100, 'selectable')
    await expectNoA11yViolations(el)
  })
})
