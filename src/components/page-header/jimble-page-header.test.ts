import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import '../breadcrumb/jimble-breadcrumb.js'
import '../button/jimble-button.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimblePageHeader } from './jimble-page-header.js'
import './jimble-page-header.js'

afterEach(cleanup)
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const part = (el: Element, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!

async function header(attrs = '', inner = '') {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-page-header heading="注文一覧" ${attrs}>${inner}</jimble-page-header>`
  await tick()
  return { c, el: c.querySelector('jimble-page-header') as JimblePageHeader }
}

describe('jimble-page-header', () => {
  it('見出しは role=heading。level 属性で aria-level が変わる(既定 1)', async () => {
    const a = await header()
    expect(part(a.el, 'heading').getAttribute('role')).toBe('heading')
    expect(part(a.el, 'heading').getAttribute('aria-level')).toBe('1')
    expect(part(a.el, 'heading').textContent).toContain('注文一覧')
    const b = await header('level="2"')
    expect(part(b.el, 'heading').getAttribute('aria-level')).toBe('2')
  })

  it('title スロットでも見出しを書ける', async () => {
    const { el } = await header('heading=""', '<span slot="title">スロットの見出し</span>')
    expect(part(el, 'heading').querySelector('slot[name="title"]')).not.toBeNull()
  })

  it('説明・パンくず・操作は中身があるときだけ表示される', async () => {
    const empty = await header()
    for (const p of ['description', 'breadcrumb', 'actions'])
      expect(getComputedStyle(part(empty.el, p)).display, p).toBe('none')
    const full = await header(
      'description="今月の注文を確認します"',
      '<jimble-breadcrumb slot="breadcrumb"><jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item><jimble-breadcrumb-item>注文</jimble-breadcrumb-item></jimble-breadcrumb><jimble-button slot="actions" variant="primary">新規作成</jimble-button>',
    )
    await tick()
    for (const p of ['description', 'breadcrumb', 'actions'])
      expect(getComputedStyle(part(full.el, p)).display, p).not.toBe('none')
  })

  it('axe 違反なし', async () => {
    const { c } = await header(
      'description="説明"',
      '<jimble-breadcrumb slot="breadcrumb"><jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item><jimble-breadcrumb-item>注文</jimble-breadcrumb-item></jimble-breadcrumb><jimble-button slot="actions">操作</jimble-button>',
    )
    await expectNoA11yViolations(c)
  })
})
