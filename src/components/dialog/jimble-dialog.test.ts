import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import '../input/jimble-input.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleDialog } from './jimble-dialog.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
  document.documentElement.removeAttribute('style')
})

const native = (el: JimbleDialog) => el.shadowRoot!.querySelector('dialog')!
const part = (el: JimbleDialog, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function dlg(
  attrs = '',
  inner = '<p>本文</p><jimble-button slot="footer" data-dialog-close>閉じる</jimble-button>',
) {
  const c = await mount<HTMLElement>(
    html`<div><button id="opener">開く</button><button id="outside">外</button></div>`,
  )
  const host = document.createElement('div')
  host.innerHTML = `<jimble-dialog heading="確認" ${attrs}>${inner}</jimble-dialog>`
  c.append(host)
  const el = host.firstElementChild as JimbleDialog
  await el.updateComplete
  return {
    c,
    el,
    opener: c.querySelector<HTMLElement>('#opener')!,
    outside: c.querySelector<HTMLElement>('#outside')!,
  }
}

describe('開閉', () => {
  it('show() でモーダルとして開き(:modal)、hide() で閉じる。open 属性が同期する', async () => {
    const { el } = await dlg()
    expect(native(el).open).toBe(false)
    el.show()
    await el.updateComplete
    expect(native(el).open).toBe(true)
    expect(native(el).matches(':modal')).toBe(true)
    expect(el.hasAttribute('open')).toBe(true)
    el.hide()
    await el.updateComplete
    await tick()
    expect(native(el).open).toBe(false)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('open 属性を付けて描画すると開く', async () => {
    const { el } = await dlg('open')
    await tick()
    expect(native(el).open).toBe(true)
  })

  it('jimble-open / jimble-close(reason)が発火する', async () => {
    const { el } = await dlg()
    const onOpen = vi.fn()
    const onClose = vi.fn()
    el.addEventListener('jimble-open', onOpen)
    el.addEventListener('jimble-close', onClose)
    el.show()
    await tick()
    expect(onOpen).toHaveBeenCalledTimes(1)
    el.hide()
    await tick()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect((onClose.mock.calls[0]![0] as CustomEvent).detail).toEqual({ reason: 'api' })
  })

  it('背面は inert になり、フォーカスできない', async () => {
    const { el, outside } = await dlg()
    el.show()
    await tick()
    outside.focus()
    expect(document.activeElement).not.toBe(outside)
  })

  it('開いている間は背面のスクロールを止め、閉じたら戻す。重なっても壊れない', async () => {
    const a = await dlg()
    const b = await dlg()
    a.el.show()
    await tick()
    expect(document.documentElement.style.overflow).toBe('hidden')
    b.el.show()
    await tick()
    b.el.hide()
    await tick()
    expect(document.documentElement.style.overflow).toBe('hidden')
    a.el.hide()
    await tick()
    expect(document.documentElement.style.overflow).toBe('')
  })
})

describe('名前とロール', () => {
  it('heading が名前になる。alert は alertdialog で説明が付く', async () => {
    const { el } = await dlg()
    const labelled = native(el).getAttribute('aria-labelledby')!
    expect(el.shadowRoot!.getElementById(labelled)!.textContent).toContain('確認')
    const a = await dlg('alert')
    expect(native(a.el).getAttribute('role')).toBe('alertdialog')
    expect(native(a.el).getAttribute('aria-describedby')).toBeTruthy()
  })

  it('title スロットでも名前が付く(同じ root の h2 を参照)', async () => {
    const c = await mount<HTMLElement>(
      html`<div>
        <jimble-dialog><span slot="title">スロットの見出し</span>本文</jimble-dialog>
      </div>`,
    )
    const el = c.querySelector('jimble-dialog') as JimbleDialog
    await el.updateComplete
    expect(
      el
        .shadowRoot!.getElementById(native(el).getAttribute('aria-labelledby')!)!
        .querySelector('slot'),
    ).not.toBeNull()
  })

  it('名前が無いと開発時に警告する', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mount(html`<jimble-dialog>本文</jimble-dialog>`)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('名前'))
    warn.mockRestore()
  })

  it('閉じるボタンの名前は辞書から、hide-close-button で消せる', async () => {
    const { el } = await dlg()
    expect(part(el, 'close-button').getAttribute('aria-label')).toBe('閉じる')
    setLocale(en)
    await el.updateComplete
    expect(part(el, 'close-button').getAttribute('aria-label')).toBe('Close')
    const h = await dlg('hide-close-button')
    expect(h.el.shadowRoot!.querySelector('[part="close-button"]')).toBeNull()
  })
})

describe('閉じる操作と jimble-close-request', () => {
  it('Esc: close-request(escape)が出て閉じる。preventDefault() すると閉じない', async () => {
    const { el } = await dlg()
    const onReq = vi.fn()
    el.addEventListener('jimble-close-request', onReq)
    el.show()
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(onReq).toHaveBeenCalledTimes(1)
    expect((onReq.mock.calls[0]![0] as CustomEvent).detail).toEqual({ reason: 'escape' })
    expect(native(el).open).toBe(false)

    const keep = await dlg()
    keep.el.addEventListener('jimble-close-request', (e) => e.preventDefault())
    keep.el.show()
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(native(keep.el).open).toBe(true)
  })

  it('IME の変換中の cancel(Esc)では閉じない。変換が終われば閉じる(R6)', async () => {
    const { el } = await dlg('', '<jimble-input aria-label="名前"></jimble-input>')
    el.show()
    await tick()
    const input = el.querySelector('jimble-input')!.shadowRoot!.querySelector('input')!
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }))
    const cancel = new Event('cancel', { cancelable: true })
    native(el).dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(native(el).open).toBe(true)
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }))
    await tick()
    native(el).dispatchEvent(new Event('cancel', { cancelable: true }))
    await tick()
    expect(native(el).open).toBe(false)
  })

  it('背景クリック: 押下と解放の両方が背景上のときだけ閉じる', async () => {
    const { el } = await dlg()
    el.show()
    await tick()
    const d = native(el)
    // パネル内で押して、背景で離す(ドラッグ) → 閉じない
    part(el, 'panel').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true }),
    )
    d.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await tick()
    expect(d.open).toBe(true)
    // 背景で押して背景で離す → 閉じる
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    d.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await tick()
    expect(d.open).toBe(false)
  })

  it('static-backdrop と alert は背景クリックで閉じない', async () => {
    for (const attrs of ['static-backdrop', 'alert']) {
      const { el } = await dlg(attrs)
      el.show()
      await tick()
      native(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
      native(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await tick()
      expect(native(el).open).toBe(true)
    }
  })

  it('閉じるボタンと data-dialog-close で閉じる(reason: action)', async () => {
    const { el } = await dlg()
    const onClose = vi.fn()
    el.addEventListener('jimble-close', onClose)
    el.show()
    await tick()
    await userEvent.click(part(el, 'close-button'))
    await tick()
    expect(native(el).open).toBe(false)
    el.show()
    await tick()
    await userEvent.click(el.querySelector('[data-dialog-close]')!)
    await tick()
    expect(native(el).open).toBe(false)
    expect(onClose.mock.calls.map((c) => (c[0] as CustomEvent).detail.reason)).toEqual([
      'action',
      'action',
    ])
  })
})

describe('フォーカス', () => {
  it('閉じたら、開く前にフォーカスしていた要素に戻る', async () => {
    const { el, opener } = await dlg()
    opener.focus()
    el.show()
    await tick()
    expect(document.activeElement).not.toBe(opener)
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(document.activeElement).toBe(opener)
  })

  it('autofocus を付けた要素があれば最初にフォーカスされる', async () => {
    const { el } = await dlg('', '<jimble-button id="ok" autofocus>OK</jimble-button>')
    el.show()
    await tick()
    expect(document.activeElement).toBe(el.querySelector('#ok'))
  })

  it('Tab で背後の要素にフォーカスが移らない（ダイアログの中、またはブラウザ本体の UI へ）', async () => {
    const { el, outside, opener } = await dlg(
      '',
      '<jimble-button>A</jimble-button><jimble-button>B</jimble-button>',
    )
    el.show()
    await tick()
    for (let i = 0; i < 8; i++) {
      await userEvent.tab()
      expect(document.activeElement, `Tab ${i + 1} 回目`).not.toBe(outside)
      expect(document.activeElement).not.toBe(opener)
    }
  })
})

describe('見た目', () => {
  it('幅は min(画面幅 - 2rem, 24 / 32 / 42rem)', async () => {
    for (const [size, rem] of [
      ['sm', 24],
      ['md', 32],
      ['lg', 42],
    ] as const) {
      const { el } = await dlg(`size="${size}"`)
      el.show()
      await tick()
      const expected = Math.min(window.innerWidth - 32, rem * 16)
      expect(Math.round(native(el).getBoundingClientRect().width), size).toBe(Math.round(expected))
      el.hide()
      await tick()
    }
  })

  it('面に影と ring が効く(Shadow DOM のスタイル)', async () => {
    const { el } = await dlg()
    el.show()
    await tick()
    const s = getComputedStyle(part(el, 'panel'))
    expect(s.boxShadow).toContain('inset')
  })
})

describe('アクセシビリティ(axe)', () => {
  for (const [name, attrs] of Object.entries({
    通常: '',
    alert: 'alert',
    'hide-close-button': 'hide-close-button',
  })) {
    it(`${name}: 開いた状態で違反なし`, async () => {
      const { el } = await dlg(attrs)
      el.show()
      await tick()
      await expectNoA11yViolations(el)
    })
  }
})
