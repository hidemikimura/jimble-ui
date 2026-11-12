import { html, nothing, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import type { MessageKey } from '../../i18n/index.js'
import { exclamationTriangle } from '../../icons/exclamationTriangle.js'
import { informationCircle } from '../../icons/informationCircle.js'
import { renderIcon, type Icon } from '../../icons/render.js'
import { xCircle } from '../../icons/xCircle.js'
import { xMark } from '../../icons/xMark.js'

export type BannerVariant = 'info' | 'warning' | 'danger'

// 塗りつぶした色。既定は private 変数（--_bg / --_fg）で持ち、公開変数 --jimble-banner-* が勝つ
const VARIANT: Record<BannerVariant, string> = {
  info: '[--_bg:var(--color-surface-inverse)] [--_fg:var(--color-fg-on-primary)]',
  warning: '[--_bg:var(--color-warning-300)] [--_fg:var(--color-neutral-900)]',
  danger: '[--_bg:var(--color-danger-600)] [--_fg:var(--color-fg-on-primary)]',
}
const ICON: Record<BannerVariant, Icon> = {
  info: informationCircle,
  warning: exclamationTriangle,
  danger: xCircle,
}
const LABEL: Record<BannerVariant, MessageKey> = {
  info: 'alert.info',
  warning: 'alert.warning',
  danger: 'alert.danger',
}
const BASE =
  'flex min-h-10 items-center gap-3 px-4 py-2 text-sm font-medium ' +
  'bg-(--jimble-banner-bg,var(--_bg)) [color:var(--jimble-banner-text,var(--_fg))] outline outline-1 outline-transparent'
// 中のリンク（直下の a）は、文字の色を引き継いで下線。フォーカスの輪は文字の色。
// 色と下線は !important にする: ページの a の色（通常の宣言）は ::slotted より強いが、Shadow DOM の中の !important はページに勝つ
const CONTENT =
  'flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center ' +
  '[&_::slotted(a)]:[color:inherit]! [&_::slotted(a)]:underline! [&_::slotted(a)]:underline-offset-2 ' +
  '[&_::slotted(a:focus-visible)]:rounded-sm [&_::slotted(a:focus-visible)]:outline-2 [&_::slotted(a:focus-visible)]:outline-offset-2 [&_::slotted(a:focus-visible)]:outline-current'
const CLOSE =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md cursor-pointer text-current ' +
  'hover:[background-color:color-mix(in_oklab,currentColor_15%,transparent)] outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current'

/**
 * 画面のいちばん上に、幅いっぱいで出す知らせ（保守の予定・契約の期限切れ・障害など、アプリ全体に関わること）。
 * ページの一部への知らせは `jimble-alert`、操作の結果は通知（`JimbleUI.toast()`）。
 *
 * - `jimble-app-shell` の中なら `slot="banner"` に置く（ヘッダーの上。スクロールすると流れて消える）。
 * - `danger` / `warning` は `role="alert"`（すぐに読み上げる）、`info` は `role="status"`。
 * - 直下の `<a>` は、文字の色を引き継いで下線が付く。
 *
 * @tag jimble-banner
 * @status experimental
 *
 * @slot - 本文（1 文程度。リンクは直下に置く）
 * @slot icon - アイコンの差し替え
 * @slot actions - 本文の横に置く操作（ボタンなど）
 *
 * @fires jimble-dismiss - 閉じるボタンが押された。preventDefault() すると閉じない
 *
 * @csspart base - ルート要素（`role="alert"` / `role="status"`）
 * @csspart icon - アイコン
 * @csspart content - 本文と操作を包む要素
 * @csspart close-button - 閉じるボタン
 *
 * @cssprop [--jimble-banner-bg=variant に応じる] - 背景色
 * @cssprop [--jimble-banner-text=variant に応じる] - 文字色（アイコン・リンク・フォーカスの輪も同じ色）
 */
export class JimbleBanner extends JimbleElement {
  static override properties: PropertyDeclarations = {
    variant: { reflect: true },
    dismissible: { type: Boolean, reflect: true },
  }

  /** 意味の種類。未知の値は info */
  declare variant: BannerVariant
  /** 閉じるボタンを出す */
  declare dismissible: boolean

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
    const variant: BannerVariant = this.variant in VARIANT ? this.variant : 'info'
    const role = variant === 'info' ? 'status' : 'alert'
    return html`<div part="base" class="${BASE} ${VARIANT[variant]}" role=${role}>
      <span part="icon" class="inline-flex shrink-0" aria-hidden="true"
        ><slot name="icon">${renderIcon(ICON[variant], 'size-5')}</slot></span
      >
      <div part="content" class=${CONTENT}>
        <span><span class="sr-only">${this.t(LABEL[variant])}: </span><slot></slot></span>
        <slot name="actions"></slot>
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

JimbleBanner.define('jimble-banner')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-banner': JimbleBanner
  }
}
