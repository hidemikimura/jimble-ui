import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleNavGroup, JimbleNavItem } from './jimble-sidebar-nav.js'
import './jimble-sidebar-nav.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function nav(attrs = '', groupAttrs = '') {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-sidebar-nav ${attrs}>
    <jimble-nav-item href="/" current>ダッシュボード</jimble-nav-item>
    <jimble-nav-item href="/orders"><svg slot="icon" width="16" height="16" aria-hidden="true"></svg>注文</jimble-nav-item>
    <jimble-nav-group label="設定" ${groupAttrs}>
      <jimble-nav-item href="/settings/profile">プロフィール</jimble-nav-item>
      <jimble-nav-item href="/settings/team">チーム</jimble-nav-item>
    </jimble-nav-group>
  </jimble-sidebar-nav>`
  await tick()
  const el = c.querySelector('jimble-sidebar-nav')!
  return {
    c,
    el,
    items: [...c.querySelectorAll('jimble-nav-item')] as JimbleNavItem[],
    group: c.querySelector('jimble-nav-group') as JimbleNavGroup,
  }
}
const link = (i: Element) => i.shadowRoot!.querySelector<HTMLAnchorElement>('a')!
const gbtn = (g: JimbleNavGroup) => g.shadowRoot!.querySelector<HTMLButtonElement>('button')!

describe('jimble-sidebar-nav', () => {
  it('nav ランドマーク。名前は辞書(既定「メインメニュー」)、label で上書き', async () => {
    const { el } = await nav()
    const n = el.shadowRoot!.querySelector('nav')!
    expect(n.getAttribute('aria-label')).toBe('メインメニュー')
    setLocale(en)
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(n.getAttribute('aria-label')).toBe('Main menu')
    const b = await nav('label="設定メニュー"')
    expect(b.el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('設定メニュー')
  })

  it('項目はリンク。現在のページだけ aria-current="page" で、色が違う', async () => {
    const { items } = await nav()
    expect(link(items[0]!).getAttribute('href')).toBe('/')
    expect(link(items[0]!).getAttribute('aria-current')).toBe('page')
    expect(link(items[1]!).hasAttribute('aria-current')).toBe(false)
    expect(getComputedStyle(link(items[0]!)).backgroundColor).not.toBe(
      getComputedStyle(link(items[1]!)).backgroundColor,
    )
    expect(items[0]!.matches(':state(current)')).toBe(true)
  })

  it('icon スロットが空なら領域を取らない', async () => {
    const { items } = await nav()
    const iconBox = (i: Element) => i.shadowRoot!.querySelector<HTMLElement>('a > span')!
    expect(getComputedStyle(iconBox(items[0]!)).display).toBe('none')
    expect(getComputedStyle(iconBox(items[1]!)).display).not.toBe('none')
  })

  it('グループ: ボタンで開閉(aria-expanded / aria-controls)。開閉イベント', async () => {
    const { group } = await nav()
    const on = vi.fn()
    group.addEventListener('jimble-open', on)
    const panel = group.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('false')
    expect(getComputedStyle(panel).display).toBe('none')
    await userEvent.click(gbtn(group))
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('true')
    expect(gbtn(group).getAttribute('aria-controls')).toBe(panel.id)
    expect(getComputedStyle(panel).display).not.toBe('none')
    expect(on).toHaveBeenCalledTimes(1)
    gbtn(group).focus()
    await userEvent.keyboard('{Enter}')
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('false')
  })

  it('グループの中に現在のページがあると、最初から開いている', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-sidebar-nav><jimble-nav-group label="設定"><jimble-nav-item href="/a" current>A</jimble-nav-item></jimble-nav-group></jimble-sidebar-nav>`
    await tick()
    expect(
      gbtn(c.querySelector('jimble-nav-group') as JimbleNavGroup).getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('axe 違反なし(グループを開いた状態も)', async () => {
    const { c, group } = await nav()
    await expectNoA11yViolations(c)
    await userEvent.click(gbtn(group))
    await expectNoA11yViolations(c)
  })
})

describe('compact（アイコンだけの細い表示）', () => {
  const label = (i: Element) => i.shadowRoot!.querySelector('a > span:last-child')!
  const initial = (i: Element) => i.shadowRoot!.querySelector('[part="initial"]')

  it('compact を付けると項目に伝わり、項目名は見えなくなる（読み上げには残る）。外すと戻る', async () => {
    const { el, items } = await nav()
    expect(items.every((i) => !i.compact)).toBe(true)
    el.toggleAttribute('compact', true)
    await tick()
    expect(items.every((i) => i.compact)).toBe(true)
    // sr-only: 画面からは消えるが、アクセシビリティツリーには残る(display: none ではない)
    expect(label(items[0]!).className).toContain('sr-only')
    expect(getComputedStyle(label(items[0]!)).display).not.toBe('none')
    expect(items[0]!.textContent).toContain('ダッシュボード') // 項目名は slot された light DOM のまま
    expect(label(items[0]!).querySelector('slot')).not.toBeNull()
    el.toggleAttribute('compact', false)
    await tick()
    expect(items.every((i) => !i.compact)).toBe(true)
    expect(label(items[0]!).className).not.toContain('sr-only')
  })

  it('アイコンのない項目・グループは、頭文字を出す（読み上げからは隠す）。アイコンのある項目は出さない', async () => {
    const { items, group } = await nav('compact')
    expect(initial(items[0]!)!.textContent!.trim()).toBe('ダ')
    expect(initial(items[0]!)!.getAttribute('aria-hidden')).toBe('true')
    expect(initial(items[1]!)).toBeNull() // 注文にはアイコンがある
    expect(initial(group)!.textContent!.trim()).toBe('設')
  })

  it('グループは、子項目と開閉の矢印を隠し、開閉の状態は「閉じている」と伝える。open は覚えている', async () => {
    const { el, group } = await nav('', 'open')
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('true')
    el.toggleAttribute('compact', true)
    await tick()
    const panel = group.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    expect(getComputedStyle(panel).display).toBe('none')
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('false')
    expect(group.open).toBe(true)
    el.toggleAttribute('compact', false)
    await tick()
    expect(getComputedStyle(panel).display).not.toBe('none')
    expect(gbtn(group).getAttribute('aria-expanded')).toBe('true')
  })

  it('あとから足した項目にも、compact が伝わる', async () => {
    const { el, c } = await nav('compact')
    el.insertAdjacentHTML('beforeend', '<jimble-nav-item href="/new">新規</jimble-nav-item>')
    await tick()
    const added = c.querySelector<JimbleNavItem>('jimble-nav-item[href="/new"]')!
    expect(added.compact).toBe(true)
  })

  it('compact でも axe の違反がない', async () => {
    const { c } = await nav('compact')
    await expectNoA11yViolations(c)
  })
})
