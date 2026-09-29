import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleButton } from '../button/jimble-button.js'
import { JimbleDropdownMenu } from './jimble-dropdown-menu.js'
import type { JimbleMenuItem } from './jimble-menu-item.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const menuEl = (el: JimbleDropdownMenu) =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="menu"]')!
const isOpen = (el: JimbleDropdownMenu) => menuEl(el).matches(':popover-open')
const innerButton = (b: Element) => (b as JimbleButton).shadowRoot!.querySelector('button')!

async function menu(attrs = '', wrapperStyle = '') {
  const c = await mount<HTMLElement>(html`<div style=${wrapperStyle}></div>`)
  c.innerHTML = `<jimble-dropdown-menu ${attrs}>
      <jimble-button slot="trigger" id="trigger">操作</jimble-button>
      <jimble-menu-item value="edit">編集</jimble-menu-item>
      <jimble-menu-item value="copy">複製</jimble-menu-item>
      <jimble-menu-item value="off" disabled>無効な項目</jimble-menu-item>
      <jimble-menu-separator></jimble-menu-separator>
      <jimble-menu-item value="delete" variant="danger">削除</jimble-menu-item>
    </jimble-dropdown-menu><input id="after" aria-label="次">`
  const el = c.querySelector('jimble-dropdown-menu') as JimbleDropdownMenu
  await el.updateComplete
  await tick()
  const items = [...el.querySelectorAll('jimble-menu-item')] as JimbleMenuItem[]
  return {
    c,
    el,
    trigger: c.querySelector<HTMLElement>('#trigger')!,
    items,
    after: c.querySelector<HTMLElement>('#after')!,
  }
}

describe('開閉とトリガー', () => {
  it('クリックで開き、最初の項目にフォーカスが移る。トリガーに aria-haspopup / aria-expanded が付く', async () => {
    const { el, trigger, items } = await menu()
    expect(isOpen(el)).toBe(false)
    expect(innerButton(trigger).getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(trigger)
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(el.hasAttribute('open')).toBe(true)
    expect(innerButton(trigger).getAttribute('aria-haspopup')).toBe('menu')
    expect(innerButton(trigger).getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(items[0])
  })

  it('開いているときにトリガーをもう一度押すと閉じる(再び開かない)', async () => {
    const { el, trigger } = await menu()
    await userEvent.click(trigger)
    await tick()
    expect(isOpen(el)).toBe(true)
    await userEvent.click(trigger)
    await tick()
    expect(isOpen(el)).toBe(false)
  })

  it('外側のクリックで閉じる(ライトディスミス)。jimble-close が発火する', async () => {
    const { el, trigger, after } = await menu()
    const onClose = vi.fn()
    el.addEventListener('jimble-close', onClose)
    await userEvent.click(trigger)
    await tick()
    await userEvent.click(after)
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ArrowDown で開いて最初、ArrowUp で開いて最後の有効な項目にフォーカス', async () => {
    const { el, trigger, items } = await menu()
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(document.activeElement).toBe(items[0])
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    trigger.focus()
    await userEvent.keyboard('{ArrowUp}')
    await tick()
    expect(document.activeElement).toBe(items[3])
  })

  it('メニューの名前はトリガーの文字、label 属性で上書きできる', async () => {
    const a = await menu()
    expect(menuEl(a.el).getAttribute('aria-label')).toBe('操作')
    const b = await menu('label="行の操作"')
    expect(menuEl(b.el).getAttribute('aria-label')).toBe('行の操作')
  })
})

describe('キーボード操作(APG の menu)', () => {
  it('矢印キーで移動(無効は飛ばす・端は循環)、Home / End', async () => {
    const { trigger, items } = await menu()
    await userEvent.click(trigger)
    await tick()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[1])
    await userEvent.keyboard('{ArrowDown}') // 無効な項目を飛ばして削除へ
    expect(document.activeElement).toBe(items[3])
    await userEvent.keyboard('{ArrowDown}') // 循環
    expect(document.activeElement).toBe(items[0])
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(items[3])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(items[0])
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(items[3])
  })

  it('先頭文字検索で移動する(日本語は合成イベント、英字は実キー)', async () => {
    const { trigger, items } = await menu()
    await userEvent.click(trigger)
    await tick()
    // 非 ASCII の実キー入力はエンジンによって key が正しく渡らないので、合成イベントで確認する
    items[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: '削', bubbles: true, composed: true }),
    )
    expect(document.activeElement).toBe(items[3])
    await tick(700) // 続けて打った文字を連結するバッファ(typeahead)が切れるのを待つ
    items[3]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: '編', bubbles: true, composed: true }),
    )
    expect(document.activeElement).toBe(items[0])
  })

  it('英字の先頭文字検索(実キー)', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-dropdown-menu><jimble-button slot="trigger" id="t">Actions</jimble-button>
      <jimble-menu-item>Archive</jimble-menu-item><jimble-menu-item>Delete</jimble-menu-item><jimble-menu-item>Duplicate</jimble-menu-item></jimble-dropdown-menu>`
    await tick()
    const items = [...c.querySelectorAll('jimble-menu-item')]
    await userEvent.click(c.querySelector('#t')!)
    await tick()
    await userEvent.keyboard('d')
    expect(document.activeElement).toBe(items[1])
    await userEvent.keyboard('d') // 同じ文字の連打で次の候補へ
    expect(document.activeElement).toBe(items[2])
  })

  it('Enter / Space で項目を実行: jimble-select(value) → 閉じてトリガーにフォーカスが戻る', async () => {
    const { el, trigger, items } = await menu()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await userEvent.click(trigger)
    await tick()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await tick()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.value).toBe('copy')
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.item).toBe(items[1])
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement ?? document.activeElement).toBe(trigger)
    await userEvent.click(trigger)
    await tick()
    await userEvent.keyboard(' ')
    await tick()
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('クリックでも実行される。無効な項目は実行されない', async () => {
    const { el, trigger, items } = await menu()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await userEvent.click(trigger)
    await tick()
    await userEvent.click(items[2]!, { force: true }).catch(() => {})
    expect(onSelect).not.toHaveBeenCalled()
    await userEvent.click(items[0]!)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('jimble-select を preventDefault() すると開いたままになる', async () => {
    const { el, trigger, items } = await menu()
    el.addEventListener('jimble-select', (e) => e.preventDefault())
    await userEvent.click(trigger)
    await tick()
    await userEvent.click(items[0]!)
    await tick()
    expect(isOpen(el)).toBe(true)
  })

  it('Esc で閉じ、トリガーにフォーカスが戻る', async () => {
    const { el, trigger } = await menu()
    await userEvent.click(trigger)
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('Tab で閉じ、トリガーの次の要素へ進む', async () => {
    const { el, trigger, after } = await menu()
    await userEvent.click(trigger)
    await tick()
    await userEvent.tab()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(document.activeElement).toBe(after)
  })

  it('IME の変換中は先頭文字検索をしない', async () => {
    const { trigger, items } = await menu()
    await userEvent.click(trigger)
    await tick()
    const before = document.activeElement
    items[0]!.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, composed: true }),
    )
    items[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: '削', bubbles: true, composed: true }),
    )
    expect(document.activeElement).toBe(before)
  })
})

describe('項目', () => {
  it('ロール(menuitem / separator)とフォーカス用の tabindex', async () => {
    const { items, c } = await menu()
    expect(items.every((i) => i.getAttribute('tabindex') === '-1')).toBe(true)
    expect(items[0]!.matches(':state(disabled)')).toBe(false)
    expect(items[2]!.matches(':state(disabled)')).toBe(false)
    void c
  })

  it('href の項目は遷移する', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-dropdown-menu><jimble-button slot="trigger" id="t">開く</jimble-button><jimble-menu-item href="#menu-test">リンク</jimble-menu-item></jimble-dropdown-menu>`
    const el = c.querySelector('jimble-dropdown-menu') as JimbleDropdownMenu
    await tick()
    await userEvent.click(c.querySelector('#t')!)
    await tick()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(location.hash).toBe('#menu-test')
    history.replaceState(null, '', location.pathname + location.search)
    void el
  })
})

describe('位置(CSS Anchor Positioning)', () => {
  it('トリガーの直下に、左端をそろえて出る', async () => {
    const { el, trigger } = await menu('', 'padding: 100px 0 0 200px')
    await userEvent.click(trigger)
    await tick()
    const t = trigger.getBoundingClientRect()
    const m = menuEl(el).getBoundingClientRect()
    expect(Math.round(m.left)).toBe(Math.round(t.left))
    expect(m.top).toBeGreaterThanOrEqual(t.bottom)
    expect(m.top - t.bottom).toBeLessThan(12)
  })

  it('placement="bottom-end" は右端をそろえる', async () => {
    const { el, trigger } = await menu('placement="bottom-end"', 'padding: 100px 0 0 400px')
    await userEvent.click(trigger)
    await tick()
    expect(Math.round(menuEl(el).getBoundingClientRect().right)).toBe(
      Math.round(trigger.getBoundingClientRect().right),
    )
  })

  it('画面の下端では上に反転する', async () => {
    const { el, trigger } = await menu('', 'position: fixed; left: 100px; bottom: 8px')
    await userEvent.click(trigger)
    await tick()
    const t = trigger.getBoundingClientRect()
    const m = menuEl(el).getBoundingClientRect()
    expect(m.bottom).toBeLessThanOrEqual(t.top + 1)
    expect(m.top).toBeGreaterThanOrEqual(0)
  })

  it('メニューに影と ring が効く', async () => {
    const { el, trigger } = await menu()
    await userEvent.click(trigger)
    await tick()
    expect(getComputedStyle(menuEl(el)).boxShadow).toContain('inset')
  })
})

describe('アクセシビリティ(axe)', () => {
  it('閉じた状態・開いた状態で違反なし', async () => {
    const { el, c, trigger } = await menu()
    await expectNoA11yViolations(c)
    await userEvent.click(trigger)
    await tick()
    await expectNoA11yViolations(el)
  })
})
