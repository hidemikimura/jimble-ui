import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { sharedSheet } from '../../styles/shared-sheet.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleButton } from './jimble-button.js'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('style')
  vi.restoreAllMocks()
})

const inner = (el: JimbleButton) => el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
const tick = () => new Promise((r) => setTimeout(r, 20))

describe('共有シートと Shadow DOM（M0 の検証）', () => {
  it('共有 CSSStyleSheet を adoptedStyleSheets で適用し、インスタンスを共有する', async () => {
    const a = await mount<JimbleButton>(html`<jimble-button>A</jimble-button>`)
    const b = await mount<JimbleButton>(html`<jimble-button>B</jimble-button>`)
    expect(a.shadowRoot!.adoptedStyleSheets).toContain(sharedSheet)
    expect(a.shadowRoot!.adoptedStyleSheets[0]).toBe(b.shadowRoot!.adoptedStyleSheets[0])
  })

  it('primary: shadow-sm が効く（F1）', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button variant="primary">保存</jimble-button>`,
    )
    const { boxShadow } = getComputedStyle(inner(el))
    expect(boxShadow).not.toBe('none')
    expect(boxShadow).toContain('3px')
  })

  it('secondary: ring-1 ring-inset が shadow-sm と合成されて効く（F1）', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button>キャンセル</jimble-button>`)
    const { boxShadow } = getComputedStyle(inner(el))
    expect(boxShadow).toContain('inset')
    expect(boxShadow).toContain('3px')
  })

  it('ring を持つ要素は透明な outline を併用する（強制色モード対策 F4）', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button>キャンセル</jimble-button>`)
    const s = getComputedStyle(inner(el))
    expect(s.outlineStyle).toBe('solid')
    expect(s.outlineWidth).toBe('1px')
    expect(s.outlineColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })

  it('二重に define() しても例外にならない', () => {
    expect(() => JimbleButton.define('jimble-button')).not.toThrow()
  })
})

describe('見た目とカスタマイズ', () => {
  it('高さは sm 32 / md 36 / lg 40px', async () => {
    const md = await mount<JimbleButton>(html`<jimble-button>md</jimble-button>`)
    const sm = await mount<JimbleButton>(html`<jimble-button size="sm">sm</jimble-button>`)
    const lg = await mount<JimbleButton>(html`<jimble-button size="lg">lg</jimble-button>`)
    expect(inner(md).getBoundingClientRect().height).toBe(36)
    expect(inner(sm).getBoundingClientRect().height).toBe(32)
    expect(inner(lg).getBoundingClientRect().height).toBe(40)
  })

  it('利用者が :root で上書きしたトークンが効く（F2）', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button variant="primary">保存</jimble-button>`,
    )
    expect(getComputedStyle(inner(el)).backgroundColor).not.toBe('rgb(255, 0, 0)')
    document.documentElement.style.setProperty('--jimble-color-primary-600', 'rgb(255, 0, 0)')
    expect(getComputedStyle(inner(el)).backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('公開 CSS 変数で背景・角丸・高さを変えられる', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button variant="primary">x</jimble-button>`)
    el.style.setProperty('--jimble-button-bg', 'rgb(0, 128, 0)')
    el.style.setProperty('--jimble-button-radius', '9999px')
    el.style.setProperty('--jimble-button-height', '3rem')
    const s = getComputedStyle(inner(el))
    expect(s.backgroundColor).toBe('rgb(0, 128, 0)')
    expect(s.borderTopLeftRadius).not.toBe('8px')
    expect(inner(el).getBoundingClientRect().height).toBe(48)
  })

  it('::part(base) で外から装飾できる', async () => {
    const style = document.createElement('style')
    style.textContent = 'jimble-button.x::part(base){ letter-spacing: 3px }'
    document.head.append(style)
    const el = await mount<JimbleButton>(html`<jimble-button class="x">x</jimble-button>`)
    expect(getComputedStyle(inner(el)).letterSpacing).toBe('3px')
    style.remove()
  })

  it('未知の variant は secondary にフォールバックする', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button variant="nope">x</jimble-button>`)
    expect(getComputedStyle(inner(el)).boxShadow).toContain('inset')
  })

  it('prefix / suffix スロットは空なら領域を取らない', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button>x</jimble-button>`)
    const prefix = el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"]')!
    expect(getComputedStyle(prefix).display).toBe('none')
    const withIcon = await mount<JimbleButton>(
      html`<jimble-button><svg slot="prefix" width="16" height="16"></svg>x</jimble-button>`,
    )
    await withIcon.updateComplete
    expect(
      getComputedStyle(withIcon.shadowRoot!.querySelector<HTMLElement>('[part="prefix"]')!).display,
    ).not.toBe('none')
  })

  it('icon-only は正方形になる', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button icon-only aria-label="設定"
        ><svg slot="prefix" width="16" height="16"></svg
      ></jimble-button>`,
    )
    const r = inner(el).getBoundingClientRect()
    expect(r.width).toBe(36)
    expect(r.height).toBe(36)
  })

  it('icon-only で aria-label が無いと開発時に警告する', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mount(html`<jimble-button icon-only>x</jimble-button>`)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('aria-label'))
  })

  it('host の aria-label が内部のボタンの名前になる', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button icon-only aria-label="設定">⚙</jimble-button>`,
    )
    expect(inner(el).getAttribute('aria-label')).toBe('設定')
  })
})

describe('disabled / loading', () => {
  it('disabled: クリックが外に出ず、フォーカスもできない', async () => {
    const onClick = vi.fn()
    const el = await mount<JimbleButton>(
      html`<jimble-button disabled @click=${onClick}>x</jimble-button>`,
    )
    await userEvent.click(el, { force: true }).catch(() => {})
    el.click()
    expect(onClick).not.toHaveBeenCalled()
    expect((inner(el) as HTMLButtonElement).disabled).toBe(true)
  })

  it('loading: クリックを無効にしつつフォーカスは維持し、aria-busy を付ける', async () => {
    const onClick = vi.fn()
    const el = await mount<JimbleButton>(
      html`<jimble-button loading @click=${onClick}>保存</jimble-button>`,
    )
    await userEvent.click(el)
    el.click()
    expect(onClick).not.toHaveBeenCalled()
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(inner(el))
    expect(inner(el).getAttribute('aria-busy')).toBe('true')
    expect(inner(el).getAttribute('aria-disabled')).toBe('true')
    expect((inner(el) as HTMLButtonElement).disabled).toBe(false)
    expect(el.shadowRoot!.textContent).toContain('読み込み中')
    expect(el.matches(':state(loading)')).toBe(true)
  })

  it('祖先の fieldset[disabled] で無効になる', async () => {
    const container = await mount<HTMLFieldSetElement>(
      html`<fieldset disabled><jimble-button>x</jimble-button></fieldset>`,
    )
    const el = container.querySelector('jimble-button') as JimbleButton
    await el.updateComplete
    expect((inner(el) as HTMLButtonElement).disabled).toBe(true)
  })

  it('読み込み中の文言は辞書の切り替えに追従する', async () => {
    const el = await mount<JimbleButton>(html`<jimble-button loading>x</jimble-button>`)
    setLocale(en)
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('Loading')
    setLocale({ $locale: 'ja', 'common.loading': '読み込み中' })
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('読み込み中')
  })
})

describe('キーボード', () => {
  it('Enter と Space でクリックできる', async () => {
    const onClick = vi.fn()
    const el = await mount<JimbleButton>(html`<jimble-button @click=${onClick}>x</jimble-button>`)
    el.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})

describe('フォーム連携（type=submit / reset）', () => {
  const form = async (btn: string) => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <input name="a" value="init" />${document.createRange().createContextualFragment(btn)}
      </form>`,
    )
    const button = f.querySelector('jimble-button') as JimbleButton
    await button.updateComplete
    return { f, button }
  }

  it('submit: form.requestSubmit() が呼ばれる', async () => {
    const { f, button } = await form('<jimble-button type="submit">送信</jimble-button>')
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    await userEvent.click(button)
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submit: 利用者が click を preventDefault() したら送信しない', async () => {
    const { f, button } = await form('<jimble-button type="submit">送信</jimble-button>')
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    button.addEventListener('click', (e) => e.preventDefault())
    await userEvent.click(button)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submit: loading 中は送信しない', async () => {
    const { f, button } = await form('<jimble-button type="submit" loading>送信</jimble-button>')
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    await userEvent.click(button)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reset: form.reset() が呼ばれる', async () => {
    const { f, button } = await form('<jimble-button type="reset">戻す</jimble-button>')
    const input = f.querySelector('input')!
    input.value = 'changed'
    await userEvent.click(button)
    await tick()
    expect(input.value).toBe('init')
  })

  it('既定の type は button で、送信しない', async () => {
    const { f, button } = await form('<jimble-button>x</jimble-button>')
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    await userEvent.click(button)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('href（リンク描画）', () => {
  it('a 要素として描画し、_blank には noopener を付ける', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button href="/x" target="_blank">開く</jimble-button>`,
    )
    const a = inner(el) as HTMLAnchorElement
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('/x')
    expect(a.getAttribute('rel')).toBe('noopener')
  })

  it('disabled のときは href を外して aria-disabled にする', async () => {
    const el = await mount<JimbleButton>(
      html`<jimble-button href="/x" disabled>開く</jimble-button>`,
    )
    const a = inner(el)
    expect(a.hasAttribute('href')).toBe(false)
    expect(a.getAttribute('aria-disabled')).toBe('true')
    expect(a.getAttribute('role')).toBe('link')
  })
})

describe('アクセシビリティ（axe）', () => {
  const states = {
    通常: html`<jimble-button>保存</jimble-button>`,
    primary: html`<jimble-button variant="primary">保存</jimble-button>`,
    danger: html`<jimble-button variant="danger">削除</jimble-button>`,
    ghost: html`<jimble-button variant="ghost">戻る</jimble-button>`,
    disabled: html`<jimble-button variant="primary" disabled>保存</jimble-button>`,
    loading: html`<jimble-button variant="primary" loading>保存</jimble-button>`,
    リンク: html`<jimble-button href="/x">開く</jimble-button>`,
    'icon-only': html`<jimble-button icon-only aria-label="設定"
      ><svg slot="prefix" width="16" height="16" aria-hidden="true"></svg
    ></jimble-button>`,
  }
  for (const [name, template] of Object.entries(states)) {
    it(`${name}: 違反なし`, async () => {
      const el = await mount<JimbleButton>(template)
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
