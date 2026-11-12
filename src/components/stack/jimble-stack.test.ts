import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-stack.js'
import type { JimbleStack } from './jimble-stack.js'
import { gapUnits } from './layout.js'

afterEach(cleanup)
const base = (el: JimbleStack) => el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
const top = (el: Element) => el.getBoundingClientRect().top
const left = (el: Element) => el.getBoundingClientRect().left

const three = () =>
  mount<JimbleStack>(
    html`<jimble-stack
      ><div style="height: 10px">a</div>
      <div style="height: 10px">b</div>
      <div style="height: 10px">c</div></jimble-stack
    >`,
  )

describe('jimble-stack', () => {
  it('既定は、縦に 16px（余白の基準 4px × 4）の間隔で並べる', async () => {
    const el = await mount<JimbleStack>(
      html`<jimble-stack
        ><div style="height: 10px">a</div>
        <div style="height: 10px">b</div></jimble-stack
      >`,
    )
    const [a, b] = [...el.children]
    expect(top(b!) - top(a!)).toBe(26) // 10px + 16px
    expect(getComputedStyle(base(el)).flexDirection).toBe('column')
  })

  it('direction="horizontal" で横に並べ、gap で間隔を変える', async () => {
    const el = await mount<JimbleStack>(
      html`<jimble-stack direction="horizontal" gap="2"
        ><span style="display: inline-block; width: 30px">a</span
        ><span style="display: inline-block; width: 30px">b</span></jimble-stack
      >`,
    )
    const [a, b] = [...el.children]
    expect(top(a!)).toBe(top(b!))
    expect(left(b!) - left(a!)).toBe(38) // 30px + 8px
  })

  it('間隔は --jimble-spacing（ページ全体の密度）に従う', async () => {
    const el = await mount<JimbleStack>(
      html`<jimble-stack style="--jimble-spacing: 2px"
        ><div style="height: 10px">a</div>
        <div style="height: 10px">b</div></jimble-stack
      >`,
    )
    const [a, b] = [...el.children]
    expect(top(b!) - top(a!)).toBe(18) // 10px + 2px × 4
  })

  it('align・justify・wrap が、並べ方に効く', async () => {
    const el = await mount<JimbleStack>(
      html`<jimble-stack direction="horizontal" align="center" justify="between" wrap
        ><span>a</span><span>b</span></jimble-stack
      >`,
    )
    const cs = getComputedStyle(base(el))
    expect(cs.alignItems).toBe('center')
    expect(cs.justifyContent).toBe('space-between')
    expect(cs.flexWrap).toBe('wrap')
  })

  it('中の文字は、置いた場所の書体と色を引き継ぐ', async () => {
    const outer = await mount<HTMLElement>(
      html`<div style="font-family: serif; color: rgb(200, 0, 0)">
        <jimble-stack><p>本文</p></jimble-stack>
      </div>`,
    )
    const p = outer.querySelector('p')!
    expect(getComputedStyle(p).color).toBe('rgb(200, 0, 0)')
    expect(getComputedStyle(p).fontFamily).toBe('serif')
  })

  it('gap の誤った値は、既定（4）として扱う', () => {
    expect(gapUnits('3')).toBe(3)
    expect(gapUnits(0)).toBe(0)
    expect(gapUnits(1.5)).toBe(1.5)
    expect(gapUnits('abc')).toBe(4)
    expect(gapUnits(-1)).toBe(4)
    expect(gapUnits(undefined)).toBe(4)
  })

  it('axe 違反がない', async () => {
    const el = await three()
    await expectNoA11yViolations(el)
  })
})
