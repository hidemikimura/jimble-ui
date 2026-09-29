import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { getDeepActiveElement, restoreFocus } from '../../base/focus.js'
import { ImeController } from '../../base/ime-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { popModal, pushModal } from '../../base/modal-stack.js'
import { lockScroll, unlockScroll } from '../../base/scroll-lock.js'
import { SlotController } from '../../base/slot-controller.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'

export type DialogSize = 'sm' | 'md' | 'lg'
export type DialogCloseReason = 'escape' | 'backdrop' | 'action' | 'api'

const SIZE: Record<DialogSize, string> = {
  sm: 'w-[min(calc(100vw-2rem),24rem)]',
  md: 'w-[min(calc(100vw-2rem),32rem)]',
  lg: 'w-[min(calc(100vw-2rem),42rem)]',
}
const DIALOG =
  'm-auto max-h-[calc(100dvh-2rem)] max-w-none overflow-visible border-0 bg-transparent p-0 ' +
  'text-fg backdrop:bg-backdrop'
const PANEL =
  'flex max-h-[calc(100dvh-2rem)] flex-col rounded-overlay bg-surface-overlay shadow-lg ring-1 ring-inset ring-line ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-dialog-radius,var(--radius-overlay))]'
const CLOSE =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * モーダルダイアログ。ネイティブの `<dialog>` の `showModal()` を使うので、背面の inert 化・
 * フォーカスの閉じ込め・トップレイヤー表示はブラウザが行う。
 *
 * - Esc・背景クリック・閉じるボタンは、まず `jimble-close-request`（キャンセル可）を発火する。
 * - **IME の変換中の Esc では閉じない**（変換の取り消しになる）。
 * - 閉じたらフォーカスは開く前の要素に戻る。
 * - `data-dialog-close` を付けた要素をクリックすると閉じる（JavaScript 不要）。
 *
 * @tag jimble-dialog
 *
 * @slot - 本文
 * @slot title - 見出しに入れる HTML（`heading` 属性の代わり）
 * @slot footer - フッター（操作ボタンなど）
 *
 * @csspart base - 内部の dialog 要素
 * @csspart panel - 面
 * @csspart header - ヘッダー領域
 * @csspart title - 見出し
 * @csspart close-button - 閉じるボタン
 * @csspart body - 本文領域
 * @csspart footer - フッター領域
 *
 * @cssprop [--jimble-dialog-radius=var(--jimble-radius-overlay)] - 角丸
 * @cssprop [--jimble-dialog-padding=4 単位(1rem)] - 各領域の内側の余白
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close-request - 閉じようとしている(reason: escape / backdrop / action)。preventDefault() すると閉じない
 * @fires jimble-close - 閉じた(reason)
 */
export class JimbleDialog extends JimbleElement {
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    heading: {},
    size: { reflect: true },
    alert: { type: Boolean, reflect: true },
    staticBackdrop: { type: Boolean, reflect: true, attribute: 'static-backdrop' },
    hideCloseButton: { type: Boolean, reflect: true, attribute: 'hide-close-button' },
    accessibleLabel: { attribute: 'aria-label' },
  }

  /** 開いているか。`show()` / `hide()` でも切り替えられる */
  declare open: boolean
  /** 見出し。ダイアログの名前になる（`title` スロットでも書ける） */
  declare heading: string
  /** 幅: 24 / 32 / 42rem（画面より狭いときは画面に収まる） */
  declare size: DialogSize
  /** 確認など、ユーザーの応答が必須のダイアログ。role="alertdialog" になり、背景クリックでは閉じない */
  declare alert: boolean
  /** 背景クリックで閉じない */
  declare staticBackdrop: boolean
  declare hideCloseButton: boolean
  /** 見出しを自分で描く場合の名前（heading も title スロットも無いとき） */
  declare accessibleLabel: string | null

  #slots = new SlotController(this)
  #ime = new ImeController(this)
  #headingId = this.uid('dialog-title')
  #bodyId = this.uid('dialog-body')
  #previousFocus: Element | null = null
  #reason: DialogCloseReason = 'api'
  #pointerDownOnBackdrop = false
  #locked = false

  constructor() {
    super()
    this.open = false
    this.heading = ''
    this.size = 'md'
    this.alert = false
    this.staticBackdrop = false
    this.hideCloseButton = false
    this.accessibleLabel = null
    // data-dialog-close を付けた要素(本文・フッターに置いたボタンなど)のクリックで閉じる
    this.addEventListener('click', (event) => {
      // event.target は host に再ターゲット済みなので、jimble-button の内側のクリックも拾える
      const target = (event.target as Element | null)?.closest?.('[data-dialog-close]')
      if (target && this.contains(target)) this.requestClose('action')
    })
  }

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  show(): void {
    this.open = true
  }
  /** 閉じる（close-request は発火しない。プログラムからの明示的な操作） */
  hide(): void {
    this.#reason = 'api'
    this.open = false
  }
  toggle(): void {
    if (this.open) this.hide()
    else this.show()
  }

  /** ユーザー操作による閉じる要求。キャンセルされなければ閉じる */
  requestClose(reason: Exclude<DialogCloseReason, 'api'>): void {
    if (!this.open) return
    const event = this.emit('close-request', { detail: { reason }, cancelable: true })
    if (event.defaultPrevented) return
    this.#reason = reason
    this.open = false
  }

  #onCancel = (event: Event) => {
    // ネイティブの閉じる動作は使わず、close-request を経由する
    event.preventDefault()
    // IME の変換中の Esc は、変換の取り消しであってダイアログを閉じる操作ではない（設計書 R6）
    if (this.#ime.isComposing()) return
    this.requestClose('escape')
  }

  // 背景クリック: 押下と解放の両方が背景上のときだけ閉じる（テキスト選択のドラッグで閉じるのを防ぐ）
  #onPointerDown = (event: PointerEvent) => {
    this.#pointerDownOnBackdrop = event.target === this.#dialog
  }
  #onClick = (event: MouseEvent) => {
    const onBackdrop = event.target === this.#dialog && this.#pointerDownOnBackdrop
    this.#pointerDownOnBackdrop = false
    if (onBackdrop && !this.staticBackdrop && !this.alert) this.requestClose('backdrop')
  }

  #onClose = () => {
    // ネイティブ側で閉じられた場合も、状態を揃える
    if (this.open) this.open = false
    this.#afterClose()
  }

  #afterClose() {
    if (this.#locked) {
      this.#locked = false
      unlockScroll()
      const dialog = this.#dialog
      if (dialog) popModal(dialog)
    }
    const previous = this.#previousFocus
    this.#previousFocus = null
    // 描画の後に戻す(ネイティブの復帰処理が働かない場合や、Shadow をまたぐ場合の保険)
    queueMicrotask(() => restoreFocus(previous))
    this.emit('close', { detail: { reason: this.#reason } })
    this.#reason = 'api'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const dialog = this.#dialog
    if (!dialog || !changed.has('open')) return
    if (this.open && !dialog.open) {
      this.#previousFocus = getDeepActiveElement()
      dialog.showModal()
      this.#locked = true
      lockScroll()
      pushModal(dialog)
      // autofocus を付けた要素があればそこへ。無ければブラウザ既定(最初のフォーカス可能な要素)
      this.querySelector<HTMLElement>('[autofocus]')?.focus()
      this.emit('open')
    } else if (!this.open && dialog.open) {
      dialog.close()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.#locked) {
      this.#locked = false
      unlockScroll()
      const dialog = this.#dialog
      if (dialog) popModal(dialog)
    }
  }

  protected override render() {
    const size = this.size in SIZE ? this.size : 'md'
    const hasTitleSlot = this.#slots.hasSlot('title')
    const hasHeading = !!this.heading || hasTitleSlot
    const hasFooter = this.#slots.hasSlot('footer')
    if (__DEV__ && !hasHeading && !this.accessibleLabel && this.isConnected) {
      this.warn(
        'heading 属性、title スロット、aria-label のいずれかでダイアログに名前を付けてください。',
      )
    }
    const pad = 'p-(--jimble-dialog-padding,calc(var(--spacing)*4))'
    return html`<dialog
      part="base"
      class="${DIALOG} ${SIZE[size]}"
      role=${this.alert ? 'alertdialog' : nothing}
      aria-labelledby=${hasHeading ? this.#headingId : nothing}
      aria-label=${!hasHeading && this.accessibleLabel ? this.accessibleLabel : nothing}
      aria-describedby=${this.alert ? this.#bodyId : nothing}
      @cancel=${this.#onCancel}
      @close=${this.#onClose}
      @pointerdown=${this.#onPointerDown}
      @click=${this.#onClick}
    >
      <div part="panel" class=${PANEL}>
        <div
          part="header"
          class="flex items-start gap-3 ${pad} ${hasHeading || !this.hideCloseButton ? '' : 'hidden'}"
        >
          <h2
            part="title"
            id=${this.#headingId}
            class="min-w-0 flex-1 text-base font-semibold leading-8"
          >
            ${this.heading}<slot name="title"></slot>
          </h2>
          ${
            this.hideCloseButton
              ? nothing
              : html`<button
                  part="close-button"
                  type="button"
                  class=${CLOSE}
                  aria-label=${this.t('dialog.close')}
                  @click=${() => this.requestClose('action')}
                >
                  ${renderIcon(xMark, 'size-5')}
                </button>`
          }
        </div>
        <div
          part="body"
          id=${this.#bodyId}
          class="min-h-0 overflow-auto text-sm ${pad} ${hasHeading ? 'pt-0' : ''}"
        >
          <slot></slot>
        </div>
        <div
          part="footer"
          class="${hasFooter ? `flex flex-wrap justify-end gap-2 ${pad} pt-0` : 'hidden'}"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </dialog>`
  }
}

JimbleDialog.define('jimble-dialog')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-dialog': JimbleDialog
  }
  interface HTMLElementEventMap {
    'jimble-close-request': CustomEvent<{ reason: DialogCloseReason }>
    'jimble-close': CustomEvent<{ reason: DialogCloseReason }>
    'jimble-open': CustomEvent<undefined>
  }
}
