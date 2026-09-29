import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import { fold, matches } from '../../base/text-match.js'
import { AFFIX, textWrapClasses } from '../../base/text-control.js'
import { check } from '../../icons/check.js'
import { chevronDown } from '../../icons/chevronDown.js'
import { chevronLeft } from '../../icons/chevronLeft.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'
import type { JimbleOption } from '../select/jimble-option.js'
import '../select/jimble-option.js'

const ICON_BUTTON =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken hover:text-fg disabled:cursor-not-allowed outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const CHIP =
  'group inline-flex max-w-full items-center gap-0.5 rounded-md bg-surface-sunken py-0.5 pl-2 pr-0.5 text-sm text-fg ' +
  'ring-1 ring-inset ring-line'
const CHIP_REMOVE =
  'inline-flex size-5 shrink-0 items-center justify-center rounded cursor-pointer text-fg-muted ' +
  'hover:bg-surface-overlay hover:text-fg outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
// 前へ / 後ろへボタンは、チップにフォーカスがあるとき(タップした直後など)だけ出す
const CHIP_MOVE =
  'hidden group-focus-within:inline-flex size-5 shrink-0 items-center justify-center rounded cursor-pointer text-fg-muted ' +
  'hover:bg-surface-overlay hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const INPUT =
  'min-w-0 flex-1 bg-transparent p-0 outline-none placeholder:text-(--_ph) disabled:cursor-not-allowed'
const INPUT_MULTI =
  'min-w-24 flex-1 bg-transparent p-0 outline-none placeholder:text-(--_ph) disabled:cursor-not-allowed'
const POPUP =
  'max-h-[min(20rem,50dvh)] overflow-auto border-0 bg-surface-overlay p-1 text-fg shadow-lg ' +
  'ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-combobox-radius,var(--radius-overlay))]'
const OPTION =
  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg select-none ' +
  'cursor-default outline outline-1 outline-transparent hover:bg-surface-sunken'

/** 候補・選択中の項目 */
export interface ComboboxItem {
  /** 送信される値 */
  value: string
  /** 表示する文字 */
  label: string
  /** 絞り込みで一致させる追加の語(読みなど) */
  keywords?: string
  disabled?: boolean
  /** グループ名。同じ名前の項目が見出し付きでまとまる */
  group?: string
}

/** 絞り込みの関数。true なら候補に残す */
export type ComboboxFilter = (query: string, item: ComboboxItem) => boolean
/** 検索語から候補を返す関数(同期でも、サーバーへの問い合わせなど非同期でもよい)。`signal` は古い検索で中止される */
export type ComboboxLoader = (
  query: string,
  signal: AbortSignal,
) => ComboboxItem[] | Promise<ComboboxItem[]>
/** 一覧にない文字から項目を作る関数。`null` を返すと追加しない */
export type ComboboxCreator = (text: string) => ComboboxItem | null | Promise<ComboboxItem | null>

interface Row {
  key: string
  item: ComboboxItem
  create?: boolean
}
const CREATE_KEY = '\u0000create'

/**
 * 絞り込みできるセレクト(WAI-ARIA の combobox・list autocomplete パターン)。文字を入力すると候補が絞られ、
 * 選択肢から選ぶ。選択肢は `jimble-option` で書く(`jimble-select` と同じ)。フォーム関連カスタム要素で、
 * 選ばれた選択肢の値を送信する。
 *
 * - 一致は、全角・半角、大文字・小文字、ひらがな・カタカナ、空白を区別しない。`jimble-option` の `keywords` に
 *   読み(`とうきょう tokyo`)を書くと、それでも一致する。独自の絞り込みは `filter` プロパティ。
 * - `load` に関数を渡すと、入力した文字からその関数で候補を取得して表示する(サーバーへの問い合わせも同じ)。
 *   入力が止まってから呼ばれ(`load-delay`)、古い検索は `signal` で中止される。取得中・失敗も表示される。
 * - `multiple` で複数選択(選択中はチップで表示。同じ `name` で複数の値を送信する)。
 * - `max-items` で選べる数の上限、`reorderable` でチップの並べ替え(Alt+左右の矢印キー、またはドラッグ)。
 * - `jimble-option` の `group` 属性(または項目の `group`)で、候補を見出し付きにまとめる。
 * - `creatable` で、一覧にない文字を項目として追加できる。`create` プロパティで項目の作り方(サーバーへの登録など)を決められる。
 * - 既定(単一選択・`creatable` なし)では、自由入力は値にならない。選択肢に無い文字のまま離れると、選択中の表示に戻る。
 *
 * @tag jimble-combobox
 *
 * @slot - jimble-option
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart chips - 選択中の項目(multiple)
 * @csspart chip - 選択中の項目 1 つ
 * @csspart chip-remove - チップの削除ボタン
 * @csspart chip-move - チップを前後へ動かすボタン(reorderable。チップにフォーカスがあるときだけ表示。タッチ操作の代わり)
 * @csspart input - テキスト欄(role="combobox")
 * @csspart clear - 選択を解除するボタン
 * @csspart toggle - 候補を開閉するボタン
 * @csspart popup - 候補の面
 * @csspart listbox - 候補の一覧(role="listbox")
 * @csspart group - 候補のグループ(role="group")
 * @csspart group-label - グループの見出し
 * @csspart option - 候補
 * @csspart empty - 候補が無い・読み込み中・失敗のときの表示
 *
 * @cssprop [--jimble-combobox-radius=var(--jimble-radius-overlay)] - 候補の面の角丸
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 入力欄の角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - 高さ
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 *
 * @fires input - 選択が変わった(文字の入力では出ない)
 * @fires change - 選択が変わった
 * @fires jimble-search - 入力で検索語が変わった。`detail.query`
 * @fires jimble-create - 一覧にない項目を追加した。`detail` は追加した項目(`value` / `label`)
 * @fires jimble-load-error - `load` が失敗した。`detail.error`
 * @fires jimble-reorder - チップを並べ替えた(`reorderable`)。`detail.values` は新しい順の値
 * @fires jimble-open - 候補を開いた
 * @fires jimble-close - 候補を閉じた
 */
export class JimbleCombobox extends JimbleFormElement {
  static implicitSubmitBlocker = true
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    clearable: { type: Boolean, reflect: true },
    multiple: { type: Boolean, reflect: true },
    creatable: { type: Boolean, reflect: true },
    match: { reflect: true },
    open: { type: Boolean, reflect: true },
    loadDelay: { type: Number, attribute: 'load-delay' },
    loadMinLength: { type: Number, attribute: 'load-min-length' },
    maxItems: { type: Number, attribute: 'max-items' },
    reorderable: { type: Boolean, reflect: true },
    items: { attribute: false },
    filter: { attribute: false },
    load: { attribute: false },
    create: { attribute: false },
  }

  declare placeholder: string | undefined
  declare readonly: boolean
  /** 選択を解除するボタンを出す */
  declare clearable: boolean
  /** 複数選択。選択中はチップで表示し、同じ `name` で複数の値を送信する */
  declare multiple: boolean
  /** 一覧にない文字を項目として追加できる */
  declare creatable: boolean
  /** 一致のさせ方。`contains`(含む・既定)または `starts-with`(前方一致) */
  declare match: 'contains' | 'starts-with'
  /** 候補を開いているか */
  declare open: boolean
  /** `load` を呼ぶまでの待ち時間(ミリ秒)。既定 250 */
  declare loadDelay: number
  /** `load` を呼ぶ最小の文字数。既定 0(開いただけで呼ぶ) */
  declare loadMinLength: number
  /** 選べる数の上限(複数選択)。上限に達すると、ほかの候補は選べなくなる */
  declare maxItems: number | undefined
  /** 選んだ項目(チップ)を並べ替えられる。Alt+左右の矢印キー、またはドラッグ */
  declare reorderable: boolean
  /** 独自の絞り込み。指定すると `match` と `keywords` は使われない */
  declare filter: ComboboxFilter | undefined
  /** 入力した文字から候補を取得する関数。指定すると絞り込みは行わず、返した項目をそのまま表示する */
  declare load: ComboboxLoader | undefined
  /** 追加する項目の作り方。未指定なら、入力した文字が値と表示になる */
  declare create: ComboboxCreator | undefined
  /** `jimble-option` の代わり(または追加)の項目。`load` を使うとき、選択済みの項目の表示に使う */
  declare items: ComboboxItem[]

  #values: string[] = []
  #dirty = false
  #fromAttribute = false
  #typing = false
  #text = ''
  #active: string | undefined
  #listId = this.uid('listbox')
  #notified = false
  #observer: MutationObserver | undefined
  #optionIds = new Map<string, string>()
  #labels = new Map<string, string>()
  #created: ComboboxItem[] = []
  #loaded: ComboboxItem[] = []
  #loadedQuery: string | undefined
  #loading = false
  #loadError = false
  #reqId = 0
  #timer: ReturnType<typeof setTimeout> | undefined
  #abort: AbortController | undefined
  #chipHintId = this.uid('chip-hint')
  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined

  /** 選ばれている値(複数選択では最初の値)。`value` 属性は初期値（リセット先）、プロパティは現在値 */
  get value(): string {
    return this.#values[0] ?? ''
  }
  set value(next: string) {
    this.#setValues(next ? [String(next)] : [])
  }
  /** 選ばれている値の配列。`multiple` でないときは 0 または 1 個 */
  get values(): string[] {
    return [...this.#values]
  }
  set values(next: string[]) {
    this.#setValues([...new Set((next ?? []).map(String))])
  }
  /** 選ばれている項目 */
  get selectedItems(): ComboboxItem[] {
    return this.#values.flatMap((v) => {
      const label = this.#labelOf(v)
      return label === undefined ? [] : [{ value: v, label }]
    })
  }
  #setValues(next: string[]) {
    const old = this.#values
    this.#values = this.multiple ? next : next.slice(0, 1)
    this.#typing = false
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  #parseAttribute(v: string | null): string[] {
    if (!v) return []
    return this.multiple
      ? [
          ...new Set(
            v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ]
      : [v]
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      this.#setValues(this.#parseAttribute(value))
      this.#fromAttribute = false
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  constructor() {
    super()
    this.placeholder = undefined
    this.readonly = false
    this.clearable = false
    this.multiple = false
    this.creatable = false
    this.match = 'contains'
    this.open = false
    this.loadDelay = 250
    this.loadMinLength = 0
    this.maxItems = undefined
    this.reorderable = false
    this.filter = undefined
    this.load = undefined
    this.create = undefined
    this.items = []
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 選択肢の追加・削除・文字の変更(非同期に読み込む場合など)に追従する
    this.#observer = new MutationObserver(() => this.requestUpdate())
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'keywords'],
    })
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#cancelLoad()
  }

  /** `jimble-option` の要素 */
  get options(): JimbleOption[] {
    return [...this.children].filter((e): e is JimbleOption => e.localName === 'jimble-option')
  }
  get #domItems(): ComboboxItem[] {
    return this.options.map((o) => ({
      value: o.optionValue,
      label: o.label,
      keywords: o.keywords,
      disabled: o.disabled,
      group: o.group || undefined,
    }))
  }
  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null
  }
  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }

  /** 表示の元になる項目すべて(重複は先のものを優先) */
  get #known(): ComboboxItem[] {
    return dedupe([...this.#domItems, ...this.items, ...this.#created, ...this.#loaded])
  }
  #labelOf(value: string): string | undefined {
    const known = this.#labels.get(value)
    if (known !== undefined) return known
    // 一覧にない値は、追加・取得で得た値かもしれないので、そのまま表示する
    return this.load || this.creatable ? value : undefined
  }

  /** いま候補に出すもの */
  get #visible(): ComboboxItem[] {
    if (this.load) return this.#loaded
    const all = dedupe([...this.#domItems, ...this.items, ...this.#created])
    const query = this.#text.trim()
    if (!this.#typing || !query) return all
    return all.filter((o) =>
      this.filter
        ? this.filter(this.#text, o)
        : matches(this.#text, o.label, o.keywords, this.match),
    )
  }
  /** 一覧にない文字を追加するための行(入力があり、同じ項目が無いとき) */
  get #createRow(): Row | undefined {
    const text = this.#text.trim()
    if (!this.creatable || !this.#typing || !text) return undefined
    const f = fold(text)
    if (this.#known.some((i) => fold(i.label) === f || fold(i.value) === f)) return undefined
    return { key: CREATE_KEY, item: { value: text, label: text }, create: true }
  }
  get #rows(): Row[] {
    const rows: Row[] = this.#visible.map((item) => ({ key: item.value, item }))
    // 同じグループを、最初に現れた位置でまとめる(矢印キーの移動順と表示順を一致させる)
    const order: string[] = []
    const byGroup = new Map<string, Row[]>()
    for (const r of rows) {
      const g = r.item.group ?? ''
      if (!byGroup.has(g)) {
        byGroup.set(g, [])
        order.push(g)
      }
      byGroup.get(g)!.push(r)
    }
    const grouped = order.flatMap((g) => byGroup.get(g)!)
    const c = this.#createRow
    return c ? [...grouped, c] : grouped
  }
  /** 上限に達しているか */
  get #atMax(): boolean {
    return this.multiple && this.maxItems != null && this.#values.length >= this.maxItems
  }
  /** 選べない行(無効、または上限に達していて未選択) */
  #rowDisabled(r: Row): boolean {
    return !!r.item.disabled || (this.#atMax && (r.create || !this.#values.includes(r.key)))
  }
  #groupIds = new Map<string, string>()
  #groupId(g: string): string {
    let id = this.#groupIds.get(g)
    if (!id) {
      id = this.uid('group')
      this.#groupIds.set(g, id)
    }
    return id
  }
  #optionId(key: string): string {
    let id = this.#optionIds.get(key)
    if (!id) {
      id = this.uid('option')
      this.#optionIds.set(key, id)
    }
    return id
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string | FormData | null {
    if (!this.multiple) return this.#values[0] || null
    if (!this.#values.length || !this.name) return null
    const data = new FormData()
    for (const v of this.#values) data.append(this.name, v)
    return data
  }
  protected override get formState(): string | null {
    return this.multiple ? JSON.stringify(this.#values) : this.#values[0] || null
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#fromAttribute = true
    this.#setValues(this.#parseAttribute(this.getAttribute('value')))
    this.#fromAttribute = false
    this.#typing = false
  }
  protected override restoreValue(state: string): void {
    let next: string[] = [state]
    if (this.multiple) {
      try {
        const parsed: unknown = JSON.parse(state)
        next = Array.isArray(parsed) ? parsed.map(String) : []
      } catch {
        next = []
      }
    }
    this.#setValues(next)
    this.#dirty = true
  }
  protected override computeValidity(): ValidityResult {
    if ((this.required || this.field.required) && this.#values.length === 0) {
      return {
        flags: { valueMissing: true },
        message: this.t('validation.valueMissing'),
        anchor: this.nativeControl ?? undefined,
      }
    }
    return { flags: {}, message: '' }
  }

  show(): void {
    if (this.isDisabled || this.readonly) return
    this.open = true
  }
  hide(): void {
    this.open = false
  }

  // ---- 取得(load) ----------------------------------------------------------------------
  #cancelLoad() {
    clearTimeout(this.#timer)
    this.#abort?.abort()
    this.#reqId++
    this.#loading = false
  }

  /** `load` で候補を取得する。入力ごとの呼び出しは待ってからまとめ、古い検索は中止する */
  #scheduleLoad(query: string, immediate = false) {
    const load = this.load
    if (!load) return
    this.#cancelLoad()
    this.#loadError = false
    if (query.trim().length < this.loadMinLength) {
      this.#loaded = []
      this.#loadedQuery = undefined
      this.#active = undefined
      this.requestUpdate()
      return
    }
    const id = this.#reqId
    const abort = new AbortController()
    this.#abort = abort
    this.#loading = true
    this.#active = undefined
    const run = async () => {
      try {
        const result = await load(query, abort.signal)
        if (id !== this.#reqId) return
        this.#loaded = Array.isArray(result) ? result : []
        this.#loadedQuery = query
      } catch (error) {
        if (id !== this.#reqId || abort.signal.aborted) return
        this.#loaded = []
        this.#loadedQuery = undefined
        this.#loadError = true
        this.emit('load-error', { detail: { error } })
      }
      this.#loading = false
      this.#active = this.#rows.find((r) => !this.#rowDisabled(r))?.key
      this.requestUpdate()
    }
    if (immediate) void run()
    else this.#timer = setTimeout(() => void run(), this.loadDelay)
    this.requestUpdate()
  }

  // ---- 操作 ----------------------------------------------------------------------------
  #announce(text: string) {
    this.#announcement = text
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, 2000)
    this.requestUpdate()
  }

  #onInput = (event: Event) => {
    // 文字の入力は「検索語の変化」であり、値(選択)は変わらないので input は host へ出さない
    event.stopPropagation()
    this.#text = (event.target as HTMLInputElement).value
    this.#typing = true
    this.#announcement = ''
    this.#openList()
    if (this.load) this.#scheduleLoad(this.#text)
    else this.#active = this.#rows.find((r) => !this.#rowDisabled(r))?.key
    this.requestUpdate()
    this.emit('search', { detail: { query: this.#text } })
  }

  #openList() {
    if (this.isDisabled || this.readonly) return
    this.open = true
  }

  /** 検索語なしで開くとき、`load` の候補が無ければ取得する */
  #loadOnOpen() {
    if (this.load && this.#loadedQuery !== '') this.#scheduleLoad('', true)
  }

  #move(step: 1 | -1, edge: 'first' | 'last') {
    const wasOpen = this.open
    if (!wasOpen) {
      this.#typing = false
      this.#openList()
      this.#loadOnOpen()
    }
    const enabled = this.#rows.filter((r) => !this.#rowDisabled(r))
    if (!enabled.length) return
    if (!wasOpen) {
      const sel = enabled.find((r) => this.#values.includes(r.key))
      this.#active = (sel ?? (edge === 'last' ? enabled.at(-1) : enabled[0]))?.key
      this.requestUpdate()
      return
    }
    const at = this.#active ? enabled.findIndex((r) => r.key === this.#active) : -1
    const next = at === -1 ? (step === 1 ? 0 : enabled.length - 1) : at + step
    this.#active = enabled[Math.min(Math.max(next, 0), enabled.length - 1)]?.key
    this.requestUpdate()
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (this.ime.isComposing(event)) return
    if (event.ctrlKey || event.metaKey) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.#move(1, 'first')
        return
      case 'ArrowUp':
        event.preventDefault()
        this.#move(-1, 'last')
        return
      case 'Enter':
        if (this.open) {
          event.preventDefault()
          const row = this.#rows.find((r) => r.key === this.#active)
          if (row) void this.#pick(row)
          return
        }
        break
      case 'Escape':
        if (this.open) {
          event.preventDefault()
          this.#close()
        }
        return
      case 'ArrowLeft':
        // 入力が空でカーソルが先頭のとき、最後のチップへ移る(並べ替え・削除のため)
        if (this.multiple && this.#values.length && !this.#text && !event.altKey) {
          event.preventDefault()
          this.#focusChip(this.#values.length - 1)
        }
        return
      case 'Backspace':
        // 入力が空のとき、最後のチップを削除する
        if (this.multiple && !this.#text && this.#values.length && !this.readonly) {
          event.preventDefault()
          this.#remove(this.#values[this.#values.length - 1]!)
        }
        return
    }
    handleImplicitSubmit(event, this.form, this.isDisabled, this.ime)
  }

  // ---- チップの操作(フォーカス・並べ替え・削除) -----------------------------------------
  #chipEls(): HTMLElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[part="chip"]')]
  }
  #focusChip(index: number) {
    const els = this.#chipEls()
    if (index < 0) index = 0
    if (index >= els.length) this.nativeControl?.focus()
    else els[index]?.focus()
  }
  /** 値の順番を移動する(送信される順番も変わる) */
  #moveValue(value: string, to: number) {
    const from = this.#values.indexOf(value)
    to = Math.min(Math.max(to, 0), this.#values.length - 1)
    if (from < 0 || from === to) return false
    const next = [...this.#values]
    next.splice(from, 1)
    next.splice(to, 0, value)
    this.#setValues(next)
    this.commit()
    this.#announce(
      this.t('combobox.moved', {
        label: this.#labelOf(value) ?? value,
        pos: to + 1,
        total: next.length,
      }),
    )
    this.emit('reorder', { detail: { values: [...next] } })
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    return true
  }
  /** 前へ / 後ろへボタン(ドラッグやキーボードが使えないタッチ操作の代わり) */
  #moveByButton(value: string, step: -1 | 1) {
    if (this.#moveValue(value, this.#values.indexOf(value) + step)) this.#focusChipByValue(value)
  }
  #focusChipByValue(value: string) {
    void this.updateComplete.then(() =>
      this.#chipEls()
        .find((c) => c.dataset.value === value)
        ?.focus(),
    )
  }
  #onChipKeydown = (event: KeyboardEvent, value: string) => {
    if (event.ctrlKey || event.metaKey) return
    const at = this.#values.indexOf(value)
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const step = event.key === 'ArrowLeft' ? -1 : 1
        event.preventDefault()
        if (event.altKey) {
          if (this.reorderable && this.#moveValue(value, at + step)) this.#focusChipByValue(value)
        } else {
          this.#focusChip(Math.max(at + step, 0))
        }
        return
      }
      case 'Home':
      case 'End':
        event.preventDefault()
        if (event.altKey && this.reorderable) {
          if (this.#moveValue(value, event.key === 'Home' ? 0 : this.#values.length - 1)) {
            this.#focusChipByValue(value)
          }
        } else {
          this.#focusChip(event.key === 'Home' ? 0 : this.#values.length - 1)
        }
        return
      case 'Delete':
      case 'Backspace': {
        event.preventDefault()
        this.#remove(value)
        void this.updateComplete.then(() => this.#focusChip(Math.min(at, this.#values.length)))
        return
      }
      case 'Escape':
      case 'ArrowDown':
      case 'Enter':
        event.preventDefault()
        this.nativeControl?.focus()
        return
    }
  }

  // ドラッグ(マウス)での並べ替え。キーボードでの操作は #onChipKeydown
  #dragValue: string | undefined
  #onDragStart = (event: DragEvent, value: string) => {
    this.#dragValue = value
    event.dataTransfer?.setData('text/plain', value)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
  #dropIndex(event: DragEvent, target: HTMLElement): number {
    const rect = target.getBoundingClientRect()
    const after = event.clientX > rect.left + rect.width / 2
    const i = this.#values.indexOf(target.dataset.value!)
    return after ? i + 1 : i
  }
  #onDragOver = (event: DragEvent) => {
    if (this.#dragValue === undefined) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    const target = event.currentTarget as HTMLElement
    const i = this.#dropIndex(event, target)
    for (const c of this.#chipEls()) delete c.dataset.drop
    target.dataset.drop = i > this.#values.indexOf(target.dataset.value!) ? 'after' : 'before'
  }
  #onDrop = (event: DragEvent) => {
    const value = this.#dragValue
    this.#dragValue = undefined
    for (const c of this.#chipEls()) delete c.dataset.drop
    if (value === undefined) return
    event.preventDefault()
    let to = this.#dropIndex(event, event.currentTarget as HTMLElement)
    // 元の位置より後ろへ動かすときは、取り除いた分だけ詰める
    if (to > this.#values.indexOf(value)) to -= 1
    this.#moveValue(value, to)
  }
  #onDragEnd = () => {
    this.#dragValue = undefined
    for (const c of this.#chipEls()) delete c.dataset.drop
  }

  #emitChange() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  async #pick(row: Row) {
    if (row.item.disabled) return
    if (this.#rowDisabled(row)) {
      this.#announce(this.t('combobox.maxReached', { max: this.maxItems ?? 0 }))
      return
    }
    let item = row.item
    if (row.create) {
      const made = this.create ? await this.create(row.item.label) : item
      if (!made) return
      item = made
      if (!this.#created.some((c) => c.value === item.value)) this.#created.push(item)
      this.#labels.set(item.value, item.label)
      this.emit('create', { detail: item })
      this.#announce(this.t('combobox.created', { label: item.label }))
    }
    this.#labels.set(item.value, item.label)
    if (this.multiple) {
      const has = this.#values.includes(item.value)
      this.#setValues(
        has ? this.#values.filter((v) => v !== item.value) : [...this.#values, item.value],
      )
      this.commit()
      this.#emitChange()
      // 選び続けられるよう開いたままにする。入力した文字は消す
      this.#typing = false
      this.#active = row.create ? item.value : row.key
      if (!row.create) {
        this.#announce(this.t(has ? 'combobox.unpicked' : 'combobox.picked', { label: item.label }))
      }
      if (this.load) this.#scheduleLoad('', true)
      this.requestUpdate()
      return
    }
    const changed = item.value !== this.value
    this.#setValues([item.value])
    this.commit()
    this.#close()
    if (changed) this.#emitChange()
  }

  #remove(value: string) {
    const label = this.#labelOf(value) ?? value
    this.#setValues(this.#values.filter((v) => v !== value))
    this.commit()
    this.#announce(this.t('combobox.unpicked', { label }))
    this.#emitChange()
  }

  /** 閉じて、入力欄の文字を選択中の表示に戻す */
  #close() {
    this.#typing = false
    this.#active = undefined
    this.#cancelLoad()
    const popup = this.#popup
    if (popup?.matches(':popover-open')) popup.hidePopover()
    this.open = false
    this.requestUpdate()
  }

  #onClear = () => {
    const changed = this.#values.length > 0
    this.#setValues([])
    this.commit()
    this.#close()
    this.nativeControl?.focus()
    if (changed) this.#emitChange()
  }

  #onToggle = () => {
    if (this.isDisabled || this.readonly) return
    this.nativeControl?.focus()
    if (this.open) this.#close()
    else this.#move(1, 'first')
  }

  /** ボタンを押してもフォーカスを入力欄から動かさない */
  #keepFocus = (event: Event) => event.preventDefault()

  #onPopupToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (isOpen === this.#notified) return
    this.#notified = isOpen
    this.emit(isOpen ? 'open' : 'close')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    for (const i of this.#known) this.#labels.set(i.value, i.label)
    if (changed.has('multiple') && !this.multiple && this.#values.length > 1) {
      this.#values = this.#values.slice(0, 1)
    }
    if (!this.#typing) {
      this.#text = this.multiple
        ? ''
        : this.#values[0]
          ? (this.#labelOf(this.#values[0]) ?? '')
          : ''
    }
    if (this.isDisabled && this.open) this.open = false
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const popup = this.#popup
    if (popup && changed.has('open')) {
      const shown = popup.matches(':popover-open')
      if (this.open && !shown) popup.showPopover()
      else if (!this.open && shown) popup.hidePopover()
    }
    if (this.open && this.#active) {
      const el = this.renderRoot.querySelector<HTMLElement>(
        `[id="${this.#optionId(this.#active)}"]`,
      )
      el?.scrollIntoView?.({ block: 'nearest' })
    }
  }

  // ---- 描画 ----------------------------------------------------------------------------
  /** 候補が無いときの表示(読み込み中・失敗・入力待ち・一致なし) */
  #emptyText(): string {
    if (this.#loading) return this.t('combobox.loading')
    if (this.#loadError) return this.t('combobox.loadError')
    if (this.load && this.#text.trim().length < this.loadMinLength) {
      return this.t('combobox.typeToSearch', { min: this.loadMinLength })
    }
    return this.t('combobox.noResults')
  }

  #renderRow(r: Row) {
    const selected = !r.create && this.#values.includes(r.key)
    return html`<div
      part="option"
      id=${this.#optionId(r.key)}
      role="option"
      class="${OPTION} ${r.key === this.#active ? 'bg-surface-sunken' : ''} ${this.#rowDisabled(r) ? 'opacity-50 cursor-not-allowed' : ''}"
      aria-selected=${selected ? 'true' : 'false'}
      aria-disabled=${this.#rowDisabled(r) ? 'true' : nothing}
      data-active=${r.key === this.#active ? '' : nothing}
      data-create=${r.create ? '' : nothing}
      @click=${() => void this.#pick(r)}
      @pointermove=${() => {
        if (!this.#rowDisabled(r) && this.#active !== r.key) {
          this.#active = r.key
          this.requestUpdate()
        }
      }}
    >
      <span class="min-w-0 flex-1"
        >${r.create ? this.t('combobox.create', { text: r.item.label }) : r.item.label}</span
      >${selected ? renderIcon(check, 'size-4 shrink-0 text-primary-600') : nothing}
    </div>`
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const rows = this.#rows
    const active = rows.find((r) => r.key === this.#active)
    const editable = !disabled && !this.readonly
    const showClear = this.clearable && this.#values.length > 0 && editable
    const name = this.accessibleName()
    const empty = rows.length === 0
    const blocks: { group: string; rows: Row[] }[] = []
    for (const r of rows) {
      const g = r.item.group ?? ''
      const last = blocks[blocks.length - 1]
      if (last && last.group === g) last.rows.push(r)
      else blocks.push({ group: g, rows: [r] })
    }
    const chips = this.multiple ? this.selectedItems : []
    const emptyText = empty ? this.#emptyText() : ''
    const status = this.#announcement
      ? this.#announcement
      : this.open && (this.#typing || this.#loading || this.#loadError)
        ? this.#loading
          ? this.t('combobox.loading')
          : empty
            ? emptyText
            : this.t('combobox.results', { count: rows.length })
        : ''
    return html`<div
        part="base"
        class=${textWrapClasses(
          this.size,
          invalid,
          disabled,
          this.multiple ? 'items-center flex-wrap py-1' : 'items-center',
        )}
      >
        ${
          chips.length
            ? html`<ul
                  part="chips"
                  class="m-0 flex list-none flex-wrap gap-1 p-0"
                  aria-label=${this.t('combobox.selectedList')}
                >
                  ${chips.map(
                    (c) =>
                      html`<li
                        part="chip"
                        class=${CHIP}
                        tabindex=${editable ? '-1' : nothing}
                        data-value=${c.value}
                        draggable=${editable && this.reorderable && chips.length > 1 ? 'true' : nothing}
                        aria-describedby=${ifDefined(editable ? this.#chipHintId : undefined)}
                        @keydown=${(e: KeyboardEvent) => this.#onChipKeydown(e, c.value)}
                        @dragstart=${(e: DragEvent) => this.#onDragStart(e, c.value)}
                        @dragover=${this.#onDragOver}
                        @drop=${this.#onDrop}
                        @dragend=${this.#onDragEnd}
                      >
                        <span class="min-w-0 truncate">${c.label}</span>
                        ${
                          editable && this.reorderable && chips.length > 1
                            ? html`<button
                                  part="chip-move"
                                  type="button"
                                  tabindex="-1"
                                  class=${CHIP_MOVE}
                                  aria-label=${this.t('combobox.movePrev', { label: c.label })}
                                  ?disabled=${this.#values.indexOf(c.value) === 0}
                                  @pointerdown=${this.#keepFocus}
                                  @click=${() => this.#moveByButton(c.value, -1)}
                                >
                                  ${renderIcon(chevronLeft, 'size-3.5')}</button
                                ><button
                                  part="chip-move"
                                  type="button"
                                  tabindex="-1"
                                  class=${CHIP_MOVE}
                                  aria-label=${this.t('combobox.moveNext', { label: c.label })}
                                  ?disabled=${this.#values.indexOf(c.value) === chips.length - 1}
                                  @pointerdown=${this.#keepFocus}
                                  @click=${() => this.#moveByButton(c.value, 1)}
                                >
                                  ${renderIcon(chevronRight, 'size-3.5')}
                                </button>`
                            : nothing
                        }
                        ${
                          editable
                            ? html`<button
                                part="chip-remove"
                                type="button"
                                tabindex="-1"
                                class=${CHIP_REMOVE}
                                aria-label=${this.t('combobox.remove', { label: c.label })}
                                @pointerdown=${this.#keepFocus}
                                @click=${() => {
                                  this.#remove(c.value)
                                  this.nativeControl?.focus()
                                }}
                              >
                                ${renderIcon(xMark, 'size-3.5')}
                              </button>`
                            : nothing
                        }
                      </li>`,
                  )}
                </ul>
                <span id=${this.#chipHintId} class="sr-only"
                  >${this.reorderable ? this.t('combobox.reorderHint') : this.t('combobox.chipHint')}</span
                >`
            : nothing
        }
        <input
          part="input"
          class=${this.multiple ? INPUT_MULTI : INPUT}
          type="text"
          role="combobox"
          autocomplete="off"
          .value=${live(this.#text)}
          placeholder=${ifDefined(chips.length ? undefined : this.placeholder)}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          aria-label=${ifDefined(name)}
          aria-autocomplete="list"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls=${this.#listId}
          aria-activedescendant=${ifDefined(this.open && active ? this.#optionId(active.key) : undefined)}
          aria-required=${this.required || this.field.required ? 'true' : nothing}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.#onInput}
          @keydown=${this.#onKeydown}
          @blur=${() => this.#close()}
          @change=${(e: Event) => e.stopPropagation()}
        />
        <span class="${AFFIX} ml-auto">
          ${
            showClear
              ? html`<button
                  part="clear"
                  type="button"
                  tabindex="-1"
                  class=${ICON_BUTTON}
                  aria-label=${this.t('combobox.clear')}
                  @pointerdown=${this.#keepFocus}
                  @click=${this.#onClear}
                >
                  ${renderIcon(xMark, 'size-4')}
                </button>`
              : nothing
          }
          <button
            part="toggle"
            type="button"
            tabindex="-1"
            class=${ICON_BUTTON}
            aria-label=${this.t('combobox.toggle')}
            ?disabled=${disabled || this.readonly}
            @pointerdown=${this.#keepFocus}
            @click=${this.#onToggle}
          >
            ${renderIcon(chevronDown, 'size-5')}
          </button>
        </span>
      </div>
      <div part="popup" popover="manual" class=${POPUP} @toggle=${this.#onPopupToggle}>
        <div
          part="listbox"
          id=${this.#listId}
          role="listbox"
          aria-label=${name ?? this.placeholder ?? ''}
          aria-multiselectable=${this.multiple ? 'true' : nothing}
          aria-busy=${this.#loading ? 'true' : nothing}
          ?hidden=${empty}
          @pointerdown=${this.#keepFocus}
        >
          ${blocks.map((b) =>
            b.group
              ? html`<div part="group" role="group" aria-labelledby=${this.#groupId(b.group)}>
                  <div
                    part="group-label"
                    id=${this.#groupId(b.group)}
                    role="presentation"
                    class="px-2.5 pb-0.5 pt-1.5 text-xs font-semibold text-fg-muted"
                  >
                    ${b.group}
                  </div>
                  ${b.rows.map((r) => this.#renderRow(r))}
                </div>`
              : b.rows.map((r) => this.#renderRow(r)),
          )}
        </div>
        ${
          empty
            ? html`<div part="empty" class="px-2.5 py-1.5 text-sm text-fg-muted">${emptyText}</div>`
            : nothing
        }
      </div>
      <div role="status" class="sr-only">${status}</div>
      ${this.renderDescriptions()}
      <slot hidden @slotchange=${() => this.requestUpdate()}></slot>`
  }
}

function dedupe(items: ComboboxItem[]): ComboboxItem[] {
  const seen = new Set<string>()
  return items.filter((i) => (seen.has(i.value) ? false : (seen.add(i.value), true)))
}

JimbleCombobox.define('jimble-combobox')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-combobox': JimbleCombobox
  }
}
