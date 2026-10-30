import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { renderIcon } from '../../icons/render.js'

export type MenuItemVariant = 'default' | 'danger'

/** メニューの面(ドロップダウンメニューと、サブメニューで共通) */
export const MENU =
  'max-h-[min(24rem,50dvh)] min-w-40 overflow-auto border-0 bg-surface-overlay p-1 text-fg ' +
  'shadow-lg ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-menu-radius,var(--radius-overlay))]'

const BASE =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm select-none cursor-default ' +
  'outline outline-1 outline-transparent hover:bg-item-hover [:host(:focus)_&]:bg-item-hover'
const VARIANT: Record<MenuItemVariant, string> = { default: 'text-fg', danger: 'text-fg-danger' }

/**
 * メニューの項目。`jimble-dropdown-menu` の直接の子として使う。ロール(menuitem)は host が持ち、
 * フォーカスの移動・選択は親のメニューが管理する。`href` があるとリンクとして遷移する。
 *
 * 子に `slot="submenu"` の `jimble-menu-item` を置くと、その項目はサブメニューを開く項目になる
 * （右に矢印が付き、選んでも `jimble-select` は出ない。サブメニューの中で、さらに入れ子にできる）。
 *
 * @tag jimble-menu-item
 *
 * @slot - 項目の内容
 * @slot prefix - 前のアイコンなど
 * @slot submenu - サブメニューの項目（`jimble-menu-item` / `jimble-menu-separator`）
 *
 * @csspart base - ルート要素
 * @csspart link - href があるときの a 要素
 * @csspart submenu - サブメニューの面(role="menu")
 */
export class JimbleMenuItem extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    href: {},
    target: {},
    variant: { reflect: true },
  }

  /** `jimble-select` イベントの detail.value になる値 */
  declare value: string
  declare disabled: boolean
  /** 指定すると、選択時にそのアドレスへ遷移する */
  declare href: string | undefined
  declare target: string | undefined
  /** 破壊的な操作(削除など)は danger */
  declare variant: MenuItemVariant

  constructor() {
    super()
    this.value = ''
    this.disabled = false
    this.href = undefined
    this.target = undefined
    this.variant = 'default'
  }

  /** 項目の選択に伴う動作(href への遷移)を行う。イベントの発火・メニューを閉じるのは親が行う */
  activate(): void {
    if (this.disabled || this.hasSubmenu) return
    this.renderRoot.querySelector<HTMLAnchorElement>('a')?.click()
  }

  // ---- サブメニュー ----------------------------------------------------------------------
  /** サブメニューの項目(子の、`slot="submenu"` の `jimble-menu-item`) */
  get submenuItems(): JimbleMenuItem[] {
    return [...this.children].filter(
      (e): e is JimbleMenuItem =>
        e.localName === 'jimble-menu-item' && e.getAttribute('slot') === 'submenu',
    )
  }
  get hasSubmenu(): boolean {
    return this.submenuItems.length > 0
  }
  get submenuOpen(): boolean {
    return this.#submenu?.matches(':popover-open') ?? false
  }
  /** 項目の文字(サブメニューの中・prefix のアイコンを除く)。先頭文字検索に使う */
  get text(): string {
    return [...this.childNodes]
      .filter((n) => !(n instanceof Element && n.hasAttribute('slot')))
      .map((n) => n.textContent ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
  }
  get #submenu(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="submenu"]') ?? null
  }

  /** サブメニューを開く(フォーカスは移さない。移すのは親のメニュー) */
  showSubmenu(): void {
    const menu = this.#submenu
    if (this.disabled || !this.hasSubmenu || !menu || this.submenuOpen) return
    menu.showPopover()
  }
  /** サブメニューを閉じる(入れ子のサブメニューも) */
  hideSubmenu(): void {
    for (const item of this.submenuItems) item.hideSubmenu()
    if (this.submenuOpen) this.#submenu!.hidePopover()
  }
  #onSubmenuToggle = (e: Event) => {
    // 外側のクリックなどで閉じたときも、入れ子を閉じて、aria-expanded を合わせる
    if ((e as ToggleEvent).newState === 'closed') for (const i of this.submenuItems) i.hideSubmenu()
    this.requestUpdate()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const sub = this.hasSubmenu
    this.internals.role = 'menuitem'
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.internals.ariaHasPopup = sub ? 'menu' : null
    this.internals.ariaExpanded = sub ? String(this.submenuOpen) : null
    if (!sub && this.submenuOpen) this.#submenu!.hidePopover()
  }

  protected override render() {
    const sub = this.hasSubmenu
    const classes = `${BASE} ${VARIANT[this.variant] ?? VARIANT.default} ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''}`
    const content = html`<slot name="prefix"></slot><slot></slot>${
        sub ? renderIcon(chevronRight, 'ms-auto size-4 shrink-0 text-fg-muted') : nothing
      }`
    // サブメニューの面には名前を付けない。付けると、開いている間、親の項目の名前(中身から決まる)に
    // その名前が加わる(Chromium で「共有 共有」になった)
    const submenu = html`<div
      part="submenu"
      popover="auto"
      role="menu"
      class=${MENU}
      @toggle=${this.#onSubmenuToggle}
    >
      <slot name="submenu" @slotchange=${() => this.requestUpdate()}></slot>
    </div>`
    const item =
      this.href && !this.disabled && !sub
        ? html`<a
            part="base link"
            class=${classes}
            role="none"
            tabindex="-1"
            href=${this.href}
            target=${ifDefined(this.target)}
            rel=${ifDefined(this.target === '_blank' ? 'noopener' : undefined)}
            >${content}</a
          >`
        : html`<span part="base" class=${classes}>${content}</span>`
    return html`${item}${submenu}`
  }
}

JimbleMenuItem.define('jimble-menu-item')

/**
 * メニューの区切り線。
 *
 * @tag jimble-menu-separator
 * @csspart base - 線
 */
export class JimbleMenuSeparator extends JimbleElement {
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'separator'
  }
  protected override render() {
    return html`<div part="base" class="my-1 h-px bg-line-divider" aria-hidden="true"></div>`
  }
}

JimbleMenuSeparator.define('jimble-menu-separator')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-menu-item': JimbleMenuItem
    'jimble-menu-separator': JimbleMenuSeparator
  }
}
