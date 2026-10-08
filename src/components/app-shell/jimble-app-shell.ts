import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { getReturnFocusTarget, restoreFocus } from '../../base/focus.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { popModal, pushModal } from '../../base/modal-stack.js'
import { lockScroll, unlockScroll } from '../../base/scroll-lock.js'
import { bars3 } from '../../icons/bars3.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'

/** サイドバーを常時表示する幅（Tailwind の md: と同じ 48rem） */
const WIDE = '(min-width: 48rem)'
/** 細いサイドバーにマウスを重ねてから広がるまで / 離れてから戻るまで(ms)。通り過ぎただけでは広げない */
const PEEK_OPEN_DELAY = 80
const PEEK_CLOSE_DELAY = 150

/** Shadow DOM の中まで辿った、いまフォーカスのある要素 */
function deepActiveElement(): Element | null {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

// グリッドの列など。Tailwind が拾えるよう、完全な文字列で書く
const BASE =
  'grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-surface-muted text-fg md:transition-[grid-template-columns] md:duration-150 motion-reduce:transition-none [--_hh:var(--jimble-app-shell-header-height,3.5rem)] ' +
  '[--_ring-header:var(--jimble-app-shell-header-ring,var(--color-line))] [--_ring-sidebar:var(--jimble-app-shell-sidebar-ring,var(--color-line))] '
const COLS_WIDE = 'md:grid-cols-[var(--jimble-app-shell-sidebar-width,16rem)_minmax(0,1fr)]'
const COLS_RAIL =
  'md:grid-cols-[var(--jimble-app-shell-sidebar-collapsed-width,4rem)_minmax(0,1fr)]'
const SIDEBAR =
  'sticky top-(--_hh) hidden h-[calc(100dvh_-_var(--_hh))] [background-color:var(--jimble-app-shell-sidebar-bg,var(--color-surface))] ring-1 ring-inset ring-(--_ring-sidebar) md:block '
/** 細いサイドバーの中身。マウスを重ねると、本文に重なるように広がる（列の幅は変えない） */
const PANEL_RAIL =
  'absolute inset-y-0 start-0 overflow-x-hidden overflow-y-auto p-3 [background-color:var(--jimble-app-shell-sidebar-bg,var(--color-surface))] ring-1 ring-inset ring-(--_ring-sidebar) ' +
  'transition-[width] duration-150 motion-reduce:transition-none '

const ICON_BUTTON =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-md cursor-pointer text-inherit ' +
  'hover:[background-color:var(--jimble-app-shell-header-hover-bg,var(--color-surface-sunken))] outline outline-1 outline-transparent focus-visible:outline-2 ' +
  'focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * 管理画面の枠組み: 上部のヘッダー、左のサイドバー、本文。
 *
 * - 広い画面（48rem 以上）ではサイドバーを常に表示する。
 * - 狭い画面ではサイドバーを閉じ、ヘッダーのボタンで**モーダルのドロワー**（ネイティブの `<dialog>`）として開く。
 *   Esc・背景クリック・サイドバーのリンクのクリックで閉じる。閉じるとフォーカスはボタンに戻る。
 * - ヘッダーは上に固定される。キーボードのフォーカスが固定ヘッダーの下に隠れないよう、
 *   フォーカスした要素が隠れる場合は自動でスクロールを補正する（WCAG 2.4.11）。
 * - 先頭に「本文へ移動」のスキップリンクを持つ。
 * - `sidebar-collapsible` を付けると、ヘッダーのボタンで、サイドバーを「アイコンだけの細い表示」と
 *   「項目名も出す広い表示」に切り替えられる（広い画面のみ）。細い表示でも、マウスを重ねる・フォーカスすると
 *   本文に重なるように広がり、項目名と子項目（`jimble-nav-group`）が使える。現在の状態は `sidebar-collapsed`。
 *
 * @tag jimble-app-shell
 *
 * @slot header - ヘッダーの内容（ロゴ、検索、ユーザーメニューなど）
 * @slot sidebar - サイドバーの内容（jimble-sidebar-nav など）
 * @slot - 本文
 *
 * @csspart base - ルート要素
 * @csspart skip-link - スキップリンク
 * @csspart header - ヘッダー（banner）
 * @csspart menu-button - ドロワーを開くボタン（狭い画面のみ）
 * @csspart toggle-button - サイドバーの幅を切り替えるボタン（`sidebar-collapsible`、広い画面のみ）
 * @csspart sidebar - 広い画面のサイドバー（列の幅を取る枠）
 * @csspart sidebar-panel - サイドバーの中身。細い表示では、広がるときに本文に重なる面
 * @csspart drawer - 狭い画面のドロワー(dialog)
 * @csspart main - 本文（main）
 *
 * @cssprop [--jimble-app-shell-header-height=3.5rem] - ヘッダーの高さ
 * @cssprop [--jimble-app-shell-sidebar-width=16rem] - サイドバーの幅（細い表示でマウスを重ねたときに広がる幅も同じ）
 * @cssprop [--jimble-app-shell-sidebar-collapsed-width=4rem] - 細い表示のサイドバーの幅
 * @cssprop [--jimble-app-shell-main-padding=4 単位(1rem)] - 本文の余白
 * @cssprop [--jimble-app-shell-header-bg=var(--jimble-color-surface)] - ヘッダーの背景
 * @cssprop [--jimble-app-shell-header-text=var(--jimble-color-text)] - ヘッダーの文字色（ヘッダーの中のボタンにも効く）
 * @cssprop [--jimble-app-shell-header-hover-bg=var(--jimble-color-surface-sunken)] - ヘッダーの中のボタン（メニュー・幅の切り替え）にマウスを重ねたときの背景
 * @cssprop [--jimble-app-shell-header-ring=var(--jimble-color-ring)] - ヘッダーの縁の色
 * @cssprop [--jimble-app-shell-sidebar-bg=var(--jimble-color-surface)] - サイドバーの背景（ドロワー・広がった細い表示も同じ）
 * @cssprop [--jimble-app-shell-sidebar-ring=var(--jimble-color-ring)] - サイドバーの縁の色
 *
 * @fires jimble-open - ドロワーが開いた
 * @fires jimble-close - ドロワーが閉じた
 * @fires jimble-sidebar-toggle - サイドバーの細い/広いが切り替わった(collapsed)
 */
export class JimbleAppShell extends JimbleElement {
  static override properties: PropertyDeclarations = {
    sidebarOpen: { type: Boolean, reflect: true, attribute: 'sidebar-open' },
    sidebarCollapsible: { type: Boolean, reflect: true, attribute: 'sidebar-collapsible' },
    sidebarCollapsed: { type: Boolean, reflect: true, attribute: 'sidebar-collapsed' },
    wide: { type: Boolean, attribute: false },
    peek: { type: Boolean, attribute: false },
  }

  /** 狭い画面で、サイドバーのドロワーを開いているか */
  declare sidebarOpen: boolean
  /** ヘッダーに、サイドバーの幅を切り替えるボタンを出す（広い画面のみ） */
  declare sidebarCollapsible: boolean
  /** サイドバーを、アイコンだけの細い表示にしているか（広い画面のみ。狭い画面のドロワーは常に広い表示） */
  declare sidebarCollapsed: boolean
  /** 広い画面か（サイドバーを常時表示するか） */
  declare wide: boolean
  /** 細いサイドバーに、マウスを重ねている・フォーカスがあるため、広げて見せているか */
  declare peek: boolean

  #mq = window.matchMedia(WIDE)
  #sidebarSlot = document.createElement('slot')
  #previousFocus: Element | null = null
  #locked = false
  #hovering = false
  #peekTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.sidebarOpen = false
    this.sidebarCollapsible = false
    this.sidebarCollapsed = false
    this.peek = false
    this.wide = this.#mq.matches
    // <slot name="sidebar"> は 1 つだけ作り、広い画面では aside、狭い画面ではドロワーの中へ移して使い回す
    this.#sidebarSlot.name = 'sidebar'
    this.#sidebarSlot.addEventListener('slotchange', () => this.#syncNav())
    this.addEventListener('focusin', this.#keepFocusVisible)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.wide = this.#mq.matches
    this.#mq.addEventListener('change', this.#onMedia)
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#mq.removeEventListener('change', this.#onMedia)
    clearTimeout(this.#peekTimer)
    this.#release()
  }

  #onMedia = () => {
    this.wide = this.#mq.matches
    if (this.wide) this.sidebarOpen = false // 広くなったらドロワーは閉じる
  }

  /** 細い表示か（広い画面で、折りたたんでいる） */
  get #rail(): boolean {
    return this.wide && this.sidebarCollapsed
  }

  /** サイドバーの幅を、細い / 広いで切り替える */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  // ---- 細いサイドバーの「のぞき見」(マウスを重ねる・フォーカスすると広がる) ----
  /** いまの状態(ホバー or フォーカス)に合わせて、広げる / 戻す。広げるのは少し待ち、戻すのも少し待つ */
  #syncPeek() {
    clearTimeout(this.#peekTimer)
    if (!this.#rail) {
      this.peek = false // 細い表示でなくなったら、広げて見せる理由もなくなる
      return
    }
    const sidebar = this.renderRoot?.querySelector<HTMLElement>('#sidebar')
    // フォーカスで広げるのは、キーボードで入ったとき(:focus-visible)だけ。マウスでクリックしたボタンに
    // フォーカスが残っていても、マウスが離れたら戻す
    const focused =
      !!sidebar?.matches(':focus-within') && !!deepActiveElement()?.matches(':focus-visible')
    const want = this.#rail && (this.#hovering || focused)
    if (want === this.peek) return
    const delay = !want ? PEEK_CLOSE_DELAY : focused ? 0 : PEEK_OPEN_DELAY
    if (delay === 0) this.peek = want
    else this.#peekTimer = setTimeout(() => (this.peek = want), delay)
  }
  #onSidebarPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return // タッチは、タップでそのまま項目を開く。広げるのはボタンで
    this.#hovering = true
    this.#syncPeek()
  }
  #onSidebarPointerLeave = () => {
    this.#hovering = false
    this.#syncPeek()
  }
  // フォーカスが移り終わってから判定する(focusout の時点では、まだ :focus-within が残っている)
  #onSidebarFocusChange = () => queueMicrotask(() => this.#syncPeek())

  /** サイドバーの中の jimble-sidebar-nav に、細い表示かどうか(のぞき見中は広い)を伝える */
  #syncNav() {
    const compact = this.#rail && !this.peek
    for (const slotted of this.querySelectorAll<HTMLElement>('[slot="sidebar"]')) {
      const navs =
        slotted.localName === 'jimble-sidebar-nav'
          ? [slotted]
          : [...slotted.querySelectorAll<HTMLElement>('jimble-sidebar-nav')]
      for (const nav of navs) (nav as HTMLElement & { compact: boolean }).compact = compact
    }
  }

  get #drawer(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  open(): void {
    this.sidebarOpen = true
  }
  close(): void {
    this.sidebarOpen = false
  }

  #release() {
    if (!this.#locked) return
    this.#locked = false
    unlockScroll()
    const drawer = this.#drawer
    if (drawer) popModal(drawer)
  }

  #onCancel = (event: Event) => {
    event.preventDefault()
    this.sidebarOpen = false
  }
  #onDrawerClose = () => {
    if (this.sidebarOpen) this.sidebarOpen = false
    this.#release()
    const previous = this.#previousFocus
    this.#previousFocus = null
    queueMicrotask(() => restoreFocus(previous))
    this.emit('close')
  }
  #onDrawerClick = (event: MouseEvent) => {
    const drawer = this.#drawer
    // 背景クリック、またはドロワー内のリンクをたどったとき
    if (event.target === drawer) this.sidebarOpen = false
    // リンクは jimble-nav-item の Shadow の内側にあるので、target ではなくイベントの経路から探す
    else if (
      event.composedPath().some((n) => n instanceof HTMLAnchorElement && n.hasAttribute('href'))
    ) {
      this.sidebarOpen = false
    }
  }

  // 固定ヘッダーの下にフォーカスが隠れないよう、スクロールを補正する（WCAG 2.4.11）
  #keepFocusVisible = (event: FocusEvent) => {
    const header = this.renderRoot?.querySelector<HTMLElement>('[part="header"]')
    const target = event.target as HTMLElement | null
    if (!header || !target || this.#drawer?.open) return
    const top = target.getBoundingClientRect().top
    const limit = header.getBoundingClientRect().bottom
    if (top < limit) window.scrollBy({ top: top - limit - 8 })
  }

  #focusMain = (event: Event) => {
    event.preventDefault()
    this.renderRoot.querySelector<HTMLElement>('[part="main"]')?.focus()
  }

  #placeSidebar() {
    const target = this.renderRoot.querySelector<HTMLElement>(
      this.wide ? '#sidebar-host' : '#drawer-host',
    )
    if (target && this.#sidebarSlot.parentElement !== target) target.append(this.#sidebarSlot)
  }

  protected override firstUpdated(): void {
    this.#placeSidebar()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.#placeSidebar()
    if (changed.has('wide') || changed.has('sidebarCollapsed')) this.#syncPeek()
    if (changed.has('wide') || changed.has('sidebarCollapsed') || changed.has('peek'))
      this.#syncNav()
    if (changed.has('sidebarCollapsed') && changed.get('sidebarCollapsed') !== undefined)
      this.emit('sidebar-toggle', { detail: { collapsed: this.sidebarCollapsed } })
    const drawer = this.#drawer
    if (!drawer || !changed.has('sidebarOpen')) return
    if (this.sidebarOpen && !this.wide && !drawer.open) {
      this.#previousFocus = getReturnFocusTarget()
      drawer.showModal()
      this.#locked = true
      lockScroll()
      pushModal(drawer)
      this.emit('open')
    } else if (!this.sidebarOpen && drawer.open) {
      drawer.close()
    }
  }

  protected override render() {
    const label = this.sidebarOpen ? this.t('shell.closeMenu') : this.t('shell.openMenu')
    const rail = this.#rail
    return html`<div part="base" class="${BASE}${rail ? COLS_RAIL : COLS_WIDE}">
      <button
        part="skip-link"
        type="button"
        class="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-(--jimble-z-drawer,20) focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:outline focus:outline-2 focus:outline-focus"
        @click=${this.#focusMain}
      >
        ${this.t('shell.skipToContent')}
      </button>
      <header
        part="header"
        class="sticky top-0 z-(--jimble-z-sticky,10) col-span-full flex h-(--_hh) items-center gap-3 px-4 shadow-sm ring-1 ring-inset ring-(--_ring-header) [background-color:var(--jimble-app-shell-header-bg,var(--color-surface))] [color:var(--jimble-app-shell-header-text,var(--color-fg))]"
      >
        ${
          this.wide
            ? this.sidebarCollapsible
              ? html`<button
                  part="toggle-button"
                  type="button"
                  class=${ICON_BUTTON}
                  aria-label=${this.t('shell.toggleSidebar')}
                  aria-expanded=${this.sidebarCollapsed ? 'false' : 'true'}
                  aria-controls="sidebar"
                  @click=${() => this.toggleSidebar()}
                >
                  ${renderIcon(bars3, 'size-6')}
                </button>`
              : ''
            : html`<button
                part="menu-button"
                type="button"
                class=${ICON_BUTTON}
                aria-label=${this.t('shell.openMenu')}
                aria-expanded=${this.sidebarOpen ? 'true' : 'false'}
                @click=${() => (this.sidebarOpen = true)}
              >
                ${renderIcon(bars3, 'size-6')}
              </button>`
        }
        <div class="flex min-w-0 flex-1 items-center gap-3"><slot name="header"></slot></div>
      </header>
      <div
        id="sidebar"
        part="sidebar"
        class="${SIDEBAR}${rail ? 'z-(--jimble-z-drawer,20)' : 'overflow-auto p-3'}"
        @pointerenter=${this.#onSidebarPointerEnter}
        @pointerleave=${this.#onSidebarPointerLeave}
        @focusin=${this.#onSidebarFocusChange}
        @focusout=${this.#onSidebarFocusChange}
      >
        <div
          id="sidebar-host"
          part="sidebar-panel"
          class=${
            rail
              ? `${PANEL_RAIL}${this.peek ? 'w-(--jimble-app-shell-sidebar-width,16rem) shadow-lg' : 'w-full'}`
              : ''
          }
        ></div>
      </div>
      <main
        id="main"
        part="main"
        tabindex="-1"
        class="min-w-0 p-(--jimble-app-shell-main-padding,calc(var(--spacing)*4)) outline-none md:p-(--jimble-app-shell-main-padding,calc(var(--spacing)*6))"
      >
        <slot></slot>
      </main>
      <dialog
        part="drawer"
        aria-label=${label}
        class="m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none overflow-auto border-0 p-0 text-fg shadow-lg backdrop:bg-backdrop [background-color:var(--jimble-app-shell-sidebar-bg,var(--color-surface))]"
        @cancel=${this.#onCancel}
        @close=${this.#onDrawerClose}
        @click=${this.#onDrawerClick}
      >
        <div class="flex h-full flex-col">
          <div class="flex h-(--_hh) shrink-0 items-center justify-end px-4">
            <button
              part="close-button"
              type="button"
              class=${ICON_BUTTON}
              aria-label=${this.t('shell.closeMenu')}
              @click=${() => (this.sidebarOpen = false)}
            >
              ${renderIcon(xMark, 'size-6')}
            </button>
          </div>
          <div id="drawer-host" class="min-h-0 flex-1 overflow-auto p-3"></div>
        </div>
      </dialog>
    </div>`
  }
}
JimbleAppShell.define('jimble-app-shell')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-app-shell': JimbleAppShell
  }
}
