import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleSelect } from './jimble-select.js'
import type { JimbleOption } from './jimble-option.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const button = (el: JimbleSelect) => el.shadowRoot!.querySelector('button')!
const list = (el: JimbleSelect) => el.shadowRoot!.querySelector<HTMLElement>('[part="listbox"]')!
const isOpen = (el: JimbleSelect) => list(el).matches(':popover-open')
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))

async function select(attrs = '', wrapperStyle = '') {
  const f = await mount<HTMLFormElement>(html`<form style=${wrapperStyle}></form>`)
  f.innerHTML = `<jimble-select name="plan" aria-label="プラン" ${attrs}>
      <jimble-option value="free">無料</jimble-option>
      <jimble-option value="pro">Pro</jimble-option>
      <jimble-option value="biz" disabled>Business</jimble-option>
      <jimble-option value="ent">Enterprise</jimble-option>
    </jimble-select>`
  // 位置のテストで form ごと画面下端に固定することがあるので、次の要素は form の外に置く
  f.insertAdjacentHTML(
    'afterend',
    '<input id="after" aria-label="次" style="display:block;height:32px;margin-top:320px">',
  )
  const el = f.querySelector('jimble-select') as JimbleSelect
  await el.updateComplete
  await tick()
  return {
    f,
    el,
    options: [...el.querySelectorAll('jimble-option')] as JimbleOption[],
    after: f.parentElement!.querySelector<HTMLElement>('#after')!,
  }
}

describe('表示と値', () => {
  it('未選択のときはプレースホルダー、value 属性があればその選択肢の文字を表示する', async () => {
    const a = await select()
    expect(button(a.el).textContent).toContain('選択してください')
    const b = await select('value="pro" placeholder="プランを選択"')
    expect(button(b.el).textContent).toContain('Pro')
    const c = await select('placeholder="プランを選択"')
    expect(button(c.el).textContent).toContain('プランを選択')
  })

  it('選ばれた value が送信される。未選択なら送信されない', async () => {
    const a = await select()
    expect(data(a.f)).toEqual({})
    const b = await select('value="ent"')
    expect(data(b.f)).toEqual({ plan: 'ent' })
  })

  it('reset で value 属性に戻る。利用者が触った後は属性で上書きしない', async () => {
    const { f, el } = await select('value="pro"')
    el.value = 'ent'
    await el.updateComplete
    expect(button(el).textContent).toContain('Enterprise')
    el.setAttribute('value', 'free')
    expect(el.value).toBe('ent')
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('free')
    expect(button(el).textContent).toContain('無料')
  })

  it('required: 未選択だと無効。メッセージは辞書から', async () => {
    const { f, el } = await select('required')
    expect(f.checkValidity()).toBe(false)
    expect(el.validity.valueMissing).toBe(true)
    expect(el.validationMessage).toBe('この項目は必須です')
    setLocale(en)
    await el.updateComplete
    expect(el.validationMessage).toBe('This field is required')
    el.value = 'pro'
    await el.updateComplete
    expect(f.checkValidity()).toBe(true)
  })

  it('setCustomValidity が効く', async () => {
    const { f, el } = await select('value="pro"')
    el.setCustomValidity('このプランは選べません')
    expect(f.checkValidity()).toBe(false)
    expect(el.validationMessage).toBe('このプランは選べません')
  })

  it('disabled と fieldset[disabled]: 開けず、送信もされない', async () => {
    const { f, el } = await select('disabled value="pro"')
    expect(button(el).disabled).toBe(true)
    expect(data(f)).toEqual({})
    await userEvent.click(button(el), { force: true }).catch(() => {})
    expect(isOpen(el)).toBe(false)
  })
})

describe('開閉と選択(マウス)', () => {
  it('クリックで開き、選択中(なければ最初の有効な選択肢)にフォーカスが移る', async () => {
    const a = await select()
    await userEvent.click(button(a.el))
    await tick()
    expect(isOpen(a.el)).toBe(true)
    expect(button(a.el).getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(a.options[0])
    await userEvent.keyboard('{Escape}')
    await tick()
    const b = await select('value="ent"')
    await userEvent.click(button(b.el))
    await tick()
    expect(document.activeElement).toBe(b.options[3])
  })

  it('選択肢のクリックで値が変わり、input と change が 1 回ずつ出て閉じ、ボタンにフォーカスが戻る', async () => {
    const { f, el, options } = await select()
    const onInput = vi.fn()
    const onChange = vi.fn()
    el.addEventListener('input', onInput)
    el.addEventListener('change', onChange)
    await userEvent.click(button(el))
    await tick()
    await userEvent.click(options[1]!)
    await tick()
    expect(el.value).toBe('pro')
    expect(data(f)).toEqual({ plan: 'pro' })
    expect(onInput).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(button(el))
    expect(options[1]!.matches(':state(selected)')).toBe(true)
    // 同じ選択肢を選び直しても change は出ない
    await userEvent.click(button(el))
    await tick()
    await userEvent.click(options[1]!)
    await tick()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('無効な選択肢は選べない。外側クリックで閉じる。ボタンをもう一度押すと閉じる', async () => {
    const { el, options, after } = await select()
    await userEvent.click(button(el))
    await tick()
    options[2]!.click() // 無効な選択肢(Playwright の click は無効な要素を待ち続けるので、プログラムから押す)
    await tick()
    expect(el.value).toBe('')
    await userEvent.click(after)
    await tick()
    expect(isOpen(el)).toBe(false)
    await userEvent.click(button(el))
    await tick()
    await userEvent.click(button(el))
    await tick()
    expect(isOpen(el)).toBe(false)
  })
})

describe('キーボード', () => {
  it('ボタンで ArrowDown / ArrowUp が開く(Up は最後の有効な選択肢)。Enter / Space はクリックとして開く', async () => {
    const { el, options } = await select()
    button(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(document.activeElement).toBe(options[0])
    await userEvent.keyboard('{Escape}')
    await tick()
    button(el).focus()
    await userEvent.keyboard('{ArrowUp}')
    await tick()
    expect(document.activeElement).toBe(options[3])
    await userEvent.keyboard('{Escape}')
    await tick()
    button(el).focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(isOpen(el)).toBe(true)
  })

  it('一覧: 矢印・Home・End で移動(無効は飛ばす・端で止まる)、Enter で選択', async () => {
    const { el, options } = await select()
    button(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(options[1])
    await userEvent.keyboard('{ArrowDown}') // Business は無効
    expect(document.activeElement).toBe(options[3])
    await userEvent.keyboard('{ArrowDown}') // 端で止まる
    expect(document.activeElement).toBe(options[3])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(options[0])
    await userEvent.keyboard('{End}{Enter}')
    await tick()
    expect(el.value).toBe('ent')
    expect(isOpen(el)).toBe(false)
  })

  it('Esc は選択を変えずに閉じてボタンに戻る。Tab は閉じて次の要素へ', async () => {
    const { el, after } = await select('value="pro"')
    button(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    await userEvent.keyboard('{ArrowDown}{Escape}')
    await tick()
    expect(el.value).toBe('pro')
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(button(el))
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    await userEvent.tab()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(el.value).toBe('pro')
    expect(document.activeElement).toBe(after)
  })

  it('閉じたまま文字を打つと、ネイティブの select と同じく値が変わる', async () => {
    const c = await mount<HTMLFormElement>(html`<form></form>`)
    c.innerHTML = `<jimble-select aria-label="果物"><jimble-option value="a">Apple</jimble-option><jimble-option value="b">Banana</jimble-option><jimble-option value="c">Blueberry</jimble-option></jimble-select>`
    const el = c.querySelector('jimble-select') as JimbleSelect
    await tick()
    button(el).focus()
    await userEvent.keyboard('b')
    expect(el.value).toBe('b')
    await tick(700)
    await userEvent.keyboard('b')
    expect(el.value).toBe('c')
    expect(isOpen(el)).toBe(false)
  })

  it('一覧の中の先頭文字検索は移動だけで、選択は Enter(日本語は合成イベント)', async () => {
    const { el, options } = await select()
    button(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    options[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'E', bubbles: true, composed: true }),
    )
    expect(document.activeElement).toBe(options[3])
    expect(el.value).toBe('')
  })

  it('IME の変換中は先頭文字検索をしない', async () => {
    const { el, options } = await select()
    button(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    options[0]!.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, composed: true }),
    )
    options[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'E', bubbles: true, composed: true }),
    )
    expect(document.activeElement).toBe(options[0])
  })
})

describe('位置とロール', () => {
  it('ボタンの直下に、ボタンと同じ幅以上で出る。画面の下端では上に反転する', async () => {
    const a = await select('', 'padding: 100px 0 0 200px; width: 240px')
    await userEvent.click(button(a.el))
    await tick()
    const b = button(a.el).getBoundingClientRect()
    const l = list(a.el).getBoundingClientRect()
    expect(Math.round(l.left)).toBe(Math.round(b.left))
    expect(l.top).toBeGreaterThanOrEqual(b.bottom)
    expect(l.width).toBeGreaterThanOrEqual(Math.floor(b.width))
    await userEvent.keyboard('{Escape}')
    await tick()
    const c = await select('', 'position: fixed; left: 100px; bottom: 8px; width: 240px')
    await userEvent.click(button(c.el))
    await tick()
    expect(list(c.el).getBoundingClientRect().bottom).toBeLessThanOrEqual(
      button(c.el).getBoundingClientRect().top + 1,
    )
  })

  it('ロール: ボタンは aria-haspopup=listbox、一覧は listbox、選択肢は option(aria-selected)', async () => {
    const { el, options } = await select('value="pro"')
    expect(button(el).getAttribute('aria-haspopup')).toBe('listbox')
    expect(list(el).getAttribute('role')).toBe('listbox')
    expect(button(el).getAttribute('aria-controls')).toBe(list(el).id)
    expect(options[1]!.matches(':state(selected)')).toBe(true)
    expect(options[0]!.matches(':state(selected)')).toBe(false)
    expect(options[2]!.matches(':state(disabled)')).toBe(false)
  })

  it('ボタンの名前は「ラベル + 現在の値」(aria-labelledby で同じ root のラベルと値を参照)', async () => {
    const { el } = await select('value="pro"')
    const ids = button(el).getAttribute('aria-labelledby')!.split(' ')
    const text = ids.map((id) => el.shadowRoot!.getElementById(id)!.textContent!.trim()).join(' ')
    expect(text).toBe('プラン Pro')
  })

  it('jimble-field のラベル・ヒント・エラーが名前・説明になる', async () => {
    const f = await mount<HTMLElement>(html`<div></div>`)
    f.innerHTML = `<jimble-field label="プラン" hint="あとから変更できます" error="選択してください"><jimble-select><jimble-option value="a">A</jimble-option></jimble-select></jimble-field>`
    const el = f.querySelector('jimble-select') as JimbleSelect
    await tick(80)
    expect(button(el).getAttribute('aria-describedby')).toBeTruthy()
    const desc = button(el)
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => el.shadowRoot!.getElementById(id)?.textContent)
    expect(desc).toEqual(['あとから変更できます', '選択してください'])
    expect(button(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('選択肢が無いときは「選択肢がありません」を出す', async () => {
    const f = await mount<HTMLElement>(
      html`<div><jimble-select aria-label="空"></jimble-select></div>`,
    )
    const el = f.querySelector('jimble-select') as JimbleSelect
    await tick()
    expect(list(el).textContent).toContain('選択肢がありません')
  })
})

describe('アクセシビリティ(axe)', () => {
  it('閉じた状態・開いた状態・エラー・無効で違反なし', async () => {
    const a = await select('value="pro"')
    await expectNoA11yViolations(a.f)
    await userEvent.click(button(a.el))
    await tick()
    await expectNoA11yViolations(a.el)
    await userEvent.keyboard('{Escape}')
    await tick()
    const b = await select('required disabled')
    await expectNoA11yViolations(b.f)
  })
})
