import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleCheckbox } from './jimble-checkbox.js'

afterEach(cleanup)
const inner = (el: JimbleCheckbox) => el.shadowRoot!.querySelector('input')!
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

async function form(body: ReturnType<typeof html>) {
  const f = await mount<HTMLFormElement>(html`<form>${body}</form>`)
  await Promise.all(
    [...f.querySelectorAll('jimble-checkbox')].map((e) => (e as JimbleCheckbox).updateComplete),
  )
  return f
}

describe('jimble-checkbox', () => {
  it('クリックで切り替わり、チェック時だけ value（既定 on）が送信される', async () => {
    const f = await form(
      html`<jimble-checkbox name="a">同意</jimble-checkbox
        ><jimble-checkbox name="b" value="yes" checked>はい</jimble-checkbox>`,
    )
    const [a, b] = [...f.querySelectorAll('jimble-checkbox')]
    expect(data(f)).toEqual({ b: 'yes' })
    await userEvent.click(inner(a!))
    expect(a!.checked).toBe(true)
    expect(data(f)).toEqual({ a: 'on', b: 'yes' })
    await userEvent.click(inner(b!))
    expect(data(f)).toEqual({ a: 'on' })
  })

  it('ラベル(スロット)のクリックでも切り替わる。change は host から 1 回出てバブリングする', async () => {
    const onChange = vi.fn()
    const f = await mount<HTMLFormElement>(
      html`<form @change=${onChange}><jimble-checkbox name="a">同意する</jimble-checkbox></form>`,
    )
    const el = f.querySelector('jimble-checkbox')!
    await el.updateComplete
    await userEvent.click(el.shadowRoot!.querySelector('[part="label"]')!)
    expect(el.checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]![0] as Event).target).toBe(el)
  })

  it('外側の <label for> のクリックで 1 回だけ切り替わる', async () => {
    const onChange = vi.fn()
    const c = await mount<HTMLElement>(
      html`<div>
        <label for="c">メルマガ</label
        ><jimble-checkbox id="c" @change=${onChange}></jimble-checkbox>
      </div>`,
    )
    const el = c.querySelector('jimble-checkbox')!
    await el.updateComplete
    await userEvent.click(c.querySelector('label')!)
    expect(el.checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(inner(el).getAttribute('aria-label')).toBe('メルマガ')
  })

  it('Space で切り替わる', async () => {
    const el = await mount<JimbleCheckbox>(html`<jimble-checkbox>x</jimble-checkbox>`)
    inner(el).focus()
    await userEvent.keyboard(' ')
    await expect.poll(() => el.checked).toBe(true)
    await userEvent.keyboard(' ')
    await expect.poll(() => el.checked).toBe(false)
  })

  it('checked 属性はデフォルト。reset で戻り、ユーザーが触った後は属性で上書きしない', async () => {
    const f = await form(html`<jimble-checkbox name="a" checked>x</jimble-checkbox>`)
    const el = f.querySelector('jimble-checkbox')!
    await userEvent.click(inner(el))
    expect(el.checked).toBe(false)
    el.setAttribute('checked', '')
    expect(el.checked).toBe(false)
    f.reset()
    await el.updateComplete
    expect(el.checked).toBe(true)
    expect(inner(el).checked).toBe(true)
  })

  it('indeterminate は操作すると解除される', async () => {
    const el = await mount<JimbleCheckbox>(
      html`<jimble-checkbox indeterminate>一部</jimble-checkbox>`,
    )
    expect(inner(el).indeterminate).toBe(true)
    await userEvent.click(inner(el))
    await el.updateComplete
    expect(el.indeterminate).toBe(false)
    expect(inner(el).indeterminate).toBe(false)
  })

  it('required: 未チェックだと無効。メッセージは「チェックしてください」', async () => {
    const f = await form(html`<jimble-checkbox name="a" required>規約に同意</jimble-checkbox>`)
    const el = f.querySelector('jimble-checkbox')!
    expect(f.checkValidity()).toBe(false)
    expect(el.validationMessage).toBe('チェックしてください')
    await userEvent.click(inner(el))
    expect(f.checkValidity()).toBe(true)
  })

  it('disabled と fieldset[disabled]', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <fieldset disabled><jimble-checkbox name="a" checked>x</jimble-checkbox></fieldset>
      </form>`,
    )
    const el = f.querySelector('jimble-checkbox')!
    await el.updateComplete
    expect(inner(el).disabled).toBe(true)
    expect(data(f)).toEqual({})
  })

  it('チェック時の見た目: 背景が primary になり、チェックマークが出る（Shadow DOM 内のスタイル）', async () => {
    const off = await mount<JimbleCheckbox>(html`<jimble-checkbox>x</jimble-checkbox>`)
    const on = await mount<JimbleCheckbox>(html`<jimble-checkbox checked>x</jimble-checkbox>`)
    expect(getComputedStyle(inner(on)).backgroundColor).not.toBe(
      getComputedStyle(inner(off)).backgroundColor,
    )
    expect(getComputedStyle(on.shadowRoot!.querySelector('svg')!).display).not.toBe('none')
    expect(getComputedStyle(off.shadowRoot!.querySelector('svg')!).display).toBe('none')
    await tick()
  })

  for (const [name, t] of Object.entries({
    通常: html`<jimble-checkbox>同意する</jimble-checkbox>`,
    checked: html`<jimble-checkbox checked>同意する</jimble-checkbox>`,
    indeterminate: html`<jimble-checkbox indeterminate>すべて選択</jimble-checkbox>`,
    disabled: html`<jimble-checkbox disabled>同意する</jimble-checkbox>`,
    ラベル無し: html`<jimble-checkbox aria-label="行を選択"></jimble-checkbox>`,
  })) {
    it(`axe: ${name}`, async () => {
      const el = await mount(t)
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
