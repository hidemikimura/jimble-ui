import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { JimbleKanbanCard } from './jimble-kanban-card.js'
import { JimbleKanbanColumn } from './jimble-kanban-column.js'

/** マウスは、これだけ動いたらドラッグとみなす(px) */
const DRAG_DISTANCE = 5
/** タッチは、動かさずにこれだけ押し続けたらドラッグを始める(ms)。それより前に動けば、画面のスクロールになる */
const LONG_PRESS = 300
/** 長押しの間に、これ以上動いたらスクロールとみなす(px) */
const LONG_PRESS_SLOP = 10
/** ドラッグ中、画面や列の端からこの距離に入ると自動でスクロールする(px) */
const EDGE = 48
const SCROLL_STEP = 12
const ANNOUNCE_MS = 3000
/** カードの中の、押してもドラッグを始めない要素 */
const INTERACTIVE =
  'a[href],button,input,select,textarea,summary,label,[contenteditable],[role="button"],[role="link"],' +
  'jimble-button,jimble-input,jimble-textarea,jimble-select,jimble-combobox,jimble-checkbox,jimble-switch,' +
  'jimble-radio-group,jimble-date-input,jimble-color-input,jimble-file-input,jimble-dropdown-menu'

type Move = { card: JimbleKanbanCard; column: JimbleKanbanColumn; index: number }
type Drag = Move & {
  x0: number
  y0: number
  scrollLeft0: number
  scrollTop0: number
  x: number
  y: number
}

const isCard = (n: EventTarget): n is JimbleKanbanCard => n instanceof JimbleKanbanCard
const keyOf = (v: string | undefined, i: number) => v ?? String(i)

/**
 * カンバンボード。`jimble-kanban-column`（列）の中に `jimble-kanban-card`（カード）を並べる。
 * カードは、ドラッグ（マウス・ペン・タッチの長押し）、カードの移動ボタン（ポインター 1 本）、
 * キーボード（Alt + 矢印）で、列の間や列の中を動かせる。動かすと、カードの要素そのものが入れ替わる。
 *
 * @tag jimble-kanban
 *
 * @slot - `jimble-kanban-column`
 *
 * @csspart base - ルート要素
 * @csspart board - 列を横に並べる領域（横にスクロールする）
 *
 * @cssprop [--jimble-kanban-column-width=18rem] - 列の幅
 *
 * @fires jimble-card-move - カードを動かす直前（キャンセルできる）。detail: { value, card, from, to, index }。キャンセルすると動かない（サーバーが拒否したときなど）
 */
export class JimbleKanban extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    readonly: { type: Boolean, reflect: true },
  }

  /** ボード全体の名前（aria-label） */
  declare label: string | undefined
  /** 動かせなくする（閲覧だけ） */
  declare readonly: boolean

  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined
  #active: JimbleKanbanCard | undefined
  #moving: JimbleKanbanCard | undefined
  #press: { card: JimbleKanbanCard; id: number; x: number; y: number; touch: boolean } | undefined
  #pressTimer: ReturnType<typeof setTimeout> | undefined
  #drag: Drag | undefined
  #frame = 0
  readonly #observer = new MutationObserver(() => this.#sync())

  constructor() {
    super()
    this.label = undefined
    this.readonly = false
    // タッチのドラッグ中は、画面のスクロールを止める(passive: false が要る。始まる前に登録しておく)
    this.addEventListener('touchmove', (e) => this.#drag && e.cancelable && e.preventDefault(), {
      passive: false,
    })
    this.addEventListener('contextmenu', (e) => (this.#press || this.#drag) && e.preventDefault())
  }

  /** 列 */
  get columns(): JimbleKanbanColumn[] {
    return [...this.children].filter(
      (c): c is JimbleKanbanColumn => c instanceof JimbleKanbanColumn,
    )
  }
  /** すべてのカード（列の順、列の中の順） */
  get cards(): JimbleKanbanCard[] {
    return this.columns.flatMap((c) => c.cards)
  }
  /** 並びの現在の状態。列の value をキー、カードの value の並びを値にする */
  get board(): Record<string, string[]> {
    return Object.fromEntries(
      this.columns.map((c, i) => [keyOf(c.value, i), c.cards.map((k, j) => keyOf(k.value, j))]),
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#observer.observe(this, { childList: true, subtree: true })
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer.disconnect()
    this.#endDrag(false)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'group'
    this.internals.ariaLabel = this.label ?? null
    this.#sync()
  }

  /** 子の状態(フォーカスの入口・移動先の表示・読み取り専用)を、列とカードへ反映する */
  #sync() {
    const cards = this.cards
    if (!this.#active || !cards.includes(this.#active)) this.#active = cards[0]
    if (this.#moving && !cards.includes(this.#moving)) this.#moving = undefined
    const moving = this.#moving
    for (const card of cards) {
      card.readonly = this.readonly
      card.active = card === this.#active
      card.tabIndex = card.active ? 0 : -1
      card.moving = card === moving
      // 動かすカードの直前(いまと同じ位置)と、そのカード自身には、受け口を出さない
      card.targeting = !!moving && card !== moving && card.previousElementSibling !== moving
    }
    for (const column of this.columns) {
      const last = column.cards.at(-1)
      column.targeting = !!moving && last !== moving
    }
  }

  #announce(text: string) {
    this.#announcement = text
    this.requestUpdate()
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, ANNOUNCE_MS)
  }

  #columnOf(card: JimbleKanbanCard) {
    return card.parentElement instanceof JimbleKanbanColumn ? card.parentElement : undefined
  }
  #cardIn(path: EventTarget[]) {
    const card = path.find(isCard)
    return card && this.#columnOf(card)?.parentElement === this ? card : undefined
  }
  #titleOf(column: JimbleKanbanColumn) {
    return column.heading ?? column.value ?? ''
  }

  /**
   * カードを column の index 番目(動かすカードを除いた並びでの位置)へ動かす。
   * `jimble-card-move` がキャンセルされたら動かさない。動かしたら true。
   */
  #commit({ card, column, index }: Move): boolean {
    const from = this.#columnOf(card)
    if (!from || this.readonly || card.locked) return false
    const others = column.cards.filter((c) => c !== card)
    const at = Math.min(Math.max(index, 0), others.length)
    if (from === column && from.cards.indexOf(card) === at) return false
    const event = this.emit('card-move', {
      cancelable: true,
      detail: {
        value: keyOf(card.value, this.cards.indexOf(card)),
        card,
        from: keyOf(from.value, this.columns.indexOf(from)),
        to: keyOf(column.value, this.columns.indexOf(column)),
        index: at,
      },
    })
    if (event.defaultPrevented) {
      this.#announce(this.t('kanban.rejected', { title: card.cardTitle }))
      return false
    }
    // 要素を入れ替えるとフォーカスが外れるので、動かす前の位置を覚えて戻す
    const inner = card.matches(':focus-within') ? card.shadowRoot?.activeElement : undefined
    const focused = card.matches(':focus-within')
    column.insertBefore(card, others[at] ?? null)
    if (focused) ((inner as HTMLElement | null | undefined) ?? card).focus({ preventScroll: true })
    this.#active = card
    this.#sync()
    this.#announce(
      this.t('kanban.moved', {
        title: card.cardTitle,
        column: this.#titleOf(column),
        total: column.cards.length,
        pos: column.cards.indexOf(card) + 1,
      }),
    )
    return true
  }

  // ---- 移動ボタン(移動先を選ぶ) ----
  #startMove(card: JimbleKanbanCard) {
    this.#moving = card
    this.#sync()
    this.#announce(this.t('kanban.moveStart', { title: card.cardTitle }))
  }
  #cancelMove(announce = true) {
    if (!this.#moving) return
    this.#moving = undefined
    this.#sync()
    if (announce) this.#announce(this.t('kanban.moveCancel'))
  }

  #onClick = (e: MouseEvent) => {
    const path = e.composedPath()
    const part = path.find(
      (n): n is HTMLElement =>
        n instanceof HTMLElement && n.matches('button[part="move"], button[part="target"]'),
    )
    if (!part || this.readonly) return
    const card = this.#cardIn(path)
    const column = path.find((n): n is JimbleKanbanColumn => n instanceof JimbleKanbanColumn)
    const moving = this.#moving
    if (part.getAttribute('part') === 'move' && card && !card.locked) {
      if (moving === card) this.#cancelMove()
      else this.#startMove(card)
    } else if (part.getAttribute('part') === 'target' && moving) {
      this.#moving = undefined
      // 受け口がカードの中なら、そのカードの前へ。列の末尾なら、その列の最後へ
      const target = card && card !== moving ? card : undefined
      const dest = target ? this.#columnOf(target) : column
      if (dest) {
        const index = target
          ? dest.cards.filter((c) => c !== moving).indexOf(target)
          : dest.cards.length
        this.#commit({ card: moving, column: dest, index })
      }
      this.#sync()
    }
  }

  // ---- キーボード ----
  #shift(card: JimbleKanbanCard, dx: number, dy: number) {
    const column = this.#columnOf(card)!
    const columns = this.columns
    const at = column.cards.indexOf(card)
    if (dy) return this.#commit({ card, column, index: at + dy })
    const dest = columns[columns.indexOf(column) + dx]
    if (dest) this.#commit({ card, column: dest, index: at })
  }

  /** 矢印キーでのフォーカス移動(↑↓ は列の中、←→ は隣のカードのある列の、同じ位置に近いカード) */
  #focusNeighbor(card: JimbleKanbanCard, dx: number, dy: number) {
    const column = this.#columnOf(card)!
    const at = column.cards.indexOf(card)
    if (dy) return column.cards[at + dy]?.focus()
    const columns = this.columns
    for (let i = columns.indexOf(column) + dx; i >= 0 && i < columns.length; i += dx) {
      const list = columns[i]!.cards
      if (list.length) return list[Math.min(at, list.length - 1)]!.focus()
    }
  }

  #onKeydown = (e: KeyboardEvent) => {
    if (e.isComposing) return
    const path = e.composedPath()
    const card = this.#cardIn(path)
    if (e.key === 'Escape') {
      if (this.#drag) return // ドラッグ中の Esc は window 側で受ける
      if (this.#moving) {
        e.preventDefault()
        e.stopPropagation()
        this.#cancelMove()
      }
      return
    }
    if (!card) return
    const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      e.key as 'ArrowLeft'
    ]
    if (arrow && e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      if (!this.readonly && !card.locked) this.#shift(card, arrow[0]!, arrow[1]!)
      return
    }
    // 以降は、カード自身にフォーカスがあるときだけ(中のリンクや入力欄の操作は邪魔しない)
    if (path[0] !== card || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    if (arrow) {
      e.preventDefault()
      this.#focusNeighbor(card, arrow[0]!, arrow[1]!)
    } else if ((e.key === ' ' || e.key === 'Enter') && !this.readonly && !card.locked) {
      e.preventDefault()
      if (this.#moving === card) this.#cancelMove()
      else this.#startMove(card)
    }
  }

  #onFocusin = (e: FocusEvent) => {
    const card = this.#cardIn(e.composedPath())
    if (card && card !== this.#active) {
      this.#active = card
      this.#sync()
    }
  }

  // ---- ドラッグ ----
  #onPointerDown = (e: PointerEvent) => {
    if (this.readonly || e.button !== 0 || !e.isPrimary || this.#press || this.#drag) return
    const path = e.composedPath()
    const card = this.#cardIn(path)
    if (!card || card.locked) return
    const inside = path.slice(0, path.indexOf(card))
    if (inside.some((n) => n instanceof Element && n.matches(INTERACTIVE))) return
    const touch = e.pointerType === 'touch'
    this.#press = { card, id: e.pointerId, x: e.clientX, y: e.clientY, touch }
    window.addEventListener('pointermove', this.#onPointerMove)
    window.addEventListener('pointerup', this.#onPointerUp)
    window.addEventListener('pointercancel', this.#onPointerCancel)
    if (touch)
      this.#pressTimer = setTimeout(() => this.#beginDrag(e.clientX, e.clientY), LONG_PRESS)
  }

  #onPointerMove = (e: PointerEvent) => {
    const press = this.#press
    if (!press || e.pointerId !== press.id) return
    if (this.#drag) {
      this.#drag.x = e.clientX
      this.#drag.y = e.clientY
      this.#updateDrag()
      return
    }
    const distance = Math.hypot(e.clientX - press.x, e.clientY - press.y)
    if (press.touch) {
      if (distance > LONG_PRESS_SLOP) this.#releasePress() // 長押しの前に動いた = スクロール
    } else if (distance >= DRAG_DISTANCE) this.#beginDrag(e.clientX, e.clientY)
  }
  #onPointerUp = (e: PointerEvent) => {
    if (this.#press && e.pointerId === this.#press.id) this.#endDrag(true)
  }
  #onPointerCancel = (e: PointerEvent) => {
    if (this.#press && e.pointerId === this.#press.id) this.#endDrag(false)
  }
  #onWindowKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.#drag) {
      e.preventDefault()
      e.stopPropagation()
      this.#endDrag(false)
      this.#announce(this.t('kanban.moveCancel'))
    }
  }

  #releasePress() {
    clearTimeout(this.#pressTimer)
    this.#press = undefined
    window.removeEventListener('pointermove', this.#onPointerMove)
    window.removeEventListener('pointerup', this.#onPointerUp)
    window.removeEventListener('pointercancel', this.#onPointerCancel)
  }

  #board() {
    return this.renderRoot.querySelector<HTMLElement>('[part="board"]')
  }

  #beginDrag(x: number, y: number) {
    const press = this.#press
    if (!press || this.#drag) return
    this.#cancelMove(false)
    const column = this.#columnOf(press.card)
    if (!column) return this.#releasePress()
    this.#drag = {
      card: press.card,
      column,
      index: column.cards.indexOf(press.card),
      x0: x,
      y0: y,
      x,
      y,
      scrollLeft0: this.#board()?.scrollLeft ?? 0,
      scrollTop0: window.scrollY,
    }
    press.card.dragging = true
    getSelection()?.removeAllRanges()
    window.addEventListener('keydown', this.#onWindowKeydown, true)
    this.#frame = requestAnimationFrame(this.#tick)
  }

  /** ドラッグ中、端に近ければスクロールして、カードの位置と挿入位置を更新する */
  #tick = () => {
    const drag = this.#drag
    if (!drag) return
    const board = this.#board()
    if (board) {
      const r = board.getBoundingClientRect()
      if (drag.x < r.left + EDGE) board.scrollLeft -= SCROLL_STEP
      else if (drag.x > r.right - EDGE) board.scrollLeft += SCROLL_STEP
    }
    if (drag.y < EDGE) window.scrollBy(0, -SCROLL_STEP)
    else if (drag.y > window.innerHeight - EDGE) window.scrollBy(0, SCROLL_STEP)
    this.#updateDrag()
    this.#frame = requestAnimationFrame(this.#tick)
  }

  #updateDrag() {
    const drag = this.#drag
    if (!drag) return
    const { card, x, y } = drag
    const dx = x - drag.x0 + ((this.#board()?.scrollLeft ?? 0) - drag.scrollLeft0)
    const dy = y - drag.y0 + (window.scrollY - drag.scrollTop0)
    card.style.translate = `${dx}px ${dy}px`
    // ポインターの下の列(なければ横方向にいちばん近い列)と、その中の挿入位置
    const columns = this.columns
    const distance = (c: JimbleKanbanColumn) => {
      const r = c.getBoundingClientRect()
      return x < r.left ? r.left - x : x > r.right ? x - r.right : 0
    }
    const column = columns.reduce((a, b) => (distance(b) < distance(a) ? b : a), columns[0]!)
    const others = column.cards.filter((c) => c !== card)
    const before = others.findIndex((c) => {
      const r = c.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    drag.column = column
    drag.index = before < 0 ? others.length : before
    for (const c of columns) {
      c.over = c === column
      c.dropEnd = c === column && drag.index >= others.length
    }
    for (const c of this.cards)
      c.dropBefore = c !== card && c === others[drag.index] && c.parentElement === column
  }

  #endDrag(commit: boolean) {
    const drag = this.#drag
    cancelAnimationFrame(this.#frame)
    this.#releasePress()
    window.removeEventListener('keydown', this.#onWindowKeydown, true)
    if (!drag) return
    this.#drag = undefined
    drag.card.style.translate = ''
    drag.card.dragging = false
    for (const c of this.columns) {
      c.over = false
      c.dropEnd = false
    }
    for (const c of this.cards) c.dropBefore = false
    // ドラッグのあとに出る click(リンクやカード全体の操作)は、止める
    const stop = (e: Event) => e.stopPropagation()
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
    if (commit) this.#commit(drag)
  }

  protected override render() {
    return html`<div part="base">
      <div
        part="board"
        class="flex items-start gap-(--jimble-kanban-gap,calc(var(--spacing)*4)) overflow-x-auto p-1 pb-3"
        @click=${this.#onClick}
        @keydown=${this.#onKeydown}
        @focusin=${this.#onFocusin}
        @pointerdown=${this.#onPointerDown}
      >
        <slot @slotchange=${() => this.#sync()}></slot>
      </div>
      <div role="status" class="sr-only">${this.#announcement}</div>
    </div>`
  }
}
JimbleKanban.define('jimble-kanban')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-kanban': JimbleKanban
  }
  interface HTMLElementEventMap {
    'jimble-card-move': CustomEvent<{
      value: string
      card: JimbleKanbanCard
      from: string
      to: string
      index: number
    }>
  }
}
