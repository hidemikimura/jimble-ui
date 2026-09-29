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

describe('日時（time）', () => {
  const timeInputs = (el: JimbleDateInput) => ({
    h: el.shadowRoot!.querySelector<HTMLInputElement>('[part="time-hour"]')!,
    m: el.shadowRoot!.querySelector<HTMLInputElement>('[part="time-minute"]')!,
  })
  const setNum = (input: HTMLInputElement, v: string) => {
    input.value = v
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  it('value は YYYY-MM-DDTHH:mm。表示は日本語の書式で、時刻の欄に反映される', async () => {
    const { f, el } = await make('time value="2026-09-29T14:30"')
    expect(input(el).value).toBe('2026/09/29 14:30')
    expect(data(f)).toEqual({ d: '2026-09-29T14:30' })
    expect(input(el).placeholder).toBe('yyyy/mm/dd hh:mm')
    expect(timeInputs(el).h.value).toBe('14')
    expect(timeInputs(el).m.value).toBe('30')
  })

  it('日を選んでも開いたまま。時刻を変えると値と change が更新され、「完了」で閉じる', async () => {
    const { f, el } = await make('time')
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    btn(el).click()
    await tick()
    expect(timeInputs(el).h.disabled).toBe(true)
    day(el, '2026-09-15').click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(data(f)).toEqual({ d: '2026-09-15T00:00' })
    expect(timeInputs(el).h.disabled).toBe(false)
    setNum(timeInputs(el).h, '9')
    setNum(timeInputs(el).m, '5')
    await el.updateComplete
    expect(data(f)).toEqual({ d: '2026-09-15T09:05' })
    expect(input(el).value).toBe('2026/09/15 09:05')
    expect(timeInputs(el).h.value).toBe('09')
    expect(onChange).toHaveBeenCalled()
    const done = [
      ...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="footer"] button'),
    ].at(-1)!
    expect(done.textContent!.trim()).toBe('完了')
    done.click()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('範囲外の時・分は丸められる。刻み（minute-step）が欄に付く', async () => {
    const { el } = await make('time minute-step="15" value="2026-09-15T10:00"')
    btn(el).click()
    await tick()
    expect(timeInputs(el).m.step).toBe('15')
    setNum(timeInputs(el).h, '99')
    await el.updateComplete
    expect(el.value).toBe('2026-09-15T23:00')
  })

  it('テキストで 2026/9/29 9時5分 と入力できる。時刻の無い入力は 00:00', async () => {
    const { el } = await make('time')
    input(el).focus()
    input(el).value = '2026/9/29 9時5分'
    input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(el.value).toBe('2026-09-29T09:05')
    input(el).value = '2026/9/30'
    input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(el.value).toBe('2026-09-30T00:00')
  })

  it('time でなければ時刻つきの入力は不正。min の時刻も検証される', async () => {
    const a = await make()
    input(a.el).value = '2026/9/29 10:00'
    input(a.el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(a.el.validity.badInput).toBe(true)
    const b = await make('time min="2026-09-29T10:00" value="2026-09-29T09:00"')
    expect(b.el.validity.rangeUnderflow).toBe(true)
    expect(b.el.validationMessage).toContain('10:00')
  })
})

describe('期間（range）', () => {
  it('value は 開始/終了。表示は「開始 〜 終了」で、フォームに 1 つの値として送られる。start / end で取れる', async () => {
    const { f, el } = await make('range value="2026-09-01/2026-09-10"')
    expect(input(el).value).toBe('2026/09/01 〜 2026/09/10')
    expect(data(f)).toEqual({ d: '2026-09-01/2026-09-10' })
    expect(el.start).toBe('2026-09-01')
    expect(el.end).toBe('2026-09-10')
    expect(input(el).placeholder).toBe('yyyy/mm/dd 〜 yyyy/mm/dd')
  })

  it('1 回目で開始、2 回目で終了。間が強調され、閉じて change が 1 回出る。逆順なら入れ替わる', async () => {
    const { f, el } = await make('range')
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    btn(el).click()
    await tick()
    day(el, '2026-09-20').click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(data(f)).toEqual({})
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('終了日を選択')
    day(el, '2026-09-23').dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
    await el.updateComplete
    const selected = () =>
      [...el.shadowRoot!.querySelectorAll('td[aria-selected="true"] [data-date]')].map(
        (b) => (b as HTMLElement).dataset.date,
      )
    expect(selected()).toEqual(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'])
    day(el, '2026-09-12').click() // 開始より前 → 入れ替わる
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(data(f)).toEqual({ d: '2026-09-12/2026-09-20' })
    expect(input(el).value).toBe('2026/09/12 〜 2026/09/20')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('端の日には 開始日 / 終了日 が読み上げの名前に付く', async () => {
    const { el } = await make('range value="2026-09-10/2026-09-12"')
    btn(el).click()
    await tick()
    expect(day(el, '2026-09-10').getAttribute('aria-label')).toContain('開始日')
    expect(day(el, '2026-09-12').getAttribute('aria-label')).toContain('終了日')
    expect(day(el, '2026-09-11').getAttribute('aria-label')).not.toContain('開始日')
    expect(
      el.shadowRoot!.querySelector('[role="grid"]')!.getAttribute('aria-multiselectable'),
    ).toBe('true')
  })

  it('キーボードだけで選べる（Enter で開始、移動して Enter で終了）', async () => {
    const { el } = await make('range value="2026-09-10/2026-09-12"')
    btn(el).click()
    await tick()
    await userEvent.keyboard('{Enter}') // 10 日を開始に
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{Enter}')
    await tick()
    expect(el.value).toBe('2026-09-10/2026-09-13')
  })

  it('テキストで 〜 ～ - to の区切りを受け付ける。終了が無い・順序が逆は検証エラー', async () => {
    const { el } = await make('range')
    const type = (t: string) => {
      input(el).value = t
      input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    type('2026/9/1～2026/9/10')
    expect(el.value).toBe('2026-09-01/2026-09-10')
    type('2026-09-01 to 2026-09-10')
    expect(el.value).toBe('2026-09-01/2026-09-10')
    type('2026/09/01')
    expect(el.value).toBe('')
    expect(el.validity.badInput).toBe(true)
    expect(el.validationMessage).toContain('終了')
    type('2026/09/10 〜 2026/09/01')
    expect(el.validity.customError).toBe(true)
    type('abc')
    expect(el.validity.badInput).toBe(true)
  })

  it('reset で value 属性に戻る。クリアで空になる', async () => {
    const { f, el } = await make('range value="2026-09-01/2026-09-10"')
    el.value = '2026-10-01/2026-10-05'
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('2026-09-01/2026-09-10')
    btn(el).click()
    await tick()
    ;[...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="footer"] button')][0]!.click()
    await tick()
    expect(data(f)).toEqual({})
  })

  it('range と time: 開始・終了の時刻の欄があり、既定は 00:00 と 23:59', async () => {
    const { f, el } = await make('range time')
    btn(el).click()
    await tick()
    day(el, '2026-09-01').click()
    await tick()
    day(el, '2026-09-03').click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(data(f)).toEqual({ d: '2026-09-01T00:00/2026-09-03T23:59' })
    expect(el.shadowRoot!.querySelectorAll('[part="time"] [role="group"]').length).toBe(2)
    expect(input(el).value).toBe('2026/09/01 00:00 〜 2026/09/03 23:59')
    // 同じ日で終了が開始より前なら検証エラー
    input(el).value = '2026/09/01 10:00 〜 2026/09/01 09:00'
    input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(el.validity.customError).toBe(true)
  })
})

describe('複数の月（months）', () => {
  it('months="2" で 2 か月が並び、端で月をまたいで移動しても表示が追従する', async () => {
    const { el } = await make('months="2" value="2026-09-29"')
    btn(el).click()
    await tick()
    const grids = () => el.shadowRoot!.querySelectorAll('[part="grid"]')
    expect(grids().length).toBe(2)
    expect(day(el, '2026-10-05')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="title"]').length).toBe(2)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    await tick()
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-11-03')
    expect(day(el, '2026-11-03')).not.toBeNull()
  })

  it('range time months=2 の開いた状態でも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="期間"
        ><jimble-date-input
          name="p"
          range
          time
          months="2"
          value="2026-09-01T09:00/2026-09-10T18:30"
        ></jimble-date-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-date-input') as JimbleDateInput
    await el.updateComplete
    btn(el).click()
    await tick()
    await expectNoA11yViolations(f)
  })
})

describe('入力欄のクリックと手入力不可（picker-only）', () => {
  it('通常の入力では、入力欄のクリックでカレンダーは開かない(ボタンと ↓ で開く)', async () => {
    const { el } = await make('value="2026-09-29"')
    input(el).focus()
    input(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    input(el).click()
    await tick()
    expect(isOpen(el)).toBe(false)
  })

  it('picker-only: 入力欄のクリックでカレンダーが開き、フォーカスは入力欄に残る。もう一度クリックすると閉じたまま', async () => {
    const { el } = await make('picker-only value="2026-09-29"')
    input(el).focus()
    input(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    input(el).click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(input(el))
    // 開いているときのクリックは、ライトディスミスで閉じたあとに開き直さない
    input(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    popup(el).hidePopover()
    input(el).click()
    await tick()
    expect(isOpen(el)).toBe(false)
  })

  it('開いたまま入力すると、解釈できた日に表示が移る', async () => {
    const { el } = await make('value="2026-09-29"')
    input(el).focus()
    btn(el).click()
    await tick()
    input(el).focus()
    input(el).value = '2027/03/05'
    input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(day(el, '2027-03-05')).not.toBeNull()
  })

  it('picker-only: 入力欄は読み取り専用で、クリック・Space・↓ で開く。Backspace / Delete で消せる', async () => {
    const { f, el } = await make('picker-only value="2026-09-29"')
    expect(input(el).readOnly).toBe(true)
    input(el).focus()
    await userEvent.keyboard('abc')
    expect(input(el).value).toBe('2026/09/29')
    await userEvent.keyboard(' ')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(day(el, '2026-09-29'))
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    await userEvent.keyboard('{Backspace}')
    await el.updateComplete
    expect(data(f)).toEqual({})
    expect(input(el).value).toBe('')
  })

  it('picker-only でもカレンダーで選べて、値が入る。disabled / readonly では開かない', async () => {
    const { f, el } = await make('picker-only')
    input(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    input(el).click()
    await tick()
    day(el, '2026-09-15').click()
    await tick()
    expect(data(f)).toEqual({ d: '2026-09-15' })
    const r = await make('readonly')
    r.el.shadowRoot!.querySelector('input')!.click()
    await tick()
    expect(isOpen(r.el)).toBe(false)
  })
})

describe('月・年の選択（ヘッダー）', () => {
  const monthSel = (el: JimbleDateInput) =>
    el.shadowRoot!.querySelector<HTMLSelectElement>('[part="month-select"]')!
  const yearIn = (el: JimbleDateInput) =>
    el.shadowRoot!.querySelector<HTMLInputElement>('[part="year-input"]')!
  const title = (el: JimbleDateInput) =>
    el.shadowRoot!.querySelector('[part="title"]')!.textContent!.trim()

  it('いまの月・年が入っていて、月を選ぶと、その月のカレンダーに変わる', async () => {
    const { el } = await make('value="2026-09-29"')
    btn(el).click()
    await tick()
    expect(monthSel(el).value).toBe('9')
    expect(yearIn(el).value).toBe('2026')
    expect(title(el)).toBe('2026年9月') // 読み上げ用の見出し
    monthSel(el).value = '2'
    monthSel(el).dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    expect(day(el, '2026-02-28')).not.toBeNull()
    expect(day(el, '2026-09-29')).toBeNull()
    expect(title(el)).toBe('2026年2月')
    // フォーカスの行き先(Tab で入る日)も、表示中の月の中にある
    const focusable = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-date][tabindex="0"]')]
    expect(focusable.length).toBe(1)
    expect(focusable[0]!.dataset.date!.startsWith('2026-02')).toBe(true)
  })

  it('年を入力すると、その年に変わる。範囲外の値は無視され、入力欄は表示中の年に戻る', async () => {
    const { el } = await make('value="2026-09-29"')
    btn(el).click()
    await tick()
    yearIn(el).value = '2030'
    yearIn(el).dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    expect(day(el, '2030-09-15')).not.toBeNull()
    yearIn(el).value = '12'
    yearIn(el).dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    expect(yearIn(el).value).toBe('2030')
    expect(day(el, '2030-09-15')).not.toBeNull()
  })

  it('min / max の外の月は選べず、年も範囲に収まる', async () => {
    const { el } = await make('value="2026-09-15" min="2026-07-10" max="2026-11-20"')
    btn(el).click()
    await tick()
    const disabled = [...monthSel(el).options].filter((o) => o.disabled).map((o) => o.value)
    expect(disabled).toEqual(['1', '2', '3', '4', '5', '6', '12'])
    expect(yearIn(el).min).toBe('2026')
    expect(yearIn(el).max).toBe('2026')
    yearIn(el).value = '2030'
    yearIn(el).dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    expect(yearIn(el).value).toBe('2026') // 範囲の外の年には移らない(範囲の端の月に収まる)
  })

  it('en では 月 → 年 の順、ja では 年 → 月 の順で、月の名前が言語に従う', async () => {
    const ja = await make('value="2026-09-29"')
    btn(ja.el).click()
    await tick()
    const order = (el: JimbleDateInput) =>
      [...el.shadowRoot!.querySelectorAll('[part="month-select"], [part="year-input"]')].map((e) =>
        e.getAttribute('part'),
      )
    expect(order(ja.el)).toEqual(['year-input', 'month-select'])
    expect(monthSel(ja.el).selectedOptions[0]!.textContent!.trim()).toBe('9月')
    setLocale(en)
    const e = await make('value="2026-09-29"')
    btn(e.el).click()
    await tick()
    expect(order(e.el)).toEqual(['month-select', 'year-input'])
    expect(monthSel(e.el).selectedOptions[0]!.textContent!.trim()).toBe('September')
    expect(monthSel(e.el).getAttribute('aria-label')).toBe('Month')
  })

  it('前の月・次の月のボタンで動かすと、選択・入力欄にも反映される。ラベルがあり、axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="日付"
        ><jimble-date-input name="d" value="2026-09-29"></jimble-date-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-date-input') as JimbleDateInput
    await el.updateComplete
    btn(el).click()
    await tick()
    el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="次の月"]')!.click()
    await tick()
    expect(monthSel(el).value).toBe('10')
    expect(monthSel(el).getAttribute('aria-label')).toBe('月')
    expect(yearIn(el).getAttribute('aria-label')).toBe('年')
    await expectNoA11yViolations(f)
  })

  it('months=2 でも、最初の月にだけ選択があり、2 か月目は文字の見出し', async () => {
    const { el } = await make('months="2" value="2026-09-29"')
    btn(el).click()
    await tick()
    expect(el.shadowRoot!.querySelectorAll('[part="month-select"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="title"]').length).toBe(2)
    monthSel(el).value = '12'
    monthSel(el).dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    expect(day(el, '2026-12-05')).not.toBeNull()
    expect(day(el, '2027-01-05')).not.toBeNull() // 2 か月目
  })
})
