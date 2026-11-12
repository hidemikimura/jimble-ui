import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { getDeepActiveElement } from '../../base/focus.js'
import { ImeController } from '../../base/ime-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'
import { applyPopupAria } from '../dropdown-menu/jimble-dropdown-menu.js'

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
export type PopoverCloseReason = 'escape' | 'outside' | 'tab' | 'close-button' | 'api'

const PANEL =
  'border-0 bg-surface-overlay text-sm text-fg shadow-lg ring-1 ring-inset ring-line ' +
  'outline outline-1 outline-transparent max-h-[min(32rem,80dvh)] overflow-auto ' +
  '[width:var(--jimble-popover-width,20rem)] max-w-[calc(100vw_-_1rem)] ' +
  '[border-radius:var(--jimble-popover-radius,var(--radius-overlay))] ' +
  '[padding:var(--jimble-popover-padding,calc(var(--spacing)*4))] ' +
  'focus-visible:outline-2 focus-visible:outline-focus'
const CLOSE =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:[background-color:var(--jimble-icon-button-hover-bg,var(--color-surface-sunken))] hover:[color:var(--jimble-icon-button-hover-fg,var(--color-fg-muted))] outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
/** 開いたときに、フォーカスを試す要素（この中から、実際にフォーカスできた最初のもの） */
const FOCUS_CANDIDATES =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]'
const MAX_FOCUS_TRIES = 50

/**
 * ボタンの近くに開く、操作できる小さなパネル（ポップオーバー）。絞り込みの条件・その場での確認・
 * 表示の設定など、1 つの作業で完結する中身に使う。モーダルではない（背面も操作できる）。
 *
 * - トリガーは `trigger` スロットに置く（`jimble-button` など）。押すと開閉する。
 * - パネルは Popover API のトップレイヤーに表示され、位置は CSS Anchor Positioning で決まる（画面の端では反転する）。
 * - 支援技術には、モーダルでないダイアログ（`role="dialog"`）として伝える。名前は `heading`（パネルの上に表示する）
 *   か `label`。トリガーには `aria-haspopup="dialog"` と `aria-expanded` が付く。
 * - 開くと、`autofocus` の付いた要素、なければ中の最初のフォーカスできる要素、なければパネルにフォーカスする。
 * - 閉じ方: Esc（トリガーへ戻る）・外側のクリック・Tab でパネルの外へ出る・`data-popover-close` を付けた要素
 *   （トリガーへ戻る）・`hide()`。中のセレクトやコンボボックスを開いても閉じない。
 *
 * @tag jimble-popover
 *
 * @slot trigger - パネルを開くボタン（jimble-button など）
 * @slot - パネルの中身
 * @slot title - 見出し（`heading` の代わり）
 *
 * @csspart anchor - トリガーを包む要素（位置の基準）
 * @csspart panel - パネル（role="dialog"）
 * @csspart header - 見出しと閉じるボタンの行（`heading` があるときだけ）
 * @csspart heading - 見出し
 * @csspart close-button - 閉じるボタン
 *
 * @cssprop [--jimble-popover-width=20rem] - パネルの幅（画面の幅を超えない）
 * @cssprop [--jimble-popover-radius=var(--jimble-radius-overlay)] - 角丸
 * @cssprop [--jimble-popover-padding=calc(var(--jimble-spacing) * 4)] - 内側の余白
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close - 閉じた（`detail.reason`: escape / outside / tab / close-button / api）
 */
export class JimblePopover extends JimbleElement {
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    placement: { reflect: true },
    heading: {},
    label: {},
    hideCloseButton: { type: Boolean, attribute: 'hide-close-button' },
  }

  declare open: boolean
  /** パネルを開く位置。画面に収まらないときは反転する */
  declare placement: PopoverPlacement
  /** 見出し（パネルの上に表示し、パネルの名前にする） */
  declare heading: string
  /** パネルの名前（見出しを表示しないとき） */
  declare label: string | undefined
  /** 見出しの横の閉じるボタンを出さない */
  declare hideCloseButton: boolean

  #ime = new ImeController(this)
  #slots = new SlotController(this)
  #headingId = this.uid('popover-heading')
  #reason: PopoverCloseReason = 'outside'
  #returnFocus = false
  #wasOpenOnPointerDown = false
  #pointerOutside = false
  #notified = false

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('pointerdown', this.#onDocumentPointerDown, true)
    document.removeEventListener('keydown', this.#onDocumentKeyDown, true)
  }

  constructor() {
    super()
    this.open = false
    this.placement = 'bottom-start'
    this.heading = ''
    this.label = undefined
    this.hideCloseButton = false
    // data-popover-close を付けた要素（中身のボタンなど）のクリックで閉じる
    this.addEventListener('click', (event) => {
      const target = (event.target as Element | null)?.closest?.('[data-popover-close]')
      if (target && this.contains(target) && target.slot !== 'trigger')
        this.#close('close-button', true)
    })
    // Tab などで、フォーカスがポップオーバーの外へ出たら閉じる（非モーダルなので閉じ込めない）
    this.addEventListener('focusout', this.#onFocusOut)
  }

  get #panel(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="panel"]') ?? null
  }
  get #trigger(): HTMLElement | undefined {
    return this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.assignedElements({ flatten: true })[0] as HTMLElement | undefined
  }
  /** パネルの中身（既定のスロットに入った要素） */
  get #content(): Element[] {
    return (
      this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot:not([name])')
        ?.assignedElements({ flatten: true }) ?? []
    )
  }

  show(): void {
    this.open = true
  }
  hide(): void {
    this.#close('api', false)
  }
  toggle(): void {
    if (this.open) this.hide()
    else this.show()
  }

  #close(reason: PopoverCloseReason, returnFocus: boolean) {
    if (!this.open) return
    this.#reason = reason
    this.#returnFocus = returnFocus
    const panel = this.#panel
    if (panel?.matches(':popover-open')) panel.hidePopover()
    this.open = false
  }

  // ---- トリガー ---------------------------------------------------------------------------
  // 開いているときにトリガーを押すと、ライトディスミスが先に閉じてから click が来る。
  // 再び開いてしまわないよう、押した時点の状態を覚えておく（メニューと同じ）
  #onTriggerPointerDown = () => {
    this.#wasOpenOnPointerDown = this.open
  }
  #onTriggerClick = () => {
    const wasOpen = this.#wasOpenOnPointerDown
    this.#wasOpenOnPointerDown = false
    if (wasOpen) return
    if (this.open) this.#close('api', true)
    else this.show()
  }

  // ---- パネル -----------------------------------------------------------------------------
  // Esc: 文書の捕捉段階で受ける（エンジンによっては、パネルに届く前にライトディスミスで閉じるため）。
  // 閉じるのはネイティブのライトディスミス。ここでは理由とフォーカスの戻し先だけを覚える
  #onDocumentKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !e.composedPath().includes(this)) return
    // IME の変換中の Esc は、変換の取り消し。ポップオーバーは閉じない
    if (this.#ime.isComposing(e)) {
      e.preventDefault()
      return
    }
    this.#reason = 'escape'
    this.#returnFocus = true
  }

  #onFocusOut = (e: FocusEvent) => {
    if (!this.open) return
    const next = e.relatedTarget as Node | null
    // 行き先が無い（ウィンドウの外・フォーカスできない場所のクリック）ときは、外側のクリックの処理に任せる
    if (!next) return
    if (next === this || this.contains(next) || this.renderRoot.contains(next)) return
    // 外側を押したことでフォーカスが移ったなら、外側のクリックとして閉じる
    this.#close(this.#pointerOutside ? 'outside' : 'tab', false)
  }

  // 開いている間だけ、外側を押したかを覚える（Tab で出たのか、外側を押したのかを区別する）
  #onDocumentPointerDown = (e: PointerEvent) => {
    this.#pointerOutside = !e.composedPath().includes(this)
  }

  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen)
      this.open = isOpen // ライトディスミス（外側クリック・Esc）で閉じた
    else this.#afterToggle(isOpen)
  }

  /** 開いたときのフォーカス: autofocus → 中の最初のフォーカスできる要素 → パネル */
  #focusInitial() {
    const panel = this.#panel
    if (!panel) return
    const content = this.#content
    const auto = content
      .flatMap((el) => [el, ...el.querySelectorAll('[autofocus]')])
      .find((el) => el.hasAttribute('autofocus')) as HTMLElement | undefined
    if (auto && this.#tryFocus(auto)) return
    const candidates = content
      .flatMap((el) => [el, ...el.querySelectorAll('*')])
      .filter((el) => el.matches(FOCUS_CANDIDATES) || el.localName.startsWith('jimble-'))
      .slice(0, MAX_FOCUS_TRIES) as HTMLElement[]
    for (const el of candidates) if (this.#tryFocus(el)) return
    panel.focus()
  }

  /** フォーカスを試し、ポップオーバーの中に入ったら true */
  #tryFocus(el: HTMLElement): boolean {
    if ((el as HTMLElement & { disabled?: boolean }).disabled) return false
    el.focus()
    const active = getDeepActiveElement()
    return (
      !!active && active !== document.body && (this.contains(active) || this.#isInShadow(active))
    )
  }
  #isInShadow(node: Node): boolean {
    for (let n: Node | null = node; n; n = (n.getRootNode() as ShadowRoot).host ?? null) {
      if (n === this || this.contains(n)) return true
      if (!(n.getRootNode() instanceof ShadowRoot)) return false
    }
    return false
  }

  #afterToggle(isOpen: boolean) {
    if (isOpen === this.#notified) return // 開閉の通知は 1 回だけ
    this.#notified = isOpen
    applyPopupAria(this.#trigger, 'dialog', isOpen)
    this.#pointerOutside = false
    if (isOpen) {
      document.addEventListener('pointerdown', this.#onDocumentPointerDown, true)
      document.addEventListener('keydown', this.#onDocumentKeyDown, true)
      this.#focusInitial()
      this.emit('open')
    } else {
      document.removeEventListener('pointerdown', this.#onDocumentPointerDown, true)
      document.removeEventListener('keydown', this.#onDocumentKeyDown, true)
      if (this.#returnFocus) this.#trigger?.focus()
      this.emit('close', { detail: { reason: this.#reason } })
      this.#reason = 'outside'
      this.#returnFocus = false
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const panel = this.#panel
    if (!panel) return
    if (changed.has('open')) {
      const shown = panel.matches(':popover-open')
      if (this.open && !shown) panel.showPopover()
      else if (!this.open && shown) panel.hidePopover()
      else this.#afterToggle(this.open)
    }
    applyPopupAria(this.#trigger, 'dialog', this.open)
  }

  protected override render() {
    const hasHeading = !!this.heading || this.#slots.hasSlot('title')
    return html`<span
        part="anchor"
        @pointerdown=${this.#onTriggerPointerDown}
        @click=${this.#onTriggerClick}
        ><slot name="trigger" @slotchange=${() => this.requestUpdate()}></slot
      ></span>
      <div
        part="panel"
        popover="auto"
        role="dialog"
        tabindex="-1"
        class=${PANEL}
        aria-labelledby=${hasHeading ? this.#headingId : nothing}
        aria-label=${ifDefined(hasHeading ? undefined : this.label || undefined)}
        @toggle=${this.#onToggle}
      >
        <div part="header" class=${hasHeading ? 'mb-3 flex items-start gap-2' : 'hidden'}>
          <div
            part="heading"
            id=${this.#headingId}
            class="min-w-0 flex-1 text-base font-semibold leading-7"
          >
            ${this.heading}<slot name="title"></slot>
          </div>
          ${
            hasHeading && !this.hideCloseButton
              ? html`<button
                  part="close-button"
                  type="button"
                  class=${CLOSE}
                  aria-label=${this.t('dialog.close')}
                  @click=${() => this.#close('close-button', true)}
                >
                  ${renderIcon(xMark, 'size-4')}
                </button>`
              : nothing
          }
        </div>
        <slot></slot>
      </div>`
  }
}

JimblePopover.define('jimble-popover')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-popover': JimblePopover
  }
}
