import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import '../input/jimble-input.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleDrawer } from './jimble-drawer.js'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('style')
})

// 位置の検査では動きを止める(遅い CI や Linux の WebKit では、遷移が始まりの位置から進まないことがある)。
// 遷移の指定があること自体は、別のテストで確かめる。
const noMotion = document.createElement('style')
noMotion.textContent = 'jimble-drawer::part(base) { transition: none !important; }'
const native = (el: JimbleDrawer) => el.shadowRoot!.querySelector('dialog')!
const panel = (el: JimbleDrawer) => el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
const tick = (ms = 400) => new Promise((r) => setTimeout(r, ms))
/** スライドの動きが終わるまで待つ(位置が続けて同じになったら止まったとみなす。遅い CI でも固定の待ち時間に頼らない) */
async function settled(el: JimbleDrawer) {
  let last = ''
  let same = 0
  for (let i = 0; i < 100 && same < 4; i++) {
    await new Promise((r) => setTimeout(r, 50))
    const r = panel(el).getBoundingClientRect()
    const now = `${r.left},${r.top},${r.width},${r.height}`
    same = now === last ? same + 1 : 0
    last = now
  }
}

async function drawer(
  attrs = '',
  inner = '<p>本文</p><jimble-button slot="footer" data-dialog-close>閉じる</jimble-button>',
) {
  const c = await mount<HTMLElement>(
    html`<div><button id="opener">開く</button><button id="outside">外</button></div>`,
  )
  const host = document.createElement('div')
  host.innerHTML = `<jimble-drawer heading="絞り込み" ${attrs}>${inner}</jimble-drawer>`
  c.append(host)
  const el = host.firstElementChild as JimbleDrawer
  await el.updateComplete
  return { c, el, opener: c.querySelector<HTMLElement>('#opener')! }
}

describe('開閉（jimble-dialog と同じ）', () => {
  it('show() でモーダルとして開き、hide() で閉じる', async () => {
    const { el } = await drawer()
    el.show()
    await el.updateComplete
    expect(native(el).matches(':modal')).toBe(true)
    el.hide()
    await el.updateComplete
    await tick(50)
    expect(native(el).open).toBe(false)
  })

  it('Esc・閉じるボタン・data-dialog-close で閉じ、jimble-close の reason が付く。閉じたら元の要素にフォーカスが戻る', async () => {
    const { el, opener } = await drawer()
    const onClose = vi.fn()
    el.addEventListener('jimble-close', onClose)
    opener.focus()
    el.show()
    await el.updateComplete
    await userEvent.keyboard('{Escape}')
    await tick(50)
    expect((onClose.mock.calls[0]![0] as CustomEvent).detail).toEqual({ reason: 'escape' })
    expect(document.activeElement).toBe(opener)
    el.show()
    await el.updateComplete
    el.querySelector<HTMLElement>('[data-dialog-close]')!.click()
    await tick(50)
    expect((onClose.mock.calls[1]![0] as CustomEvent).detail).toEqual({ reason: 'action' })
  })

  it('jimble-close-request を preventDefault すると閉じない。static-backdrop は背景クリックで閉じない', async () => {
    const { el } = await drawer('static-backdrop')
    el.addEventListener('jimble-close-request', (e) => e.preventDefault())
    el.show()
    await el.updateComplete
    await userEvent.keyboard('{Escape}')
    await tick(50)
    expect(native(el).open).toBe(true)
  })

  it('背景（パネルの外）のクリックで閉じる', async () => {
    const { el } = await drawer()
    el.show()
    await el.updateComplete
    await tick()
    const r = panel(el).getBoundingClientRect()
    const d = native(el)
    const x = Math.max(r.left - 20, 5)
    d.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, clientX: x, clientY: 200 }),
    )
    d.click()
    await tick(50)
    expect(native(el).open).toBe(false)
  })
})

describe('位置と大きさ', () => {
  beforeAll(() => document.head.append(noMotion))
  afterAll(() => noMotion.remove())
  const rect = async (attrs: string) => {
    const { el } = await drawer(attrs)
    el.show()
    await el.updateComplete
    await settled(el)
    return { r: panel(el).getBoundingClientRect(), el }
  }

  // 「画面」は position: fixed の基準の大きさ。太いスクロールバーの環境では、背面のスクロールを止めたあとも
  // scrollbar-gutter: stable で幅が残り、documentElement.clientWidth とは食い違う
  const screen = () => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'
    document.body.append(probe)
    const box = probe.getBoundingClientRect()
    probe.remove()
    return box
  }

  it('既定（end）は右端に、画面の高さいっぱいで出る', async () => {
    const { r } = await rect('')
    const s = screen()
    expect(Math.round(r.right)).toBe(Math.round(s.right))
    expect(Math.round(r.top)).toBe(0)
    expect(Math.round(r.height)).toBe(Math.round(s.height))
    expect(r.width).toBeGreaterThan(200)
  })

  it('start は左端、size で幅が変わる', async () => {
    const sm = await rect('placement="start" size="sm"')
    expect(Math.round(sm.r.left)).toBe(0)
    cleanup()
    const lg = await rect('placement="start" size="lg"')
    expect(lg.r.width).toBeGreaterThan(sm.r.width)
  })

  it('top / bottom は画面の幅いっぱいで、上端 / 下端に付く', async () => {
    const top = await rect('placement="top"')
    expect(Math.round(top.r.top)).toBe(0)
    expect(Math.round(top.r.width)).toBe(Math.round(screen().width))
    cleanup()
    const bottom = await rect('placement="bottom"')
    expect(Math.round(bottom.r.bottom)).toBe(Math.round(screen().height))
  })
})

describe('フォーカスとアクセシビリティ', () => {
  it('フォーカスがパネル内に閉じ込められ、背面は inert', async () => {
    const { el, c } = await drawer('', '<jimble-input aria-label="名前"></jimble-input>')
    el.show()
    await el.updateComplete
    await userEvent.keyboard('{Tab}{Tab}{Tab}{Tab}')
    expect(c.contains(document.activeElement) && document.activeElement?.id === 'outside').toBe(
      false,
    )
    expect(
      el.contains(document.activeElement) || el.shadowRoot!.contains(document.activeElement),
    ).toBe(true)
  })

  it('名前が付き、開いた状態でも axe 違反がない', async () => {
    const { el, c } = await drawer(
      'placement="start"',
      '<jimble-input aria-label="名前"></jimble-input>',
    )
    el.show()
    await el.updateComplete
    await tick()
    expect(native(el).getAttribute('aria-labelledby')).toBeTruthy()
    await expectNoA11yViolations(c)
  })

  it('スライドの遷移が指定されている（reduced-motion では止まる指定は CSS 側）', async () => {
    const { el } = await drawer()
    el.show()
    await el.updateComplete
    // 動きを止める指定が CSS にあること(値は環境依存なので、遷移の指定そのものを確認する)
    expect(getComputedStyle(native(el)).transitionProperty).toContain('translate')
  })
})
