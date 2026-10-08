import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../sidebar-nav/jimble-sidebar-nav.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleAppShell } from './jimble-app-shell.js'
import './jimble-app-shell.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
  window.scrollTo(0, 0)
  history.replaceState(null, '', location.pathname + location.search)
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
// テスト用の iframe は狭い(<48rem)。広い画面の挙動は E2E で確認する
const NARROW = !window.matchMedia('(min-width: 48rem)').matches

async function shell(
  attrs = '',
  body = '<h1>ダッシュボード</h1><button id="in-main">本文のボタン</button>',
) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-app-shell ${attrs}>
    <strong slot="header">管理画面</strong>
    <jimble-sidebar-nav slot="sidebar">
      <jimble-nav-item href="#dash" current>ダッシュボード</jimble-nav-item>
      <jimble-nav-item href="#orders">注文</jimble-nav-item>
    </jimble-sidebar-nav>
    ${body}
  </jimble-app-shell>`
  const el = c.querySelector('jimble-app-shell') as JimbleAppShell
  await el.updateComplete
  await tick()
  return { c, el }
}
const part = (el: JimbleAppShell, n: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${n}"]`)!
const drawer = (el: JimbleAppShell) => el.shadowRoot!.querySelector('dialog')!

describe('構造とランドマーク', () => {
  it('header(banner)・main・スキップリンクを持つ。ヘッダーは上に固定され、スロットの内容が入る', async () => {
    const { el } = await shell()
    expect(part(el, 'header').tagName).toBe('HEADER')
    expect(part(el, 'main').tagName).toBe('MAIN')
    expect(getComputedStyle(part(el, 'header')).position).toBe('sticky')
    expect(el.querySelector('[slot="header"]')!.getBoundingClientRect().height).toBeGreaterThan(0)
    expect(part(el, 'skip-link').textContent!.trim()).toBe('本文へ移動')
  })

  it('ヘッダーは、本文の sticky な要素(表の見出しなど)より上に出る(z-index が実際に付いている)', async () => {
    // Tailwind は、定義のないクラス(z-sticky など)の CSS を黙って出さない。計算結果で確かめる
    const { el } = await shell()
    expect(getComputedStyle(part(el, 'header')).zIndex).toBe('10')
  })

  it('ヘッダーの高さは --jimble-app-shell-header-height で変えられる(既定 3.5rem = 56px)', async () => {
    const { el } = await shell()
    expect(Math.round(part(el, 'header').getBoundingClientRect().height)).toBe(56)
    el.style.setProperty('--jimble-app-shell-header-height', '4rem')
    expect(Math.round(part(el, 'header').getBoundingClientRect().height)).toBe(64)
  })

  it('スキップリンクで本文にフォーカスが移る', async () => {
    const { el } = await shell()
    part(el, 'skip-link').focus()
    await userEvent.keyboard('{Enter}')
    expect(el.shadowRoot!.activeElement).toBe(part(el, 'main'))
  })

  it('スキップリンクは普通は見えず、フォーカスすると見える', async () => {
    const { el } = await shell()
    const link = part(el, 'skip-link')
    expect(link.getBoundingClientRect().width).toBeLessThanOrEqual(1)
    link.focus()
    await tick()
    expect(link.getBoundingClientRect().width).toBeGreaterThan(20)
  })

  it('辞書に追従する(メニューボタン・スキップリンク)', async () => {
    const { el } = await shell()
    setLocale(en)
    await el.updateComplete
    expect(part(el, 'skip-link').textContent!.trim()).toBe('Skip to content')
    if (NARROW) expect(part(el, 'menu-button').getAttribute('aria-label')).toBe('Open menu')
  })
})

describe('狭い画面: サイドバーのドロワー', () => {
  it.skipIf(!NARROW)('メニューボタンが出て、サイドバーは閉じている', async () => {
    const { el } = await shell()
    const btn = part(el, 'menu-button')
    expect(btn.getAttribute('aria-label')).toBe('メニューを開く')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(drawer(el).open).toBe(false)
    expect(getComputedStyle(part(el, 'sidebar')).display).toBe('none')
  })

  it.skipIf(!NARROW)(
    'ボタンでモーダルのドロワーが開き、サイドバーの内容が中に入る。jimble-open',
    async () => {
      const { el } = await shell()
      const on = vi.fn()
      el.addEventListener('jimble-open', on)
      await userEvent.click(part(el, 'menu-button'))
      await tick()
      expect(drawer(el).open).toBe(true)
      expect(drawer(el).matches(':modal')).toBe(true)
      expect(el.hasAttribute('sidebar-open')).toBe(true)
      expect(on).toHaveBeenCalledTimes(1)
      const nav = el.querySelector('jimble-sidebar-nav')!
      expect(nav.getBoundingClientRect().height).toBeGreaterThan(0)
      expect(
        el
          .shadowRoot!.querySelector('#drawer-host')!
          .contains(el.shadowRoot!.querySelector('slot[name="sidebar"]')),
      ).toBe(true)
      expect(drawer(el).getAttribute('aria-label')).toBe('メニューを閉じる')
    },
  )

  it.skipIf(!NARROW)(
    'ドロワーは画面の左端に付く。開いている間は背面をスクロールしない',
    async () => {
      const { el } = await shell()
      await userEvent.click(part(el, 'menu-button'))
      await tick()
      expect(Math.round(drawer(el).getBoundingClientRect().left)).toBe(0)
      expect(document.documentElement.style.overflow).toBe('hidden')
      el.close()
      await tick()
      expect(document.documentElement.style.overflow).toBe('')
    },
  )

  it.skipIf(!NARROW)(
    'Esc・閉じるボタン・背景クリック・リンクのクリックで閉じ、フォーカスはメニューボタンに戻る',
    async () => {
      const { el } = await shell()
      const btn = part(el, 'menu-button')
      const open = async () => {
        btn.focus()
        await userEvent.click(btn)
        await tick()
        expect(drawer(el).open).toBe(true)
      }
      await open()
      await userEvent.keyboard('{Escape}')
      await tick()
      expect(drawer(el).open).toBe(false)
      expect(el.shadowRoot!.activeElement).toBe(btn)

      await open()
      await userEvent.click(part(el, 'close-button'))
      await tick()
      expect(drawer(el).open).toBe(false)

      await open()
      drawer(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await tick()
      expect(drawer(el).open).toBe(false)

      await open()
      await userEvent.click(el.querySelector('jimble-nav-item[href="#orders"]')!)
      await tick()
      expect(drawer(el).open).toBe(false)
      expect(location.hash).toBe('#orders')
    },
  )

  it.skipIf(!NARROW)(
    'Tab はドロワーの中に閉じ込められる(本文のボタンにフォーカスが行かない)',
    async () => {
      const { el, c } = await shell()
      await userEvent.click(part(el, 'menu-button'))
      await tick()
      const inMain = c.querySelector<HTMLElement>('#in-main')!
      for (let i = 0; i < 6; i++) {
        await userEvent.tab()
        expect(document.activeElement).not.toBe(inMain)
      }
    },
  )

  it.skipIf(!NARROW)('ドロワーを開くと、通知の領域はドロワーの中へ移動する', async () => {
    const { toast } = await import('../toast/toast.js')
    const { el } = await shell()
    const t = toast({ message: 'x', duration: 0 })
    await userEvent.click(part(el, 'menu-button'))
    await tick(80)
    expect((t.element.parentElement as HTMLElement).parentNode).toBe(drawer(el))
    el.close()
    await tick(80)
    expect((t.element.parentElement as HTMLElement).parentElement).toBe(document.body)
    t.element.parentElement!.remove()
  })
})

describe('固定ヘッダーにフォーカスが隠れない(WCAG 2.4.11)', () => {
  it('固定ヘッダーの下に隠れる位置の要素にフォーカスすると、見える位置までスクロールが補正される', async () => {
    const { el, c } = await shell(
      '',
      '<div style="height:1500px"></div><button id="deep">深い位置のボタン</button><div style="height:1500px"></div>',
    )
    const button = c.querySelector<HTMLElement>('#deep')!
    button.scrollIntoView({ block: 'start' }) // ヘッダーの真下(=隠れる位置)に来る
    await tick()
    const headerBottom = part(el, 'header').getBoundingClientRect().bottom
    expect(button.getBoundingClientRect().top).toBeLessThan(headerBottom)
    button.focus({ preventScroll: true })
    await tick(100)
    expect(button.getBoundingClientRect().top).toBeGreaterThanOrEqual(headerBottom)
  })
})

describe('アクセシビリティ(axe)', () => {
  it('閉じた状態・ドロワーを開いた状態で違反なし', async () => {
    const { c, el } = await shell()
    await expectNoA11yViolations(c)
    if (NARROW) {
      await userEvent.click(part(el, 'menu-button'))
      await tick()
      await expectNoA11yViolations(el)
    }
  })
})

describe('サイドバーの幅の切り替え（sidebar-collapsible）', () => {
  // テスト用の iframe は狭いので、広い画面の状態(wide)を直接立てて、ロジックだけを確かめる。
  // 見た目(幅・重なり)は、広い画面の E2E で確かめる
  const nav = (el: JimbleAppShell) =>
    el.querySelector('jimble-sidebar-nav') as HTMLElement & { compact: boolean }
  const toggle = (el: JimbleAppShell) =>
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle-button"]')
  const sidebar = (el: JimbleAppShell) => el.shadowRoot!.querySelector<HTMLElement>('#sidebar')!
  const wideShell = async (attrs = 'sidebar-collapsible') => {
    const { el } = await shell(attrs)
    el.wide = true
    await el.updateComplete
    return el
  }
  const enter = (el: JimbleAppShell, pointerType = 'mouse') =>
    sidebar(el).dispatchEvent(new PointerEvent('pointerenter', { pointerType }))

  it('sidebar-collapsible がなければ、切り替えボタンは出ない。あれば広い画面だけに出る', async () => {
    const plain = await wideShell('')
    expect(toggle(plain)).toBeNull()
    cleanup()
    const el = await wideShell()
    expect(toggle(el)).not.toBeNull()
    el.wide = false
    await el.updateComplete
    expect(toggle(el)).toBeNull() // 狭い画面は、ドロワーを開くボタン
    expect(el.shadowRoot!.querySelector('[part="menu-button"]')).not.toBeNull()
  })

  it('ボタンで細い / 広いが切り替わり、aria-expanded・jimble-sidebar-toggle・nav の compact が追従する', async () => {
    const el = await wideShell()
    const onToggle = vi.fn()
    el.addEventListener('jimble-sidebar-toggle', (e) => onToggle((e as CustomEvent).detail))
    expect(toggle(el)!.getAttribute('aria-expanded')).toBe('true')
    expect(toggle(el)!.getAttribute('aria-label')).toBe('サイドバーの幅を切り替え')
    expect(nav(el).compact).toBe(false)
    toggle(el)!.click()
    await el.updateComplete
    expect(el.hasAttribute('sidebar-collapsed')).toBe(true)
    expect(toggle(el)!.getAttribute('aria-expanded')).toBe('false')
    expect(nav(el).compact).toBe(true)
    expect(onToggle).toHaveBeenLastCalledWith({ collapsed: true })
    toggle(el)!.click()
    await el.updateComplete
    expect(nav(el).compact).toBe(false)
    expect(onToggle).toHaveBeenLastCalledWith({ collapsed: false })
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('sidebar-collapsed の初期値は、イベントを出さずに反映される', async () => {
    const onToggle = vi.fn()
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.addEventListener('jimble-sidebar-toggle', onToggle)
    c.innerHTML = `<jimble-app-shell sidebar-collapsible sidebar-collapsed>
      <jimble-sidebar-nav slot="sidebar"><jimble-nav-item href="#">A</jimble-nav-item></jimble-sidebar-nav>
    </jimble-app-shell>`
    const el = c.querySelector('jimble-app-shell') as JimbleAppShell
    el.wide = true
    await el.updateComplete
    await tick()
    expect(nav(el).compact).toBe(true)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('細い表示でマウスを重ねると、少し待って広がり（nav は compact でなくなる）、離れると戻る', async () => {
    const el = await wideShell('sidebar-collapsible sidebar-collapsed')
    expect(nav(el).compact).toBe(true)
    enter(el)
    await vi.waitFor(() => expect(el.peek).toBe(true), { timeout: 3000 })
    await el.updateComplete
    expect(nav(el).compact).toBe(false)
    sidebar(el).dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await vi.waitFor(() => expect(el.peek).toBe(false), { timeout: 3000 })
    await el.updateComplete
    expect(nav(el).compact).toBe(true)
  })

  it('通り過ぎただけ(すぐ離れる)では広がらない。タッチのホバーでは広がらない', async () => {
    const el = await wideShell('sidebar-collapsible sidebar-collapsed')
    enter(el)
    sidebar(el).dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await tick(300)
    expect(el.peek).toBe(false)
    enter(el, 'touch')
    await tick(300)
    expect(el.peek).toBe(false)
  })

  it('広い表示に戻すと、広げて見せる状態も終わる。狭い画面では、折りたたんでいても細くならない', async () => {
    const el = await wideShell('sidebar-collapsible sidebar-collapsed')
    enter(el)
    await vi.waitFor(() => expect(el.peek).toBe(true), { timeout: 3000 })
    el.sidebarCollapsed = false
    await el.updateComplete
    await vi.waitFor(() => expect(el.peek).toBe(false))
    el.sidebarCollapsed = true
    el.wide = false
    await el.updateComplete
    await tick()
    expect(nav(el).compact).toBe(false) // ドロワーは常に項目名つき
  })

  it('axe の違反がない（細い表示・広がった表示）', async () => {
    const el = await wideShell('sidebar-collapsible sidebar-collapsed')
    await expectNoA11yViolations(el)
    enter(el)
    await vi.waitFor(() => expect(el.peek).toBe(true), { timeout: 3000 })
    await tick(300)
    await expectNoA11yViolations(el)
  })
})
