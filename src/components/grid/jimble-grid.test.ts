import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-grid.js'
import type { JimbleGrid } from './jimble-grid.js'

afterEach(cleanup)
const base = (el: JimbleGrid) => el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
const cols = (el: JimbleGrid) =>
  getComputedStyle(base(el)).gridTemplateColumns.split(' ').filter(Boolean).length

/** 幅を決めた入れ物に、4 つの子を持つ grid を置く */
async function put(attrs: Record<string, string>, width = 400) {
  const c = await mount<HTMLElement>(html`<div style="width: ${width}px"></div>`)
  const g = document.createElement('jimble-grid')
  for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, v)
  g.innerHTML = '<div>a</div><div>b</div><div>c</div><div>d</div>'
  c.append(g)
  await g.updateComplete
  return g
}

describe('jimble-grid', () => {
  it('既定は 1 列', async () => {
    expect(cols(await put({}))).toBe(1)
  })

  it('columns で列の数を決め、列の幅は等しい', async () => {
    const g = await put({ columns: '2', gap: '0' })
    expect(cols(g)).toBe(2)
    const [a, b] = [...g.children]
    expect(a!.getBoundingClientRect().width).toBe(200)
    expect(b!.getBoundingClientRect().left - a!.getBoundingClientRect().left).toBe(200)
  })

  it('gap は、余白の基準（4px）の倍数。既定は 16px', async () => {
    const g = await put({ columns: '2' })
    const [a, b] = [...g.children]
    expect(b!.getBoundingClientRect().left - a!.getBoundingClientRect().right).toBe(16)
  })

  it('min-column-width で、幅に入るだけの列にする（狭いと 1 列で、はみ出さない）', async () => {
    expect(cols(await put({ 'min-column-width': '120px', gap: '0' }, 400))).toBe(3)
    const narrow = await put({ 'min-column-width': '300px', gap: '0' }, 200)
    expect(cols(narrow)).toBe(1)
    expect(narrow.children[0]!.getBoundingClientRect().width).toBe(200)
  })

  it('min-column-width は columns より優先する。長さでない値は無視して columns を使う', async () => {
    expect(cols(await put({ columns: '4', 'min-column-width': '150px', gap: '0' }, 400))).toBe(2)
    expect(cols(await put({ columns: '4', 'min-column-width': 'calc(1px)' }, 400))).toBe(4)
  })

  it('columns の誤った値は 1 列', async () => {
    expect(cols(await put({ columns: '0' }))).toBe(1)
    expect(cols(await put({ columns: 'abc' }))).toBe(1)
  })

  it('axe 違反がない', async () => {
    const g = await put({ columns: '2' })
    await expectNoA11yViolations(g)
  })
})
