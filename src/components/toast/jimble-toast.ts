import { html, nothing, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { checkCircle } from '../../icons/checkCircle.js'
import { exclamationTriangle } from '../../icons/exclamationTriangle.js'
import { informationCircle } from '../../icons/informationCircle.js'
import { renderIcon, type Icon } from '../../icons/render.js'
import { xCircle } from '../../icons/xCircle.js'
import { xMark } from '../../icons/xMark.js'
import type { MessageKey } from '../../i18n/index.js'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

const ICON: Record<ToastVariant, Icon> = {
  info: informationCircle,
  success: checkCircle,
  warning: exclamationTriangle,
  danger: xCircle,
}
const ICON_COLOR: Record<ToastVariant, string> = {
  info: 'text-info-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
}
const LABEL: Record<ToastVariant, MessageKey> = {
  info: 'alert.info',
  success: 'alert.success',
  warning: 'alert.warning',
  danger: 'alert.danger',
}
/** 自動で消えるまでの既定の時間(ms)。0 は自動で消えない */
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  info: 5000,
  success: 5000,
  warning: 8000,
  danger: 0,
}

const BASE =
  'pointer-events-auto flex items-start gap-3 rounded-overlay bg-surface-overlay p-3 text-sm text-fg shadow-lg ' +
  'ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-toast-radius,var(--radius-overlay))]'
const CLOSE =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * 通知1件。通常は `toast()` が作って `jimble-toast-region` の中に置く。
 *
 * - `duration`（ms）が過ぎると自動で消える。マウスが乗っている間・フォーカスがある間は止まる。
 * - danger は既定で自動では消えない。操作（`actions`）がある通知も自動では消えない。
 *
 * @tag jimble-toast
 *
 * @slot - メッセージ
 * @slot title - 見出し
 * @slot actions - 操作ボタン
 *
 * @csspart base - ルート要素
 * @csspart icon - アイコン
 * @csspart content - 文字と操作を包む領域
 * @csspart title - 見出し
 * @csspart body - メッセージ
 * @csspart actions - 操作領域
 * @csspart close-button - 閉じるボタン
 *
 * @cssprop [--jimble-toast-radius=var(--jimble-radius-overlay)] - 角丸
 *
 * @fires jimble-dismiss - 閉じられた(自動・ボタンのどちらでも)
 */
export class JimbleToast extends JimbleElement {
  static override properties: PropertyDeclarations = {
    variant: { reflect: true },
    duration: { type: Number },
    dismissible: { type: Boolean, attribute: 'dismissible' },
  }

  declare variant: ToastVariant
  /** 自動で消えるまでの時間(ms)。省略すると種別ごとの既定値。0 は自動で消えない */
  declare duration: number | undefined
  /** 閉じるボタンを出す（既定 true） */
  declare dismissible: boolean

  #slots = new SlotController(this)
  #timer: ReturnType<typeof setTimeout> | undefined
  #remaining = 0
  #startedAt = 0
  #hovered = false

  constructor() {
    super()
    this.variant = 'info'
    this.duration = undefined
    this.dismissible = true
    this.addEventListener('pointerenter', () => {
      this.#hovered = true
      this.#pause()
    })
    this.addEventListener('pointerleave', () => {
      this.#hovered = false
      if (!this.matches(':focus-within')) this.#resume()
    })
    this.addEventListener('focusin', () => this.#pause())
    this.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!this.#hovered && !this.matches(':focus-within')) this.#resume()
      })
    })
  }

  get #effectiveDuration(): number {
    if (this.duration !== undefined) return this.duration
    if (this.#slots.hasSlot('actions')) return 0 // 操作がある通知は、押す前に消えてはいけない
    return DEFAULT_DURATION[this.variant] ?? 0
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#remaining = this.#effectiveDuration
    this.#resume()
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.#timer)
  }

  #pause() {
    if (!this.#timer) return
    clearTimeout(this.#timer)
    this.#timer = undefined
    this.#remaining = Math.max(0, this.#remaining - (Date.now() - this.#startedAt))
  }
  #resume() {
    if (this.#timer || this.#remaining <= 0) return
    this.#startedAt = Date.now()
    this.#timer = setTimeout(() => this.dismiss(), this.#remaining)
  }

  /** 通知を閉じる（取り除く） */
  dismiss(): void {
    clearTimeout(this.#timer)
    this.#timer = undefined
    this.emit('dismiss')
    this.remove()
  }

  protected override render() {
    const variant: ToastVariant = this.variant in ICON ? this.variant : 'info'
    const hasTitle = this.#slots.hasSlot('title')
    const hasActions = this.#slots.hasSlot('actions')
    return html`<div part="base" class=${BASE}>
      <span part="icon" class="mt-0.5 inline-flex shrink-0 ${ICON_COLOR[variant]}"
        >${renderIcon(ICON[variant], 'size-5')}</span
      >
      <div part="content" class="min-w-0 flex-1">
        <span class="sr-only">${this.t(LABEL[variant])}: </span>
        <div part="title" class=${hasTitle ? 'font-semibold' : 'hidden'}>
          <slot name="title"></slot>
        </div>
        <div part="body" class=${hasTitle ? 'mt-0.5 text-fg-muted' : ''}><slot></slot></div>
        <div part="actions" class=${hasActions ? 'mt-2 flex gap-2' : 'hidden'}>
          <slot name="actions"></slot>
        </div>
      </div>
      ${
        this.dismissible
          ? html`<button
              part="close-button"
              type="button"
              class=${CLOSE}
              aria-label=${this.t('toast.dismiss')}
              @click=${() => this.dismiss()}
            >
              ${renderIcon(xMark, 'size-4')}
            </button>`
          : nothing
      }
    </div>`
  }
}

JimbleToast.define('jimble-toast')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-toast': JimbleToast
  }
}
