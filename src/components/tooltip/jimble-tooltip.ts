import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

const POPUP =
  'm-0 border-0 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium leading-5 text-fg-on-primary shadow-md ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-tooltip-radius,var(--radius-md))]'

/**
 * 囲んだ要素にマウスを重ねる、またはフォーカスすると、短い補足説明を出すツールチップ。
 *
 * - **囲む要素は、キーボードでフォーカスできるもの（ボタン・リンクなど）にする。** フォーカスできない要素（文字だけの
 *   `span` など）は、キーボードや支援技術の利用者に表示されない。
 * - 説明は支援技術に伝わる。ネイティブの要素（`button`・`a`）には `aria-describedby`、`jimble-button` には `aria-description`
 *   を自動で設定する。**他の `jimble-*` 部品（入力欄など）は、内側へ説明を渡さないため対象外**（入力欄の説明は `jimble-field` の `hint`）。
 * - 出るのはマウスを重ねたとき・フォーカスしたとき。**Esc で消せ**、ツールチップの上にポインターを移しても消えない
 *   （WCAG 1.4.13）。タッチでは、タップしてフォーカスしたときに出る。
 * - 大事な情報や操作は入れない（ツールチップは補足）。リンクやボタンを入れることもできない。
 * - アイコンだけのボタンの名前は、ツールチップではなく `aria-label` で付ける。
 *
 * @tag jimble-tooltip
 *
 * @slot - ツールチップを出す対象（フォーカスできる要素）
 *
 * @csspart trigger - 対象を包む要素
 * @csspart popup - ツールチップ
 *
 * @cssprop [--jimble-tooltip-radius=var(--jimble-radius-md)] - 角丸
 * @cssprop [--jimble-tooltip-max-width=20rem] - `multiline` のときの最大の幅
 *
 * @fires jimble-open - 表示した
 * @fires jimble-close - 隠した
 */
export class JimbleTooltip extends JimbleElement {
  static override properties: PropertyDeclarations = {
    text: {},
    placement: { reflect: true },
    multiline: { type: Boolean, reflect: true },
    delay: { type: Number },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  }

  /** 表示する文字。改行は `multiline` のときだけ効く */
  declare text: string
  /** 出る位置: `top`（既定）・`bottom`・`left`・`right`。画面に収まらないときは反対側に出る */
  declare placement: TooltipPlacement
  /** 折り返しと改行を許可する（最大の幅 20rem）。付けなければ 1 行 */
  declare multiline: boolean
  /** ポインターを重ねてから表示するまでの待ち時間（ミリ秒）。フォーカスでは待たない。既定 300 */
  declare delay: number
  /** ツールチップを出さない */
  declare disabled: boolean
  /** 表示中か */
  declare open: boolean

  #descId = this.uid('tooltip')
  #desc: HTMLSpanElement | undefined
  #target: Element | undefined
  #showTimer: ReturnType<typeof setTimeout> | undefined
  #hideTimer: ReturnType<typeof setTimeout> | undefined
  #focused = false
  #hovered = false

  constructor() {
    super()
    this.text = ''
    this.placement = 'top'
    this.multiline = false
    this.delay = 300
    this.disabled = false
    this.open = false
    this.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return // タッチはフォーカスで出す
      this.#hovered = true
      this.#schedule(true, this.delay)
    })
    this.addEventListener('pointerleave', () => {
      this.#hovered = false
      this.#schedule(false, 120) // ツールチップの上へ移る間は消さない
    })
    this.addEventListener('focusin', () => {
      this.#focused = true
      this.#schedule(true, 0)
    })
    this.addEventListener('focusout', () => {
      this.#focused = false
      this.#schedule(false, 0)
    })
  }

  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }

  /** 表示・非表示を予約する。フォーカスとホバーのどちらかが残っている間は隠さない */
  #schedule(show: boolean, wait: number) {
    clearTimeout(this.#showTimer)
    clearTimeout(this.#hideTimer)
    const run = () => {
      if (show) this.open = !this.disabled && !!this.text
      else if (!this.#focused && !this.#hovered) this.open = false
    }
    if (show) this.#showTimer = setTimeout(run, wait)
    else this.#hideTimer = setTimeout(run, wait)
    if (wait === 0) {
      clearTimeout(show ? this.#showTimer : this.#hideTimer)
      run()
    }
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      // 開いている間だけ効かせる。ダイアログの Esc には渡さない
      event.preventDefault()
      event.stopPropagation()
      this.#focused = false
      this.#hovered = false
      this.open = false
    }
  }
  #onPopupEnter = () => {
    this.#hovered = true
    clearTimeout(this.#hideTimer)
  }
  #onPopupLeave = () => {
    this.#hovered = false
    this.#schedule(false, 120)
  }

  /**
   * 説明を支援技術に伝える。
   * - ネイティブの要素（button・a など）: 隠した要素を light DOM に置いて、`aria-describedby` にトークンを足す
   *   （ARIA の参照は Shadow の境界をまたげないので、参照先は light DOM に置く）。
   * - カスタム要素（jimble-button など）: 実際にフォーカスされるのは内側の要素で、host の `aria-describedby` は届かない。
   *   そこで `aria-description`（文字列）を host に付け、部品が内側の要素へ渡す（jimble-button が対応）。
   */
  #syncDescription() {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot')
    const next = slot?.assignedElements({ flatten: true }).find((e) => e !== this.#desc)
    if (this.#target && this.#target !== next) this.#detach(this.#target)
    this.#target = next
    if (!next) return
    if (!this.text) {
      this.#detach(next)
      return
    }
    if (isCustomElement(next)) {
      this.#desc?.remove()
      this.#desc = undefined
      this.#removeToken(next)
      if (!this.#hadDescription.has(next)) {
        this.#hadDescription.set(next, next.getAttribute('aria-description'))
      }
      next.setAttribute('aria-description', this.text)
    } else {
      if (!this.#desc) {
        const span = document.createElement('span')
        span.id = this.#descId
        span.hidden = true
        // 名前のあるスロットに入れて、描画されないようにする(隠した要素も aria-describedby の参照先にはなれる)
        span.slot = 'jimble-tooltip-description'
        this.append(span)
        this.#desc = span
      }
      this.#desc.textContent = this.text
      const ids = new Set(
        (next.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
      )
      ids.add(this.#descId)
      next.setAttribute('aria-describedby', [...ids].join(' '))
    }
    if (__DEV__ && !isFocusable(next)) {
      this.warn(
        '囲んだ要素がキーボードでフォーカスできません。ボタンやリンクなど、フォーカスできる要素を囲んでください。',
      )
    }
  }
  /** 付けた説明を取り除く(もとの値は戻す) */
  #detach(el: Element) {
    this.#removeToken(el)
    this.#desc?.remove()
    this.#desc = undefined
    if (this.#hadDescription.has(el)) {
      const original = this.#hadDescription.get(el)
      if (original === null || original === undefined) el.removeAttribute('aria-description')
      else el.setAttribute('aria-description', original)
      this.#hadDescription.delete(el)
    }
  }
  #hadDescription = new Map<Element, string | null>()
  #removeToken(el: Element) {
    const ids = (el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((i) => i && i !== this.#descId)
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '))
    else el.removeAttribute('aria-describedby')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.#onKeydown, true)
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.#onKeydown, true)
    clearTimeout(this.#showTimer)
    clearTimeout(this.#hideTimer)
    if (this.#target) this.#detach(this.#target)
    this.#target = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.open && (this.disabled || !this.text)) this.open = false
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('text') || changed.has('disabled')) this.#syncDescription()
    const popup = this.#popup
    if (popup && changed.has('open')) {
      const shown = popup.matches(':popover-open')
      if (this.open && !shown) popup.showPopover()
      else if (!this.open && shown) popup.hidePopover()
      if (changed.get('open') !== undefined || this.open) this.emit(this.open ? 'open' : 'close')
    }
  }

  protected override render() {
    return html`<span part="trigger" class="inline-flex"
        ><slot @slotchange=${() => this.#syncDescription()}></slot
      ></span>
      <!-- 文字は textContent で入れる。white-space: pre-line は、テンプレートの空白や改行をそのまま余白として出すため -->
      <div
        part="popup"
        popover="manual"
        aria-hidden="true"
        class="${POPUP} ${this.multiline ? 'whitespace-pre-line' : 'whitespace-nowrap'}"
        @pointerenter=${this.#onPopupEnter}
        @pointerleave=${this.#onPopupLeave}
        .textContent=${this.text}
      ></div>`
  }
}

function isCustomElement(el: Element): boolean {
  return el.localName.includes('-')
}

function isFocusable(el: Element): boolean {
  if (
    el.matches('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')
  )
    return true
  // jimble-* などのカスタム要素は、Shadow の中の focus() 先で判断できないので、フォーカスできるものとみなす
  return el.localName.includes('-')
}

JimbleTooltip.define('jimble-tooltip')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tooltip': JimbleTooltip
  }
}
