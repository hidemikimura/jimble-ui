import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleInput } from './jimble-input.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
  document.documentElement.removeAttribute('style')
})

const inner = (el: JimbleInput) => el.shadowRoot!.querySelector('input')!
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))
const data = (form: HTMLFormElement) => Object.fromEntries(new FormData(form))

async function form(body: ReturnType<typeof html>) {
  const f = await mount<HTMLFormElement>(html`<form>${body}</form>`)
  await Promise.all(
    [...f.querySelectorAll('jimble-input, jimble-button')].map(
      (e) => (e as JimbleInput).updateComplete,
    ),
  )
  return f
}

describe('見た目', () => {
  it('高さは sm 32 / md 36 / lg 40px、枠(ring)と影が効く（F1）', async () => {
    const md = await mount<JimbleInput>(html`<jimble-input></jimble-input>`)
    const sm = await mount<JimbleInput>(html`<jimble-input size="sm"></jimble-input>`)
    const lg = await mount<JimbleInput>(html`<jimble-input size="lg"></jimble-input>`)
    const base = (e: JimbleInput) => e.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    expect(base(md).getBoundingClientRect().height).toBe(36)
    expect(base(sm).getBoundingClientRect().height).toBe(32)
    expect(base(lg).getBoundingClientRect().height).toBe(40)
    expect(getComputedStyle(base(md)).boxShadow).toContain('inset')
    expect(getComputedStyle(base(md)).boxShadow).toContain('3px')
  })

  it('公開 CSS 変数で枠の色・高さ・幅を変えられる', async () => {
    const el = await mount<JimbleInput>(html`<jimble-input></jimble-input>`)
    el.style.setProperty('--jimble-input-height', '3rem')
    el.style.setProperty('--jimble-input-width', '10rem')
    const base = el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    expect(base.getBoundingClientRect().height).toBe(48)
    expect(el.getBoundingClientRect().width).toBe(160)
  })

  it('prefix / suffix は空なら領域を取らない', async () => {
    const el = await mount<JimbleInput>(html`<jimble-input></jimble-input>`)
    expect(getComputedStyle(el.shadowRoot!.querySelector('[part="prefix"]')!).display).toBe('none')
    const withPrefix = await mount<JimbleInput>(
      html`<jimble-input><span slot="prefix">¥</span></jimble-input>`,
    )
    await withPrefix.updateComplete
    expect(
      getComputedStyle(withPrefix.shadowRoot!.querySelector('[part="prefix"]')!).display,
    ).not.toBe('none')
  })
})

describe('値とフォーム', () => {
  it('name と value がフォームに送信される。name が無ければ送信されない', async () => {
    const f = await form(
      html`<jimble-input name="a" value="x"></jimble-input><jimble-input value="y"></jimble-input>`,
    )
    expect(data(f)).toEqual({ a: 'x' })
  })

  it('入力した値が送信される', async () => {
    const f = await form(html`<jimble-input name="a"></jimble-input>`)
    await userEvent.type(inner(f.querySelector('jimble-input')!), 'こんにちは')
    expect(data(f)).toEqual({ a: 'こんにちは' })
  })

  it('value 属性はデフォルト値、プロパティは現在値。reset で属性の値に戻る', async () => {
    const f = await form(html`<jimble-input name="a" value="init"></jimble-input>`)
    const el = f.querySelector('jimble-input')!
    el.value = 'changed'
    await el.updateComplete
    expect(inner(el).value).toBe('changed')
    expect(el.getAttribute('value')).toBe('init')
    f.reset()
    await el.updateComplete
    expect(el.value).toBe('init')
    expect(inner(el).value).toBe('init')
  })

  it('利用者が値を変えた後は、value 属性の変更で上書きしない（ネイティブ準拠）', async () => {
    const el = await mount<JimbleInput>(html`<jimble-input value="a"></jimble-input>`)
    el.setAttribute('value', 'b')
    expect(el.value).toBe('b')
    el.value = 'typed'
    el.setAttribute('value', 'c')
    expect(el.value).toBe('typed')
  })

  it('祖先の fieldset[disabled] で無効になり、送信されない', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <fieldset disabled><jimble-input name="a" value="x"></jimble-input></fieldset>
      </form>`,
    )
    const el = f.querySelector('jimble-input')!
    await el.updateComplete
    expect(inner(el).disabled).toBe(true)
    expect(data(f)).toEqual({})
  })

  it('input は host まで届き、change は blur 時に host から 1 回だけ出る', async () => {
    const onInput = vi.fn()
    const onChange = vi.fn()
    const el = await mount<JimbleInput>(
      html`<jimble-input @input=${onInput} @change=${onChange}></jimble-input>`,
    )
    await userEvent.type(inner(el), 'ab')
    expect(onInput).toHaveBeenCalledTimes(2)
    expect((onInput.mock.calls[0]![0] as Event).target).toBe(el)
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]![0] as Event).target).toBe(el)
  })

  it('外側の <label for> のクリックでフォーカスされ、名前になる', async () => {
    const c = await mount<HTMLElement>(
      html`<div><label for="x">お名前</label><jimble-input id="x"></jimble-input></div>`,
    )
    const el = c.querySelector('jimble-input') as JimbleInput
    await el.updateComplete
    expect(inner(el).getAttribute('aria-label')).toBe('お名前')
    await userEvent.click(c.querySelector('label')!)
    expect(el.shadowRoot!.activeElement).toBe(inner(el))
  })
})

describe('検証', () => {
  it('required: 空だと無効。メッセージは辞書から（日本語 → 英語に追従）', async () => {
    const f = await form(html`<jimble-input name="a" required></jimble-input>`)
    const el = f.querySelector('jimble-input')!
    expect(f.checkValidity()).toBe(false)
    expect(el.validity.valueMissing).toBe(true)
    expect(el.validationMessage).toBe('この項目は必須です')
    setLocale(en)
    await el.updateComplete
    expect(el.validationMessage).toBe('This field is required')
  })

  it('type=email の形式エラー、minlength の短すぎるエラー', async () => {
    const f = await form(html`<jimble-input name="a" type="email" minlength="5"></jimble-input>`)
    const el = f.querySelector('jimble-input')!
    await userEvent.type(inner(el), 'ab')
    expect(el.validity.typeMismatch).toBe(true)
    expect(el.validationMessage).toBe('メールアドレスの形式で入力してください')
    const f2 = await form(html`<jimble-input name="a" minlength="5"></jimble-input>`)
    const el2 = f2.querySelector('jimble-input')!
    await userEvent.type(inner(el2), 'ab')
    expect(el2.validity.tooShort).toBe(true)
    expect(el2.validationMessage).toBe('5 文字以上で入力してください')
  })

  it('setCustomValidity でサーバー側のエラーを渡せる', async () => {
    const f = await form(html`<jimble-input name="a" value="x"></jimble-input>`)
    const el = f.querySelector('jimble-input')!
    el.setCustomValidity('すでに使われています')
    expect(f.checkValidity()).toBe(false)
    expect(el.validationMessage).toBe('すでに使われています')
    el.setCustomValidity('')
    expect(f.checkValidity()).toBe(true)
  })

  it('エラー表示は「触れた後」だけ: blur、または送信の試行で invalid になる', async () => {
    const f = await form(
      html`<jimble-input name="a" required></jimble-input
        ><jimble-input name="b" required></jimble-input>`,
    )
    const [a, b] = [...f.querySelectorAll('jimble-input')]
    expect(a!.matches(':state(invalid)')).toBe(false)
    inner(a!).focus()
    inner(a!).blur()
    await tick(50)
    await a!.updateComplete
    expect(a!.matches(':state(invalid)')).toBe(true)
    expect(inner(a!).getAttribute('aria-invalid')).toBe('true')
    expect(b!.matches(':state(invalid)')).toBe(false)
    f.requestSubmit()
    await b!.updateComplete
    expect(b!.matches(':state(invalid)')).toBe(true)
    f.reset()
    await a!.updateComplete
    expect(a!.matches(':state(invalid)')).toBe(false)
  })

  it('エラー時は枠の色が変わる', async () => {
    const f = await form(html`<jimble-input required></jimble-input>`)
    const el = f.querySelector('jimble-input')!
    const base = el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    const before = getComputedStyle(base).boxShadow
    f.requestSubmit()
    await el.updateComplete
    expect(getComputedStyle(base).boxShadow).not.toBe(before)
  })
})

describe('Enter による暗黙の送信と IME（F6, §8.3）', () => {
  const submitSpy = (f: HTMLFormElement) => {
    const fn = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', fn)
    return fn
  }

  it('送信ボタンが無く入力欄が 1 つなら、Enter で送信される', async () => {
    const f = await form(html`<jimble-input name="a"></jimble-input>`)
    const onSubmit = submitSpy(f)
    inner(f.querySelector('jimble-input')!).focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('送信ボタンが無く入力欄が複数なら、Enter で送信されない（ネイティブ準拠）', async () => {
    const f = await form(
      html`<jimble-input name="a"></jimble-input><jimble-input name="b"></jimble-input>`,
    )
    const onSubmit = submitSpy(f)
    inner(f.querySelector('jimble-input')!).focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('jimble-button type=submit があれば、入力欄が複数でも送信される', async () => {
    const f = await form(
      html`<jimble-input name="a"></jimble-input><jimble-input name="b"></jimble-input
        ><jimble-button type="submit">送信</jimble-button>`,
    )
    const onSubmit = submitSpy(f)
    inner(f.querySelector('jimble-input')!).focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('既定の送信ボタンが無効なら送信されない', async () => {
    const f = await form(
      html`<jimble-input name="a"></jimble-input
        ><jimble-button type="submit" disabled>送信</jimble-button>`,
    )
    const onSubmit = submitSpy(f)
    inner(f.querySelector('jimble-input')!).focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ネイティブの送信ボタンは submitter として渡される', async () => {
    const f = await form(
      html`<jimble-input name="a"></jimble-input><jimble-input name="b"></jimble-input
        ><button type="submit" name="go" value="1">送信</button>`,
    )
    let submitter: unknown
    f.addEventListener('submit', (e) => {
      e.preventDefault()
      submitter = (e as SubmitEvent).submitter
    })
    inner(f.querySelector('jimble-input')!).focus()
    await userEvent.keyboard('{Enter}')
    expect((submitter as HTMLElement).getAttribute('name')).toBe('go')
  })

  it('IME の変換中(isComposing)の Enter では送信されない', async () => {
    const f = await form(html`<jimble-input name="a"></jimble-input>`)
    const onSubmit = submitSpy(f)
    const input = inner(f.querySelector('jimble-input')!)
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        isComposing: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Safari 型: compositionend の直後の Enter(keyCode 229)でも送信されない。その後の Enter は送信される', async () => {
    const f = await form(html`<jimble-input name="a"></jimble-input>`)
    const onSubmit = submitSpy(f)
    const input = inner(f.querySelector('jimble-input')!)
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }))
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        keyCode: 229,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
    expect(onSubmit).not.toHaveBeenCalled()
    await tick()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('修飾キー付きの Enter や preventDefault 済みでは送信しない', async () => {
    const f = await form(html`<jimble-input name="a"></jimble-input>`)
    const onSubmit = submitSpy(f)
    const el = f.querySelector('jimble-input')!
    inner(el).focus()
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    el.addEventListener('keydown', (e) => e.preventDefault())
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('jimble-field との連携（R2）', () => {
  it('ラベル・ヒント・エラーが文字列で内部の input に渡る', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="メール" hint="社用アドレス" error="登録済みです" required>
        <jimble-input name="e"></jimble-input>
      </jimble-field>`,
    )
    const el = f.querySelector('jimble-input') as JimbleInput
    await new Promise((r) => setTimeout(r, 30))
    await el.updateComplete
    expect(inner(el).getAttribute('aria-label')).toBe('メール')
    expect(inner(el).required).toBe(true)
    expect(inner(el).getAttribute('aria-invalid')).toBe('true')
    const ids = inner(el).getAttribute('aria-describedby')!.split(' ')
    const texts = ids.map((id) => el.shadowRoot!.getElementById(id)?.textContent)
    expect(texts).toEqual(['社用アドレス', '登録済みです'])
  })

  it('部品の検証メッセージは、触れた後に field のエラーとして表示される', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <jimble-field label="名前"><jimble-input name="n" required></jimble-input></jimble-field>
      </form>`,
    )
    const field = f.querySelector('jimble-field')!
    const el = f.querySelector('jimble-input') as JimbleInput
    const errorPart = () => field.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    await new Promise((r) => setTimeout(r, 30))
    expect(getComputedStyle(errorPart()).display).toBe('none')
    f.requestSubmit()
    await new Promise((r) => setTimeout(r, 50))
    expect(getComputedStyle(errorPart()).display).not.toBe('none')
    expect(errorPart().textContent).toContain('この項目は必須です')
    expect(inner(el).getAttribute('aria-describedby')).toBeTruthy()
  })

  it('ラベルのクリックで部品にフォーカスする', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="名前"><jimble-input></jimble-input></jimble-field>`,
    )
    const el = f.querySelector('jimble-input') as JimbleInput
    await new Promise((r) => setTimeout(r, 30))
    await userEvent.click(f.shadowRoot!.querySelector('[part="label"]')!)
    expect(el.shadowRoot!.activeElement).toBe(inner(el))
  })

  it('field の外でも aria-label で名前を付けられる', async () => {
    const el = await mount<JimbleInput>(html`<jimble-input aria-label="検索"></jimble-input>`)
    expect(inner(el).getAttribute('aria-label')).toBe('検索')
  })
})

describe('アクセシビリティ（axe）', () => {
  const cases = {
    通常: html`<jimble-input aria-label="名前"></jimble-input>`,
    値あり: html`<jimble-input aria-label="名前" value="山田"></jimble-input>`,
    placeholder: html`<jimble-input aria-label="名前" placeholder="山田 太郎"></jimble-input>`,
    disabled: html`<jimble-input aria-label="名前" disabled value="x"></jimble-input>`,
    'field(全部入り)': html`<jimble-field label="メール" hint="社用" error="登録済みです" required
      ><jimble-input type="email"></jimble-input
    ></jimble-field>`,
    prefix: html`<jimble-input aria-label="金額"><span slot="prefix">¥</span></jimble-input>`,
  }
  for (const [name, template] of Object.entries(cases)) {
    it(`${name}: 違反なし`, async () => {
      const el = await mount(template)
      await new Promise((r) => setTimeout(r, 30))
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
