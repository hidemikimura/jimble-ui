import { html, nothing } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { checkCircle } from '../../icons/checkCircle.js'
import { exclamationTriangle } from '../../icons/exclamationTriangle.js'
import { informationCircle } from '../../icons/informationCircle.js'
import { renderIcon, type Icon } from '../../icons/render.js'
import { xCircle } from '../../icons/xCircle.js'
import { xMark } from '../../icons/xMark.js'
import type { MessageKey } from '../../i18n/index.js'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

const VARIANT: Record<AlertVariant, string> = {
  info: 'bg-info-50 text-info-800 ring-info-600/20',
  success: 'bg-success-50 text-success-800 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-800 ring-warning-600/20',
  danger: 'bg-danger-50 text-danger-800 ring-danger-600/20',
}
const ICON_COLOR: Record<AlertVariant, string> = {
  info: 'text-info-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
}
const ICON: Record<AlertVariant, Icon> = {
  info: informationCircle,
  success: checkCircle,
  warning: exclamationTriangle,
  danger: xCircle,
}
const LABEL: Record<AlertVariant, MessageKey> = {
  info: 'alert.info',
  success: 'alert.success',
  warning: 'alert.warning',
  danger: 'alert.danger',
}
const BASE =
  'flex items-start gap-3 p-(--jimble-alert-padding,calc(var(--spacing)*4)) ring-1 ring-inset ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-alert-radius,var(--radius-card))]'
const CLOSE =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md cursor-pointer ' +
  'text-current hover:bg-black/5 outline outline-1 outline-transparent ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus'

/**
 * ページ内の通知。danger / warning は role="alert"（即時に読み上げ）、それ以外は role="status"。
 * 色だけで種別を伝えないよう、種別名（「エラー」など）を視覚的に隠したテキストで補う。
 *
 * @tag jimble-alert
 *
 * @slot - 本文
 * @slot title - 見出し
 * @slot icon - アイコンの差し替え
 * @slot actions - 本文の下に置く操作
 *
 * @csspart base - ルート要素
 * @csspart icon - アイコン領域
 * @csspart content - 見出し・本文・操作を包む領域
 * @csspart title - 見出し
 * @csspart body - 本文
 * @csspart actions - 操作領域
 * @csspart close-button - 閉じるボタン
 *
 * @cssprop [--jimble-alert-radius=var(--jimble-radius-card)] - 角丸
 * @cssprop [--jimble-alert-padding=4 単位(1rem)] - 内側の余白
 *
 * @fires jimble-dismiss - 閉じるボタンが押された。preventDefault() すると閉じない
 */
export class JimbleAlert extends JimbleElement {
  static override properties = {
    variant: { reflect: true },
    dismissible: { type: Boolean, reflect: true },
  }

  /** 種別。未知の値は info にフォールバックする */
  declare variant: AlertVariant
  /** 閉じるボタンを表示する。押すと host に hidden が付く */
  declare dismissible: boolean

  #slots = new SlotController(this)

  constructor() {
    super()
    this.variant = 'info'
    this.dismissible = false
  }

  #dismiss = () => {
    const event = this.emit('dismiss', { cancelable: true })
    if (!event.defaultPrevented) this.hidden = true
  }

  protected override render() {
    const variant: AlertVariant = this.variant in VARIANT ? this.variant : 'info'
    const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status'
    const hasTitle = this.#slots.hasSlot('title')
    const hasActions = this.#slots.hasSlot('actions')
    return html`<div part="base" class="${BASE} ${VARIANT[variant]}" role=${role}>
      <span part="icon" class="mt-0.5 inline-flex shrink-0 ${ICON_COLOR[variant]}"
        ><slot name="icon">${renderIcon(ICON[variant], 'size-5')}</slot></span
      >
      <div part="content" class="min-w-0 flex-1 text-sm">
        <span class="sr-only">${this.t(LABEL[variant])}: </span>
        <div part="title" class=${hasTitle ? 'font-semibold' : 'hidden'}>
          <slot name="title"></slot>
        </div>
        <div part="body" class=${hasTitle ? 'mt-1' : ''}><slot></slot></div>
        <div part="actions" class=${hasActions ? 'mt-3 flex gap-2' : 'hidden'}>
          <slot name="actions"></slot>
        </div>
      </div>
      ${
        this.dismissible
          ? html`<button
              part="close-button"
              type="button"
              class=${CLOSE}
              aria-label=${this.t('alert.dismiss')}
              @click=${this.#dismiss}
            >
              ${renderIcon(xMark, 'size-5')}
            </button>`
          : nothing
      }
    </div>`
  }
}

JimbleAlert.define('jimble-alert')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-alert': JimbleAlert
  }
  interface HTMLElementEventMap {
    'jimble-dismiss': CustomEvent<undefined>
  }
}
