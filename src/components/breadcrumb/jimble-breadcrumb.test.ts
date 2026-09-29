import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleBreadcrumb } from './jimble-breadcrumb.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function crumbs(attrs = '') {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-breadcrumb ${attrs}>
    <jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item>
    <jimble-breadcrumb-item href="/orders">注文</jimble-breadcrumb-item>
    <jimble-breadcrumb-item>注文 #1024</jimble-breadcrumb-item>
  </jimble-breadcrumb>`
  const el = c.querySelector('jimble-breadcrumb') as JimbleBreadcrumb
  await tick()
  return { c, el, items: [...c.querySelectorAll('jimble-breadcrumb-item')] }
}
const part = (el: Element, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)

describe('jimble-breadcrumb', () => {
  it('nav ランドマークで、名前は辞書(日本語 → 英語に追従)。label 属性で上書きできる', async () => {
    const { el } = await crumbs()
    expect(part(el, 'base')!.tagName).toBe('NAV')
    expect(part(el, 'base')!.getAttribute('aria-label')).toBe('パンくずリスト')
    setLocale(en)
    await el.updateComplete
    expect(part(el, 'base')!.getAttribute('aria-label')).toBe('Breadcrumb')
    const b = await crumbs('label="場所"')
    expect(part(b.el, 'base')!.getAttribute('aria-label')).toBe('場所')
  })

  it('href のある項目はリンク。最後の項目(href なし)は現在のページ(aria-current)', async () => {
    const { items } = await crumbs()
    expect(part(items[0]!, 'link')!.getAttribute('href')).toBe('/')
    expect(part(items[1]!, 'link')!.getAttribute('href')).toBe('/orders')
    expect(part(items[2]!, 'link')).toBeNull()
    expect(part(items[2]!, 'current')!.getAttribute('aria-current')).toBe('page')
  })

  it('current 属性で、href があっても現在のページにできる', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-breadcrumb><jimble-breadcrumb-item href="/a" current>A</jimble-breadcrumb-item><jimble-breadcrumb-item href="/b">B</jimble-breadcrumb-item></jimble-breadcrumb>`
    await tick()
    const first = c.querySelector('jimble-breadcrumb-item')!
    expect(part(first, 'link')).toBeNull()
    expect(part(first, 'current')!.getAttribute('aria-current')).toBe('page')
  })

  it('区切りは最初の項目には出ず、装飾(aria-hidden)である', async () => {
    const { items } = await crumbs()
    expect(getComputedStyle(part(items[0]!, 'separator')!).display).toBe('none')
    expect(getComputedStyle(part(items[1]!, 'separator')!).display).not.toBe('none')
    expect(part(items[1]!, 'separator')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('axe 違反なし', async () => {
    const { c } = await crumbs()
    await expectNoA11yViolations(c)
  })
})
