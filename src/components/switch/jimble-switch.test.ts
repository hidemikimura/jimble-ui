import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleSwitch } from './jimble-switch.js'

afterEach(cleanup)
const inner = (el: JimbleSwitch) => el.shadowRoot!.querySelector('input')!

describe('jimble-switch', () => {
  it('role=switch で、クリックと Space で切り替わり、オン時だけ送信される', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-switch name="notify">通知</jimble-switch></form>`,
    )
    const el = f.querySelector('jimble-switch')!
    await el.updateComplete
    expect(inner(el).getAttribute('role')).toBe('switch')
    expect(Object.fromEntries(new FormData(f))).toEqual({})
    await userEvent.click(el.shadowRoot!.querySelector('[part="label"]')!)
    expect(el.checked).toBe(true)
    expect(Object.fromEntries(new FormData(f))).toEqual({ notify: 'on' })
    await new Promise((r) => setTimeout(r, 50)) // クリック後のフォーカス処理が終わるのを待つ
    inner(el).focus()
    await expect.poll(() => el.shadowRoot!.activeElement).toBe(inner(el))
    await userEvent.keyboard(' ')
    await expect.poll(() => el.checked).toBe(false)
  })

  it('reset で checked 属性の状態に戻る', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-switch name="a" checked>x</jimble-switch></form>`,
    )
    const el = f.querySelector('jimble-switch')!
    await el.updateComplete
    await userEvent.click(inner(el).parentElement!)
    expect(el.checked).toBe(false)
    f.reset()
    await el.updateComplete
    expect(el.checked).toBe(true)
  })

  it('オンでつまみが動き、トラックの色が変わる', async () => {
    const off = await mount<JimbleSwitch>(html`<jimble-switch>x</jimble-switch>`)
    const on = await mount<JimbleSwitch>(html`<jimble-switch checked>x</jimble-switch>`)
    const track = (e: JimbleSwitch) => e.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    const thumb = (e: JimbleSwitch) => e.shadowRoot!.querySelector<HTMLElement>('[part="thumb"]')!
    expect(getComputedStyle(track(on)).backgroundColor).not.toBe(
      getComputedStyle(track(off)).backgroundColor,
    )
    expect(thumb(on).getBoundingClientRect().x).toBeGreaterThan(
      thumb(off).getBoundingClientRect().x + 10,
    )
    expect(getComputedStyle(track(off)).boxShadow).toContain('inset')
  })

  for (const [name, t] of Object.entries({
    オフ: html`<jimble-switch>通知</jimble-switch>`,
    オン: html`<jimble-switch checked>通知</jimble-switch>`,
    disabled: html`<jimble-switch disabled>通知</jimble-switch>`,
    ラベル無し: html`<jimble-switch aria-label="通知"></jimble-switch>`,
  })) {
    it(`axe: ${name}`, async () => {
      const el = await mount(t)
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
