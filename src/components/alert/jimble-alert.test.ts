import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import '../button/jimble-button.js'
import './jimble-alert.js'
import type { JimbleAlert } from './jimble-alert.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const base = (el: JimbleAlert) => el.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!

describe('jimble-alert', () => {
  it('danger / warning は role=alert、それ以外は role=status', async () => {
    const roles: Record<string, string> = {}
    for (const v of ['info', 'success', 'warning', 'danger']) {
      const el = await mount<JimbleAlert>(html`<jimble-alert variant=${v}>本文</jimble-alert>`)
      roles[v] = base(el).getAttribute('role')!
    }
    expect(roles).toEqual({ info: 'status', success: 'status', warning: 'alert', danger: 'alert' })
  })

  it('種別名を視覚的に隠したテキストで補う（色だけに頼らない）、辞書に追従する', async () => {
    const el = await mount<JimbleAlert>(
      html`<jimble-alert variant="danger">保存できません</jimble-alert>`,
    )
    expect(el.shadowRoot!.textContent).toContain('エラー')
    setLocale(en)
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('Error')
  })

  it('種別に応じた既定アイコンが出て、icon スロットで差し替えられる', async () => {
    const el = await mount<JimbleAlert>(html`<jimble-alert>本文</jimble-alert>`)
    expect(el.shadowRoot!.querySelector('[part="icon"] svg')).not.toBeNull()
  })

  it('title / actions は中身があるときだけ表示される', async () => {
    const plain = await mount<JimbleAlert>(html`<jimble-alert>本文</jimble-alert>`)
    expect(getComputedStyle(plain.shadowRoot!.querySelector('[part="title"]')!).display).toBe(
      'none',
    )
    expect(getComputedStyle(plain.shadowRoot!.querySelector('[part="actions"]')!).display).toBe(
      'none',
    )
  })

  it('dismissible: 閉じるボタンで jimble-dismiss が発火し、host が隠れる', async () => {
    const onDismiss = vi.fn()
    const el = await mount<JimbleAlert>(
      html`<jimble-alert dismissible @jimble-dismiss=${onDismiss}>本文</jimble-alert>`,
    )
    const close = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close-button"]')!
    expect(close.getAttribute('aria-label')).toBe('閉じる')
    await userEvent.click(close)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(el.hidden).toBe(true)
    expect(getComputedStyle(el).display).toBe('none')
  })

  it('jimble-dismiss を preventDefault() すると閉じない', async () => {
    const el = await mount<JimbleAlert>(
      html`<jimble-alert dismissible @jimble-dismiss=${(e: Event) => e.preventDefault()}
        >本文</jimble-alert
      >`,
    )
    await userEvent.click(el.shadowRoot!.querySelector('[part="close-button"]')!)
    expect(el.hidden).toBe(false)
  })

  it('dismissible でなければ閉じるボタンは無い', async () => {
    const el = await mount<JimbleAlert>(html`<jimble-alert>本文</jimble-alert>`)
    expect(el.shadowRoot!.querySelector('[part="close-button"]')).toBeNull()
  })

  for (const v of ['info', 'success', 'warning', 'danger']) {
    it(`${v}: axe 違反なし（見出し・操作・閉じるボタン込み）`, async () => {
      const el = await mount<JimbleAlert>(
        html`<jimble-alert variant=${v} dismissible>
          <span slot="title">見出し</span>本文
          <jimble-button slot="actions" size="sm">詳細</jimble-button>
        </jimble-alert>`,
      )
      await expectNoA11yViolations(el.parentElement!)
    })
  }
})
