import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../checkbox/jimble-checkbox.js'
import '../combobox/jimble-combobox.js'
import '../input/jimble-input.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleInput } from '../input/jimble-input.js'
import type { FieldValidator, JimbleField } from './jimble-field.js'
import './jimble-field.js'

afterEach(cleanup)
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const errorText = (f: JimbleField) =>
  f.shadowRoot!.querySelector('[part="error"]')!.textContent!.trim()

async function make(
  validate?: FieldValidator,
  inner = '<jimble-input name="email" type="email"></jimble-input>',
) {
  const form = await mount<HTMLFormElement>(html`<form></form>`)
  form.innerHTML = `<jimble-field label="メールアドレス">${inner}</jimble-field><button>送信</button>`
  const field = form.querySelector('jimble-field') as JimbleField
  if (validate) field.validate = validate
  await field.updateComplete
  const input = form.querySelector('jimble-input') as JimbleInput
  await input?.updateComplete
  return { form, field, input }
}

describe('独自の検証（validate）', () => {
  const required: FieldValidator = (v) => (v ? null : '必須です。')

  it('最初に 1 回呼ばれる。エラーの間はフォームの検証が通らず、表示は、フォーカスが外れたあと', async () => {
    const validate = vi.fn(required)
    const { form, field, input } = await make(validate)
    await tick()
    expect(validate).toHaveBeenCalledWith('', input, expect.objectContaining({ controls: [input] }))
    expect(input.validity.customError).toBe(true)
    expect(form.checkValidity()).toBe(false)
    expect(errorText(field)).toBe('') // まだ触れていない
    input.focus()
    input.blur()
    await tick(80)
    expect(errorText(field)).toBe('必須です。')
    expect(input.validationMessage).toBe('必須です。')
  })

  it('値が変わると再検証され、直ると解除されて送信できる', async () => {
    const { form, field, input } = await make(required)
    input.focus()
    input.blur()
    await tick(80)
    expect(errorText(field)).toBe('必須です。')
    input.focus()
    await userEvent.keyboard('a@example.com')
    input.blur()
    await tick(80)
    expect(errorText(field)).toBe('')
    expect(form.checkValidity()).toBe(true)
  })

  it('入力のたびに(同期の検証なら)呼ばれる。null・undefined・空文字・false は問題なし', async () => {
    const seen: string[] = []
    const { input } = await make((v) => {
      seen.push(String(v))
      return null
    })
    await tick()
    input.focus()
    await userEvent.keyboard('ab')
    expect(seen.slice(-2)).toEqual(['a', 'ab'])
    for (const ok of [null, undefined, '', false] as const) {
      const r = await make(() => ok)
      await tick()
      expect(r.input.validity.valid).toBe(true)
    }
  })

  it('setCustomValidity(サーバーのエラーなど)を上書きしない。error 属性とも別', async () => {
    const { input } = await make(() => null)
    await tick()
    input.setCustomValidity('サーバーのエラー')
    await input.updateComplete
    input.focus()
    await userEvent.keyboard('x')
    await tick()
    expect(input.validationMessage).toBe('サーバーのエラー')
  })

  it('例外を投げたら「検証できませんでした」になる', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { input } = await make(() => {
      throw new Error('boom')
    })
    await tick()
    expect(input.validationMessage).toBe('検証できませんでした')
    warn.mockRestore()
  })

  it('validate を差し替えると、その場で検証し直す', async () => {
    const { field, input } = await make(required)
    await tick()
    expect(input.validity.valid).toBe(false)
    field.validate = () => null
    await field.updateComplete
    await tick()
    expect(input.validity.valid).toBe(true)
  })
})

describe('非同期の検証', () => {
  it('結果が出るまでは「確認中です」で送信されず、結果で置き換わる。入力のたびには呼ばない', async () => {
    let resolve!: (v: string | null) => void
    const calls: string[] = []
    const validate = (v: unknown) => {
      calls.push(String(v))
      return new Promise<string | null>((r) => (resolve = r))
    }
    const { form, input } = await make(validate)
    await tick()
    expect(input.validationMessage).toBe('確認中です')
    expect(form.checkValidity()).toBe(false)
    resolve(null)
    await tick()
    expect(input.validity.valid).toBe(true)
    const before = calls.length
    input.focus()
    await userEvent.keyboard('abc')
    expect(calls.length).toBe(before) // input では呼ばない
    input.blur()
    await tick()
    expect(calls.length).toBeGreaterThan(before) // 確定(change / blur)で呼ぶ
  })

  it('古い結果は捨てる(あとから呼ばれた検証の結果が残る)', async () => {
    const resolvers: Array<(v: string | null) => void> = []
    const { input, field } = await make(() => new Promise<string | null>((r) => resolvers.push(r)))
    await tick()
    input.focus()
    input.blur()
    await tick()
    expect(resolvers.length).toBeGreaterThanOrEqual(2)
    const last = resolvers.length - 1
    resolvers[last]!('新しい結果')
    resolvers[0]!('古い結果')
    await tick()
    expect(input.validationMessage).toBe('新しい結果')
    void field
  })

  it('拒否された Promise は「検証できませんでした」。validateNow で完了を待てて、結果が返る', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { field, input } = await make(() => Promise.reject(new Error('x')))
    await tick()
    expect(input.validationMessage).toBe('検証できませんでした')
    field.validate = async (v) => (v ? null : '空です')
    expect(await field.validateNow()).toBe(false)
    input.value = 'a@example.com'
    await input.updateComplete
    expect(await field.validateNow()).toBe(true)
    warn.mockRestore()
  })
})

describe('部品ごとの値', () => {
  it('チェックボックスは真偽値、複数選択は配列で渡される', async () => {
    const values: unknown[] = []
    const check = await make((v) => {
      values.push(v)
      return v === true ? null : '同意が必要です'
    }, '<jimble-checkbox name="agree">同意する</jimble-checkbox>')
    await tick()
    expect(values.at(-1)).toBe(false)
    const box = check.form.querySelector('jimble-checkbox') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    ;(box as unknown as { checked: boolean }).checked = true
    box.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await tick()
    expect(values.at(-1)).toBe(true)

    const multi: unknown[] = []
    const cb = await make((v) => {
      multi.push(v)
      return Array.isArray(v) && v.length >= 2 ? null : '2 つ以上選んでください'
    }, '<jimble-combobox name="t" multiple value="a"><jimble-option value="a">A</jimble-option><jimble-option value="b">B</jimble-option></jimble-combobox>')
    await tick()
    expect(multi.at(-1)).toEqual(['a'])
    const combo = cb.form.querySelector('jimble-combobox') as HTMLElement & {
      values: string[]
      updateComplete: Promise<unknown>
    }
    combo.values = ['a', 'b']
    combo.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await tick()
    expect(multi.at(-1)).toEqual(['a', 'b'])
    expect((combo as unknown as { validity: ValidityState }).validity.valid).toBe(true)
  })
})

describe('アクセシビリティ', () => {
  it('エラー表示中も axe 違反がなく、部品が invalid になる', async () => {
    const { form, field, input } = await make((v) => (v ? null : '必須です。'))
    input.focus()
    input.blur()
    await tick(80)
    expect(errorText(field)).toBe('必須です。')
    expect(input.matches(':state(invalid)')).toBe(true)
    await expectNoA11yViolations(form)
  })
})

describe('1 つの field に部品が複数ある(姓と名)', () => {
  type C = HTMLElement & { validity: ValidityState; name: string; updateComplete: Promise<unknown> }
  async function twoInputs(validate: FieldValidator) {
    const form = await mount<HTMLFormElement>(html`<form></form>`)
    form.innerHTML = `<jimble-field label="氏名"><jimble-input name="last" aria-label="姓"></jimble-input><jimble-input name="first" aria-label="名"></jimble-input></jimble-field>`
    const field = form.querySelector('jimble-field') as JimbleField
    field.validate = validate
    await field.updateComplete
    await tick()
    const [last, first] = [...form.querySelectorAll('jimble-input')] as C[]
    return { form, field, last: last!, first: first! }
  }
  const inner = (c: C) => c.shadowRoot!.querySelector('input')!

  it('部品ごとに検証され、片方が空なら、もう片方を直してもエラー表示は消えず、送信も止まる', async () => {
    const { form, field, last, first } = await twoInputs((v) => (v ? null : '必須です。'))
    expect(form.checkValidity()).toBe(false)
    last.focus()
    await userEvent.tab()
    await userEvent.tab()
    await tick(100)
    expect(errorText(field)).toBe('必須です。')
    last.focus()
    await userEvent.keyboard('山田')
    await userEvent.tab()
    await tick(100)
    expect(last.validity.valid).toBe(true)
    expect(first.validity.valid).toBe(false)
    expect(errorText(field)).toBe('必須です。') // 名が空のまま。表示は消えない
    first.focus()
    await userEvent.keyboard('太郎')
    await userEvent.tab()
    await tick(100)
    expect(errorText(field)).toBe('')
    expect(form.checkValidity()).toBe(true)
  })

  it('表示されるのは、並びで最初の無効な部品のメッセージ', async () => {
    const { field, last, first } = await twoInputs((_v, c) =>
      (c as C).name === 'last' ? '姓を入力してください' : '名を入力してください',
    )
    last.focus()
    await userEvent.tab()
    await userEvent.tab()
    await tick(100)
    expect(errorText(field)).toBe('姓を入力してください')
    last.focus()
    await userEvent.keyboard('山田')
    await userEvent.tab()
    await tick(100)
    // 姓の検証は、常にエラーを返す関数なので姓も無効のまま
    expect(first.validity.valid).toBe(false)
  })

  it('ほかの部品の値を context.get で引ける。片方が変わると、もう片方も再検証される', async () => {
    const { form, field, last, first } = await twoInputs((_v, c, ctx) => {
      const total = String(ctx.get('last') ?? '').length + String(ctx.get('first') ?? '').length
      return total > 4 ? `氏名は合計 4 文字以内です（${(c as C).name}）` : null
    })
    expect(form.checkValidity()).toBe(true)
    last.focus()
    await userEvent.keyboard('山田山田山')
    await userEvent.tab()
    await tick(100)
    // 名は変えていないが、姓の変更で再検証され、両方が無効になる
    expect(last.validity.valid).toBe(false)
    expect(first.validity.valid).toBe(false)
    expect(errorText(field)).toContain('合計 4 文字以内')
    last.focus()
    inner(last).select()
    await userEvent.keyboard('山田')
    await userEvent.tab()
    await tick(100)
    expect(first.validity.valid).toBe(true)
    expect(form.checkValidity()).toBe(true)
  })

  it('部品の名前は「field のラベル + 部品の aria-label」で区別される(1 つのときは field のラベルだけ)', async () => {
    const { last, first } = await twoInputs(() => null)
    expect(inner(last).getAttribute('aria-label')).toBe('氏名 姓')
    expect(inner(first).getAttribute('aria-label')).toBe('氏名 名')
    const single = await make(undefined)
    expect(inner(single.input as unknown as C).getAttribute('aria-label')).toBe('メールアドレス')
  })

  it('axe 違反がない', async () => {
    const { form, last } = await twoInputs((v) => (v ? null : '必須です。'))
    last.focus()
    last.blur()
    await tick(80)
    await expectNoA11yViolations(form)
  })
})

describe('外から実行する（フリガナの自動入力など）', () => {
  type C = HTMLElement & {
    value: string
    validity: ValidityState
    updateComplete: Promise<unknown>
  }
  async function nameAndKana() {
    const form = await mount<HTMLFormElement>(html`<form></form>`)
    form.innerHTML = `<jimble-input name="name" aria-label="氏名"></jimble-input>
      <jimble-field id="kana" label="フリガナ"><jimble-input name="kana"></jimble-input></jimble-field>`
    const field = form.querySelector('#kana') as JimbleField
    field.validate = (v) => (v ? null : 'フリガナを入力してください。')
    await field.updateComplete
    await tick()
    return {
      form,
      field,
      name: form.querySelector('jimble-input[name="name"]') as C,
      kana: form.querySelector('jimble-input[name="kana"]') as C,
    }
  }

  it('1. showErrors で、その場でエラーにして、表示する（触れていなくても）', async () => {
    const { field, kana } = await nameAndKana()
    expect(errorText(field)).toBe('')
    expect(await field.showErrors()).toBe(false)
    await tick(60)
    expect(errorText(field)).toBe('フリガナを入力してください。')
    expect(kana.validity.customError).toBe(true)
  })

  it('2. 値がプログラムから入ると(イベントなしでも)自動で再検証され、エラーが消える', async () => {
    const { form, field, kana } = await nameAndKana()
    await field.showErrors()
    await tick(60)
    expect(errorText(field)).toBe('フリガナを入力してください。')
    kana.value = 'ヤマダ' // Autokana.js のように、value を直接書き換える(input イベントは出ない)
    await kana.updateComplete
    await tick(60)
    expect(kana.validity.valid).toBe(true)
    expect(errorText(field)).toBe('')
    expect(form.checkValidity()).toBe(true)
    kana.value = '' // 空に戻すと、また無効になる(触れた状態のままなので、エラーも出る)
    await kana.updateComplete
    await tick(60)
    expect(kana.validity.valid).toBe(false)
    expect(errorText(field)).toBe('フリガナを入力してください。')
  })

  it('3. hideErrors で、エラーの表示だけを隠す(検証の結果は変わらない)。もう一度 showErrors で出る', async () => {
    const { form, field, kana } = await nameAndKana()
    await field.showErrors()
    await tick(60)
    field.hideErrors()
    await tick(60)
    expect(errorText(field)).toBe('')
    expect(kana.validity.valid).toBe(false)
    expect(form.checkValidity()).toBe(false)
    await field.showErrors()
    await tick(60)
    expect(errorText(field)).toBe('フリガナを入力してください。')
  })

  it('氏名の入力(input イベント)から、フリガナの value を書き換える連携ができる', async () => {
    const { field, name, kana } = await nameAndKana()
    const table: Record<string, string> = { 山: 'ヤマ', 田: 'ダ' }
    name.addEventListener('input', () => {
      kana.value = [...name.value].map((c) => table[c] ?? '').join('')
    })
    await field.showErrors()
    name.focus()
    await userEvent.keyboard('山田')
    await tick(100)
    expect(kana.value).toBe('ヤマダ')
    expect(kana.validity.valid).toBe(true)
    field.hideErrors()
    await tick(60)
    expect(errorText(field)).toBe('')
  })

  it('入力で変えたときに、検証が二重に呼ばれない(同じ値では再検証しない)', async () => {
    const calls: string[] = []
    const { field, kana } = await nameAndKana()
    field.validate = (v) => {
      calls.push(String(v))
      return null
    }
    await field.updateComplete
    await tick()
    calls.length = 0
    kana.focus()
    await userEvent.keyboard('ア')
    await tick(60)
    expect(calls).toEqual(['ア'])
  })
})

describe('再描画（requestUpdate・テンプレートの再描画）との関係', () => {
  it('値が変わらない再描画では検証しない。テンプレートの .value が変わって再描画されると、検証される', async () => {
    const calls: string[] = []
    const host = await mount<HTMLElement>(html`<div></div>`)
    const { render } = await import('lit')
    const draw = (v: string) =>
      render(
        html`<jimble-field
          label="コメント"
          .validate=${(x: unknown) => {
            calls.push(String(x))
            return x ? null : '必須です'
          }}
          ><jimble-input name="c" .value=${v}></jimble-input
        ></jimble-field>`,
        host,
      )
    draw('')
    const input = host.querySelector('jimble-input') as JimbleInput
    await input.updateComplete
    await tick(60)
    calls.length = 0
    input.requestUpdate() // 値は同じ
    await input.updateComplete
    await tick(60)
    expect(calls).toEqual([])
    draw('こんにちは') // 再描画で value が変わる
    await input.updateComplete
    await tick(60)
    expect(calls).toEqual(['こんにちは'])
    expect(input.validity.valid).toBe(true)
    draw('') // 空に戻る
    await input.updateComplete
    await tick(60)
    expect(calls.at(-1)).toBe('')
    expect(input.validity.valid).toBe(false)
  })
})
