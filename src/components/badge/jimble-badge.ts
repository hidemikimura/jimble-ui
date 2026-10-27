import { html } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-sunken text-fg-secondary ring-line-control/20',
  primary: 'bg-surface-accent text-fg-accent ring-icon-accent/20',
  success: 'bg-surface-success text-fg-success ring-icon-success/20',
  warning: 'bg-surface-warning text-fg-warning ring-icon-warning/20',
  danger: 'bg-surface-danger text-fg-danger ring-icon-danger/20',
  info: 'bg-surface-info text-fg-info ring-icon-info/20',
}
const SIZE: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs gap-1',
  md: 'px-2 py-1 text-sm gap-1.5',
}
const BASE =
  'inline-flex items-center whitespace-nowrap font-medium ring-1 ring-inset outline outline-1 ' +
  'outline-transparent [border-radius:var(--jimble-badge-radius,var(--radius-md))]'

/**
 * 状態やカテゴリを示す小さなラベル。色だけで意味を伝えないよう、必ず文字を含めること。
 *
 * @tag jimble-badge
 *
 * @slot - ラベル
 * @slot prefix - ラベルの前のアイコンなど
 *
 * @csspart base - ルート要素
 * @csspart prefix - prefix スロットを包む要素
 * @csspart label - ラベルを包む要素
 *
 * @cssprop [--jimble-badge-radius=var(--jimble-radius-md)] - 角丸
 */
export class JimbleBadge extends JimbleElement {
  static override properties = {
    variant: { reflect: true },
    size: { reflect: true },
  }

  /** 意味（トーン）。未知の値は neutral にフォールバックする */
  declare variant: BadgeVariant
  declare size: BadgeSize

  #slots = new SlotController(this)

  constructor() {
    super()
    this.variant = 'neutral'
    this.size = 'md'
  }

  protected override render() {
    const classes = `${BASE} ${VARIANT[this.variant] ?? VARIANT.neutral} ${SIZE[this.size] ?? SIZE.md}`
    return html`<span part="base" class=${classes}
      ><span part="prefix" class=${this.#slots.hasSlot('prefix') ? 'inline-flex' : 'hidden'}
        ><slot name="prefix"></slot></span
      ><span part="label"><slot></slot></span
    ></span>`
  }
}

JimbleBadge.define('jimble-badge')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-badge': JimbleBadge
  }
}
