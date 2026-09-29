import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleDateInput } from './jimble-date-input.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const input = (el: JimbleDateInput) => el.shadowRoot!.querySelector('input')!
const popup = (el: JimbleDateInput) => el.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!
const isOpen = (el: JimbleDateInput) => popup(el).matches(':popover-open')
const btn = (el: JimbleDateInput) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="calendar-button"]')!
const day = (el: JimbleDateInput, iso: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))

async function make(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-date-input name="d" aria-label="期日" ${attrs}></jimble-date-input>`
  const el = f.querySelector('jimble-date-input') as JimbleDateInput
  await el.updateComplete
  return { f, el }
}

describe('表示と値', () => {
  it('value 属性を言語の書式で表示し、フォームには ISO で送る', async () => {
    const { f, el } = await make('value="2026-09-29"')
    expect(input(el).value).toBe('2026/09/29')
    expect(data(f)).toEqual({ d: '2026-09-29' })
    expect(el.value).toBe('2026-09-29')
  })

  it('未入力は送信されず、プレースホルダーに書式の例が出る', async () => {
    const { f, el } = await make()
    expect(data(f)).toEqual({})
    expect(input(el).placeholder).toBe('yyyy/mm/dd')
  })

  it('en では月/日/年の書式', async () => {
    setLocale(en)
    const { el } = await make('value="2026-09-29"')
    expect(input(el).value).toBe('09/29/2026')
  })

  it('value プロパティで設定でき、不正な値は空になる', async () => {
    const { el } = await make()
    el.value = '2026-02-30'
    expect(el.value).toBe('')
    el.value = '2026-03-05'
    await el.updateComplete
    expect(input(el).value).toBe('2026/03/05')
  })

  it('reset で value 属性に戻る', async () => {
    const { f, el } = await make('value="2026-01-01"')
    el.value = '2026-05-05'
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('2026-01-01')
    expect(input(el).value).toBe('2026/01/01')
  })
})

describe('テキスト入力', () => {
  it('いろいろな書式を受け付け、blur で正規の書式に整える', async () => {
    const { f, el } = await make()
    for (const [typed, iso] of [
      ['2026/9/3', '2026-09-03'],
      ['2026-09-03', '2026-09-03'],
      ['2026年9月3日', '2026-09-03'],
      ['20260903', '2026-09-03'],
      ['２０２６／９／３', '2026-09-03'],
    ] as const) {
      input(el).focus()
      // 非 ASCII は userEvent.keyboard で確実に打てないので、値を入れて input を発火する
      input(el).value = typed
      input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      await el.updateComplete
      expect(data(f)).toEqual({ d: iso })
      input(el).blur()
      await el.updateComplete
      expect(input(el).value).toBe('2026/09/03')
    }
  })

  it('input は入力ごと、change は確定時に 1 回', async () => {
    const { el } = await make()
    const onInput = vi.fn()
    const onChange = vi.fn()
    el.addEventListener('input', onInput)
    el.addEventListener('change', onChange)
    input(el).focus()
    await userEvent.keyboard('2026/09/03')
    expect(onInput).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    input(el).blur()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('書式が不正、または範囲外だと検証エラーになる', async () => {
    const { el } = await make('min="2026-01-01" max="2026-12-31"')
    input(el).focus()
    await userEvent.keyboard('abc')
    expect(el.validity.badInput).toBe(true)
    expect(el.validationMessage).toContain('2026/09/29')
    input(el).select()
    await userEvent.keyboard('2025/12/31')
    expect(el.validity.rangeUnderflow).toBe(true)
    input(el).select()
    await userEvent.keyboard('2027/01/01')
    expect(el.validity.rangeOverflow).toBe(true)
    input(el).select()
    await userEvent.keyboard('2026/06/01')
    expect(el.validity.valid).toBe(true)
  })

  it('required で未入力ならエラー、setCustomValidity も効く', async () => {
    const { el } = await make('required')
    expect(el.validity.valueMissing).toBe(true)
    el.value = '2026-06-01'
    el.setCustomValidity('この日は使えません')
    expect(el.validity.customError).toBe(true)
    expect(el.validationMessage).toBe('この日は使えません')
    el.setCustomValidity('')
    expect(el.validity.valid).toBe(true)
  })

  it('Enter で暗黙の送信になる', async () => {
    const f = await mount<HTMLFormElement>(html`<form></form>`)
    f.innerHTML = `<jimble-date-input name="d" aria-label="期日"></jimble-date-input><button>送信</button>`
    const el = f.querySelector('jimble-date-input') as JimbleDateInput
    await el.updateComplete
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    input(el).focus()
    await userEvent.keyboard('2026/09/03{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('カレンダー', () => {
  it('ボタンで開き、選択日にフォーカスが移る。日を選ぶと閉じて入力欄に戻る', async () => {
    const { f, el } = await make('value="2026-09-29"')
    btn(el).click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(btn(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.activeElement).toBe(day(el, '2026-09-29'))
    day(el, '2026-09-15').click()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(data(f)).toEqual({ d: '2026-09-15' })
    expect(input(el).value).toBe('2026/09/15')
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('入力欄で ↓ を押すと開く。Escape で閉じて入力欄に戻る', async () => {
    const { el } = await make('value="2026-09-29"')
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(day(el, '2026-09-29'))
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('矢印キー・Home/End・PageUp/PageDown で移動する', async () => {
    const { el } = await make('value="2026-09-29"')
    btn(el).click()
    await tick()
    const active = () => (el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.date
    await userEvent.keyboard('{ArrowLeft}')
    await tick()
    expect(active()).toBe('2026-09-28')
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(active()).toBe('2026-10-05')
    await userEvent.keyboard('{PageUp}')
    await tick()
    expect(active()).toBe('2026-09-05')
    await userEvent.keyboard('{Home}')
    await tick()
    expect(active()).toBe('2026-08-30')
    await userEvent.keyboard('{End}')
    await tick()
    expect(active()).toBe('2026-09-05')
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(el.value).toBe('2026-09-05')
  })

  it('min / max の外の日は選べない', async () => {
    const { el } = await make('value="2026-09-15" min="2026-09-10" max="2026-09-20"')
    btn(el).click()
    await tick()
    expect(day(el, '2026-09-09').disabled).toBe(true)
    expect(day(el, '2026-09-21').disabled).toBe(true)
    expect(day(el, '2026-09-10').disabled).toBe(false)
    day(el, '2026-09-09').click()
    expect(el.value).toBe('2026-09-15')
  })

  it('first-day-of-week=1 で月曜始まり', async () => {
    const { el } = await make('value="2026-09-29" first-day-of-week="1"')
    btn(el).click()
    await tick()
    const heads = [...el.shadowRoot!.querySelectorAll('th')].map((t) => t.textContent!.trim())
    expect(heads[0]).toBe('月')
    expect(heads[6]).toBe('日')
  })

  it('「クリア」で値が空になる', async () => {
    const { f, el } = await make('value="2026-09-29"')
    btn(el).click()
    await tick()
    ;[...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="footer"] button')][1]!.click()
    await tick()
    expect(data(f)).toEqual({})
    expect(input(el).value).toBe('')
  })

  it('disabled / readonly ではカレンダーを開けない', async () => {
    const a = await make('disabled')
    expect(btn(a.el).disabled).toBe(true)
    const b = await make('readonly')
    expect(btn(b.el).disabled).toBe(true)
  })
})

describe('アクセシビリティ', () => {
  it('field の中で名前が付き、閉じた状態・開いた状態とも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="期日" hint="例: 2026/09/29"
        ><jimble-date-input name="d" value="2026-09-29"></jimble-date-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-date-input') as JimbleDateInput
    await el.updateComplete
    expect(input(el).getAttribute('aria-label')).toBe('期日')
    await expectNoA11yViolations(f)
    btn(el).click()
    await tick()
    await expectNoA11yViolations(f)
  })
})
