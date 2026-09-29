import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { ImeController } from '../../base/ime-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { Typeahead } from '../../base/typeahead.js'
import type { JimbleButton } from '../button/jimble-button.js'
import { JimbleMenuItem } from './jimble-menu-item.js'
import './jimble-menu-item.js'

export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
export type MenuCloseReason = 'escape' | 'action' | 'outside' | 'tab' | 'api'

const MENU =
  'max-h-[min(24rem,50dvh)] min-w-40 overflow-auto rounded-overlay border-0 bg-surface-overlay p-1 text-fg ' +
  'shadow-lg ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-menu-radius,var(--radius-overlay))]'

/** トリガーがポップアップを開くことを支援技術へ伝える。jimble-button は内部のボタンへ渡す */
export function applyPopupAria(
  trigger: Element | undefined,
  haspopup: string,
  expanded: boolean,
): void {
  if (!trigger) return
  if (trigger.localName === 'jimble-button') {
    const b = trigger as JimbleButton
    b.haspopup = haspopup
    b.expanded = expanded
  } else {
    trigger.setAttribute('aria-haspopup', haspopup)
    trigger.setAttribute('aria-expanded', String(expanded))
  }
}

/**
 * ドロップダウンメニュー(WAI-ARIA の menu button パターン)。トリガーは `trigger` スロットに置く。
 * メニューは Popover API のトップレイヤーに表示され、位置は CSS Anchor Positioning で決まる
 * （画面の端では反転する）。
 *
 * サブメニュー・チェック付き項目は未対応。
 *
 * @tag jimble-dropdown-menu
 *
 * @slot trigger - メニューを開くボタン(jimble-button など)
 * @slot - jimble-menu-item / jimble-menu-separator
 *
 * @csspart anchor - トリガーを包む要素(位置の基準)
 * @csspart menu - メニュー本体(role="menu")
 *
 * @cssprop [--jimble-menu-radius=var(--jimble-radius-overlay)] - 角丸
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close - 閉じた(reason)
 * @fires jimble-select - 項目が選ばれた(value, item)。preventDefault() するとメニューを閉じない
 */
export class JimbleDropdownMenu extends JimbleElement {
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    placement: { reflect: true },
    label: {},
  }

  declare open: boolean
  /** メニューを開く位置。画面に収まらないときは反転する */
  declare placement: MenuPlacement
  /** メニューの名前。省略するとトリガーの文字が使われる */
  declare label: string | undefined

  #ime = new ImeController(this)
  #typeahead = new Typeahead()
  #focusOnOpen: 'first' | 'last' = 'first'
  #reason: MenuCloseReason = 'outside'
  #wasOpenOnPointerDown = false
  #notified = false

  constructor() {
    super()
    this.open = false
    this.placement = 'bottom-start'
    this.label = undefined
  }

  get #menu(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="menu"]') ?? null
  }
  get #trigger(): HTMLElement | undefined {
    return this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.assignedElements({ flatten: true })[0] as HTMLElement | undefined
  }
  get items(): JimbleMenuItem[] {
    return (
      this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot:not([name])')
        ?.assignedElements({ flatten: true }) ?? []
    ).filter((e): e is JimbleMenuItem => e.localName === 'jimble-menu-item')
  }
  #enabled = () => this.items.filter((i) => !i.disabled)

  show(focus: 'first' | 'last' = 'first'): void {
    this.#focusOnOpen = focus
    this.open = true
  }
  hide(): void {
    this.#reason = 'api'
    this.open = false
  }
  toggle(): void {
    if (this.open) this.hide()
    else this.show()
  }

  #close(reason: MenuCloseReason, returnFocus: boolean) {
    this.#reason = reason
    if (returnFocus) this.#trigger?.focus()
    // 同期的に隠す。描画を待つと、Tab の既定動作が「まだ表示中の項目(tabindex=0)」へ移ってしまう
    const menu = this.#menu
    if (menu?.matches(':popover-open')) menu.hidePopover()
    this.open = false
  }

  // ---- トリガー ---------------------------------------------------------------------------
  // 開いているメニューのトリガーを押すと、ライトディスミスが先に閉じてから click が来る。
  // 再び開いてしまわないよう、押した時点の状態を覚えておく。
  #onTriggerPointerDown = () => {
    this.#wasOpenOnPointerDown = this.open
  }
  #onTriggerClick = () => {
    const wasOpen = this.#wasOpenOnPointerDown
    this.#wasOpenOnPointerDown = false
    if (wasOpen) return
    this.show('first')
  }
  #onTriggerKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.show(e.key === 'ArrowDown' ? 'first' : 'last')
    }
  }

  // ---- メニュー ---------------------------------------------------------------------------
  #focusItem(item: JimbleMenuItem | undefined) {
    if (!item) return
    for (const i of this.items) i.tabIndex = i === item ? 0 : -1
    item.focus()
  }

  #onMenuKeydown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const enabled = this.#enabled()
    const current = (e.target as Element).closest?.('jimble-menu-item') as JimbleMenuItem | null
    const at = current ? enabled.indexOf(current) : -1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.#focusItem(enabled[(at + 1) % enabled.length])
        return
      case 'ArrowUp':
        e.preventDefault()
        this.#focusItem(enabled[(at - 1 + enabled.length) % enabled.length])
        return
      case 'Home':
        e.preventDefault()
        this.#focusItem(enabled[0])
        return
      case 'End':
        e.preventDefault()
        this.#focusItem(enabled[enabled.length - 1])
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (current) this.#activate(current)
        return
      case 'Escape':
        e.preventDefault()
        this.#close('escape', true)
        return
      case 'Tab':
        // トリガーの次へ進む（APG）。フォーカスをトリガーに戻してから、既定の Tab に任せる
        this.#close('tab', true)
        return
    }
    if (Typeahead.isChar(e) && !this.#ime.isComposing(e)) {
      const hit = this.#typeahead.match(
        e.key,
        enabled,
        current ?? undefined,
        (i) => i.textContent ?? '',
      )
      if (hit) this.#focusItem(hit)
    }
  }

  #onMenuClick = (e: Event) => {
    const item = (e.target as Element).closest?.('jimble-menu-item') as JimbleMenuItem | null
    if (item && item.parentElement === this) this.#activate(item)
  }

  // マウスで指した項目にフォーカスを移す（ネイティブのメニューと同じ）
  #onPointerMove = (e: PointerEvent) => {
    const item = (e.target as Element).closest?.('jimble-menu-item') as JimbleMenuItem | null
    if (
      item &&
      !item.disabled &&
      this.shadowRoot?.activeElement !== item &&
      document.activeElement !== item
    ) {
      this.#focusItem(item)
    }
  }

  #activate(item: JimbleMenuItem) {
    if (item.disabled) return
    const event = this.emit('select', { detail: { value: item.value, item }, cancelable: true })
    item.activate()
    if (!event.defaultPrevented) this.#close('action', !item.href)
  }

  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen)
      this.open = isOpen // ライトディスミス(外側クリック・Esc)で閉じた
    else this.#afterToggle(isOpen)
  }

  #afterToggle(isOpen: boolean) {
    if (isOpen === this.#notified) return // 開閉の通知は 1 回だけ
    this.#notified = isOpen
    applyPopupAria(this.#trigger, 'menu', isOpen)
    if (isOpen) {
      const enabled = this.#enabled()
      this.#focusItem(this.#focusOnOpen === 'last' ? enabled[enabled.length - 1] : enabled[0])
      this.emit('open')
    } else {
      this.emit('close', { detail: { reason: this.#reason } })
      this.#reason = 'outside'
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const menu = this.#menu
    if (!menu) return
    if (changed.has('open')) {
      const shown = menu.matches(':popover-open')
      if (this.open && !shown) menu.showPopover()
      else if (!this.open && shown) menu.hidePopover()
      else this.#afterToggle(this.open)
    }
    // 項目は roving tabindex（フォーカスは矢印キーで移す）
    for (const i of this.items) if (!i.hasAttribute('tabindex')) i.tabIndex = -1
    applyPopupAria(this.#trigger, 'menu', this.open)
  }

  #menuName(): string | undefined {
    return this.label || this.#trigger?.textContent?.trim() || undefined
  }

  protected override render() {
    return html`<span
        part="anchor"
        @pointerdown=${this.#onTriggerPointerDown}
        @click=${this.#onTriggerClick}
        @keydown=${this.#onTriggerKeydown}
        ><slot name="trigger" @slotchange=${() => this.requestUpdate()}></slot
      ></span>
      <div
        part="menu"
        popover="auto"
        role="menu"
        class=${MENU}
        aria-label=${ifDefined(this.#menuName())}
        @toggle=${this.#onToggle}
        @keydown=${this.#onMenuKeydown}
        @click=${this.#onMenuClick}
        @pointermove=${this.#onPointerMove}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>`
  }
}

JimbleDropdownMenu.define('jimble-dropdown-menu')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-dropdown-menu': JimbleDropdownMenu
  }
  interface HTMLElementEventMap {
    'jimble-select': CustomEvent<{ value: string; item: JimbleMenuItem }>
  }
}
