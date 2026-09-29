import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleTab, JimbleTabPanel, JimbleTabs } from './jimble-tabs.js'
import './jimble-tabs.js'

afterEach(cleanup)
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function tabs(attrs = '') {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-tabs label="注文の表示" ${attrs}>
    <jimble-tab value="all">すべて</jimble-tab>
    <jimble-tab value="open">未処理</jimble-tab>
    <jimble-tab value="closed" disabled>完了</jimble-tab>
    <jimble-tab value="cancel">キャンセル</jimble-tab>
    <jimble-tab-panel value="all">すべての注文</jimble-tab-panel>
    <jimble-tab-panel value="open">未処理の注文</jimble-tab-panel>
    <jimble-tab-panel value="closed">完了の注文</jimble-tab-panel>
    <jimble-tab-panel value="cancel">キャンセルの注文</jimble-tab-panel>
  </jimble-tabs>`
  const el = c.querySelector('jimble-tabs') as JimbleTabs
  await tick()
  return {
    c,
    el,
    tabs: [...el.querySelectorAll('jimble-tab')] as JimbleTab[],
    panels: [...el.querySelectorAll('jimble-tab-panel')] as JimbleTabPanel[],
  }
}
const visible = (panels: JimbleTabPanel[]) => panels.filter((p) => !p.hidden).map((p) => p.value)

describe('構造と ARIA', () => {
  it('tablist(名前・向き付き)。tab は slot="tab" が自動で付く。tab と panel が aria-controls / aria-labelledby で結ばれる', async () => {
    const { el, tabs: t, panels } = await tabs()
    const list = el.shadowRoot!.querySelector('[role="tablist"]')!
    expect(list.getAttribute('aria-label')).toBe('注文の表示')
    expect(list.getAttribute('aria-orientation')).toBe('horizontal')
    expect(t.every((x) => x.slot === 'tab')).toBe(true)
    t.forEach((tab, i) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[i]!.id)
      expect(panels[i]!.getAttribute('aria-labelledby')).toBe(tab.id)
    })
  })

  it('最初の有効なタブが選ばれ、選択中だけ tabindex=0(roving)、パネルは tabindex=0 で選択中だけ表示', async () => {
    const { el, tabs: t, panels } = await tabs()
    expect(el.value).toBe('all')
    expect(t.map((x) => x.tabIndex)).toEqual([0, -1, -1, -1])
    expect(t[0]!.matches(':state(selected)')).toBe(true)
    expect(visible(panels)).toEqual(['all'])
    expect(panels.every((p) => p.tabIndex === 0)).toBe(true)
  })

  it('value 属性で初期選択できる。存在しない値は最初の有効なタブになる', async () => {
    const a = await tabs('value="cancel"')
    expect(visible(a.panels)).toEqual(['cancel'])
    const b = await tabs('value="nope"')
    expect(b.el.value).toBe('all')
  })
})

describe('操作', () => {
  it('クリックで切り替わり、jimble-tab-change が出る。無効なタブは選べない', async () => {
    const { el, tabs: t, panels } = await tabs()
    const on = vi.fn()
    el.addEventListener('jimble-tab-change', on)
    await userEvent.click(t[1]!)
    expect(el.value).toBe('open')
    expect(visible(panels)).toEqual(['open'])
    expect((on.mock.calls[0]![0] as CustomEvent).detail).toEqual({ value: 'open' })
    t[2]!.click()
    await tick()
    expect(el.value).toBe('open')
    expect(on).toHaveBeenCalledTimes(1)
  })

  it('矢印キー(自動): 移動と同時に切り替わる。無効を飛ばし、端で循環。Home / End', async () => {
    const { el, tabs: t } = await tabs()
    t[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(el.value).toBe('open')
    expect(document.activeElement).toBe(t[1])
    await userEvent.keyboard('{ArrowRight}') // 完了(無効)を飛ばす
    expect(el.value).toBe('cancel')
    await userEvent.keyboard('{ArrowRight}') // 循環
    expect(el.value).toBe('all')
    await userEvent.keyboard('{ArrowLeft}')
    expect(el.value).toBe('cancel')
    await userEvent.keyboard('{Home}')
    expect(el.value).toBe('all')
    await userEvent.keyboard('{End}')
    expect(el.value).toBe('cancel')
  })

  it('activation="manual": 矢印はフォーカスだけ移り、Enter / Space で切り替わる', async () => {
    const { el, tabs: t, panels } = await tabs('activation="manual"')
    t[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(t[1])
    expect(el.value).toBe('all')
    expect(visible(panels)).toEqual(['all'])
    await userEvent.keyboard('{Enter}')
    expect(el.value).toBe('open')
    expect(visible(panels)).toEqual(['open'])
  })

  it('orientation="vertical": 上下の矢印で移動する', async () => {
    const { el, tabs: t } = await tabs('orientation="vertical"')
    expect(el.shadowRoot!.querySelector('[role="tablist"]')!.getAttribute('aria-orientation')).toBe(
      'vertical',
    )
    t[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(el.value).toBe('all') // 縦のときは左右では動かない
    await userEvent.keyboard('{ArrowDown}')
    expect(el.value).toBe('open')
    await userEvent.keyboard('{ArrowUp}')
    expect(el.value).toBe('all')
  })

  it('Tab でタブの一覧に入ると選択中のタブ、次の Tab でパネルへ', async () => {
    const { el, tabs: t, panels } = await tabs('value="open"')
    void el
    t[1]!.focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(panels[1])
  })

  it('後から value を変えると表示が追従する', async () => {
    const { el, panels } = await tabs()
    el.value = 'cancel'
    await tick()
    expect(visible(panels)).toEqual(['cancel'])
  })
})

describe('見た目とアクセシビリティ', () => {
  it('選択中のタブは下線(inset の影)と色が変わる', async () => {
    const { tabs: t } = await tabs()
    const base = (x: JimbleTab) => x.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!
    expect(getComputedStyle(base(t[0]!)).boxShadow).toContain('inset')
    expect(getComputedStyle(base(t[1]!)).boxShadow).not.toContain('inset')
    expect(getComputedStyle(base(t[0]!)).color).not.toBe(getComputedStyle(base(t[1]!)).color)
  })

  it('axe 違反なし', async () => {
    const { c } = await tabs()
    await expectNoA11yViolations(c)
    const v = await tabs('orientation="vertical" activation="manual"')
    await expectNoA11yViolations(v.c)
  })
})
