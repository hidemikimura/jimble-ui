import { html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

// クラス名は完全な文字列リテラルで書く（Tailwind のスキャナが検出できるように）。公開 API ではない。
// 公開 CSS 変数 → 内部変数(--_x) → ユーティリティ、の順に受ける（設計書 §13.3）。
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    '[--_bg:var(--jimble-button-bg,var(--color-primary-600))] ' +
    '[--_bg-hover:var(--jimble-button-bg-hover,var(--color-primary-500))] ' +
    '[--_fg:var(--jimble-button-fg,var(--color-fg-on-primary))] ' +
    '[--_ring:var(--jimble-button-ring,transparent)] shadow-sm',
  secondary:
    '[--_bg:var(--jimble-button-bg,var(--color-surface))] ' +
    '[--_bg-hover:var(--jimble-button-bg-hover,var(--color-surface-muted))] ' +
    '[--_fg:var(--jimble-button-fg,var(--color-fg))] ' +
    '[--_ring:var(--jimble-button-ring,var(--color-line))] shadow-sm',
  danger:
    '[--_bg:var(--jimble-button-bg,var(--color-danger-600))] ' +
    '[--_bg-hover:var(--jimble-button-bg-hover,var(--color-danger-700))] ' +
    '[--_fg:var(--jimble-button-fg,var(--color-fg-on-primary))] ' +
    '[--_ring:var(--jimble-button-ring,transparent)] shadow-sm',
  ghost:
    '[--_bg:var(--jimble-button-bg,transparent)] ' +
    '[--_bg-hover:var(--jimble-button-bg-hover,var(--color-surface-sunken))] ' +
    '[--_fg:var(--jimble-button-fg,var(--color-fg))] ' +
    '[--_ring:var(--jimble-button-ring,transparent)]',
}
const SIZE: Record<ButtonSize, string> = {
  sm:
    '[--_h:var(--jimble-button-height,var(--jimble-control-height-sm,2rem))] ' +
    '[--_px:var(--jimble-button-padding-x,calc(var(--spacing)*2.5))] ' +
    '[--_gap:var(--jimble-button-gap,calc(var(--spacing)*1.5))] text-sm',
  md:
    '[--_h:var(--jimble-button-height,var(--jimble-control-height-md,2.25rem))] ' +
    '[--_px:var(--jimble-button-padding-x,calc(var(--spacing)*3))] ' +
    '[--_gap:var(--jimble-button-gap,calc(var(--spacing)*2))] text-sm',
  lg:
    '[--_h:var(--jimble-button-height,var(--jimble-control-height-lg,2.5rem))] ' +
    '[--_px:var(--jimble-button-padding-x,calc(var(--spacing)*4))] ' +
    '[--_gap:var(--jimble-button-gap,calc(var(--spacing)*2))] text-base',
}
const BASE =
  'inline-flex min-h-(--_h) items-center justify-center whitespace-nowrap select-none ' +
  'cursor-pointer bg-(--_bg) text-(--_fg) hover:bg-(--_bg-hover) ' +
  'ring-1 ring-inset ring-(--_ring) [border-radius:var(--jimble-button-radius,var(--radius-control))] ' +
  '[font-weight:var(--jimble-button-font-weight,600)] gap-(--_gap) ' +
  'outline outline-1 outline-transparent ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-busy:cursor-progress'
const PADDING = 'px-(--_px)'
const ICON_ONLY = 'w-(--_h) p-0'

/**
 * ボタン。操作の実行・ページ遷移に使う。`href` があるとリンク（`<a>`）として描画する。
 *
 * `type="submit"` / `"reset"` は所属フォームの `requestSubmit()` / `reset()` を呼ぶ。
 * フォーム関連カスタム要素は送信ボタンになれないため、`name` / `value` は送信されない。
 *
 * @tag jimble-button
 *
 * @slot - ラベル
 * @slot prefix - ラベルの前のアイコンなど
 * @slot suffix - ラベルの後のアイコンなど
 *
 * @csspart base - 内部の button / a 要素
 * @csspart label - ラベルを包む要素
 * @csspart prefix - prefix スロットを包む要素
 * @csspart suffix - suffix スロットを包む要素
 * @csspart spinner - ローディングのスピナー
 *
 * @cssprop [--jimble-button-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-button-height=サイズに応じた --jimble-control-height-*] - 高さ（最小）
 * @cssprop [--jimble-button-padding-x=サイズに応じる] - 左右の余白
 * @cssprop [--jimble-button-gap=サイズに応じる] - アイコンとラベルの間隔
 * @cssprop [--jimble-button-font-weight=600] - 文字の太さ
 * @cssprop [--jimble-button-bg=variant に応じる] - 背景色
 * @cssprop [--jimble-button-bg-hover=variant に応じる] - hover 時の背景色
 * @cssprop [--jimble-button-fg=variant に応じる] - 文字色
 * @cssprop [--jimble-button-ring=variant に応じる] - 枠（ring）の色
 */
export class JimbleButton extends JimbleElement {
  static formAssociated = true
  static override properties = {
    variant: { reflect: true },
    size: { reflect: true },
    type: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    href: { reflect: true },
    target: { reflect: true },
    rel: { reflect: true },
    download: { reflect: true },
    iconOnly: { type: Boolean, reflect: true, attribute: 'icon-only' },
    block: { type: Boolean, reflect: true },
    accessibleLabel: { attribute: 'aria-label' },
    accessibleDescription: { attribute: 'aria-description' },
    haspopup: { attribute: false },
    expanded: { attribute: false },
  }
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  /** 見た目。未知の値は secondary にフォールバックする */
  declare variant: ButtonVariant
  /** 高さ 32 / 36 / 40px */
  declare size: ButtonSize
  /** ネイティブと違い既定は button（誤送信を避ける） */
  declare type: 'button' | 'submit' | 'reset'
  /** 操作不可。フォーカスもできない */
  declare disabled: boolean
  /** 処理中。クリック無効・スピナー表示。フォーカスは維持する */
  declare loading: boolean
  /** 指定するとリンク（a 要素）として描画する */
  declare href: string | undefined
  declare target: string | undefined
  declare rel: string | undefined
  declare download: string | undefined
  /** アイコンのみ（正方形）。aria-label が必須 */
  declare iconOnly: boolean
  /** 幅いっぱいに広げる */
  declare block: boolean
  /** ホストの aria-label を内部の要素へ渡す */
  declare accessibleLabel: string | null
  /** ホストの aria-description を内部の要素へ渡す(jimble-tooltip が使う。ARIA の参照は Shadow をまたげないため、文字列で渡す) */
  declare accessibleDescription: string | null
  /** ポップアップを開くボタンのとき、その種類(menu / listbox など)。dropdown-menu が設定する */
  declare haspopup: string | undefined
  /** ポップアップを開くボタンのとき、開いているか。dropdown-menu が設定する */
  declare expanded: boolean | undefined

  #slots = new SlotController(this)
  #fieldsetDisabled = false

  constructor() {
    super()
    this.variant = 'secondary'
    this.size = 'md'
    this.type = 'button'
    this.disabled = false
    this.loading = false
    this.iconOnly = false
    this.block = false
    this.accessibleLabel = null
    this.accessibleDescription = null
    this.addEventListener('click', this.#onHostClick)
  }

  get #isDisabled(): boolean {
    return this.disabled || this.#fieldsetDisabled
  }
  /** クリックを受け付けない状態（無効 or 処理中） */
  get #isInert(): boolean {
    return this.#isDisabled || this.loading
  }

  /** 祖先の fieldset[disabled] を受ける */
  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled
    this.requestUpdate()
  }

  override focus(options?: FocusOptions): void {
    this.#inner?.focus(options)
  }

  override click(): void {
    if (this.#isInert) return
    this.#inner?.click()
  }

  get #inner(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="base"]') ?? null
  }

  #onInnerClick = (event: Event) => {
    if (this.#isInert) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  // ホスト自身のリスナー。利用者のリスナーより先に登録されるが、利用者の preventDefault() を
  // 尊重するため、フォーム操作は次のタスクで defaultPrevented を見てから行う。
  #onHostClick = (event: Event) => {
    if (this.#isInert || this.href) return
    const type = this.type
    if (type !== 'submit' && type !== 'reset') return
    const form = this.internals.form
    if (!form) return
    setTimeout(() => {
      if (event.defaultPrevented) return
      if (type === 'submit') form.requestSubmit()
      else form.reset()
    })
  }

  protected override updated(): void {
    if (this.iconOnly && !this.accessibleLabel) {
      this.warn('icon-only のときは aria-label が必要です（アイコンだけでは名前が伝わりません）。')
    }
    this.setState('loading', this.loading)
    this.setState('disabled', this.#isDisabled)
    this.setState('icon-only', this.iconOnly)
  }

  protected override render() {
    const variant = VARIANT[this.variant] ?? VARIANT.secondary
    const size = SIZE[this.size] ?? SIZE.md
    const classes = `${BASE} ${variant} ${size} ${this.iconOnly ? ICON_ONLY : PADDING}`
    const disabled = this.#isDisabled
    const busy = this.loading ? 'true' : undefined
    const label = this.accessibleLabel ?? undefined
    const description = this.accessibleDescription ?? undefined

    const hasPrefix = this.#slots.hasSlot('prefix')
    const hasSuffix = this.#slots.hasSlot('suffix')
    const content = html`${
        this.loading
          ? html`<span part="spinner" class="inline-flex motion-safe:animate-spin"
                >${renderIcon(spinner, 'size-4')}</span
              ><span class="sr-only">${this.t('common.loading')}</span>`
          : nothing
      }<span part="prefix" class=${hasPrefix ? 'inline-flex' : 'hidden'}
        ><slot name="prefix"></slot></span
      ><span part="label" class="inline-flex items-center"><slot></slot></span
      ><span part="suffix" class=${hasSuffix ? 'inline-flex' : 'hidden'}
        ><slot name="suffix"></slot
      ></span>`

    if (this.href) {
      const rel = this.rel ?? (this.target === '_blank' ? 'noopener' : undefined)
      return html`<a
        part="base"
        class=${classes}
        href=${ifDefined(disabled ? undefined : this.href)}
        target=${ifDefined(this.target)}
        rel=${ifDefined(rel)}
        download=${ifDefined(this.download)}
        role=${ifDefined(disabled ? 'link' : undefined)}
        aria-disabled=${ifDefined(disabled || this.loading ? 'true' : undefined)}
        aria-busy=${ifDefined(busy)}
        aria-label=${ifDefined(label)}
        aria-description=${ifDefined(description)}
        aria-haspopup=${ifDefined(this.haspopup)}
        aria-expanded=${ifDefined(this.expanded === undefined ? undefined : String(this.expanded))}
        @click=${this.#onInnerClick}
        >${content}</a
      >`
    }
    return html`<button
      part="base"
      class=${classes}
      type="button"
      ?disabled=${disabled}
      aria-disabled=${ifDefined(this.loading && !disabled ? 'true' : undefined)}
      aria-busy=${ifDefined(busy)}
      aria-label=${ifDefined(label)}
      aria-description=${ifDefined(description)}
      aria-haspopup=${ifDefined(this.haspopup)}
      aria-expanded=${ifDefined(this.expanded === undefined ? undefined : String(this.expanded))}
      @click=${this.#onInnerClick}
    >
      ${content}
    </button>`
  }
}

JimbleButton.define('jimble-button')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-button': JimbleButton
  }
}
