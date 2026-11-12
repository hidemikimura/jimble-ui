import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { getReturnFocusTarget, restoreFocus } from '../../base/focus.js'
import { ImeController } from '../../base/ime-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { popModal, pushModal } from '../../base/modal-stack.js'
import { lockScroll, unlockScroll } from '../../base/scroll-lock.js'
import { fold, matches } from '../../base/text-match.js'
import { magnifyingGlass } from '../../icons/magnifyingGlass.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'
import { sharedSheet } from '../../styles/shared-sheet.js'
import '../icon/jimble-icon.js'
import { JimbleCommand, type CommandItem } from './jimble-command.js'
import { isEditableTarget, matchesHotkey, parseHotkey } from './hotkey.js'

export type { CommandItem } from './jimble-command.js'
export type CommandPaletteCloseReason = 'escape' | 'backdrop' | 'select' | 'api'
/** 検索語からコマンドを返す関数（サーバーへの問い合わせなど）。`signal` は古い検索で中止される */
export type CommandLoader = (
  query: string,
  signal: AbortSignal,
) => CommandItem[] | Promise<CommandItem[]>

const DIALOG =
  'mx-auto mb-auto mt-[12dvh] max-h-[76dvh] max-w-none overflow-visible border-0 bg-transparent p-0 text-fg ' +
  'backdrop:bg-backdrop [width:min(var(--jimble-command-palette-width,40rem),calc(100vw_-_2rem))]'
const PANEL =
  'flex max-h-[76dvh] flex-col overflow-hidden bg-surface-overlay shadow-lg ring-1 ring-inset ring-line ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-command-palette-radius,var(--radius-overlay))]'
const INPUT =
  'min-w-0 flex-1 border-0 bg-transparent py-3 text-base text-fg outline-none placeholder:text-fg-placeholder'
const OPTION =
  'flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm cursor-default select-none'
const KBD =
  'inline-flex min-w-5 items-center justify-center rounded-sm bg-surface-sunken px-1 font-mono text-xs text-fg-secondary ring-1 ring-inset ring-line'

/** 表示する 1 行（グループ見出しの中のコマンド） */
interface Row {
  item: CommandItem
  /** 一覧の中の位置（id に使う） */
  index: number
}

/**
 * コマンドパレット。管理画面のどこからでも、ページや操作を名前で探して実行する、モーダルの検索窓。
 * 中は WAI-ARIA の combobox（入力欄 + 候補の一覧）で、フォーカスは入力欄のまま ↑↓ で候補を選び、Enter で実行する。
 *
 * - コマンドは子の `jimble-command`（`value`・`keywords`・`group`・`icon`・`shortcut`・`href`・`disabled`、
 *   名前は中身の文字）か、`commands` プロパティ（配列）で渡す。
 * - 絞り込みは、全角・半角、大文字・小文字、ひらがな・カタカナを区別しない（`keywords` に読みを書くと、それでも一致）。
 *   名前の先頭に一致するものを先に並べる。
 * - サーバーで探すなら `load` プロパティ（`(query, signal) => 項目[] | Promise`）。入力が止まってから呼ぶ（`load-delay`）。
 * - 選ぶと、パレットから `jimble-select`（`detail.value`・`item`）が出る。`preventDefault()` しなければ閉じ、
 *   `href` があれば移動する（`jimble-router` があれば、アプリの中の移動になる）。
 * - `hotkey="mod+k"` を付けると、文書のどこでも、そのキーで開閉する（`mod` は macOS で ⌘、ほかで Ctrl。既定ではなし）。
 * - 全部入りの `@hidemikimura/jimble-ui` には含まれない。`@hidemikimura/jimble-ui/command-palette` を import する
 *   （CDN は `dist/cdn/command-palette.js`）。
 *
 * @tag jimble-command-palette
 *
 * @slot - jimble-command
 *
 * @csspart base - `<dialog>` 要素
 * @csspart panel - 面
 * @csspart search - 入力欄の行
 * @csspart input - 入力欄（role="combobox"）
 * @csspart list - 候補の一覧を包む、スクロールする領域
 * @csspart listbox - 候補の一覧（role="listbox"）
 * @csspart group-label - グループの見出し
 * @csspart option - 候補 1 つ
 * @csspart shortcut - ショートカットの表示
 * @csspart empty - 候補が無い・読み込み中・失敗のときの表示
 * @csspart footer - キー操作の案内
 *
 * @cssprop [--jimble-command-palette-width=40rem] - 幅（画面の幅を超えない）
 * @cssprop [--jimble-command-palette-radius=var(--jimble-radius-overlay)] - 角丸
 *
 * @fires jimble-select - コマンドが選ばれた（`value`・`item`）。`preventDefault()` すると閉じない・移動しない
 * @fires jimble-open - 開いた
 * @fires jimble-close - 閉じた（`detail.reason`: escape / backdrop / select / api）
 * @fires jimble-search - 検索語が変わった（`detail.query`）
 * @fires jimble-load-error - `load` が失敗した（`detail.error`）
 */
export class JimbleCommandPalette extends JimbleElement {
  static override styles = [
    sharedSheet,
    css`
      :host {
        display: contents;
      }
    `,
  ]
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    label: {},
    placeholder: {},
    hotkey: { reflect: true },
    loadDelay: { type: Number, attribute: 'load-delay' },
    loadMinLength: { type: Number, attribute: 'load-min-length' },
    commands: { attribute: false },
    load: { attribute: false },
  }

  declare open: boolean
  /** パレットの名前（読み上げ）。省略すると「コマンド」 */
  declare label: string | undefined
  /** 入力欄の案内。省略すると「コマンドやページを検索」 */
  declare placeholder: string | undefined
  /** 開閉のショートカット（例 `mod+k`）。付けたときだけ効く */
  declare hotkey: string | undefined
  /** `load` を呼ぶまでの待ち時間（ミリ秒） */
  declare loadDelay: number
  /** `load` を呼ぶ最小の文字数 */
  declare loadMinLength: number
  /** コマンドの配列（子の jimble-command に加える） */
  declare commands: CommandItem[]
  /** 検索語からコマンドを返す関数（サーバーで探す） */
  declare load: CommandLoader | undefined

  #ime = new ImeController(this)
  #observer: MutationObserver | undefined
  #query = ''
  #active = 0
  #reason: CommandPaletteCloseReason = 'api'
  #previousFocus: Element | null = null
  #locked = false
  #pointerDownOnBackdrop = false
  #navigateTo: string | undefined
  #listId = this.uid('cp-list')
  #optionId = this.uid('cp-option')
  #groupId = this.uid('cp-group')
  // load
  #loaded: CommandItem[] = []
  #loading = false
  #loadError = false
  #abort: AbortController | undefined
  #timer: ReturnType<typeof setTimeout> | undefined
  #reqId = 0
  // 件数の読み上げ
  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.open = false
    this.label = undefined
    this.placeholder = undefined
    this.hotkey = undefined
    this.loadDelay = 250
    this.loadMinLength = 0
    this.commands = []
    this.load = undefined
  }

  show(): void {
    this.open = true
  }
  hide(): void {
    this.#reason = 'api'
    this.open = false
  }
  toggle(): void {
    if (this.open) this.hide()
    else this.show()
  }

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }
  get #input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('[part="input"]') ?? null
  }
  get #name(): string {
    return this.label || this.t('commandPalette.label')
  }

  // ---- 候補 ---------------------------------------------------------------------------------
  /** 子の jimble-command と commands の、すべてのコマンド */
  get #all(): CommandItem[] {
    const own = [...this.children]
      .filter((c): c is JimbleCommand => c instanceof JimbleCommand)
      .map((c) => c.toItem())
    return [...own, ...(this.commands ?? [])]
  }

  /** 表示する候補（絞り込み・並べ替えたもの） */
  get #results(): CommandItem[] {
    if (this.load) return this.#loaded
    const q = this.#query
    const hits = this.#all.filter((i) => matches(q, i.label, i.keywords))
    if (!fold(q)) return hits
    // 名前の先頭に一致するものを先に（それ以外の順は保つ）
    const head = (i: CommandItem) => fold(i.label).startsWith(fold(q))
    return [...hits.filter(head), ...hits.filter((i) => !head(i))]
  }

  /** グループごとに並べた行（グループは最初に出た順。グループなしは先頭） */
  #grouped(results: CommandItem[]): [string, Row[]][] {
    const groups = new Map<string, Row[]>()
    results.forEach((item, index) => {
      const g = item.group ?? ''
      groups.set(g, [...(groups.get(g) ?? []), { item, index }])
    })
    const entries = [...groups.entries()]
    return [...entries.filter(([g]) => !g), ...entries.filter(([g]) => g)]
  }

  /** 表示の順に並べた行 */
  #rows(): Row[] {
    return this.#grouped(this.#results).flatMap(([, rows]) => rows)
  }
  #firstEnabled(rows: Row[]): number {
    return rows.findIndex((r) => !r.item.disabled)
  }

  // ---- 取得（load）。コンボボックスと同じ ---------------------------------------------------
  #cancelLoad() {
    clearTimeout(this.#timer)
    this.#abort?.abort()
    this.#reqId++
    this.#loading = false
  }
  #scheduleLoad(query: string, immediate = false) {
    const load = this.load
    if (!load) return
    this.#cancelLoad()
    this.#loadError = false
    if (query.trim().length < this.loadMinLength) {
      this.#loaded = []
      this.requestUpdate()
      return
    }
    const id = this.#reqId
    const abort = new AbortController()
    this.#abort = abort
    this.#loading = true
    const run = async () => {
      try {
        const result = await load(query, abort.signal)
        if (id !== this.#reqId) return
        this.#loaded = Array.isArray(result) ? result : []
      } catch (error) {
        if (id !== this.#reqId || abort.signal.aborted) return
        this.#loaded = []
        this.#loadError = true
        this.emit('load-error', { detail: { error } })
      }
      this.#loading = false
      this.#resetActive()
      this.#announceCount()
      this.requestUpdate()
    }
    if (immediate) void run()
    else this.#timer = setTimeout(() => void run(), this.loadDelay)
    this.requestUpdate()
  }

  // ---- 入力と操作 ---------------------------------------------------------------------------
  #resetActive() {
    this.#active = Math.max(0, this.#firstEnabled(this.#rows()))
  }

  #announceCount() {
    const count = this.#results.length
    this.#announcement = count
      ? this.t('commandPalette.results', { count })
      : this.t('commandPalette.empty')
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, 2000)
  }

  #onInput = (e: Event) => {
    e.stopPropagation()
    this.#query = (e.target as HTMLInputElement).value
    this.emit('search', { detail: { query: this.#query } })
    if (this.load) this.#scheduleLoad(this.#query)
    else {
      this.#resetActive()
      this.#announceCount()
    }
    this.requestUpdate()
  }

  #move(step: number) {
    const rows = this.#rows()
    const enabled = rows.map((r, i) => (r.item.disabled ? -1 : i)).filter((i) => i >= 0)
    if (!enabled.length) return
    const at = enabled.indexOf(this.#active)
    const next = at < 0 ? 0 : (at + step + enabled.length) % enabled.length
    this.#active = enabled[next]!
    this.requestUpdate()
  }

  #onKeydown = (e: KeyboardEvent) => {
    if (this.#ime.isComposing(e)) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.#move(1)
        return
      case 'ArrowUp':
        e.preventDefault()
        this.#move(-1)
        return
      case 'Enter': {
        e.preventDefault()
        const row = this.#rows()[this.#active]
        if (row) this.#run(row.item)
        return
      }
    }
  }

  #run(item: CommandItem) {
    if (item.disabled) return
    const event = this.emit('select', { detail: { value: item.value, item }, cancelable: true })
    if (event.defaultPrevented) return
    this.#navigateTo = item.href
    this.#reason = 'select'
    this.open = false
  }

  // ---- ダイアログ ---------------------------------------------------------------------------
  #onCancel = (e: Event) => {
    e.preventDefault()
    // IME の変換中の Esc は、変換の取り消し（設計書 R6）
    if (this.#ime.isComposing()) return
    this.#reason = 'escape'
    this.open = false
  }
  #onPointerDown = (e: PointerEvent) => {
    this.#pointerDownOnBackdrop = e.target === this.#dialog
  }
  #onClick = (e: MouseEvent) => {
    const onBackdrop = e.target === this.#dialog && this.#pointerDownOnBackdrop
    this.#pointerDownOnBackdrop = false
    if (onBackdrop) {
      this.#reason = 'backdrop'
      this.open = false
    }
  }
  #onClose = () => {
    if (this.open) this.open = false
    this.#afterClose()
  }

  #afterClose() {
    this.#cancelLoad()
    if (this.#locked) {
      this.#locked = false
      unlockScroll()
      const dialog = this.#dialog
      if (dialog) popModal(dialog)
    }
    const previous = this.#previousFocus
    this.#previousFocus = null
    const href = this.#navigateTo
    this.#navigateTo = undefined
    // ページを移動するときは、移動先にフォーカスを任せる
    if (!href) queueMicrotask(() => restoreFocus(previous))
    this.emit('close', { detail: { reason: this.#reason } })
    this.#reason = 'api'
    // 移動は閉じたあと（ルーターがあれば Navigation API の遷移として受ける。設計書 §22.2）
    if (href) location.assign(href)
  }

  #onOpen() {
    const dialog = this.#dialog
    if (!dialog) return
    this.#query = ''
    const input = this.#input
    if (input) input.value = ''
    if (this.load) {
      this.#loaded = []
      this.#scheduleLoad('', true)
    }
    this.#resetActive()
    this.#previousFocus = getReturnFocusTarget()
    dialog.showModal()
    this.#locked = true
    lockScroll()
    pushModal(dialog)
    input?.focus()
    this.emit('open')
  }

  // ---- ショートカット -----------------------------------------------------------------------
  #onDocumentKeydown = (e: KeyboardEvent) => {
    const hk = parseHotkey(this.hotkey)
    if (!hk || e.defaultPrevented || !matchesHotkey(e, hk)) return
    const inside = e.composedPath().includes(this)
    // ほかの入力欄の中では奪わない（このパレットの入力欄なら閉じる）
    if (!inside && isEditableTarget(e)) return
    e.preventDefault()
    if (this.open) this.hide()
    else this.show()
  }

  // ---- ライフサイクル -----------------------------------------------------------------------
  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.#onDocumentKeydown)
    this.#observer = new MutationObserver(() => this.requestUpdate())
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    })
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this.#onDocumentKeydown)
    this.#observer?.disconnect()
    this.#cancelLoad()
    clearTimeout(this.#announceTimer)
    if (this.#locked) {
      this.#locked = false
      unlockScroll()
      const dialog = this.#dialog
      if (dialog) popModal(dialog)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const dialog = this.#dialog
    if (dialog && changed.has('open')) {
      if (this.open && !dialog.open) {
        this.#onOpen()
        this.requestUpdate()
      } else if (!this.open && dialog.open) dialog.close()
    }
    // 選んでいる候補を、見える位置へ
    this.renderRoot
      .querySelector<HTMLElement>('[part~="option"][aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }

  #renderOption(row: Row, active: boolean) {
    const { item } = row
    return html`<div
      part="option"
      role="option"
      id="${this.#optionId}-${row.index}"
      aria-selected=${active ? 'true' : 'false'}
      aria-disabled=${item.disabled ? 'true' : nothing}
      class="${OPTION} ${active ? 'bg-(--color-item-hover)' : ''} ${
        item.disabled ? 'opacity-50' : ''
      }"
      @pointermove=${() => {
        if (item.disabled) return
        const i = this.#rows().indexOf(this.#rows().find((r) => r.index === row.index)!)
        if (i !== this.#active) {
          this.#active = i
          this.requestUpdate()
        }
      }}
      @click=${() => this.#run(item)}
    >
      ${
        item.icon
          ? html`<jimble-icon class="shrink-0 text-fg-muted" name=${item.icon}></jimble-icon>`
          : nothing
      }
      <span class="min-w-0 flex-1 truncate">${item.label}</span>
      ${item.shortcut ? html`<kbd part="shortcut" class=${KBD}>${item.shortcut}</kbd>` : nothing}
    </div>`
  }

  #renderList() {
    const results = this.#results
    if (this.#loading && !results.length)
      return html`<p part="empty" class="m-0 px-3 py-6 text-center text-sm text-fg-muted">
        ${this.t('common.loading')}
      </p>`
    if (this.#loadError)
      return html`<p part="empty" class="m-0 px-3 py-6 text-center text-sm text-fg-danger">
        ${this.t('commandPalette.loadError')}
      </p>`
    if (!results.length)
      return html`<p part="empty" class="m-0 px-3 py-6 text-center text-sm text-fg-muted">
        ${this.t('commandPalette.empty')}
      </p>`
    const rows = this.#rows()
    const activeIndex = rows[this.#active]?.index
    return html`<div part="listbox" role="listbox" id=${this.#listId} aria-label=${this.#name}>
      ${this.#grouped(results).map(([group, groupRows], gi) =>
        group
          ? html`<div role="group" aria-labelledby="${this.#groupId}-${gi}">
              <div
                part="group-label"
                id="${this.#groupId}-${gi}"
                class="px-2.5 pb-1 pt-2 text-xs [font-weight:var(--font-weight-medium)] text-fg-muted"
              >
                ${group}
              </div>
              ${groupRows.map((r) => this.#renderOption(r, r.index === activeIndex))}
            </div>`
          : groupRows.map((r) => this.#renderOption(r, r.index === activeIndex)),
      )}
    </div>`
  }

  protected override render() {
    const rows = this.open ? this.#rows() : []
    const active = rows[this.#active]
    const hasList = rows.length > 0 && !this.#loadError
    return html`<dialog
      part="base"
      class=${DIALOG}
      aria-label=${this.#name}
      @cancel=${this.#onCancel}
      @close=${this.#onClose}
      @pointerdown=${this.#onPointerDown}
      @click=${this.#onClick}
    >
      <div part="panel" class=${PANEL}>
        <div part="search" class="flex items-center gap-2.5 border-b border-line-divider px-4">
          <span aria-hidden="true" class="inline-flex shrink-0 text-fg-muted"
            >${renderIcon(magnifyingGlass, 'size-5')}</span
          >
          <input
            part="input"
            class=${INPUT}
            type="text"
            role="combobox"
            autocomplete="off"
            spellcheck="false"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls=${hasList ? this.#listId : nothing}
            aria-activedescendant=${hasList && active ? `${this.#optionId}-${active.index}` : nothing}
            aria-label=${this.#name}
            placeholder=${this.placeholder ?? this.t('commandPalette.placeholder')}
            @input=${this.#onInput}
            @keydown=${this.#onKeydown}
          />
          ${
            this.#loading
              ? html`<span aria-hidden="true" class="inline-flex shrink-0 text-fg-muted"
                  >${renderIcon(spinner, 'size-4 motion-safe:animate-spin')}</span
                >`
              : nothing
          }
        </div>
        <div part="list" class="max-h-[min(24rem,52dvh)] overflow-auto p-2">
          ${this.open ? this.#renderList() : nothing}
        </div>
        <div
          part="footer"
          class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-divider px-4 py-2 text-xs text-fg-muted"
        >
          <span class="inline-flex items-center gap-1"
            ><kbd class=${KBD}>↑</kbd
            ><kbd class=${KBD}>↓</kbd>${this.t('commandPalette.navigate')}</span
          >
          <span class="inline-flex items-center gap-1"
            ><kbd class=${KBD}>Enter</kbd>${this.t('commandPalette.run')}</span
          >
          <span class="inline-flex items-center gap-1"
            ><kbd class=${KBD}>Esc</kbd>${this.t('commandPalette.close')}</span
          >
        </div>
        <div role="status" class="sr-only">${this.#announcement}</div>
      </div>
    </dialog>`
  }
}

JimbleCommandPalette.define('jimble-command-palette')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-command-palette': JimbleCommandPalette
  }
}
