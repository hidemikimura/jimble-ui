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

const ICON_BUTTON =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg ' +
  'hover:bg-surface-sunken outline outline-1 outline-transparent focus-visible:outline-2 ' +
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
 * @csspart sidebar - 広い画面のサイドバー
 * @csspart drawer - 狭い画面のドロワー(dialog)
 * @csspart main - 本文（main）
 *
 * @cssprop [--jimble-app-shell-header-height=3.5rem] - ヘッダーの高さ
 * @cssprop [--jimble-app-shell-sidebar-width=16rem] - サイドバーの幅
 * @cssprop [--jimble-app-shell-main-padding=4 単位(1rem)] - 本文の余白
 *
 * @fires jimble-open - ドロワーが開いた
 * @fires jimble-close - ドロワーが閉じた
 */
export class JimbleAppShell extends JimbleElement {
  static override properties: PropertyDeclarations = {
    sidebarOpen: { type: Boolean, reflect: true, attribute: 'sidebar-open' },
    wide: { type: Boolean, attribute: false },
  }

  /** 狭い画面で、サイドバーのドロワーを開いているか */
  declare sidebarOpen: boolean
  /** 広い画面か（サイドバーを常時表示するか） */
  declare wide: boolean

  #mq = window.matchMedia(WIDE)
  #sidebarSlot = document.createElement('slot')
  #previousFocus: Element | null = null
  #locked = false

  constructor() {
    super()
    this.sidebarOpen = false
    this.wide = this.#mq.matches
    // <slot name="sidebar"> は 1 つだけ作り、広い画面では aside、狭い画面ではドロワーの中へ移して使い回す
    this.#sidebarSlot.name = 'sidebar'
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
    this.#release()
  }

  #onMedia = () => {
    this.wide = this.#mq.matches
    if (this.wide) this.sidebarOpen = false // 広くなったらドロワーは閉じる
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
    return html`<div
      part="base"
      class="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-surface-muted text-fg md:grid-cols-[var(--jimble-app-shell-sidebar-width,16rem)_minmax(0,1fr)] [--_hh:var(--jimble-app-shell-header-height,3.5rem)]"
    >
      <button
        part="skip-link"
        type="button"
        class="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-drawer focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:outline focus:outline-2 focus:outline-focus"
        @click=${this.#focusMain}
      >
        ${this.t('shell.skipToContent')}
      </button>
      <header
        part="header"
        class="sticky top-0 z-sticky col-span-full flex h-(--_hh) items-center gap-3 bg-surface px-4 shadow-sm ring-1 ring-inset ring-line"
      >
        ${
          this.wide
            ? ''
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
        id="sidebar-host"
        part="sidebar"
        class="sticky top-(--_hh) hidden h-[calc(100dvh-var(--_hh))] overflow-auto bg-surface p-3 ring-1 ring-inset ring-line md:block"
      ></div>
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
        class="m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none overflow-auto border-0 bg-surface p-0 text-fg shadow-lg backdrop:bg-backdrop"
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
