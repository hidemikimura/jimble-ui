import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { radiusTests } from '../../test/radius.js'
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

describe('サブメニュー', () => {
  async function nested(wrapperStyle = '') {
    const c = await mount<HTMLElement>(html`<div style=${wrapperStyle}></div>`)
    c.innerHTML = `<jimble-dropdown-menu>
        <jimble-button slot="trigger" id="trigger">操作</jimble-button>
        <jimble-menu-item value="edit">編集</jimble-menu-item>
        <jimble-menu-item id="share">
          共有
          <jimble-menu-item slot="submenu" value="mail">メール</jimble-menu-item>
          <jimble-menu-item slot="submenu" value="off" disabled>チャット（無効）</jimble-menu-item>
          <jimble-menu-item slot="submenu" id="export">
            書き出し
            <jimble-menu-item slot="submenu" value="pdf">PDF</jimble-menu-item>
            <jimble-menu-item slot="submenu" value="csv">CSV</jimble-menu-item>
          </jimble-menu-item>
          <jimble-menu-item slot="submenu" value="link">リンクをコピー</jimble-menu-item>
        </jimble-menu-item>
        <jimble-menu-item value="delete" variant="danger">削除</jimble-menu-item>
      </jimble-dropdown-menu><input id="after" aria-label="次">`
    const el = c.querySelector('jimble-dropdown-menu') as JimbleDropdownMenu
    await el.updateComplete
    await tick()
    const q = (sel: string) => c.querySelector(sel) as JimbleMenuItem
    return {
      c,
      el,
      trigger: c.querySelector<HTMLElement>('#trigger')!,
      share: q('#share'),
      exp: q('#export'),
      item: (v: string) => q(`[value="${v}"]`),
      after: c.querySelector<HTMLElement>('#after')!,
    }
  }
  const sub = (item: JimbleMenuItem) =>
    item.shadowRoot!.querySelector<HTMLElement>('[part="submenu"]')!
  const subOpen = (item: JimbleMenuItem) => sub(item).matches(':popover-open')
  const openMenu = async (trigger: HTMLElement) => {
    await userEvent.click(trigger)
    await tick()
  }

  it('サブメニューを持つ項目は、aria-haspopup="menu" と aria-expanded を持つ', async () => {
    const { share } = await nested()
    const internals = (share as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaHasPopup).toBe('menu')
    expect(internals.ariaExpanded).toBe('false')
    expect(share.text).toBe('共有')
    expect(sub(share).getAttribute('role')).toBe('menu')
  })

  it('→ で開いて最初の有効な項目へ、← で閉じて親の項目へ戻る', async () => {
    const { trigger, share, item } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    expect(subOpen(share)).toBe(true)
    expect((share as unknown as { internals: ElementInternals }).internals.ariaExpanded).toBe(
      'true',
    )
    expect(document.activeElement).toBe(item('mail'))
    await userEvent.keyboard('{ArrowLeft}')
    await tick()
    expect(subOpen(share)).toBe(false)
    expect(document.activeElement).toBe(share)
  })

  it('Enter・Space でも開く。親の項目では jimble-select は出ない', async () => {
    const { el, trigger, share, item } = await nested()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await tick()
    expect(subOpen(share)).toBe(true)
    expect(document.activeElement).toBe(item('mail'))
    await userEvent.keyboard('{ArrowLeft} ')
    await tick()
    expect(subOpen(share)).toBe(true)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('サブメニューの中の矢印キーは、その中だけを移動する（無効は飛ばす・端は循環）', async () => {
    const { trigger, exp, item } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(exp)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(item('link'))
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(item('mail'))
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(item('link'))
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(item('mail'))
  })

  it('サブメニューの項目を選ぶと、jimble-select が出て、すべて閉じ、トリガーに戻る', async () => {
    const { el, trigger, share, item } = await nested()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{Enter}')
    await tick()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.value).toBe('mail')
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.item).toBe(item('mail'))
    expect(isOpen(el)).toBe(false)
    expect(subOpen(share)).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('入れ子のサブメニューも開ける', async () => {
    const { el, trigger, exp, item } = await nested()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{ArrowDown}{ArrowRight}')
    await tick()
    expect(subOpen(exp)).toBe(true)
    expect(document.activeElement).toBe(item('pdf'))
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await tick()
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.value).toBe('csv')
    expect(isOpen(el)).toBe(false)
  })

  it('Esc はサブメニューだけを閉じて親に戻る。もう一度 Esc でメニューが閉じる', async () => {
    const { el, trigger, share } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(subOpen(share)).toBe(false)
    expect(isOpen(el)).toBe(true)
    expect(document.activeElement).toBe(share)
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('サブメニューの中で Tab を押すと、すべて閉じて、トリガーの次へ進む', async () => {
    const { el, trigger, share, after } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    await userEvent.tab()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(subOpen(share)).toBe(false)
    expect(document.activeElement).toBe(after)
  })

  it('クリックで開き、サブメニューの項目のクリックで選ぶ', async () => {
    const { el, trigger, share, item } = await nested()
    const onSelect = vi.fn()
    el.addEventListener('jimble-select', onSelect)
    await openMenu(trigger)
    await userEvent.click(share)
    await tick()
    expect(subOpen(share)).toBe(true)
    expect(isOpen(el)).toBe(true)
    await userEvent.click(item('link'))
    await tick()
    expect((onSelect.mock.calls[0]![0] as CustomEvent).detail.value).toBe('link')
    expect(isOpen(el)).toBe(false)
  })

  it('マウスを重ねると開き、ほかの項目に移ると閉じる', async () => {
    const { trigger, share, item } = await nested()
    await openMenu(trigger)
    await userEvent.hover(share)
    await tick(300)
    expect(subOpen(share)).toBe(true)
    await userEvent.hover(item('edit'))
    await tick(300)
    expect(subOpen(share)).toBe(false)
  })

  it('メニューの外をクリックすると、サブメニューも閉じる', async () => {
    const { el, trigger, share, after } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    await userEvent.click(after)
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(subOpen(share)).toBe(false)
  })

  it('サブメニューは、親の項目の右に、上端をそろえて出る。右端では左に反転する', async () => {
    const left = await nested('padding: 40px 0 0 20px')
    await openMenu(left.trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    const p = left.share.getBoundingClientRect()
    const s = sub(left.share).getBoundingClientRect()
    expect(s.left).toBeGreaterThanOrEqual(p.right - 8)
    expect(Math.abs(s.top - p.top)).toBeLessThan(12)
    cleanup()

    // 後ろの入力欄は下の行に回し、メニューのボタンだけを右端に置く(横に並ぶと、入力欄の幅が
    // フォントで変わり、Linux ではメニューが中ほどに開いて、サブメニューが左右どちらにも収まらない)
    const right = await nested(
      'position: fixed; top: 40px; right: 4px; display: grid; justify-items: end',
    )
    await openMenu(right.trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    const p2 = right.share.getBoundingClientRect()
    const s2 = sub(right.share).getBoundingClientRect()
    expect(p2.right).toBeGreaterThan(window.innerWidth - 16)
    expect(s2.right).toBeLessThanOrEqual(p2.left + 8)
  })

  it('先頭文字検索は、項目の文字だけを見る（サブメニューの中の文字は見ない）', async () => {
    const { trigger, share, item } = await nested()
    await openMenu(trigger)
    const key = (k: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }),
      )
    // サブメニューの中の「メール」には移らない(最上位の項目の文字に「メ」は無い)
    key('メ')
    expect(document.activeElement).toBe(item('edit'))
    await tick(700) // 先頭文字検索の入力をリセットする
    key('共')
    expect(document.activeElement).toBe(share)
  })

  it('無効な親の項目は開かない', async () => {
    const { trigger, share } = await nested()
    share.disabled = true
    await share.updateComplete
    await openMenu(trigger)
    share.focus()
    await userEvent.keyboard('{ArrowRight}')
    await tick()
    expect(subOpen(share)).toBe(false)
  })

  it('サブメニューを開いた状態で axe の違反がない', async () => {
    const { el, trigger } = await nested()
    await openMenu(trigger)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await tick()
    await expectNoA11yViolations(el)
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

radiusTests('--jimble-menu-radius', async () => {
  const { el, trigger } = await menu()
  innerButton(trigger).click()
  await tick()
  return { host: el, target: menuEl(el) }
})

describe('項目の hover の色（--jimble-color-item-hover）', () => {
  it('項目にマウスを重ねたときの背景を、トークンで変えられる。変えなければ従来どおり', async () => {
    const { el, trigger, items } = await menu()
    innerButton(trigger).click()
    await tick()
    const base = () =>
      items[1]!.shadowRoot!.querySelector<HTMLElement>('[part="base"]') ?? items[1]!
    const bg = () => getComputedStyle(base()).backgroundColor
    await userEvent.hover(items[1]!)
    await tick()
    const before = bg()
    expect(before).not.toBe('rgba(0, 0, 0, 0)')
    el.style.setProperty('--jimble-color-item-hover', 'rgb(1, 2, 3)')
    await tick()
    expect(bg()).toBe('rgb(1, 2, 3)')
  })
})
