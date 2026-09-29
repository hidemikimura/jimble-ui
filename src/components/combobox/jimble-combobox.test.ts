import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleCombobox } from './jimble-combobox.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const input = (el: JimbleCombobox) => el.shadowRoot!.querySelector<HTMLInputElement>('input')!
const popup = (el: JimbleCombobox) => el.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!
const isOpen = (el: JimbleCombobox) => popup(el).matches(':popover-open')
const shown = (el: JimbleCombobox) =>
  [...el.shadowRoot!.querySelectorAll('[part="option"]')].map((o) => o.textContent!.trim())
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))

async function make(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-combobox name="pref" aria-label="都道府県" ${attrs}>
      <jimble-option value="tokyo" keywords="とうきょう">東京都</jimble-option>
      <jimble-option value="osaka" keywords="おおさか osaka">大阪府</jimble-option>
      <jimble-option value="kyoto" keywords="きょうと">京都府</jimble-option>
      <jimble-option value="hokkaido" disabled>北海道</jimble-option>
    </jimble-combobox>`
  const el = f.querySelector('jimble-combobox') as JimbleCombobox
  await el.updateComplete
  return { f, el }
}
async function type(el: JimbleCombobox, text: string) {
  input(el).focus()
  input(el).value = text
  input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await el.updateComplete
}

describe('表示と値', () => {
  it('value 属性の選択肢の文字を表示し、value を送信する', async () => {
    const { f, el } = await make('value="osaka"')
    expect(input(el).value).toBe('大阪府')
    expect(data(f)).toEqual({ pref: 'osaka' })
  })

  it('未選択は送信されない。reset で戻る', async () => {
    const { f, el } = await make('value="osaka"')
    el.value = 'kyoto'
    await el.updateComplete
    expect(input(el).value).toBe('京都府')
    f.reset()
    await el.updateComplete
    expect(input(el).value).toBe('大阪府')
    const b = await make()
    expect(data(b.f)).toEqual({})
  })

  it('required で未選択なら valueMissing', async () => {
    const { el } = await make('required')
    expect(el.validity.valueMissing).toBe(true)
    el.value = 'tokyo'
    await el.updateComplete
    expect(el.validity.valid).toBe(true)
  })

  it('ロールと属性が付く', async () => {
    const { el } = await make()
    expect(input(el).getAttribute('role')).toBe('combobox')
    expect(input(el).getAttribute('aria-autocomplete')).toBe('list')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).getAttribute('aria-label')).toBe('都道府県')
  })
})

describe('絞り込み', () => {
  it('入力すると開いて絞られる。読み(keywords)・ひらがな/カタカナ・大文字小文字でも一致する', async () => {
    const { el } = await make()
    await type(el, '京')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(shown(el)).toEqual(['東京都', '京都府'])
    await type(el, 'おおさか')
    expect(shown(el)).toEqual(['大阪府'])
    await type(el, 'オオサカ')
    expect(shown(el)).toEqual(['大阪府'])
    await type(el, 'OSAKA')
    expect(shown(el)).toEqual(['大阪府'])
  })

  it('一致しなければ「一致する選択肢がありません」を出す', async () => {
    const { el } = await make()
    await type(el, 'zzz')
    await tick()
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('一致する')
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('一致する')
  })

  it('件数が live region で伝わる', async () => {
    const { el } = await make()
    await type(el, '京')
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('2 件')
  })

  it('match="starts-with" は前方一致', async () => {
    const { el } = await make('match="starts-with"')
    await type(el, '京')
    expect(shown(el)).toEqual(['京都府'])
  })

  it('filter プロパティで独自に絞れる', async () => {
    const { el } = await make()
    el.filter = (_q, o) => o.value === 'tokyo'
    await type(el, 'x')
    expect(shown(el)).toEqual(['東京都'])
  })

  it('文字の入力では input/change を出さず、jimble-search を出す', async () => {
    const { el } = await make()
    const onInput = vi.fn()
    const onSearch = vi.fn()
    el.addEventListener('input', onInput)
    el.addEventListener('jimble-search', onSearch)
    await type(el, '京')
    expect(onInput).not.toHaveBeenCalled()
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect((onSearch.mock.calls[0]![0] as CustomEvent).detail).toEqual({ query: '京' })
  })
})

describe('選択', () => {
  it('↓ で先頭が active、Enter で選択。閉じて文字が選択肢の表示になる', async () => {
    const { f, el } = await make()
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    await type(el, '京')
    await tick()
    expect(input(el).getAttribute('aria-activedescendant')).toBeTruthy()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await tick()
    expect(data(f)).toEqual({ pref: 'kyoto' })
    expect(input(el).value).toBe('京都府')
    expect(isOpen(el)).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ArrowDown で閉じた状態から全件を開き、無効な選択肢は飛ばす', async () => {
    const { el } = await make()
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(shown(el)).toHaveLength(4)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    await tick()
    const id = input(el).getAttribute('aria-activedescendant')!
    expect(el.shadowRoot!.getElementById(id)!.textContent).toContain('京都府')
  })

  it('クリックで選べる。無効な選択肢は選べない', async () => {
    const { f, el } = await make()
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    const opts = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    opts[3]!.click()
    expect(data(f)).toEqual({})
    opts[1]!.click()
    await el.updateComplete
    expect(data(f)).toEqual({ pref: 'osaka' })
  })

  it('Escape で閉じ、入力途中の文字は選択中の表示に戻る。値は変わらない', async () => {
    const { f, el } = await make('value="tokyo"')
    await type(el, 'abc')
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(input(el).value).toBe('東京都')
    expect(data(f)).toEqual({ pref: 'tokyo' })
  })

  it('選択肢に無い文字のまま離れると戻る(自由入力は値にならない)', async () => {
    const { f, el } = await make('value="tokyo"')
    await type(el, 'abc')
    input(el).blur()
    await el.updateComplete
    expect(input(el).value).toBe('東京都')
    expect(data(f)).toEqual({ pref: 'tokyo' })
  })

  it('開いている間の Enter は送信せず、閉じているときは送信する', async () => {
    const { f, el } = await make()
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    await type(el, '京')
    await tick()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('clearable で解除できる', async () => {
    const { f, el } = await make('value="osaka" clearable')
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    await el.updateComplete
    expect(data(f)).toEqual({})
    expect(input(el).value).toBe('')
    expect(el.shadowRoot!.querySelector('[part="clear"]')).toBeNull()
  })

  it('ボタンで開閉できる', async () => {
    const { el } = await make()
    const t = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle"]')!
    t.click()
    await tick()
    expect(isOpen(el)).toBe(true)
    t.click()
    await tick()
    expect(isOpen(el)).toBe(false)
  })

  it('disabled / readonly では開かない', async () => {
    const a = await make('disabled')
    expect(input(a.el).disabled).toBe(true)
    const b = await make('readonly')
    b.el.show()
    await tick()
    expect(isOpen(b.el)).toBe(false)
  })

  it('選択肢を後から追加しても反映される', async () => {
    const { el } = await make('value="nagoya"')
    expect(input(el).value).toBe('')
    el.insertAdjacentHTML('beforeend', '<jimble-option value="nagoya">名古屋市</jimble-option>')
    await tick()
    await el.updateComplete
    expect(input(el).value).toBe('名古屋市')
  })
})

describe('アクセシビリティ', () => {
  it('field の中で名前が付き、閉じた状態・開いた状態・結果なしとも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="都道府県"
        ><jimble-combobox name="pref" value="osaka">
          <jimble-option value="tokyo">東京都</jimble-option>
          <jimble-option value="osaka">大阪府</jimble-option>
        </jimble-combobox></jimble-field
      >`,
    )
    const el = f.querySelector('jimble-combobox') as JimbleCombobox
    await el.updateComplete
    expect(input(el).getAttribute('aria-label')).toBe('都道府県')
    await expectNoA11yViolations(f)
    el.show()
    await tick()
    await expectNoA11yViolations(f)
    await type(el, 'zzz')
    await tick()
    await expectNoA11yViolations(f)
  })
})
