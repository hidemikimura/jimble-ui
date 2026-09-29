import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleSpinner } from './jimble-spinner.js'
import './jimble-spinner.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const role = (el: JimbleSpinner) =>
  (el as unknown as { internals: ElementInternals }).internals.role
const size = (el: JimbleSpinner) =>
  el.shadowRoot!.querySelector('svg')!.getBoundingClientRect().width

describe('jimble-spinner', () => {
  it('既定で role=status と「読み込み中」を持つ。label で文字を変えられ、辞書にも従う', async () => {
    const el = await mount<JimbleSpinner>(html`<jimble-spinner></jimble-spinner>`)
    expect(role(el)).toBe('status')
    expect(el.shadowRoot!.textContent).toContain('読み込み中')
    el.label = 'データを取得しています'
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('データを取得しています')
    el.label = undefined
    setLocale(en)
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('Loading')
  })

  it('decorative では role も読み上げ用の文字も持たない', async () => {
    const el = await mount<JimbleSpinner>(html`<jimble-spinner decorative></jimble-spinner>`)
    expect(role(el)).toBeNull()
    expect(el.shadowRoot!.textContent!.trim()).toBe('')
  })

  it('size で大きさが変わり、--jimble-spinner-size で上書きできる。未知の値は md', async () => {
    const el = await mount<JimbleSpinner>(html`<jimble-spinner size="sm"></jimble-spinner>`)
    expect(size(el)).toBe(16)
    el.size = 'lg'
    await el.updateComplete
    expect(size(el)).toBe(40)
    el.size = 'xx' as never
    await el.updateComplete
    expect(size(el)).toBe(24)
    el.style.setProperty('--jimble-spinner-size', '3rem')
    expect(size(el)).toBe(48)
  })

  it('variant=primary で主色になり、既定は文字色を引き継ぐ', async () => {
    const el = await mount<JimbleSpinner>(
      html`<p style="color: rgb(1, 2, 3)"><jimble-spinner></jimble-spinner></p>`,
    )
    const sp = el.querySelector('jimble-spinner') as JimbleSpinner
    await sp.updateComplete
    const color = () => getComputedStyle(sp.shadowRoot!.querySelector('svg')!).color
    expect(color()).toBe('rgb(1, 2, 3)')
    sp.variant = 'primary'
    await sp.updateComplete
    expect(color()).not.toBe('rgb(1, 2, 3)')
  })

  it('axe 違反がない(通常・decorative)', async () => {
    const el = await mount<HTMLElement>(
      html`<div>
        <jimble-spinner></jimble-spinner><jimble-spinner decorative></jimble-spinner>
      </div>`,
    )
    await expectNoA11yViolations(el)
  })
})
