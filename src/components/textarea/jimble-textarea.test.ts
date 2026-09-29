import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleTextarea } from './jimble-textarea.js'

afterEach(cleanup)
const inner = (el: JimbleTextarea) => el.shadowRoot!.querySelector('textarea')!
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

describe('jimble-textarea', () => {
  it('値が送信され、reset で value 属性に戻る', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-textarea name="m" value="初期"></jimble-textarea></form>`,
    )
    const el = f.querySelector('jimble-textarea')!
    await el.updateComplete
    await userEvent.type(inner(el), '追記')
    expect(Object.fromEntries(new FormData(f))).toEqual({ m: '初期追記' })
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('初期')
  })

  it('Enter は改行になり、フォームを送信しない', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-textarea name="m"></jimble-textarea></form>`,
    )
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    const el = f.querySelector('jimble-textarea')!
    await el.updateComplete
    await userEvent.type(inner(el), 'a{Enter}b')
    await tick()
    expect(el.value).toBe('a\nb')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rows で高さが変わる。autosize は内容に合わせて伸びる', async () => {
    const a = await mount<JimbleTextarea>(html`<jimble-textarea rows="2"></jimble-textarea>`)
    const b = await mount<JimbleTextarea>(html`<jimble-textarea rows="6"></jimble-textarea>`)
    expect(inner(b).getBoundingClientRect().height).toBeGreaterThan(
      inner(a).getBoundingClientRect().height,
    )
    const auto = await mount<JimbleTextarea>(
      html`<jimble-textarea autosize rows="1"></jimble-textarea>`,
    )
    const h0 = inner(auto).getBoundingClientRect().height
    await userEvent.type(inner(auto), '1{Enter}2{Enter}3{Enter}4')
    await tick(50)
    expect(inner(auto).getBoundingClientRect().height).toBeGreaterThan(h0)
  })

  it('required の検証メッセージ・maxlength', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-textarea name="m" required maxlength="3"></jimble-textarea></form>`,
    )
    const el = f.querySelector('jimble-textarea')!
    await el.updateComplete
    expect(el.validationMessage).toBe('この項目は必須です')
    await userEvent.type(inner(el), 'abcdef')
    expect(el.value).toBe('abc')
  })

  it('axe 違反なし', async () => {
    const el = await mount<JimbleTextarea>(
      html`<jimble-textarea aria-label="コメント" placeholder="ご意見をどうぞ"></jimble-textarea>`,
    )
    await expectNoA11yViolations(el.parentElement!)
  })
})
