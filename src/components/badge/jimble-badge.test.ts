import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-badge.js'
import type { JimbleBadge } from './jimble-badge.js'

afterEach(cleanup)
const base = (el: JimbleBadge) => el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!

describe('jimble-badge', () => {
  it('variant ごとに色が変わり、ring が効く', async () => {
    const a = await mount<JimbleBadge>(html`<jimble-badge variant="success">完了</jimble-badge>`)
    const b = await mount<JimbleBadge>(html`<jimble-badge variant="danger">失敗</jimble-badge>`)
    expect(getComputedStyle(base(a)).backgroundColor).not.toBe(
      getComputedStyle(base(b)).backgroundColor,
    )
    expect(getComputedStyle(base(a)).boxShadow).toContain('inset')
  })

  it('未知の variant は neutral にフォールバックする', async () => {
    const a = await mount<JimbleBadge>(html`<jimble-badge variant="x">a</jimble-badge>`)
    const b = await mount<JimbleBadge>(html`<jimble-badge>a</jimble-badge>`)
    expect(getComputedStyle(base(a)).backgroundColor).toBe(
      getComputedStyle(base(b)).backgroundColor,
    )
  })

  it('size で高さが変わる', async () => {
    const md = await mount<JimbleBadge>(html`<jimble-badge>a</jimble-badge>`)
    const sm = await mount<JimbleBadge>(html`<jimble-badge size="sm">a</jimble-badge>`)
    expect(base(sm).getBoundingClientRect().height).toBeLessThan(
      base(md).getBoundingClientRect().height,
    )
  })

  for (const v of ['neutral', 'primary', 'success', 'warning', 'danger', 'info']) {
    it(`${v}: axe 違反なし`, async () => {
      const el = await mount<JimbleBadge>(
        html`<jimble-badge variant=${v}>ステータス</jimble-badge>`,
      )
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
