import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleKanban } from './jimble-kanban.js'
import type { JimbleKanbanCard } from './jimble-kanban-card.js'
import './index.js'

afterEach(cleanup)

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const card = (el: JimbleKanban, value: string) =>
  el.querySelector<JimbleKanbanCard>(`jimble-kanban-card[value="${value}"]`)!
const status = (el: JimbleKanban) =>
  el.shadowRoot!.querySelector('[role="status"]')!.textContent!.trim()
const inner = (host: Element, part: string) =>
  host.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)

async function board(attrs = '', extra = '') {
  const el = await mount<JimbleKanban>(html`<div></div>`)
  const host = el.parentElement!
  host.innerHTML = `<jimble-kanban label="タスク" style="--jimble-kanban-column-width: 7rem" ${attrs}>
    <jimble-kanban-column value="todo" heading="未着手">
      <jimble-kanban-card value="a">A</jimble-kanban-card>
      <jimble-kanban-card value="b">B</jimble-kanban-card>
      <jimble-kanban-card value="c" ${extra}>C</jimble-kanban-card>
    </jimble-kanban-column>
    <jimble-kanban-column value="doing" heading="進行中">
      <jimble-kanban-card value="d">D</jimble-kanban-card>
    </jimble-kanban-column>
    <jimble-kanban-column value="done" heading="完了"></jimble-kanban-column>
  </jimble-kanban>`
  const kanban = host.firstElementChild as JimbleKanban
  await kanban.updateComplete
  await tick()
  return kanban
}

const press = (key: string, mod = '') =>
  userEvent.keyboard(mod ? `{${mod}>}{${key}}{/${mod}}` : key === 'Space' ? ' ' : `{${key}}`)

describe('構造', () => {
  it('board が列とカードの並びを返し、フォーカスの入口は 1 枚だけ', async () => {
    const el = await board()
    expect(el.board).toEqual({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] })
    expect(el.cards.map((c) => c.tabIndex)).toEqual([0, -1, -1, -1])
    expect(inner(el.columns[0]!, 'count')!.textContent!.trim()).toBe('3')
    expect(inner(el.columns[2]!, 'empty')!.textContent!.trim()).toBe('カードがありません')
  })

  it('カードにフォーカスすると、その 1 枚が入口になる', async () => {
    const el = await board()
    card(el, 'b').focus()
    await tick()
    expect(el.cards.map((c) => c.tabIndex)).toEqual([-1, 0, -1, -1])
  })
})

describe('キーボード', () => {
  it('Alt + → / ← で隣の列へ動き、フォーカスは残り、jimble-card-move と通知が出る', async () => {
    const el = await board()
    const onMove = vi.fn()
    el.addEventListener('jimble-card-move', (e) => onMove(e.detail))
    card(el, 'b').focus()
    await press('ArrowRight', 'Alt')
    expect(el.board).toEqual({ todo: ['a', 'c'], doing: ['d', 'b'], done: [] })
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'b', from: 'todo', to: 'doing', index: 1 }),
    )
    expect(document.activeElement).toBe(card(el, 'b'))
    expect(status(el)).toBe('「B」を「進行中」の 2 件中 2 番目に移動しました')
    await press('ArrowLeft', 'Alt') // 元の位置(2 番目)へ戻る
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
  })

  it('Alt + ↑ / ↓ で列の中を並べ替える。端では動かない', async () => {
    const el = await board()
    card(el, 'b').focus()
    await press('ArrowDown', 'Alt')
    expect(el.board.todo).toEqual(['a', 'c', 'b'])
    await press('ArrowDown', 'Alt')
    expect(el.board.todo).toEqual(['a', 'c', 'b'])
    await press('ArrowUp', 'Alt')
    await press('ArrowUp', 'Alt')
    await press('ArrowUp', 'Alt')
    expect(el.board.todo).toEqual(['b', 'a', 'c'])
  })

  it('動かす前の jimble-card-move をキャンセルすると動かず、その旨が通知される', async () => {
    const el = await board()
    el.addEventListener('jimble-card-move', (e) => e.preventDefault())
    card(el, 'a').focus()
    await press('ArrowRight', 'Alt')
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
    expect(status(el)).toBe('「A」は移動できませんでした')
  })

  it('矢印キーでフォーカスを移す(↑↓ は列の中、←→ は隣のカードのある列)', async () => {
    const el = await board()
    card(el, 'a').focus()
    await press('ArrowDown')
    expect(document.activeElement).toBe(card(el, 'b'))
    await press('ArrowRight')
    expect(document.activeElement).toBe(card(el, 'd')) // 完了は空なので越えない(進行中の d)
    await press('ArrowRight') // これ以上、カードのある列がない
    expect(document.activeElement).toBe(card(el, 'd'))
    await press('ArrowLeft')
    expect(document.activeElement).toBe(card(el, 'a'))
  })

  it('変換中(IME)の Alt + 矢印は無視する', async () => {
    const el = await board()
    card(el, 'a').focus()
    card(el, 'a').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        isComposing: true,
        bubbles: true,
        composed: true,
      }),
    )
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
  })
})

describe('移動ボタン（ポインター 1 本）', () => {
  it('ボタンで移動先を選び、カードの前・列の末尾へ動かす。Esc で取り消せる', async () => {
    const el = await board()
    const move = (v: string) => inner(card(el, v), 'move')!
    move('a').click()
    await tick()
    expect(card(el, 'a').moving).toBe(true)
    expect(move('a').getAttribute('aria-pressed')).toBe('true')
    // 自分と、すぐ後ろ(いまと同じ位置)には受け口がない
    expect(inner(card(el, 'a'), 'target')).toBeNull()
    expect(inner(card(el, 'b'), 'target')).toBeNull()
    expect(inner(card(el, 'c'), 'target')).not.toBeNull()
    expect(inner(card(el, 'd'), 'target')).not.toBeNull()
    inner(card(el, 'd'), 'target')!.click()
    await tick()
    expect(el.board).toEqual({ todo: ['b', 'c'], doing: ['a', 'd'], done: [] })
    expect(card(el, 'a').moving).toBe(false)

    inner(card(el, 'b'), 'move')!.click()
    await tick()
    inner(el.columns[2]!, 'target')!.click() // 空の列の末尾
    await tick()
    expect(el.board).toEqual({ todo: ['c'], doing: ['a', 'd'], done: ['b'] })

    inner(card(el, 'c'), 'move')!.click()
    await tick()
    card(el, 'c').focus()
    await press('Escape')
    expect(card(el, 'c').moving).toBe(false)
    expect(status(el)).toBe('移動を取り消しました')
  })

  it('カードにフォーカスして Space で移動先の選択を始める', async () => {
    const el = await board()
    card(el, 'a').focus()
    await press('Space')
    expect(card(el, 'a').moving).toBe(true)
    await press('Space')
    expect(card(el, 'a').moving).toBe(false)
  })
})

describe('読み取り専用・固定', () => {
  it('readonly では、キーボードでも移動ボタンでも動かせない。ボタンも出ない', async () => {
    const el = await board('readonly')
    expect(inner(card(el, 'a'), 'move')).toBeNull()
    card(el, 'a').focus()
    await press('ArrowRight', 'Alt')
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
  })

  it('locked のカードは動かせず、ボタンの代わりに「移動できません」が読まれる', async () => {
    const el = await board('', 'locked')
    expect(inner(card(el, 'c'), 'move')).toBeNull()
    expect(inner(card(el, 'c'), 'lock')!.textContent).toContain('移動できません')
    card(el, 'c').focus()
    await press('ArrowRight', 'Alt')
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
  })
})

describe('ドラッグ', () => {
  const at = (el: Element, fx = 0.5, fy = 0.5) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width * fx, y: r.top + r.height * fy }
  }
  const down = (target: Element, p: { x: number; y: number }, type = 'mouse') =>
    target.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        pointerType: type,
        button: 0,
        clientX: p.x,
        clientY: p.y,
      }),
    )
  const send = (type: string, p: { x: number; y: number }) =>
    window.dispatchEvent(
      new PointerEvent(type, { pointerId: 1, clientX: p.x, clientY: p.y, bubbles: true }),
    )

  it('別の列へドラッグすると、ポインターの位置に挿入される(途中は線で示す)', async () => {
    const el = await board()
    const from = at(card(el, 'a'))
    down(card(el, 'a'), from)
    const over = at(card(el, 'd'), 0.5, 0.8) // d の下半分 = d の後ろ
    send('pointermove', over)
    await tick(60)
    expect(card(el, 'a').dragging).toBe(true)
    expect(el.columns[1]!.dropEnd).toBe(true)
    expect(el.columns[1]!.over).toBe(true)
    send('pointerup', over)
    await tick()
    expect(el.board).toEqual({ todo: ['b', 'c'], doing: ['d', 'a'], done: [] })
    expect(card(el, 'a').dragging).toBe(false)
    expect(card(el, 'a').style.translate).toBe('')
  })

  it('カードの上半分に落とすと、そのカードの前に入る', async () => {
    const el = await board()
    down(card(el, 'c'), at(card(el, 'c')))
    const over = at(card(el, 'a'), 0.5, 0.2)
    send('pointermove', over)
    await tick(60)
    expect(card(el, 'a').dropBefore).toBe(true)
    send('pointerup', over)
    await tick()
    expect(el.board.todo).toEqual(['c', 'a', 'b'])
  })

  it('Esc で取り消すと、動かない', async () => {
    const el = await board()
    down(card(el, 'a'), at(card(el, 'a')))
    send('pointermove', at(card(el, 'd')))
    await tick(60)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    send('pointerup', at(card(el, 'd')))
    await tick()
    expect(el.board).toEqual({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] })
    expect(card(el, 'a').dragging).toBe(false)
  })

  it('少し動いただけ(クリック)や、カード内のボタン・リンクでは始まらない', async () => {
    const el = await board()
    const start = at(card(el, 'a'))
    down(card(el, 'a'), start)
    send('pointermove', { x: start.x + 2, y: start.y + 2 })
    await tick(60)
    expect(card(el, 'a').dragging).toBe(false)
    send('pointerup', start)

    card(el, 'b').insertAdjacentHTML('beforeend', '<button id="x">開く</button>')
    const button = card(el, 'b').querySelector('button')!
    down(button, at(button))
    send('pointermove', at(card(el, 'd')))
    await tick(60)
    expect(card(el, 'b').dragging).toBe(false)
    send('pointerup', at(card(el, 'd')))
    expect(el.board.todo).toEqual(['a', 'b', 'c'])
  })

  it('タッチは、動かさずに長押ししてから始まる。先に動けばスクロールのため始まらない', async () => {
    const el = await board()
    const start = at(card(el, 'a'))
    down(card(el, 'a'), start, 'touch')
    send('pointermove', { x: start.x + 30, y: start.y })
    await tick(450)
    expect(card(el, 'a').dragging).toBe(false)
    send('pointerup', start)

    down(card(el, 'a'), start, 'touch')
    await tick(450)
    expect(card(el, 'a').dragging).toBe(true)
    send('pointercancel', start)
    await tick()
    expect(card(el, 'a').dragging).toBe(false)
  })

  it('readonly と locked のカードでは始まらない', async () => {
    const ro = await board('readonly')
    down(card(ro, 'a'), at(card(ro, 'a')))
    send('pointermove', at(card(ro, 'd')))
    await tick(60)
    expect(card(ro, 'a').dragging).toBe(false)
    send('pointerup', at(card(ro, 'd')))
    cleanup()
    const locked = await board('', 'locked')
    down(card(locked, 'c'), at(card(locked, 'c')))
    send('pointermove', at(card(locked, 'd')))
    await tick(60)
    expect(card(locked, 'c').dragging).toBe(false)
    send('pointerup', at(card(locked, 'd')))
  })
})

describe('アクセシビリティ', () => {
  it('axe の違反がない(通常・移動先の選択中)', async () => {
    const el = await board()
    await expectNoA11yViolations(el)
    inner(card(el, 'a'), 'move')!.click()
    await tick()
    await expectNoA11yViolations(el)
  })
})
