import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import '../button/jimble-button.js'
import '../dropdown-menu/jimble-dropdown-menu.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleCodeEditor } from './jimble-code-editor.js'

afterEach(cleanup)
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const content = (el: JimbleCodeEditor) => el.shadowRoot!.querySelector<HTMLElement>('.cm-content')!
const chips = (el: JimbleCodeEditor) => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part~="variable"]'),
]
const options = (el: JimbleCodeEditor) =>
  [...el.shadowRoot!.querySelectorAll('.cm-tooltip-autocomplete [role="option"]')].map(
    (o) => o.querySelector('.cm-completionLabel')!.textContent!,
  )
const VARIABLES = [
  { name: 'customer_name', label: '顧客名' },
  { name: 'order.id', label: '注文番号', description: '#10001 の形式' },
  { name: 'shop_url' },
]

async function editor(
  template = html`<jimble-code-editor aria-label="本文"></jimble-code-editor>`,
) {
  const el = await mount<JimbleCodeEditor>(template)
  await tick()
  return el
}

describe('jimble-code-editor の値とフォーム', () => {
  it('value 属性が初期値。入力すると value が変わり、input が発火する。フォームで送信され、reset で戻る', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <jimble-code-editor name="body" value="初期" aria-label="本文"></jimble-code-editor>
      </form>`,
    )
    const el = f.querySelector('jimble-code-editor')!
    await tick()
    expect(content(el).textContent).toBe('初期')
    const onInput = vi.fn()
    el.addEventListener('input', onInput)
    await userEvent.click(content(el))
    await userEvent.keyboard('{Control>}{End}{/Control}追記')
    await tick()
    expect(el.value).toBe('初期追記')
    expect(onInput).toHaveBeenCalled()
    expect(Object.fromEntries(new FormData(f))).toEqual({ body: '初期追記' })
    f.reset()
    await tick()
    expect(el.value).toBe('初期')
    expect(content(el).textContent).toBe('初期')
  })

  it('value プロパティを変えると、文書が変わる(input は発火しない)', async () => {
    const el = await editor()
    const onInput = vi.fn()
    el.addEventListener('input', onInput)
    el.value = '1 行目\n2 行目'
    await tick()
    expect(el.shadowRoot!.querySelectorAll('.cm-line')).toHaveLength(2)
    expect(onInput).not.toHaveBeenCalled()
  })

  it('値を変えてフォーカスが外れると change が発火する', async () => {
    const c = await mount<HTMLElement>(
      html`<div>
        <jimble-code-editor aria-label="本文"></jimble-code-editor><input aria-label="次" />
      </div>`,
    )
    const el = c.querySelector('jimble-code-editor')!
    await tick()
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    await userEvent.click(content(el))
    await userEvent.keyboard('abc')
    expect(onChange).not.toHaveBeenCalled()
    c.querySelector('input')!.focus()
    await tick()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('Enter は改行で、フォームを送信しない。Tab はエディタの外へ移る(フォーカスを閉じ込めない)', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <jimble-code-editor name="body" aria-label="本文"></jimble-code-editor>
        <input aria-label="次" />
      </form>`,
    )
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    const el = f.querySelector('jimble-code-editor')!
    await tick()
    await userEvent.click(content(el))
    await userEvent.keyboard('a{Enter}b')
    await tick()
    expect(el.value).toBe('a\nb')
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(f.querySelector('input'))
    expect(el.value).toBe('a\nb')
  })

  it('required: 空なら valueMissing。入力すると有効になる', async () => {
    const el = await editor(
      html`<jimble-code-editor required aria-label="本文"></jimble-code-editor>`,
    )
    expect(el.validity.valueMissing).toBe(true)
    expect(el.validationMessage).toBe('この項目は必須です')
    await userEvent.click(content(el))
    await userEvent.keyboard('x')
    await tick()
    expect(el.validity.valid).toBe(true)
  })

  it('disabled: 編集できず、送信されない。readonly: フォーカスできて、編集できない', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <jimble-code-editor name="a" value="A" disabled aria-label="A"></jimble-code-editor>
        <jimble-code-editor name="b" value="B" readonly aria-label="B"></jimble-code-editor>
      </form>`,
    )
    await tick()
    const [a, b] = [...f.querySelectorAll('jimble-code-editor')]
    expect(content(a!).getAttribute('contenteditable')).toBe('false')
    expect(Object.fromEntries(new FormData(f))).toEqual({ b: 'B' })
    expect(content(b!).getAttribute('aria-readonly')).toBe('true')
    await userEvent.click(content(b!))
    await userEvent.keyboard('x')
    await tick()
    expect(b!.value).toBe('B')
  })
})

describe('見直しで見つかった不具合', () => {
  it('readonly では、Ctrl+Space で候補を開けない(候補から書き換えられない)', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = '<jimble-code-editor aria-label="本文" readonly value="A"></jimble-code-editor>'
    const el = c.querySelector('jimble-code-editor') as JimbleCodeEditor
    el.variables = VARIABLES
    await tick()
    await userEvent.click(content(el))
    await userEvent.keyboard('{Control>} {/Control}')
    await tick(100)
    expect(options(el)).toHaveLength(0)
    expect(el.value).toBe('A')
  })

  it('エディタの外(メニュー)から insertVariable で挿入し、フォーカスが外れると change が発火する', async () => {
    const c = await mount<HTMLElement>(
      html`<div>
        <jimble-code-editor aria-label="本文"></jimble-code-editor><input aria-label="次" />
      </div>`,
    )
    const el = c.querySelector('jimble-code-editor')!
    el.variables = VARIABLES
    await tick()
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    c.querySelector('input')!.focus()
    el.insertVariable('customer_name')
    await tick()
    c.querySelector('input')!.focus()
    await tick()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('value プロパティ・reset の変更は、元に戻す(Ctrl+Z)の履歴に入らない', async () => {
    const el = await editor()
    el.value = '差し替えた'
    await tick()
    await userEvent.click(content(el))
    await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}')
    await tick()
    expect(el.value).toBe('差し替えた')
  })

  it('付け直した後も、編集・値の反映・検証のフォーカス先が新しいエディタに向く', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form><jimble-code-editor required aria-label="本文"></jimble-code-editor></form>`,
    )
    const el = f.querySelector('jimble-code-editor')!
    await tick()
    const other = document.createElement('div')
    document.body.append(other)
    other.append(el)
    f.append(el)
    await tick()
    expect(el.shadowRoot!.querySelectorAll('.cm-editor')).toHaveLength(1)
    el.reportValidity()
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(content(el))
    // Firefox の検証の吹き出しを閉じる(残ると、次の試験の最初のクリックが、吹き出しを閉じるだけになる)
    await userEvent.keyboard('x')
    content(el).blur()
    other.remove()
  })

  it('disabled なら、required でも検証の対象外(エラーにしない)', async () => {
    const el = await editor(
      html`<jimble-code-editor required disabled aria-label="本文"></jimble-code-editor>`,
    )
    expect(el.validity.valueMissing).toBe(false)
  })

  it('開きと閉じが同じ・空の区切り記号では、変数を扱わない(文書を壊さない)', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML =
      '<jimble-code-editor aria-label="本文" variable-prefix="%%" variable-suffix="%%"></jimble-code-editor>'
    const el = c.querySelector('jimble-code-editor') as JimbleCodeEditor
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    el.variables = VARIABLES
    el.value = '%%customer_name%% 様'
    await tick()
    expect(chips(el)).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('名前と説明', () => {
  it('jimble-field のラベル・ヒントが、編集領域(role=textbox)の名前と説明になる', async () => {
    const field = await mount<HTMLElement>(
      html`<jimble-field label="メール本文" hint="変数は {{ で補完できます">
        <jimble-code-editor></jimble-code-editor>
      </jimble-field>`,
    )
    const el = field.querySelector('jimble-code-editor')!
    await tick()
    const c = content(el)
    expect(c.getAttribute('role')).toBe('textbox')
    expect(c.getAttribute('aria-multiline')).toBe('true')
    expect(c.getAttribute('aria-label')).toBe('メール本文')
    const hint = el.shadowRoot!.getElementById(c.getAttribute('aria-describedby')!)
    expect(hint?.textContent).toBe('変数は {{ で補完できます')
  })

  it('placeholder を、空のときに表示する', async () => {
    const el = await editor(
      html`<jimble-code-editor placeholder="本文を入力" aria-label="本文"></jimble-code-editor>`,
    )
    expect(el.shadowRoot!.querySelector('.cm-placeholder')?.textContent).toBe('本文を入力')
  })
})

describe('変数', () => {
  async function withVariables(value: string, attrs = '') {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-code-editor aria-label="本文" ${attrs}></jimble-code-editor>`
    const el = c.querySelector('jimble-code-editor') as JimbleCodeEditor
    el.variables = VARIABLES
    el.value = value
    await tick()
    return el
  }

  it('{{name}} をチップで表示する(ラベル。未定義の変数は名前のまま、別の見た目)', async () => {
    const el = await withVariables('{{customer_name}} 様 {{ order.id }} {{unknown_var}}')
    expect(chips(el).map((c) => c.textContent)).toEqual(['顧客名', '注文番号', 'unknown_var'])
    expect(chips(el)[2]!.getAttribute('part')).toBe('variable unknown')
    // 値は {{name}} のまま
    expect(el.value).toBe('{{customer_name}} 様 {{ order.id }} {{unknown_var}}')
  })

  it('チップは 1 つの文字として扱う(Backspace 1 回で、変数ごと消える)', async () => {
    const el = await withVariables('A{{customer_name}}')
    await userEvent.click(content(el))
    await userEvent.keyboard('{End}{Backspace}')
    await tick()
    expect(el.value).toBe('A')
  })

  it('insertVariable で、カーソルの位置に変数を挿入する(input が発火する)', async () => {
    const el = await withVariables('こんにちは 様')
    await userEvent.click(content(el))
    await userEvent.keyboard(
      '{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}',
    )
    const onInput = vi.fn()
    el.addEventListener('input', onInput)
    el.insertVariable('customer_name')
    await tick()
    expect(el.value).toBe('こんにちは {{customer_name}}様')
    expect(onInput).toHaveBeenCalled()
    expect(el.matches(':focus-within')).toBe(true)
  })

  it('メニューの jimble-select で insertVariable を呼ぶと、メニューが閉じたあとも、エディタにフォーカスがある', async () => {
    const c = await mount<HTMLElement>(
      html`<div>
        <jimble-code-editor aria-label="本文"></jimble-code-editor>
        <jimble-dropdown-menu>
          <jimble-button slot="trigger">変数を挿入</jimble-button>
          <jimble-menu-item value="customer_name">顧客名</jimble-menu-item>
        </jimble-dropdown-menu>
      </div>`,
    )
    const el = c.querySelector('jimble-code-editor')!
    el.variables = VARIABLES
    await tick()
    const menu = c.querySelector('jimble-dropdown-menu')!
    menu.addEventListener('jimble-select', (e) =>
      el.insertVariable((e as CustomEvent<{ value: string }>).detail.value),
    )
    await userEvent.click(c.querySelector('jimble-button')!)
    // メニューが最初の項目にフォーカスを移してから押す(重いときに、開く前のキーが失われる)
    await vi.waitFor(() => expect(document.activeElement).toBe(c.querySelector('jimble-menu-item')))
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(el.value).toBe('{{customer_name}}')
    expect(el.matches(':focus-within')).toBe(true)
  })

  it('{{ を入力すると、変数の候補が出る。絞り込んで Enter で挿入する', async () => {
    const el = await withVariables('')
    await userEvent.click(content(el))
    // user-event では { を {{ と書く(2 つで {{ を入力する)
    await userEvent.keyboard('{{{{')
    await tick(100)
    expect(options(el)).toEqual(['顧客名', '注文番号', 'shop_url'])
    await userEvent.keyboard('order')
    await tick(100)
    expect(options(el)).toHaveLength(1)
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(el.value).toBe('{{order.id}}')
    expect(chips(el).map((c) => c.textContent)).toEqual(['注文番号'])
  })

  it('Ctrl+Space で、どこでも候補を開ける。Esc で閉じる', async () => {
    const el = await withVariables('件名: ')
    await userEvent.click(content(el))
    await userEvent.keyboard('{Control>}{End}{/Control}{Control>} {/Control}')
    await tick(100)
    expect(options(el)).toHaveLength(3)
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(options(el)).toHaveLength(0)
  })

  it('区切り記号を変えられる(variable-prefix / variable-suffix)', async () => {
    const el = await withVariables('合計 ${order.id}', 'variable-prefix="${" variable-suffix="}"')
    expect(chips(el).map((c) => c.textContent)).toEqual(['注文番号'])
    el.insertVariable('shop_url')
    await tick()
    expect(el.value).toContain('${shop_url}')
  })
})

describe('言語と見た目', () => {
  it('language="html" / "json" で色分けする(読み込みは使うときだけ)', async () => {
    const el = await editor(
      html`<jimble-code-editor
        language="html"
        value=${"<b class='x'>太字</b>"}
        aria-label="HTML"
      ></jimble-code-editor>`,
    )
    await tick(300)
    const tag = [...el.shadowRoot!.querySelectorAll('.cm-line span')].find(
      (s) => s.textContent === 'b',
    )!
    expect(getComputedStyle(tag).color).not.toBe(getComputedStyle(content(el)).color)
    el.language = 'json'
    el.value = '{"a": 1}'
    await tick(300)
    const key = [...el.shadowRoot!.querySelectorAll('.cm-line span')].find(
      (s) => s.textContent === '"a"',
    )
    expect(key).toBeDefined()
  })

  it('line-numbers で行番号を出す。rows で最小の高さが変わる', async () => {
    const a = await editor(html`<jimble-code-editor rows="2" aria-label="A"></jimble-code-editor>`)
    const b = await editor(
      html`<jimble-code-editor
        rows="8"
        line-numbers
        value=${'1\n2\n3'}
        aria-label="B"
      ></jimble-code-editor>`,
    )
    const height = (e: JimbleCodeEditor) =>
      e.shadowRoot!.querySelector('[part="base"]')!.getBoundingClientRect().height
    expect(height(b)).toBeGreaterThan(height(a))
    expect(a.shadowRoot!.querySelector('.cm-gutters')).toBeNull()
    const numbers = [...b.shadowRoot!.querySelectorAll('.cm-lineNumbers .cm-gutterElement')]
      .map((n) => n.textContent)
      .filter(Boolean)
    expect(numbers).toContain('3')
  })

  it('axe の違反がない(変数のチップ・候補を開いた状態を含む)', async () => {
    const field = await mount<HTMLElement>(
      html`<jimble-field label="本文"
        ><jimble-code-editor line-numbers></jimble-code-editor
      ></jimble-field>`,
    )
    const el = field.querySelector('jimble-code-editor')!
    el.variables = VARIABLES
    el.value = '{{customer_name}} 様\n'
    await tick()
    await expectNoA11yViolations(field)
    await userEvent.click(content(el))
    await userEvent.keyboard('{Control>}{End}{/Control}{{{{')
    await tick(100)
    expect(options(el).length).toBeGreaterThan(0)
    await expectNoA11yViolations(field)
  })
})
