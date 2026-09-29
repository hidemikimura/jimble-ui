import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { onModalChange, topModal } from '../../base/modal-stack.js'

export type ToastPlacement =
  'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'

/**
 * 通知(`jimble-toast`)の置き場。`toast()` が必要なときに `<body>` へ自動で作るので、通常は自分で置かない。
 *
 * - Popover API(`manual`)でトップレイヤーに常に表示される。
 * - 支援技術に読み上げさせるためのライブリージョン（polite / assertive）を、通知が来る前から持っている。
 * - モーダルの `dialog` が開いている間は、その `dialog` の中へ移動する。モーダルの外は inert になり、
 *   外にある通知は操作も読み上げもできなくなるため。閉じたら元の場所へ戻る。
 *
 * @tag jimble-toast-region
 *
 * @slot polite - info / success の通知
 * @slot assertive - warning / danger の通知
 *
 * @csspart base - 通知を並べる領域
 */
export class JimbleToastRegion extends JimbleElement {
  static override properties: PropertyDeclarations = {
    placement: { reflect: true },
  }

  /** 表示する位置 */
  declare placement: ToastPlacement

  #off?: () => void

  constructor() {
    super()
    this.placement = 'bottom-end'
  }

  get #base(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="base"]') ?? null
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#off = onModalChange(() => this.#relocate())
    // モーダルが開いている最中に作られた場合も、その中へ入る
    this.#relocate()
    // DOM を移動するとポップオーバーの表示状態が失われる。接続のたびに再表示する
    void this.updateComplete.then(() => this.#ensureShown())
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#off?.()
  }

  /** いちばん上のモーダルの中へ(なければ body へ)移動する */
  #relocate() {
    const target: Node = topModal() ?? document.body
    if (this.parentNode !== target) target.appendChild(this)
  }

  /** 他のオーバーレイより手前に出し直す（トップレイヤーは「後から出したものが上」のため） */
  promote(): void {
    const base = this.#base
    if (!base) return
    if (base.matches(':popover-open')) base.hidePopover()
    base.showPopover()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // ライブリージョンは、通知が来る前から表示されている必要があるので、空でも常に表示しておく
    this.#ensureShown()
  }

  #ensureShown() {
    const base = this.#base
    if (base?.isConnected && !base.matches(':popover-open')) base.showPopover()
  }

  protected override render() {
    return html`<div part="base" popover="manual" class="pointer-events-none">
      <div part="polite" role="status" aria-live="polite" class="flex flex-col gap-2">
        <slot name="polite"></slot>
      </div>
      <div part="assertive" role="alert" class="flex flex-col gap-2">
        <slot name="assertive"></slot>
      </div>
    </div>`
  }
}

JimbleToastRegion.define('jimble-toast-region')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-toast-region': JimbleToastRegion
  }
}
