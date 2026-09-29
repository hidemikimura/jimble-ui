import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-card.js'
import type { JimbleCard } from './jimble-card.js'

afterEach(cleanup)
const part = (el: JimbleCard, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!

describe('jimble-card', () => {
  it('面として shadow と ring が効く', async () => {
    const el = await mount<JimbleCard>(html`<jimble-card>本文</jimble-card>`)
    const s = getComputedStyle(part(el, 'base'))
    expect(s.boxShadow).toContain('inset')
    expect(s.boxShadow).toContain('3px')
  })

  it('header / footer は中身があるときだけ表示される', async () => {
    const empty = await mount<JimbleCard>(html`<jimble-card>本文</jimble-card>`)
    expect(getComputedStyle(part(empty, 'header')).display).toBe('none')
    expect(getComputedStyle(part(empty, 'footer')).display).toBe('none')
    const full = await mount<JimbleCard>(
      html`<jimble-card
        ><h2 slot="header">見出し</h2>
        本文
        <div slot="footer">操作</div></jimble-card
      >`,
    )
    expect(getComputedStyle(part(full, 'header')).display).not.toBe('none')
    expect(getComputedStyle(part(full, 'footer')).display).not.toBe('none')
  })

  it('後から header を足すと表示される（slotchange）', async () => {
    const el = await mount<JimbleCard>(html`<jimble-card>本文</jimble-card>`)
    const h = document.createElement('h2')
    h.slot = 'header'
    h.textContent = '後から'
    el.append(h)
    await new Promise((r) => setTimeout(r, 30))
    expect(getComputedStyle(part(el, 'header')).display).not.toBe('none')
  })

  it('公開変数で余白を変えられる', async () => {
    const el = await mount<JimbleCard>(html`<jimble-card>本文</jimble-card>`)
    el.style.setProperty('--jimble-card-padding', '2rem')
    expect(getComputedStyle(part(el, 'body')).paddingTop).toBe('32px')
  })

  it('axe 違反なし', async () => {
    const el = await mount<JimbleCard>(
      html`<jimble-card
        ><h2 slot="header">見出し</h2>
        本文
        <div slot="footer">操作</div></jimble-card
      >`,
    )
    await expectNoA11yViolations(el.parentElement!)
  })
})
