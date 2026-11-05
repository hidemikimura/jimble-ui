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

  it('既定の見た目は、公開変数を書かなくても variant の色になる', async () => {
    const el = await mount<JimbleBadge>(html`<jimble-badge variant="success">完了</jimble-badge>`)
    const cs = getComputedStyle(base(el))
    expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(cs.color).not.toBe('rgb(0, 0, 0)')
  })

  it('--jimble-badge-bg / -text / -border で、色を自由に決められる', async () => {
    const el = await mount<JimbleBadge>(
      html`<jimble-badge
        variant="success"
        style="--jimble-badge-bg: rgb(10, 20, 30); --jimble-badge-text: rgb(240, 230, 220); --jimble-badge-border: rgb(1, 2, 3)"
        >紺</jimble-badge
      >`,
    )
    const cs = getComputedStyle(base(el))
    expect(cs.backgroundColor).toBe('rgb(10, 20, 30)')
    expect(cs.color).toBe('rgb(240, 230, 220)')
    expect(cs.boxShadow).toContain('rgb(1, 2, 3)')
  })

  it('dot: ラベルの前に丸を出す（読み上げには含めない）。色は文字色、または変数', async () => {
    const plain = await mount<JimbleBadge>(html`<jimble-badge>a</jimble-badge>`)
    expect(plain.shadowRoot!.querySelector('[part="dot"]')).toBeNull()
    const el = await mount<JimbleBadge>(
      html`<jimble-badge dot variant="danger">キャンセル</jimble-badge>`,
    )
    const dot = el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!
    expect(dot.getAttribute('aria-hidden')).toBe('true')
    expect(getComputedStyle(dot).backgroundColor).toBe(getComputedStyle(base(el)).color)
    el.style.setProperty('--jimble-badge-dot-color', 'rgb(1, 2, 3)')
    expect(getComputedStyle(dot).backgroundColor).toBe('rgb(1, 2, 3)')
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
