import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { renderIcon } from '../../icons/render.js'

const LINK =
  'rounded-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline outline outline-1 ' +
  'outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

/**
 * パンくずリスト。現在のページを最後に置く。`jimble-breadcrumb-item` を並べる。
 *
 * @tag jimble-breadcrumb
 *
 * @slot - jimble-breadcrumb-item
 *
 * @csspart base - nav 要素
 * @csspart list - 項目を並べる領域
 */
export class JimbleBreadcrumb extends JimbleElement {
  static override properties: PropertyDeclarations = { label: {} }

  /** nav の名前。省略すると「パンくずリスト」（辞書） */
  declare label: string | undefined

  protected override render() {
    return html`<nav part="base" aria-label=${this.label ?? this.t('breadcrumb.label')}>
      <div part="list" role="list" class="flex flex-wrap items-center gap-y-1 text-sm">
        <slot></slot>
      </div>
    </nav>`
  }
}
JimbleBreadcrumb.define('jimble-breadcrumb')

/**
 * パンくずの 1 項目。`href` があればリンク。`href` が無い最後の項目（または `current`）は現在のページ。
 *
 * @tag jimble-breadcrumb-item
 *
 * @slot - 項目の文字
 *
 * @csspart base - ルート要素
 * @csspart separator - 区切りのアイコン
 * @csspart link - リンク
 * @csspart current - 現在のページ
 */
export class JimbleBreadcrumbItem extends JimbleElement {
  static override properties: PropertyDeclarations = {
    href: {},
    current: { type: Boolean, reflect: true },
  }

  declare href: string | undefined
  /** 現在のページ（aria-current="page"） */
  declare current: boolean

  constructor() {
    super()
    this.href = undefined
    this.current = false
  }

  get #isCurrent(): boolean {
    return this.current || (!this.href && !this.nextElementSibling)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
  }

  protected override render() {
    const current = this.#isCurrent
    return html`<span part="base" class="inline-flex items-center"
      ><span part="separator" class="mx-1.5 text-fg-muted" aria-hidden="true"
        >${renderIcon(chevronRight, 'size-4')}</span
      >${
        this.href && !current
          ? html`<a part="link" class=${LINK} href=${ifDefined(this.href)}><slot></slot></a>`
          : html`<span
              part="current"
              class="font-medium text-fg"
              aria-current=${current ? 'page' : 'false'}
              ><slot></slot
            ></span>`
      }</span
    >`
  }
}
JimbleBreadcrumbItem.define('jimble-breadcrumb-item')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-breadcrumb': JimbleBreadcrumb
    'jimble-breadcrumb-item': JimbleBreadcrumbItem
  }
}
