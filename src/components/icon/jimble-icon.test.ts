import { html, svg } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { ICON_NAMES } from '../../icons/names.js'
import '../../icons/register/index.js'
import { getIcon, listIcons, registerIcon } from '../../icons/registry.js'
import type { JimbleIcon } from './jimble-icon.js'
import './jimble-icon.js'

afterEach(cleanup)
const svgOf = (el: JimbleIcon) => el.shadowRoot!.querySelector('svg')
const role = (el: JimbleIcon) => (el as unknown as { internals: ElementInternals }).internals

describe('jimble-icon', () => {
  it('name のアイコンを描く。全アイコンが登録されている', async () => {
    expect(ICON_NAMES.length).toBeGreaterThan(90)
    expect([...ICON_NAMES].every((n) => getIcon(n))).toBe(true)
    expect(listIcons().length).toBeGreaterThanOrEqual(ICON_NAMES.length)
    const el = await mount<JimbleIcon>(html`<jimble-icon name="check"></jimble-icon>`)
    expect(svgOf(el)).not.toBeNull()
    expect(svgOf(el)!.getAttribute('aria-hidden')).toBe('true')
  })

  it('label が無ければ装飾（role なし）、あれば role=img で名前が付く', async () => {
    const el = await mount<JimbleIcon>(html`<jimble-icon name="bell"></jimble-icon>`)
    expect(role(el).role).toBeNull()
    el.label = '通知'
    await el.updateComplete
    expect(role(el).role).toBe('img')
    expect(role(el).ariaLabel).toBe('通知')
    el.label = undefined
    await el.updateComplete
    expect(role(el).role).toBeNull()
  })

  it('登録されていない名前は何も描かない。後から登録すると描かれる', async () => {
    const el = await mount<JimbleIcon>(html`<jimble-icon name="my-logo"></jimble-icon>`)
    expect(svgOf(el)).toBeNull()
    registerIcon('my-logo', {
      viewBox: '0 0 10 10',
      fill: 'currentColor',
      body: svg`<circle cx="5" cy="5" r="5"/>`,
    })
    await el.updateComplete
    expect(svgOf(el)).not.toBeNull()
  })

  it('size と --jimble-icon-size で大きさが変わる。未知の値は md', async () => {
    const el = await mount<JimbleIcon>(html`<jimble-icon name="check" size="sm"></jimble-icon>`)
    const w = () => svgOf(el)!.getBoundingClientRect().width
    expect(w()).toBe(16)
    el.size = 'xl'
    await el.updateComplete
    expect(w()).toBe(32)
    el.size = 'zz' as never
    await el.updateComplete
    expect(w()).toBe(20)
    el.style.setProperty('--jimble-icon-size', '3rem')
    expect(w()).toBe(48)
  })

  it('周りの文字色に従う', async () => {
    const p = await mount<HTMLElement>(
      html`<p style="color: rgb(1, 2, 3)"><jimble-icon name="check"></jimble-icon></p>`,
    )
    const el = p.querySelector('jimble-icon') as JimbleIcon
    await el.updateComplete
    expect(getComputedStyle(svgOf(el)!).color).toBe('rgb(1, 2, 3)')
  })

  it('axe 違反がない（装飾・label 付き・ボタンの中）', async () => {
    const el = await mount<HTMLElement>(
      html`<div>
        <jimble-icon name="check"></jimble-icon>
        <jimble-icon name="bell" label="通知"></jimble-icon>
        <button aria-label="削除"><jimble-icon name="trash"></jimble-icon></button>
      </div>`,
    )
    await expectNoA11yViolations(el)
  })
})
