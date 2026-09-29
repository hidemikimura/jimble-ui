import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { chevronDown } from '../../icons/chevronDown.js'
import { renderIcon } from '../../icons/render.js'

const LINK =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline outline ' +
  'outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * サイドバーのナビゲーション。`jimble-nav-item`（リンク）と `jimble-nav-group`（折りたたみ）を並べる。
 * `nav` ランドマークで、名前は `label`（既定「メインメニュー」）。
 *
 * @tag jimble-sidebar-nav
 *
 * @slot - jimble-nav-item / jimble-nav-group
 *
 * @csspart base - nav 要素
 * @csspart list - 項目を並べる領域
 */
export class JimbleSidebarNav extends JimbleElement {
  static override properties: PropertyDeclarations = { label: {} }

  declare label: string | undefined

  protected override render() {
    return html`<nav part="base" aria-label=${this.label ?? this.t('nav.label')}>
      <div part="list" role="list" class="flex flex-col gap-0.5"><slot></slot></div>
    </nav>`
  }
}
JimbleSidebarNav.define('jimble-sidebar-nav')

/**
 * ナビゲーションの項目（リンク）。現在のページは `current`（`aria-current="page"`）。
 *
 * @tag jimble-nav-item
 *
 * @slot - 項目の文字
 * @slot icon - 前に置くアイコン
 *
 * @csspart link - a 要素
 */
export class JimbleNavItem extends JimbleElement {
  static override properties: PropertyDeclarations = {
    href: {},
    current: { type: Boolean, reflect: true },
    target: {},
  }

  declare href: string | undefined
  /** 現在のページ */
  declare current: boolean
  declare target: string | undefined

  #slots = new SlotController(this)

  constructor() {
    super()
    this.href = undefined
    this.current = false
    this.target = undefined
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    this.setState('current', this.current)
  }

  protected override render() {
    return html`<a
      part="link"
      class="${LINK} ${
        this.current ? 'bg-primary-50 text-primary-700' : 'text-fg hover:bg-surface-sunken'
      }"
      href=${ifDefined(this.href)}
      target=${ifDefined(this.target)}
      rel=${ifDefined(this.target === '_blank' ? 'noopener' : undefined)}
      aria-current=${this.current ? 'page' : nothing}
    >
      <span class=${this.#slots.hasSlot('icon') ? 'inline-flex shrink-0 text-fg-muted' : 'hidden'}
        ><slot name="icon"></slot
      ></span>
      <span class="min-w-0 flex-1 truncate"><slot></slot></span>
    </a>`
  }
}
JimbleNavItem.define('jimble-nav-item')

let groupSeq = 0

/**
 * 折りたためる項目のまとまり（disclosure パターン）。見出しのボタンで開閉する。
 * 中に現在のページ（`current` の項目）があると、最初から開く。
 *
 * @tag jimble-nav-group
 *
 * @slot - jimble-nav-item
 * @slot icon - 見出しの前のアイコン
 *
 * @csspart button - 見出しのボタン
 * @csspart panel - 項目の領域
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close - 閉じた
 */
export class JimbleNavGroup extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    open: { type: Boolean, reflect: true },
  }

  declare label: string
  declare open: boolean

  #slots = new SlotController(this)
  #id = `jimble-nav-group-${++groupSeq}`
  #initialized = false

  constructor() {
    super()
    this.label = ''
    this.open = false
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.#initialized) {
      this.#initialized = true
      if (this.querySelector('jimble-nav-item[current]')) this.open = true
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    if (changed.has('open') && changed.get('open') !== undefined)
      this.emit(this.open ? 'open' : 'close')
  }

  protected override render() {
    return html`<button
        part="button"
        type="button"
        class="${LINK} text-fg hover:bg-surface-sunken cursor-pointer"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${this.#id}
        @click=${() => (this.open = !this.open)}
      >
        <span class=${this.#slots.hasSlot('icon') ? 'inline-flex shrink-0 text-fg-muted' : 'hidden'}
          ><slot name="icon"></slot
        ></span>
        <span class="min-w-0 flex-1 truncate text-left">${this.label}</span>
        <span
          class="inline-flex shrink-0 text-fg-muted ${this.open ? 'rotate-180' : ''}"
          aria-hidden="true"
          >${renderIcon(chevronDown, 'size-4')}</span
        >
      </button>
      <div
        part="panel"
        id=${this.#id}
        role="list"
        class=${this.open ? 'mt-0.5 flex flex-col gap-0.5 ps-3' : 'hidden'}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>`
  }
}
JimbleNavGroup.define('jimble-nav-group')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-sidebar-nav': JimbleSidebarNav
    'jimble-nav-item': JimbleNavItem
    'jimble-nav-group': JimbleNavGroup
  }
}
