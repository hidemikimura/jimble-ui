import { html } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

const BASE =
  'bg-surface text-fg [--_shadow:var(--jimble-card-shadow,var(--shadow-sm))] relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:[box-shadow:var(--_shadow)] ring-1 ring-inset ring-line-card ' +
  'outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-card-radius,var(--radius-card))]'
const SECTION = 'p-(--jimble-card-padding,calc(var(--spacing)*4))'
const DIVIDER = 'h-px bg-line-divider'
const STICKY_BG = 'bg-(--jimble-card-sticky-bg,var(--color-surface))'
const SENTINEL = 'pointer-events-none h-px -mb-px'
const STUCK_HEADER_SHADOW =
  '[box-shadow:var(--jimble-card-sticky-shadow,0_4px_6px_-4px_rgb(0_0_0/0.15))]'
const STUCK_FOOTER_SHADOW =
  '[box-shadow:var(--jimble-card-sticky-shadow,0_-4px_6px_-4px_rgb(0_0_0/0.15))]'

/**
 * 関連する情報をまとめる面。ヘッダー・フッターは中身があるときだけ描画する。
 * 枠の色は `--jimble-color-ring-card`、ヘッダー・フッターの区切り線の色は `--jimble-color-ring-divider` で変える。
 *
 * @tag jimble-card
 *
 * @slot - 本文
 * @slot header - ヘッダー（見出しや操作）
 * @slot footer - フッター（操作ボタンなど）
 *
 * `sticky-footer` を付けると、スクロールしてもフッターが、スクロールする親（またはウィンドウ）の下端に貼り付く。
 * `sticky-header` はヘッダーを上端に貼り付ける。貼り付いている間は `:state(stuck-footer)` / `:state(stuck-header)` になり、
 * 上（下）に影が出る。貼り付かない（カード全体が見えている）ときの見た目は、付けないときと同じ。
 * `jimble-dialog` / `jimble-drawer` の `footer` は、常にパネルの下にある（スクロールするのは本文だけ）ので、この属性は要らない。
 *
 * @csspart base - ルート要素
 * @csspart header - ヘッダー領域
 * @csspart body - 本文領域
 * @csspart footer - フッター領域
 *
 * @cssprop [--jimble-card-radius=var(--jimble-radius-card)] - 角丸
 * @cssprop [--jimble-card-padding=4 単位(1rem)] - 各領域の内側の余白
 * @cssprop [--jimble-card-shadow=var(--jimble-shadow-sm)] - 影
 * @cssprop [--jimble-card-sticky-offset=0] - 貼り付くときの、スクロールする親の端からの距離（固定のヘッダーがあるときなど）
 * @cssprop [--jimble-card-sticky-bg=var(--jimble-color-surface)] - 貼り付くヘッダー・フッターの背景
 * @cssprop [--jimble-card-sticky-shadow=弱い影] - 貼り付いている間の、境界の影
 */
export class JimbleCard extends JimbleElement {
  static override properties = {
    stickyFooter: { type: Boolean, attribute: 'sticky-footer', reflect: true },
    stickyHeader: { type: Boolean, attribute: 'sticky-header', reflect: true },
    _stuckHeader: { state: true },
    _stuckFooter: { state: true },
  }

  /** フッターを、スクロールする親の下端に貼り付ける */
  declare stickyFooter: boolean
  /** ヘッダーを、スクロールする親の上端に貼り付ける */
  declare stickyHeader: boolean
  declare _stuckHeader: boolean
  declare _stuckFooter: boolean

  #slots = new SlotController(this)
  #observer?: IntersectionObserver

  constructor() {
    super()
    this.stickyFooter = false
    this.stickyHeader = false
    this._stuckHeader = false
    this._stuckFooter = false
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#observer = undefined
    this.#setStuck(false, false)
  }

  protected override updated(): void {
    this.#observe()
  }

  #setStuck(header: boolean, footer: boolean): void {
    this._stuckHeader = header
    this._stuckFooter = footer
    this.setState('stuck-header', header)
    this.setState('stuck-footer', footer)
  }

  /**
   * 貼り付き判定: 本来の位置に置いた目印（高さ 1px）が、見える範囲を出入りするたびに、
   * ヘッダー・フッターの実際の位置が、目印（本来の位置）からずれているか（＝貼り付いているか）を調べる。
   */
  #observe(): void {
    this.#observer?.disconnect()
    this.#observer = undefined
    if (!this.stickyFooter && !this.stickyHeader) {
      this.#setStuck(false, false)
      return
    }
    const root = this.shadowRoot
    if (!root || typeof IntersectionObserver === 'undefined') return
    const header = root.querySelector<HTMLElement>('[data-sentinel="header"]')
    const footer = root.querySelector<HTMLElement>('[data-sentinel="footer"]')
    const displaced = (sentinel: HTMLElement | null, direction: 1 | -1): boolean => {
      const wrap = sentinel?.nextElementSibling
      if (!sentinel || !wrap) return false
      // 本来の位置（目印の位置）より、実際の位置がずれていれば、貼り付いている
      return (
        (wrap.getBoundingClientRect().top - sentinel.getBoundingClientRect().top) * direction > 0.5
      )
    }
    this.#observer = new IntersectionObserver(
      () => {
        const stuckHeader = this.stickyHeader && displaced(header, 1)
        const stuckFooter = this.stickyFooter && displaced(footer, -1)
        if (stuckHeader !== this._stuckHeader || stuckFooter !== this._stuckFooter) {
          this.#setStuck(stuckHeader, stuckFooter)
        }
      },
      { threshold: [0, 1] },
    )
    if (this.stickyHeader && header) this.#observer.observe(header)
    if (this.stickyFooter && footer) this.#observer.observe(footer)
  }

  protected override render() {
    const header = this.#slots.hasSlot('header')
    const footer = this.#slots.hasSlot('footer')
    const stickyHeader = this.stickyHeader && header
    const stickyFooter = this.stickyFooter && footer
    const headerWrap = stickyHeader
      ? `sticky top-(--jimble-card-sticky-offset,0) z-(--jimble-z-sticky,10) ${STICKY_BG} [border-top-left-radius:inherit] [border-top-right-radius:inherit] ${this._stuckHeader ? STUCK_HEADER_SHADOW : ''}`
      : ''
    const footerWrap = stickyFooter
      ? `sticky bottom-(--jimble-card-sticky-offset,0) z-(--jimble-z-sticky,10) ${STICKY_BG} [border-bottom-left-radius:inherit] [border-bottom-right-radius:inherit] ${this._stuckFooter ? STUCK_FOOTER_SHADOW : ''}`
      : ''
    return html`<div part="base" class=${BASE}>
      ${
        stickyHeader
          ? html`<div data-sentinel="header" class=${SENTINEL} aria-hidden="true"></div>`
          : null
      }
      <div class=${headerWrap}>
        <div part="header" class=${header ? SECTION : 'hidden'}><slot name="header"></slot></div>
        <div class=${header ? DIVIDER : 'hidden'} aria-hidden="true"></div>
      </div>
      <div part="body" class=${SECTION}><slot></slot></div>
      ${
        stickyFooter
          ? html`<div data-sentinel="footer" class=${SENTINEL} aria-hidden="true"></div>`
          : null
      }
      <div class=${footerWrap}>
        <div class=${footer ? DIVIDER : 'hidden'} aria-hidden="true"></div>
        <div part="footer" class=${footer ? SECTION : 'hidden'}><slot name="footer"></slot></div>
      </div>
    </div>`
  }
}

JimbleCard.define('jimble-card')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-card': JimbleCard
  }
}
