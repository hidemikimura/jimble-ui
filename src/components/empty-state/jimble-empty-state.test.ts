import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import '../button/jimble-button.js'
import '../icon/jimble-icon.js'
import './jimble-empty-state.js'
import type { JimbleEmptyState } from './jimble-empty-state.js'

afterEach(cleanup)
const part = (el: JimbleEmptyState, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!

describe('jimble-empty-state', () => {
  it('見出しは role="heading" で、既定のレベルは 2。level で変えられる', async () => {
    const el = await mount<JimbleEmptyState>(
      html`<jimble-empty-state heading="注文はまだありません"></jimble-empty-state>`,
    )
    const h = part(el, 'heading')
    expect(h.getAttribute('role')).toBe('heading')
    expect(h.getAttribute('aria-level')).toBe('2')
    expect(h.textContent!.trim()).toBe('注文はまだありません')
    el.level = 3
    await el.updateComplete
    expect(h.getAttribute('aria-level')).toBe('3')
    el.level = 99
    await el.updateComplete
    expect(h.getAttribute('aria-level')).toBe('6')
  })

  it('説明・アイコン・操作は、あるときだけ場所を取る', async () => {
    const bare = await mount<JimbleEmptyState>(
      html`<jimble-empty-state heading="なし"></jimble-empty-state>`,
    )
    for (const name of ['description', 'icon', 'actions'])
      expect(getComputedStyle(part(bare, name)).display).toBe('none')

    const full = await mount<JimbleEmptyState>(
      html`<jimble-empty-state heading="なし" description="最初の 1 件を作りましょう。">
        <jimble-icon slot="icon" name="inbox"></jimble-icon>
        <jimble-button slot="actions" variant="primary">作る</jimble-button>
      </jimble-empty-state>`,
    )
    await new Promise((r) => setTimeout(r, 30))
    for (const name of ['description', 'icon', 'actions'])
      expect(getComputedStyle(part(full, name)).display).not.toBe('none')
    expect(part(full, 'icon').getAttribute('aria-hidden')).toBe('true')
  })

  it('見出しと説明は、スロットでも書ける', async () => {
    const el = await mount<JimbleEmptyState>(
      html`<jimble-empty-state
        ><span slot="title">該当なし</span
        ><span slot="description">条件を変えてください</span></jimble-empty-state
      >`,
    )
    await new Promise((r) => setTimeout(r, 30))
    expect(getComputedStyle(part(el, 'description')).display).not.toBe('none')
  })

  it('axe 違反がない', async () => {
    const el = await mount<JimbleEmptyState>(
      html`<jimble-empty-state
        heading="注文はまだありません"
        description="最初の注文を登録しましょう。"
      >
        <jimble-icon slot="icon" name="inbox"></jimble-icon>
        <jimble-button slot="actions" variant="primary">注文を登録</jimble-button>
      </jimble-empty-state>`,
    )
    await expectNoA11yViolations(el)
  })
})
