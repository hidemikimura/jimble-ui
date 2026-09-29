import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-description-list.js'

afterEach(cleanup)
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function list(attrs = '') {
  const c = await mount<HTMLElement>(html`<div style="width:600px"></div>`)
  c.innerHTML = `<jimble-description-list ${attrs}>
    <jimble-description-item label="氏名">山田 太郎</jimble-description-item>
    <jimble-description-item><span slot="label">メール</span><a href="mailto:taro@example.com">taro@example.com</a></jimble-description-item>
    <jimble-description-item label="登録日">2026-09-29</jimble-description-item>
  </jimble-description-list>`
  await tick()
  const el = c.querySelector('jimble-description-list')!
  return { c, el, items: [...c.querySelectorAll('jimble-description-item')] }
}
const label = (i: Element) => i.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
const value = (i: Element) => i.shadowRoot!.querySelector<HTMLElement>('[part="value"]')!

describe('jimble-description-list', () => {
  it('項目名は term、値は definition の役割。label 属性でも label スロットでも書ける', async () => {
    const { items } = await list()
    expect(label(items[0]!).getAttribute('role')).toBe('term')
    expect(value(items[0]!).getAttribute('role')).toBe('definition')
    expect(label(items[0]!).textContent!.trim()).toBe('氏名')
    expect(items[1]!.querySelector('[slot="label"]')!.textContent).toBe('メール')
    expect(label(items[1]!).querySelector('slot[name="label"]')).not.toBeNull()
  })

  it('項目は自分の箱を持たず(display: contents)、項目名と値が親のグリッドに参加する', async () => {
    const { el, items } = await list()
    expect(getComputedStyle(el).display).toBe('grid')
    expect(getComputedStyle(items[0]!).display).toBe('contents')
    // 同じ項目の名前と値は同じ行(上端がそろう)か、狭い画面では縦に並ぶ
    const l = label(items[0]!).getBoundingClientRect()
    const v = value(items[0]!).getBoundingClientRect()
    expect(v.top >= l.top).toBe(true)
  })

  it('項目名と値に区切り線(inset の影)が付く', async () => {
    const { items } = await list()
    expect(getComputedStyle(value(items[0]!)).boxShadow).toContain('inset')
  })

  it('layout="vertical" は常に 1 列', async () => {
    const { el } = await list('layout="vertical"')
    expect(getComputedStyle(el).gridTemplateColumns.split(' ')).toHaveLength(1)
  })

  it('axe 違反なし', async () => {
    const { c } = await list()
    await expectNoA11yViolations(c)
  })
})
