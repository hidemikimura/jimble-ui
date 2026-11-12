import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import '../app-shell/jimble-app-shell.js'
import './jimble-banner.js'
import type { JimbleBanner } from './jimble-banner.js'
import type { JimbleAppShell } from '../app-shell/jimble-app-shell.js'

afterEach(cleanup)
const part = (el: HTMLElement, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)

describe('jimble-banner', () => {
  it('danger と warning は role="alert"、info は role="status"。種類の名前を前に付ける', async () => {
    const cases = [
      ['danger', 'alert', 'エラー'],
      ['warning', 'alert', '警告'],
      ['info', 'status', '情報'],
    ] as const
    for (const [variant, role, label] of cases) {
      const el = await mount<JimbleBanner>(
        html`<jimble-banner variant=${variant}>今夜 22 時から保守します</jimble-banner>`,
      )
      const base = part(el, 'base')!
      expect(base.getAttribute('role')).toBe(role)
      expect(base.querySelector('.sr-only')!.textContent).toBe(`${label}: `)
    }
  })

  it('塗りつぶした色にする（種類ごとに背景が違い、文字は背景と対になる色）', async () => {
    const bg = async (variant: string) => {
      const el = await mount<JimbleBanner>(
        html`<jimble-banner variant=${variant}>お知らせ</jimble-banner>`,
      )
      const style = getComputedStyle(part(el, 'base')!)
      return [style.backgroundColor, style.color]
    }
    const [info, warning, danger] = [await bg('info'), await bg('warning'), await bg('danger')]
    expect(new Set([info[0], warning[0], danger[0]]).size).toBe(3)
    expect(info[0]).not.toBe('rgba(0, 0, 0, 0)')
    // 未知の値は info
    expect(await bg('success')).toEqual(info)
  })

  it('色は CSS 変数で変えられる', async () => {
    const el = await mount<JimbleBanner>(
      html`<jimble-banner
        style="--jimble-banner-bg: rgb(1, 2, 3); --jimble-banner-text: rgb(4, 5, 6)"
        >お知らせ</jimble-banner
      >`,
    )
    const style = getComputedStyle(part(el, 'base')!)
    expect(style.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(style.color).toBe('rgb(4, 5, 6)')
  })

  it('直下のリンクは、文字の色を引き継いで下線を付ける', async () => {
    // ページの CSS が a に色を付けていても、バナーの中では文字の色になる
    const page = document.createElement('style')
    page.textContent = 'a { color: rgb(0, 0, 255); text-decoration: none }'
    document.head.append(page)
    const el = await mount<JimbleBanner>(
      html`<jimble-banner variant="danger"
        >契約が切れています。<a href="#billing">お支払いの設定</a></jimble-banner
      >`,
    )
    const link = el.querySelector('a')!
    const style = getComputedStyle(link)
    expect(style.color).toBe(getComputedStyle(part(el, 'base')!).color)
    expect(style.textDecorationLine).toContain('underline')
    page.remove()
  })

  it('dismissible で閉じるボタン。押すと jimble-dismiss を出して隠れる（取り消せる）', async () => {
    const el = await mount<JimbleBanner>(html`<jimble-banner dismissible>お知らせ</jimble-banner>`)
    const close = part(el, 'close-button') as HTMLButtonElement
    expect(close.getAttribute('aria-label')).toBe('閉じる')

    let prevent = true
    el.addEventListener('jimble-dismiss', (e) => prevent && e.preventDefault())
    close.click()
    expect(el.hidden).toBe(false)
    prevent = false
    close.click()
    expect(el.hidden).toBe(true)
    expect(el.getBoundingClientRect().height).toBe(0)

    const plain = await mount<JimbleBanner>(html`<jimble-banner>お知らせ</jimble-banner>`)
    expect(part(plain, 'close-button')).toBeNull()
  })

  it('閉じるボタンのフォーカスの輪は、文字の色', async () => {
    const el = await mount<JimbleBanner>(
      html`<jimble-banner variant="danger" dismissible>お知らせ</jimble-banner>`,
    )
    const close = part(el, 'close-button')!
    close.focus()
    const style = getComputedStyle(close)
    expect(style.outlineColor).toBe(getComputedStyle(part(el, 'base')!).color)
  })

  it('axe 違反がない（3 つの種類・リンク・操作・閉じるボタン）', async () => {
    const el = await mount<HTMLElement>(
      html`<div>
        <jimble-banner variant="info"
          >今夜 22 時から 23 時まで、保守のため止まります。</jimble-banner
        >
        <jimble-banner variant="warning" dismissible
          >契約の期限が近づいています。<a href="#plan">プランを見る</a></jimble-banner
        >
        <jimble-banner variant="danger"
          >一部の機能が使えません。<button slot="actions" type="button">
            再読み込み
          </button></jimble-banner
        >
      </div>`,
    )
    await expectNoA11yViolations(el)
  })
})

describe('jimble-app-shell の banner スロット', () => {
  it('ヘッダーの上に、幅いっぱいで置く。無ければ場所を取らない', async () => {
    const shell = await mount<JimbleAppShell>(
      html`<jimble-app-shell>
        <span slot="header">管理画面</span>
        <jimble-banner slot="banner" variant="warning">今夜、保守します</jimble-banner>
        <p>本文</p>
      </jimble-app-shell>`,
    )
    const banner = shell.querySelector('jimble-banner')!.getBoundingClientRect()
    const header = part(shell, 'header')!.getBoundingClientRect()
    const base = part(shell, 'base')!.getBoundingClientRect()
    expect(banner.bottom).toBeLessThanOrEqual(header.top + 0.5)
    expect(banner.width).toBe(base.width)

    const empty = await mount<JimbleAppShell>(
      html`<jimble-app-shell
        ><span slot="header">管理画面</span>
        <p>本文</p></jimble-app-shell
      >`,
    )
    expect(part(empty, 'banner')!.getBoundingClientRect().height).toBe(0)
    expect(part(empty, 'header')!.getBoundingClientRect().top).toBe(
      part(empty, 'base')!.getBoundingClientRect().top,
    )
  })
})
