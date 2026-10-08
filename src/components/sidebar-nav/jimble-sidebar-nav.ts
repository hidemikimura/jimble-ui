import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { chevronDown } from '../../icons/chevronDown.js'
import { renderIcon } from '../../icons/render.js'

const LINK =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline outline ' +
  'outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'focus-visible:[outline-color:var(--jimble-sidebar-nav-ring-focus,var(--color-focus))]'
/** 項目の色。利用者が CSS 変数で変えられる(既定は意味トークン) */
const IDLE =
  '[color:var(--jimble-sidebar-nav-text,var(--color-fg))] ' +
  'hover:[background-color:var(--jimble-sidebar-nav-hover-bg,var(--color-surface-sunken))]'
const CURRENT =
  '[background-color:var(--jimble-sidebar-nav-current-bg,var(--color-primary-50))] ' +
  '[color:var(--jimble-sidebar-nav-current-text,var(--color-primary-700))]'
/** アイコン。大きさは、中の jimble-icon が読む --jimble-icon-size に渡す(未指定なら、アイコン自身の大きさ) */
const ICON =
  'inline-flex shrink-0 [color:var(--jimble-sidebar-nav-icon-color,var(--color-fg-muted))] ' +
  '[--jimble-icon-size:var(--jimble-sidebar-nav-icon-size)]'
const CHEVRON =
  'inline-flex shrink-0 [color:var(--jimble-sidebar-nav-icon-color,var(--color-fg-muted))]'
/** 項目名: 通常は行いっぱいに出し、compact では見えなくして読み上げだけに残す */
const LABEL = 'min-w-0 flex-1 truncate'
const LABEL_HIDDEN = 'sr-only'
/** アイコンのない項目を compact にしたときの、頭文字の表示 */
const INITIAL =
  'inline-flex size-5 shrink-0 items-center justify-center rounded-md text-xs font-semibold ' +
  '[background-color:var(--jimble-sidebar-nav-hover-bg,var(--color-surface-sunken))] ' +
  '[color:var(--jimble-sidebar-nav-text,var(--color-fg))]'
const initialOf = (source: HTMLElement | string) =>
  [...(typeof source === 'string' ? source : (source.textContent ?? '')).trim()][0] ?? ''

/**
 * サイドバーのナビゲーション。`jimble-nav-item`（リンク）と `jimble-nav-group`（折りたたみ）を並べる。
 * `nav` ランドマークで、名前は `label`（既定「メインメニュー」）。
 * `compact` にすると、項目をアイコンだけの細い表示にする（項目名は読み上げには残る）。
 * `jimble-app-shell` の `sidebar-collapsible` は、これを自動で切り替える。
 *
 * @tag jimble-sidebar-nav
 *
 * @slot - jimble-nav-item / jimble-nav-group
 *
 * @csspart base - nav 要素
 * @csspart list - 項目を並べる領域
 *
 * @cssprop [--jimble-sidebar-nav-text=var(--jimble-color-text)] - 項目の文字色
 * @cssprop [--jimble-sidebar-nav-icon-color=var(--jimble-color-text-muted)] - アイコンと開閉の矢印の色
 * @cssprop [--jimble-sidebar-nav-icon-size=アイコン自身の大きさ(1.25rem)] - アイコン（`jimble-icon`）の大きさ
 * @cssprop [--jimble-sidebar-nav-hover-bg=var(--jimble-color-surface-sunken)] - マウスを重ねた項目の背景（細い表示の頭文字の背景にも使う）
 * @cssprop [--jimble-sidebar-nav-current-bg=var(--jimble-color-primary-50)] - 現在のページの背景
 * @cssprop [--jimble-sidebar-nav-current-text=var(--jimble-color-primary-700)] - 現在のページの文字色
 * @cssprop [--jimble-sidebar-nav-ring-focus=var(--jimble-color-ring-focus)] - フォーカスの輪郭の色
 */
export class JimbleSidebarNav extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    compact: { type: Boolean, reflect: true },
  }

  declare label: string | undefined
  /** 項目をアイコンだけで表示する（項目名は読み上げに残る。アイコンのない項目は頭文字を出す） */
  declare compact: boolean

  readonly #observer = new MutationObserver(() => this.#syncItems())

  constructor() {
    super()
    this.compact = false
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#observer.observe(this, { childList: true, subtree: true })
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer.disconnect()
  }

  /** 中の項目・グループに compact を伝える（項目は slot された light DOM なので、CSS の継承では伝わらない） */
  #syncItems() {
    for (const item of this.querySelectorAll<JimbleNavItem | JimbleNavGroup>(
      'jimble-nav-item, jimble-nav-group',
    ))
      item.compact = this.compact
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.#syncItems()
  }

  protected override render() {
    return html`<nav part="base" aria-label=${this.label ?? this.t('nav.label')}>
      <div part="list" role="list" class="flex flex-col gap-0.5"><slot></slot></div>
    </nav>`
  }
}
JimbleSidebarNav.define('jimble-sidebar-nav')

/**
 * ナビゲーションの項目（リンク）。現在のページは `current`（`aria-current="page"`）。
 *
 * @tag jimble-nav-item
 *
 * @slot - 項目の文字
 * @slot icon - 前に置くアイコン
 *
 * @csspart link - a 要素
 */
export class JimbleNavItem extends JimbleElement {
  static override properties: PropertyDeclarations = {
    href: {},
    current: { type: Boolean, reflect: true },
    target: {},
    compact: { type: Boolean, attribute: false },
  }

  declare href: string | undefined
  /** 現在のページ */
  declare current: boolean
  declare target: string | undefined
  /** @internal 親の `jimble-sidebar-nav` が設定する。アイコンだけで表示する */
  declare compact: boolean

  #slots = new SlotController(this)

  constructor() {
    super()
    this.href = undefined
    this.current = false
    this.target = undefined
    this.compact = false
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    this.setState('current', this.current)
  }

  /** アイコン。compact でアイコンがないときは頭文字を出す（読み上げでは項目名が読まれるので、頭文字は隠す） */
  #renderIcon() {
    const icon = this.#slots.hasSlot('icon')
    return html`<span class=${icon ? ICON : 'hidden'}><slot name="icon"></slot></span>${
        this.compact && !icon
          ? html`<span part="initial" class=${INITIAL} aria-hidden="true">${initialOf(this)}</span>`
          : nothing
      }`
  }

  protected override render() {
    return html`<a
      part="link"
      class="${LINK} ${this.current ? CURRENT : IDLE}"
      href=${ifDefined(this.href)}
      target=${ifDefined(this.target)}
      rel=${ifDefined(this.target === '_blank' ? 'noopener' : undefined)}
      aria-current=${this.current ? 'page' : nothing}
    >
      ${this.#renderIcon()}
      <span class=${this.compact ? LABEL_HIDDEN : LABEL}><slot></slot></span>
    </a>`
  }
}
JimbleNavItem.define('jimble-nav-item')

let groupSeq = 0

/**
 * 折りたためる項目のまとまり（disclosure パターン）。見出しのボタンで開閉する。
 * 中に現在のページ（`current` の項目）があると、最初から開く。
 *
 * @tag jimble-nav-group
 *
 * @slot - jimble-nav-item
 * @slot icon - 見出しの前のアイコン
 *
 * @csspart button - 見出しのボタン
 * @csspart panel - 項目の領域
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close - 閉じた
 */
export class JimbleNavGroup extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    open: { type: Boolean, reflect: true },
    compact: { type: Boolean, attribute: false },
  }

  declare label: string
  declare open: boolean
  /** @internal 親の `jimble-sidebar-nav` が設定する。アイコンだけで表示し、子項目は隠す */
  declare compact: boolean

  #slots = new SlotController(this)
  #id = `jimble-nav-group-${++groupSeq}`
  #initialized = false

  constructor() {
    super()
    this.label = ''
    this.open = false
    this.compact = false
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.#initialized) {
      this.#initialized = true
      if (this.querySelector('jimble-nav-item[current]')) this.open = true
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    if (changed.has('open') && changed.get('open') !== undefined)
      this.emit(this.open ? 'open' : 'close')
  }

  protected override render() {
    // compact の間は子項目を隠すので、開閉の状態も「閉じている」として伝える（開いていたことは open に残る）
    const expanded = this.open && !this.compact
    const icon = this.#slots.hasSlot('icon')
    return html`<button
        part="button"
        type="button"
        class="${LINK} ${IDLE} cursor-pointer"
        aria-expanded=${expanded ? 'true' : 'false'}
        aria-controls=${this.#id}
        @click=${() => (this.open = !this.open)}
      >
        <span class=${icon ? ICON : 'hidden'}><slot name="icon"></slot></span>${
          this.compact && !icon
            ? html`<span part="initial" class=${INITIAL} aria-hidden="true"
                >${initialOf(this.label)}</span
              >`
            : nothing
        }
        <span class=${this.compact ? LABEL_HIDDEN : `${LABEL} text-left`}>${this.label}</span>
        <span
          class=${this.compact ? 'hidden' : `${CHEVRON} ${this.open ? 'rotate-180' : ''}`}
          aria-hidden="true"
          >${renderIcon(chevronDown, 'size-4')}</span
        >
      </button>
      <div
        part="panel"
        id=${this.#id}
        role="list"
        class=${expanded ? 'mt-0.5 flex flex-col gap-0.5 ps-3' : 'hidden'}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>`
  }
}
JimbleNavGroup.define('jimble-nav-group')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-sidebar-nav': JimbleSidebarNav
    'jimble-nav-item': JimbleNavItem
    'jimble-nav-group': JimbleNavGroup
  }
}
