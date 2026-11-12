import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-skeleton.js'
import type { JimbleSkeleton } from './jimble-skeleton.js'

afterEach(cleanup)
const shapes = (el: JimbleSkeleton) => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="shape"]'),
]
const box = (e: HTMLElement) => e.getBoundingClientRect()

describe('jimble-skeleton', () => {
  it('既定は文字 1 行（幅いっぱい・面の色が付く）', async () => {
    const el = await mount<JimbleSkeleton>(
      html`<div style="width: 300px"><jimble-skeleton></jimble-skeleton></div>`,
    )
    const s = el.querySelector<JimbleSkeleton>('jimble-skeleton')!
    const [line] = shapes(s)
    expect(shapes(s)).toHaveLength(1)
    expect(box(line!).width).toBe(300)
    expect(getComputedStyle(line!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('lines で行の数を決め、最後の行は短い', async () => {
    const wrap = await mount<HTMLElement>(
      html`<div style="width: 300px"><jimble-skeleton lines="3"></jimble-skeleton></div>`,
    )
    const lines = shapes(wrap.querySelector<JimbleSkeleton>('jimble-skeleton')!)
    expect(lines).toHaveLength(3)
    expect(box(lines[2]!).width).toBeLessThan(box(lines[0]!).width)
  })

  it('lines の誤った値は 1〜20 に収める', async () => {
    const el = await mount<JimbleSkeleton>(html`<jimble-skeleton lines="0"></jimble-skeleton>`)
    expect(shapes(el)).toHaveLength(1)
    el.lines = 500
    await el.updateComplete
    expect(shapes(el)).toHaveLength(20)
  })

  it('rect / circle と、大きさの変数', async () => {
    const rect = await mount<JimbleSkeleton>(
      html`<jimble-skeleton
        variant="rect"
        style="--jimble-skeleton-width: 120px; --jimble-skeleton-height: 40px"
      ></jimble-skeleton>`,
    )
    expect(box(shapes(rect)[0]!).width).toBe(120)
    expect(box(shapes(rect)[0]!).height).toBe(40)
    const circle = await mount<JimbleSkeleton>(
      html`<jimble-skeleton variant="circle"></jimble-skeleton>`,
    )
    const c = shapes(circle)[0]!
    expect(box(c).width).toBe(40)
    expect(box(c).height).toBe(40)
    expect(getComputedStyle(c).borderTopLeftRadius).not.toBe('0px')
  })

  it('読み上げには出ない（飾り）', async () => {
    const wrap = await mount<HTMLElement>(
      html`<div aria-busy="true">
        <jimble-skeleton lines="2"></jimble-skeleton>
      </div>`,
    )
    await expectNoA11yViolations(wrap)
  })
})
