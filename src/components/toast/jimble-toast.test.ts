import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../dialog/jimble-dialog.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup } from '../../test/mount.js'
import type { JimbleDialog } from '../dialog/jimble-dialog.js'
import type { JimbleToastRegion } from './jimble-toast-region.js'
import { toast } from './toast.js'

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const region = () => document.querySelector<JimbleToastRegion>('jimble-toast-region')!

afterEach(() => {
  cleanup()
  document.querySelectorAll('jimble-toast-region').forEach((r) => r.remove())
  ;(globalThis as Record<symbol, unknown>)[Symbol.for('jimble-ui.toast-region')] = undefined
  setLocale({ $locale: 'ja' })
  document.documentElement.removeAttribute('style')
})

describe('toast()', () => {
  it('body にリージョンを作り、トップレイヤー(popover=manual)に常に表示する。通知は polite に入る', async () => {
    const h = toast('保存しました')
    await tick()
    expect(region().parentElement).toBe(document.body)
    const base = region().shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    expect(base.matches(':popover-open')).toBe(true)
    expect(h.element.slot).toBe('polite')
    expect(h.element.textContent).toContain('保存しました')
    expect(region().shadowRoot!.querySelector('[role="status"]')).not.toBeNull()
    expect(region().shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('リージョンは1つだけ。warning / danger は assertive、それ以外は polite', async () => {
    const a = toast({ message: 'a', variant: 'success' })
    const b = toast({ message: 'b', variant: 'warning' })
    const c = toast.danger('c')
    expect(document.querySelectorAll('jimble-toast-region')).toHaveLength(1)
    expect([a.element.slot, b.element.slot, c.element.slot]).toEqual([
      'polite',
      'assertive',
      'assertive',
    ])
    await tick()
    // 種別名を視覚的に隠したテキストで補う
    expect(c.element.shadowRoot!.textContent).toContain('エラー')
  })

  it('見出し・ショートカット(toast.success など)', async () => {
    const h = toast.success('完了', { heading: '保存' })
    await tick()
    expect(h.element.variant).toBe('success')
    expect(h.element.querySelector('[slot="title"]')!.textContent).toBe('保存')
  })

  it('duration を過ぎると自動で消える。jimble-dismiss が発火する', async () => {
    const onDismiss = vi.fn()
    const h = toast({ message: 'x', duration: 80 })
    h.element.addEventListener('jimble-dismiss', onDismiss)
    await tick(20)
    expect(h.element.isConnected).toBe(true)
    await tick(150)
    expect(h.element.isConnected).toBe(false)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('マウスが乗っている間は止まり、離れると残り時間で消える', async () => {
    const h = toast({ message: 'x', duration: 150 })
    await tick(30)
    h.element.dispatchEvent(new PointerEvent('pointerenter'))
    await tick(300)
    expect(h.element.isConnected).toBe(true)
    h.element.dispatchEvent(new PointerEvent('pointerleave'))
    await tick(60)
    expect(h.element.isConnected).toBe(true) // 残りはまだ ~120ms
    await tick(200)
    expect(h.element.isConnected).toBe(false)
  })

  it('danger と、操作(action)付きの通知は自動では消えない', async () => {
    const d = toast.danger('失敗')
    const onClick = vi.fn()
    const a = toast({ message: '削除しました', action: { label: '元に戻す', onClick } })
    await tick(120)
    expect(d.element.isConnected).toBe(true)
    expect(a.element.isConnected).toBe(true)
    const button = a.element.querySelector('jimble-button')!
    await userEvent.click(button)
    await tick()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(a.element.isConnected).toBe(false)
  })

  it('duration: 0 は自動で消えない。閉じるボタンと dismiss() で閉じる', async () => {
    const a = toast({ message: 'a', duration: 0 })
    const b = toast({ message: 'b', duration: 0 })
    await tick(100)
    expect(a.element.isConnected).toBe(true)
    const close = a.element.shadowRoot!.querySelector<HTMLElement>('[part="close-button"]')!
    expect(close.getAttribute('aria-label')).toBe('通知を閉じる')
    await userEvent.click(close)
    expect(a.element.isConnected).toBe(false)
    b.dismiss()
    expect(b.element.isConnected).toBe(false)
  })

  it('dismissible: false なら閉じるボタンを出さない', async () => {
    const h = toast({ message: 'x', duration: 0, dismissible: false })
    await tick()
    expect(h.element.shadowRoot!.querySelector('[part="close-button"]')).toBeNull()
  })

  it('閉じるボタンの名前は辞書に追従する', async () => {
    const h = toast({ message: 'x', duration: 0 })
    setLocale(en)
    await h.element.updateComplete
    expect(
      h.element.shadowRoot!.querySelector('[part="close-button"]')!.getAttribute('aria-label'),
    ).toBe('Dismiss notification')
  })
})

describe('位置と見た目', () => {
  it('既定は右下。placement で変えられる', async () => {
    toast({ message: 'x', duration: 0 })
    await tick()
    const base = region().shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    const r = base.getBoundingClientRect()
    expect(Math.round(r.right)).toBe(window.innerWidth)
    expect(Math.round(r.bottom)).toBe(window.innerHeight)
    region().placement = 'top-start'
    await region().updateComplete
    const t = base.getBoundingClientRect()
    expect(Math.round(t.left)).toBe(0)
    expect(Math.round(t.top)).toBe(0)
  })

  it('面に影と ring が効く(Shadow DOM のスタイル)', async () => {
    const h = toast({ message: 'x', duration: 0 })
    await tick()
    const base = h.element.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    expect(getComputedStyle(base).boxShadow).toContain('inset')
  })
})

describe('モーダルの dialog との関係(R4)', () => {
  // dialog の中(Shadow DOM の内側)に移ったリージョンは document.querySelector では見つからないので、通知の親から辿る
  const regionOf = (t: { element: HTMLElement }) => t.element.parentElement as JimbleToastRegion

  it('dialog が開いている間、リージョンは dialog の中へ移動し、操作できる。閉じたら body へ戻る', async () => {
    const c = document.createElement('div')
    c.innerHTML = '<jimble-dialog heading="確認">本文</jimble-dialog>'
    document.body.append(c)
    const dlg = c.firstElementChild as JimbleDialog
    await dlg.updateComplete
    const first = toast({ message: '先に出した通知', duration: 0 })
    await tick()
    expect(regionOf(first).parentElement).toBe(document.body)

    dlg.show()
    await tick(80)
    const native = dlg.shadowRoot!.querySelector('dialog')!
    expect(regionOf(first).parentNode).toBe(native)

    // モーダルの中に移ったので、通知は inert ではなく実際に押せる
    const h = toast({ message: 'ダイアログ内の通知', duration: 0 })
    await tick()
    expect(regionOf(h)).toBe(regionOf(first))
    const close = h.element.shadowRoot!.querySelector<HTMLElement>('[part="close-button"]')!
    await userEvent.click(close)
    await tick()
    expect(h.element.isConnected).toBe(false)

    dlg.hide()
    await tick(80)
    expect(regionOf(first).parentElement).toBe(document.body)
    // 元の場所へ戻ったあとも、通知は実際に見えている(ポップオーバーが再表示されている)
    expect(
      regionOf(first).shadowRoot!.querySelector('[part="base"]')!.matches(':popover-open'),
    ).toBe(true)
    expect(first.element.getBoundingClientRect().height).toBeGreaterThan(0)
    expect(first.element.isConnected).toBe(true)
    c.remove()
  })

  it('モーダルが開いている最中に、最初の通知(=リージョンの新規作成)を出しても、dialog の中に入る', async () => {
    const c = document.createElement('div')
    c.innerHTML = '<jimble-dialog heading="確認">本文</jimble-dialog>'
    document.body.append(c)
    const dlg = c.firstElementChild as JimbleDialog
    await dlg.updateComplete
    dlg.show()
    await tick(80)
    expect(document.querySelector('jimble-toast-region')).toBeNull()
    const h = toast({ message: '開いた後に出した通知', duration: 0 })
    await tick(80)
    expect(regionOf(h).parentNode).toBe(dlg.shadowRoot!.querySelector('dialog'))
    await userEvent.click(h.element.shadowRoot!.querySelector('[part="close-button"]')!)
    await tick()
    expect(h.element.isConnected).toBe(false)
    dlg.hide()
    await tick(80)
    c.remove()
  })

  it('モーダルが重なっても、いちばん上のモーダルへ移る', async () => {
    const c = document.createElement('div')
    c.innerHTML =
      '<jimble-dialog heading="A">a</jimble-dialog><jimble-dialog heading="B">b</jimble-dialog>'
    document.body.append(c)
    const [a, b] = [...c.children] as JimbleDialog[]
    await a!.updateComplete
    const t = toast({ message: 'x', duration: 0 })
    a!.show()
    await tick(60)
    b!.show()
    await tick(60)
    expect(regionOf(t).parentNode).toBe(b!.shadowRoot!.querySelector('dialog'))
    b!.hide()
    await tick(60)
    expect(regionOf(t).parentNode).toBe(a!.shadowRoot!.querySelector('dialog'))
    a!.hide()
    await tick(60)
    expect(regionOf(t).parentElement).toBe(document.body)
    c.remove()
  })
})

describe('アクセシビリティ(axe)', () => {
  it('通知を表示した状態で違反なし', async () => {
    toast({ message: '保存しました', variant: 'success', heading: '完了' })
    toast({ message: '削除できません', variant: 'danger', action: { label: '詳細' } })
    await tick(80)
    await expectNoA11yViolations(region())
  })
})
