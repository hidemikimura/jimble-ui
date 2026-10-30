import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleColorInput } from './jimble-color-input.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const input = (el: JimbleColorInput) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input[type="text"]')!
const popup = (el: JimbleColorInput) => el.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!
const isOpen = (el: JimbleColorInput) => popup(el).matches(':popover-open')
const swatch = (el: JimbleColorInput) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="swatch"]')!
const slider = (el: JimbleColorInput, k: string) =>
  el.shadowRoot!.querySelector<HTMLInputElement>(`[data-slider="${k}"]`)!
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))

async function make(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-color-input name="c" aria-label="テーマ色" ${attrs}></jimble-color-input>`
  const el = f.querySelector('jimble-color-input') as JimbleColorInput
  await el.updateComplete
  return { f, el }
}
function setSlider(el: JimbleColorInput, k: string, v: number) {
  const s = slider(el, k)
  s.value = String(v)
  s.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  s.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('表示と値', () => {
  it('value 属性を小文字の #rrggbb に整えて送信する', async () => {
    const { f, el } = await make('value="#4F46E5"')
    expect(input(el).value).toBe('#4f46e5')
    expect(data(f)).toEqual({ c: '#4f46e5' })
  })

  it('未入力は送信されない', async () => {
    const { f } = await make()
    expect(data(f)).toEqual({})
  })

  it('3 桁・# なし・大文字・全角を受け付ける', async () => {
    const { f, el } = await make()
    for (const [typed, hex] of [
      ['#46e', '#4466ee'],
      ['4f46e5', '#4f46e5'],
      ['#4F46E5', '#4f46e5'],
      ['＃４ｆ４６ｅ５', '#4f46e5'],
    ] as const) {
      input(el).value = typed
      input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      await el.updateComplete
      expect(data(f)).toEqual({ c: hex })
    }
  })

  it('色見本に現在の色が反映される', async () => {
    const { el } = await make('value="#ff0000"')
    expect(swatch(el).style.getPropertyValue('--_swatch')).toBe('#ff0000')
  })

  it('reset で value 属性に戻る', async () => {
    const { f, el } = await make('value="#111111"')
    el.value = '#222222'
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('#111111')
    expect(input(el).value).toBe('#111111')
  })
})

describe('検証', () => {
  it('不正な文字列は badInput、required で空は valueMissing', async () => {
    const { el } = await make('required')
    expect(el.validity.valueMissing).toBe(true)
    input(el).focus()
    await userEvent.keyboard('zzz')
    expect(el.validity.badInput).toBe(true)
    expect(el.validationMessage).toContain('#')
    input(el).select()
    await userEvent.keyboard('#abcdef')
    expect(el.validity.valid).toBe(true)
  })

  it('入力の input は入力ごと、change は blur で 1 回。Enter で送信', async () => {
    const f = await mount<HTMLFormElement>(html`<form></form>`)
    f.innerHTML = `<jimble-color-input name="c" aria-label="色"></jimble-color-input>`
    const el = f.querySelector('jimble-color-input') as JimbleColorInput
    await el.updateComplete
    const onInput = vi.fn()
    const onChange = vi.fn()
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    el.addEventListener('input', onInput)
    el.addEventListener('change', onChange)
    f.addEventListener('submit', onSubmit)
    input(el).focus()
    await userEvent.keyboard('#abcdef')
    expect(onInput).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('ポップアップ', () => {
  it('色見本で開き、スライダーにフォーカスが移る。Escape で入力欄に戻る', async () => {
    const { el } = await make('value="#4f46e5"')
    swatch(el).click()
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(swatch(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.activeElement).toBe(slider(el, 'h'))
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('スライダーの値が入力欄と送信値に反映され、離すと change が出る', async () => {
    const { f, el } = await make('value="#ff0000"')
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    swatch(el).click()
    await tick()
    expect(slider(el, 'h').value).toBe('0')
    setSlider(el, 'h', 120)
    await el.updateComplete
    expect(data(f)).toEqual({ c: '#00ff00' })
    expect(input(el).value).toBe('#00ff00')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('彩度 0 にしても色相が失われない', async () => {
    const { el } = await make('value="#ff0000"')
    swatch(el).click()
    await tick()
    setSlider(el, 'h', 200)
    setSlider(el, 's', 0)
    setSlider(el, 's', 100)
    await el.updateComplete
    expect(slider(el, 'h').value).toBe('200')
  })

  it('候補の色を選ぶと値が変わる。「クリア」で空になる', async () => {
    const { f, el } = await make('presets="#111111, #222222"')
    swatch(el).click()
    await tick()
    const presets = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="preset"]')]
    expect(presets).toHaveLength(2)
    presets[1]!.click()
    await el.updateComplete
    expect(data(f)).toEqual({ c: '#222222' })
    expect(presets[1]!.getAttribute('aria-pressed')).toBe('true')
    ;[...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')].at(-1)!.click()
    await tick()
    expect(data(f)).toEqual({})
    expect(isOpen(el)).toBe(false)
  })

  it('disabled / readonly では開けない', async () => {
    expect(swatch((await make('disabled')).el).disabled).toBe(true)
    expect(swatch((await make('readonly')).el).disabled).toBe(true)
  })
})

describe('透明度（alpha）', () => {
  const type = async (el: JimbleColorInput, text: string) => {
    input(el).value = text
    input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await el.updateComplete
  }

  it('alpha がなければ、不透明度のスライダーはなく、8 桁は不正な入力（これまでどおり）', async () => {
    const { el } = await make()
    swatch(el).click()
    await tick()
    expect(slider(el, 'a')).toBeNull()
    await type(el, '#ff000080')
    expect(el.validity.badInput).toBe(true)
  })

  it('value 属性の #rrggbbaa を小文字に整えて送信し、スライダーに不透明度（%）を出す', async () => {
    const { f, el } = await make('alpha value="#FF000080"')
    expect(input(el).value).toBe('#ff000080')
    expect(data(f)).toEqual({ c: '#ff000080' })
    swatch(el).click()
    await tick()
    expect(slider(el, 'a').value).toBe('50')
    expect(swatch(el).style.getPropertyValue('--_swatch')).toBe('#ff000080')
  })

  it('属性の順序によらず、value の透明度が残る', async () => {
    const { el } = await make('value="#ff000080" alpha')
    expect(el.value).toBe('#ff000080')
  })

  it('#rgba・#rrggbbaa を入力でき、不透明は #rrggbb になる', async () => {
    const { f, el } = await make('alpha')
    await type(el, '#f008')
    expect(data(f)).toEqual({ c: '#ff000088' })
    await type(el, '#ff0000ff')
    expect(data(f)).toEqual({ c: '#ff0000' })
    await type(el, '#ff00008')
    expect(el.validity.badInput).toBe(true)
    expect(el.validationMessage).toContain('#RRGGBBAA')
  })

  it('不透明度のスライダーで値が変わり、色相を動かしても透明度は保たれる', async () => {
    const { f, el } = await make('alpha value="#ff0000"')
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    swatch(el).click()
    await tick()
    expect(slider(el, 'a').value).toBe('100')
    setSlider(el, 'a', 50)
    await el.updateComplete
    expect(data(f)).toEqual({ c: '#ff000080' })
    expect(onChange).toHaveBeenCalledTimes(1)
    setSlider(el, 'h', 120)
    await el.updateComplete
    expect(data(f)).toEqual({ c: '#00ff0080' })
    setSlider(el, 'a', 0)
    await el.updateComplete
    expect(data(f)).toEqual({ c: '#00ff0000' })
  })

  it('不透明度 0 から色の入力に戻ると、入力した透明度になる', async () => {
    const { el } = await make('alpha value="#ff000000"')
    await type(el, '#00ff00')
    expect(el.value).toBe('#00ff00')
  })

  it('候補に #rrggbbaa を書ける（alpha がなければ、その候補は出さない）', async () => {
    const withAlpha = (await make('alpha presets="#ff000080 #00ff00"')).el
    swatch(withAlpha).click()
    await tick()
    const presets = [
      ...withAlpha.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="preset"]'),
    ]
    expect(presets.map((b) => b.dataset.color)).toEqual(['#ff000080', '#00ff00'])
    presets[0]!.click()
    await withAlpha.updateComplete
    expect(withAlpha.value).toBe('#ff000080')
    expect(slider(withAlpha, 'a').value).toBe('50')

    const without = (await make('presets="#ff000080 #00ff00"')).el
    expect(without.shadowRoot!.querySelectorAll('[part="preset"]')).toHaveLength(1)
  })

  it('alpha を外すと、値は #rrggbb になる', async () => {
    const { f, el } = await make('alpha value="#ff000080"')
    el.alpha = false
    await el.updateComplete
    expect(el.value).toBe('#ff0000')
    expect(input(el).value).toBe('#ff0000')
    expect(data(f)).toEqual({ c: '#ff0000' })
  })
})

describe('アクセシビリティ', () => {
  it('field の中で名前が付き、閉じた状態・開いた状態とも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="テーマ色"
        ><jimble-color-input name="c" value="#4f46e5"></jimble-color-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-color-input') as JimbleColorInput
    await el.updateComplete
    expect(input(el).getAttribute('aria-label')).toBe('テーマ色')
    await expectNoA11yViolations(f)
    swatch(el).click()
    await tick()
    await expectNoA11yViolations(f)
  })

  it('alpha のとき、開いた状態で axe 違反がなく、不透明度のスライダーに名前がある', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="背景色"
        ><jimble-color-input name="c" alpha value="#4f46e580"></jimble-color-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-color-input') as JimbleColorInput
    await el.updateComplete
    swatch(el).click()
    await tick()
    expect(slider(el, 'a').getAttribute('aria-label')).toBe('不透明度')
    expect(slider(el, 'a').getAttribute('aria-valuetext')).toBe('50%')
    await expectNoA11yViolations(f)
  })
})
