import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'

export type MenuItemVariant = 'default' | 'danger'

const BASE =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm select-none cursor-default ' +
  'outline outline-1 outline-transparent hover:bg-surface-sunken [:host(:focus)_&]:bg-surface-sunken'
const VARIANT: Record<MenuItemVariant, string> = { default: 'text-fg', danger: 'text-danger-700' }

/**
 * メニューの項目。`jimble-dropdown-menu` の直接の子として使う。ロール(menuitem)は host が持ち、
 * フォーカスの移動・選択は親のメニューが管理する。`href` があるとリンクとして遷移する。
 *
 * @tag jimble-menu-item
 *
 * @slot - 項目の内容
 * @slot prefix - 前のアイコンなど
 *
 * @csspart base - ルート要素
 * @csspart link - href があるときの a 要素
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
    if (this.disabled) return
    this.renderRoot.querySelector<HTMLAnchorElement>('a')?.click()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'menuitem'
    this.internals.ariaDisabled = this.disabled ? 'true' : null
  }

  protected override render() {
    const classes = `${BASE} ${VARIANT[this.variant] ?? VARIANT.default} ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''}`
    const content = html`<slot name="prefix"></slot><slot></slot>`
    return this.href && !this.disabled
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
    return html`<div part="base" class="my-1 h-px bg-line" aria-hidden="true"></div>`
  }
}

JimbleMenuSeparator.define('jimble-menu-separator')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-menu-item': JimbleMenuItem
    'jimble-menu-separator': JimbleMenuSeparator
  }
}
