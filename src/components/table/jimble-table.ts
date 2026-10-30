import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { live } from 'lit/directives/live.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { sharedSheet } from '../../styles/shared-sheet.js'
import { arrowDown } from '../../icons/arrowDown.js'
import { arrowUp } from '../../icons/arrowUp.js'
import { chevronUpDown } from '../../icons/chevronUpDown.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'
import '../checkbox/jimble-checkbox.js'
import type { JimbleCheckbox } from '../checkbox/jimble-checkbox.js'

export type SortDirection = 'ascending' | 'descending' | 'none'

export interface TableSelectionDetail {
  /** 選ばれている行の `value`（`value` の無い行は含まない） */
  values: string[]
  /** 選ばれている行 */
  rows: JimbleTableRow[]
}

/** 行から、その行が属する表へ伝える窓口(表ごと。部品の外には見せない) */
interface SelectionHub {
  /** 利用者がチェックボックスを操作した(range は Shift) */
  toggle(row: JimbleTableRow, selected: boolean, range: boolean): void
  /** 行の選択・行の数が変わった(「すべて選択」を描き直す) */
  refresh(): void
}
const hubs = new WeakMap<JimbleTable, SelectionHub>()

/** 行頭の選択の列(見出しと本文で、同じ幅・余白) */
const SELECT_CELL = 'jimble-select-cell'

/**
 * セルの結合(colspan)。グリッドの `grid-column: span N` は、値ごとの規則を 1 枚のシートに足していく
 * (セルの host に style を書かないため。全セルが同じシートを共有する)
 */
const spanSheet = new CSSStyleSheet()
const spans = new Set<number>()
function ensureSpan(n: number) {
  if (n <= 1 || spans.has(n)) return
  spans.add(n)
  // 値は CSSOM で入れる(規則の文字列に書くと、クラスの検査 check-dist がクラスと見なす)
  const rule = spanSheet.cssRules[
    spanSheet.insertRule(`:host([colspan="${n}"]) {}`)
  ] as CSSStyleRule
  rule.style.gridColumn = `span ${n}`
}
/** セルの colspan(1 以上の整数) */
const spanOf = (cell: Element) => Math.max(1, Math.floor(Number(cell.getAttribute('colspan')) || 1))
const isCell = (e: Element) =>
  e.localName === 'jimble-table-cell' || e.localName === 'jimble-table-head-cell'

/**
 * データテーブル。`jimble-table-header` / `jimble-table-body` / `jimble-table-row` /
 * `jimble-table-head-cell` / `jimble-table-cell` を組み合わせる。
 *
 * ネイティブの `<table>` は Shadow DOM のセルにスタイルが届かないため、各要素が `ElementInternals` で
 * 表のロール（table / rowgroup / row / columnheader / cell）を持ち、CSS グリッド（行のまとまりと行は
 * subgrid）で表のレイアウトになる（スクリーンリーダーには本物の表として伝わる）。
 * セルの `colspan` で横に結合できる（`aria-colspan` として伝わる）。`rowspan` は使えない。
 * 列の数は、セルの数（と `colspan`）から決まる。列の幅は `--jimble-table-columns` で指定できる。
 * 行の区切り線の色は `--jimble-color-ring-divider` で変える。
 *
 * `selectable` を付けると、行頭にチェックボックスの列が出て、行を選べる（見出しに「すべて選択」。
 * 一部だけ選ぶと中間の状態。Shift を押しながらクリックすると範囲を選ぶ）。選んだ行は `selected` になり、
 * `jimble-selection-change` が出る。`table` のロールの行には `aria-selected` を使えないため、
 * 選択の状態はチェックボックスで伝わる。
 *
 * @tag jimble-table
 *
 * @slot - jimble-table-header / jimble-table-body
 *
 * @csspart scroller - 横・縦にスクロールする領域（はみ出すときだけキーボードで操作できる）
 * @csspart grid - 表のレイアウトを持つ領域
 *
 * @cssprop [--jimble-table-max-height=none] - 表の最大の高さ（超えると縦にスクロール。固定ヘッダーと組み合わせる）
 * @cssprop [--jimble-table-columns=列の数だけ auto] - 列の幅（`grid-template-columns` の書き方。例: `12rem 1fr auto`）。`selectable` の選択の列は含めない
 * @cssprop [--jimble-table-cell-padding-x=3 単位] - セルの左右の余白
 * @cssprop [--jimble-table-cell-padding-y=2 単位] - セルの上下の余白
 * @cssprop [--jimble-table-row-hover-bg=var(--jimble-color-surface-muted)] - マウスを重ねた行の背景
 * @cssprop [--jimble-table-header-bg=var(--jimble-color-surface-muted)] - 見出しの行の背景
 * @cssprop [--jimble-table-header-text=var(--jimble-color-text-muted)] - 見出しの文字色
 *
 * @fires jimble-sort - 並べ替え可能な見出しが押された(direction)。preventDefault() すると見出しの状態を変えない
 * @fires jimble-selection-change - 利用者の操作で、行の選択が変わった。`detail` は `{ values, rows }`（選ばれている行の `value` と行）
 */
export class JimbleTable extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    stickyHeader: { type: Boolean, reflect: true, attribute: 'sticky-header' },
    striped: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    selectable: { type: Boolean, reflect: true },
  }

  /** 表の名前（aria-label） */
  declare label: string | undefined
  /** 縦にスクロールしても見出しを上に固定する（`--jimble-table-max-height` と組み合わせる） */
  declare stickyHeader: boolean
  /** 1 行おきに背景を付ける */
  declare striped: boolean
  /** 読み込み中。表を薄くして、`aria-busy` を付ける */
  declare loading: boolean
  /** 行頭にチェックボックスを出して、行を選べるようにする */
  declare selectable: boolean

  #resizer?: ResizeObserver
  #mutations?: MutationObserver
  /** Shift を押しながらの範囲選択の起点(最後にクリックした行) */
  #anchor: JimbleTableRow | undefined

  constructor() {
    super()
    this.label = undefined
    this.stickyHeader = false
    this.striped = false
    this.loading = false
    this.selectable = false
    hubs.set(this, { toggle: this.#onRowToggle, refresh: this.#refreshSelectAll })
    // 見出しセルの jimble-sort は、表で受ける(セルがバブルさせる)。入れ子の表や外側のリスナーには漏らさず、
    // この表で止める(同じ表に付けた、アプリのリスナーには、これまでどおり届く)
    this.addEventListener('jimble-sort', (e) => e.stopPropagation())
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.internals.role = 'table'
    // 行・セル・colspan が変わったら、列の数を数え直す
    this.#mutations ??= new MutationObserver(() => this.#updateColumns())
    this.#mutations.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['colspan'],
    })
    this.#updateColumns()
  }

  /** 列の数(行ごとの colspan の合計の、いちばん大きいもの)から、グリッドの列を決める */
  #updateColumns() {
    const grid = this.renderRoot?.querySelector<HTMLElement>('[part="grid"]')
    if (!grid) return
    let columns = 1
    for (const row of this.querySelectorAll('jimble-table-row')) {
      if (row.closest('jimble-table') !== this) continue
      let n = 0
      for (const cell of row.children) if (isCell(cell)) n += spanOf(cell)
      columns = Math.max(columns, n)
    }
    const select = this.selectable ? 'max-content ' : ''
    grid.style.gridTemplateColumns = `${select}var(--jimble-table-columns, repeat(${columns}, auto))`
  }

  // ---- 行の選択 --------------------------------------------------------------------------
  /** 本文の行(この表の jimble-table-body の行。入れ子の表の行は含まない) */
  get #bodyRows(): JimbleTableRow[] {
    return [
      ...this.querySelectorAll<JimbleTableRow>('jimble-table-body > jimble-table-row'),
    ].filter((r) => r.closest('jimble-table') === this)
  }
  /** 選ばれている行 */
  get selectedRows(): JimbleTableRow[] {
    return this.#bodyRows.filter((r) => r.selected)
  }
  /** 選ばれている行の `value`（`value` の無い行は含まない） */
  get selectedValues(): string[] {
    return this.selectedRows.map((r) => r.value).filter((v) => v !== '')
  }
  /** 「すべて選択」の状態 */
  get selectAllState(): 'all' | 'some' | 'none' {
    const rows = this.#bodyRows
    const n = rows.filter((r) => r.selected).length
    return n === 0 ? 'none' : n === rows.length ? 'all' : 'some'
  }

  #onRowToggle = (row: JimbleTableRow, selected: boolean, range: boolean) => {
    const rows = this.#bodyRows
    let targets = [row]
    if (
      row.localName === 'jimble-table-row' &&
      row.parentElement?.localName === 'jimble-table-header'
    ) {
      targets = rows // 「すべて選択」
    } else if (range && this.#anchor && rows.includes(this.#anchor)) {
      const [a, b] = [rows.indexOf(this.#anchor), rows.indexOf(row)].sort((x, y) => x - y)
      targets = rows.slice(a!, b! + 1)
    }
    if (targets !== rows) this.#anchor = row
    for (const r of targets) r.selected = selected
    this.emit<TableSelectionDetail>('selection-change', {
      detail: { values: this.selectedValues, rows: this.selectedRows },
    })
  }

  #refreshSelectAll = () => {
    for (const r of this.querySelectorAll('jimble-table-header > jimble-table-row'))
      if (r instanceof JimbleTableRow && r.closest('jimble-table') === this) r.requestUpdate()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#resizer?.disconnect()
    this.#mutations?.disconnect()
  }

  // はみ出して隠れる部分があるときだけ、スクロール領域をキーボードで操作できるようにする
  #updateScrollable = () => {
    const s = this.renderRoot?.querySelector<HTMLElement>('[part="scroller"]')
    if (!s) return
    const overflow = s.scrollWidth > s.clientWidth || s.scrollHeight > s.clientHeight
    if (overflow) s.setAttribute('tabindex', '0')
    else s.removeAttribute('tabindex')
  }

  protected override firstUpdated(): void {
    this.#updateColumns()
    const scroller = this.renderRoot.querySelector<HTMLElement>('[part="scroller"]')
    const grid = this.renderRoot.querySelector<HTMLElement>('[part="grid"]')
    this.#resizer = new ResizeObserver(this.#updateScrollable)
    if (scroller) this.#resizer.observe(scroller)
    if (grid) this.#resizer.observe(grid)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('selectable')) {
      for (const r of this.querySelectorAll('jimble-table-row'))
        if (r instanceof JimbleTableRow && r.closest('jimble-table') === this) r.requestUpdate()
      this.#updateColumns()
    }
    this.internals.role = 'table'
    this.internals.ariaLabel = this.label ?? null
    this.internals.ariaBusy = this.loading ? 'true' : null
    this.#updateScrollable()
  }

  protected override render() {
    return html`<div
      part="scroller"
      class="relative overflow-auto [max-height:var(--jimble-table-max-height,none)] outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
    >
      <div part="grid" class="grid w-full ${this.loading ? 'opacity-60' : ''}"><slot></slot></div>
      ${
        this.loading
          ? html`<div
              class="pointer-events-none absolute inset-0 grid place-items-center text-icon-accent"
            >
              <span class="motion-safe:animate-spin">${renderIcon(spinner, 'size-6')}</span>
              <span class="sr-only">${this.t('common.loading')}</span>
            </div>`
          : nothing
      }
    </div>`
  }
}
JimbleTable.define('jimble-table')

/** 役割(ロール)だけを持ち、中身をそのまま並べる表の構成要素 */
abstract class TableStructure extends JimbleElement {
  protected abstract readonly tableRole: string
  override connectedCallback(): void {
    super.connectedCallback()
    this.internals.role = this.tableRole
  }
  protected override render() {
    return html`<slot></slot>`
  }
}

/**
 * 表の見出し行のまとまり（rowgroup）。
 * @tag jimble-table-header
 * @slot - jimble-table-row
 */
export class JimbleTableHeader extends TableStructure {
  protected readonly tableRole = 'rowgroup'
}
JimbleTableHeader.define('jimble-table-header')

/**
 * 表の本体の行のまとまり（rowgroup）。
 * @tag jimble-table-body
 * @slot - jimble-table-row
 */
export class JimbleTableBody extends TableStructure {
  protected readonly tableRole = 'rowgroup'
}
JimbleTableBody.define('jimble-table-body')

/**
 * 表の行（row）。`selected` を付けると選択中の背景になる。表が `selectable` なら、行頭のチェックボックスが
 * `selected` と連動する（チェックボックスの名前は「(行見出しのセル) を選択」）。
 * @tag jimble-table-row
 * @slot - jimble-table-head-cell / jimble-table-cell
 * @csspart select - 行頭の選択の列（`selectable` のとき）
 */
export class JimbleTableRow extends TableStructure {
  static override properties: PropertyDeclarations = {
    selected: { type: Boolean, reflect: true },
    value: { reflect: true },
  }
  protected readonly tableRole = 'row'
  /** 選択中にする（表が `selectable` なら、チェックボックスと連動する） */
  declare selected: boolean
  /** `jimble-selection-change` の `values`・表の `selectedValues` に入る値 */
  declare value: string
  /** 選択の状態を知らせる表(外されたあとも、知らせるために覚えておく) */
  #table: JimbleTable | null = null
  /** クリックで Shift が押されていたか(change には修飾キーが無い) */
  #shift = false

  constructor() {
    super()
    this.selected = false
    this.value = ''
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#table = this.closest('jimble-table')
    if (this.#table) hubs.get(this.#table)?.refresh()
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.#table) hubs.get(this.#table)?.refresh()
    this.#table = null
  }

  /** 行頭の選択の列の種類(表が selectable でなければ none。見出しが 2 行以上なら、2 行目からは空) */
  get #selectKind(): 'none' | 'all' | 'row' | 'blank' {
    const table = this.closest('jimble-table')
    if (!table?.selectable) return 'none'
    const group = this.parentElement?.localName
    if (group === 'jimble-table-body') return 'row'
    if (group !== 'jimble-table-header') return 'none'
    return this.parentElement!.querySelector('jimble-table-row') === this ? 'all' : 'blank'
  }
  /** チェックボックスの名前に使う、行の名前(行見出しのセル、なければ最初のセル) */
  get #name(): string {
    const cell =
      this.querySelector('jimble-table-cell[header]') ?? this.querySelector('jimble-table-cell')
    return cell?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('selected') && this.#table) hubs.get(this.#table)?.refresh()
  }

  #onClick = (e: MouseEvent) => {
    this.#shift = e.shiftKey
  }
  #onChange = (e: Event) => {
    e.stopPropagation() // チェックボックスの change は、表の外に出さない(jimble-selection-change を使う)
    const table = this.closest('jimble-table')
    if (!table) return
    hubs.get(table)?.toggle(this, (e.target as JimbleCheckbox).checked, this.#shift)
    this.#shift = false
  }

  protected override render() {
    const kind = this.#selectKind
    if (kind === 'none') return html`<slot></slot>`
    if (kind === 'blank')
      return html`<div part="select" class=${SELECT_CELL} role="cell"></div>
        <slot></slot>`
    const table = this.closest('jimble-table')!
    const state = kind === 'all' ? table.selectAllState : undefined
    return html`<div
        part="select"
        class=${SELECT_CELL}
        role=${kind === 'all' ? 'columnheader' : 'cell'}
      >
        <jimble-checkbox
          size="sm"
          aria-label=${kind === 'all' ? this.t('table.selectAll') : this.t('table.selectRow', { name: this.#name })}
          .checked=${live(kind === 'all' ? state === 'all' : this.selected)}
          .indeterminate=${live(state === 'some')}
          @click=${this.#onClick}
          @change=${this.#onChange}
        ></jimble-checkbox>
      </div>
      <slot></slot>`
  }
}
JimbleTableRow.define('jimble-table-row')

/** colspan をグリッドの配置(共有シートの規則)と aria-colspan に反映する */
function applySpan(cell: Element, internals: ElementInternals) {
  const n = spanOf(cell)
  ensureSpan(n)
  internals.ariaColSpan = n > 1 ? String(n) : null
}

/**
 * 表のセル（cell）。`header` を付けると行見出し（rowheader）になる。`colspan` で横に結合する。
 * @tag jimble-table-cell
 * @slot - セルの内容
 * @csspart base - ルート要素
 */
export class JimbleTableCell extends JimbleElement {
  static override styles = [sharedSheet, spanSheet]
  static override properties: PropertyDeclarations = {
    align: { reflect: true },
    header: { type: Boolean, reflect: true },
    colspan: { type: Number, reflect: true },
  }
  /** 横位置（数値は end） */
  declare align: 'start' | 'center' | 'end'
  /** 行見出し(rowheader)にする */
  declare header: boolean
  /** 横に結合する列の数 */
  declare colspan: number

  constructor() {
    super()
    this.align = 'start'
    this.header = false
    this.colspan = 1
  }
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = this.header ? 'rowheader' : 'cell'
    applySpan(this, this.internals)
  }
  protected override render() {
    return html`<slot></slot>`
  }
}
JimbleTableCell.define('jimble-table-cell')

/**
 * 表の見出しセル（columnheader）。`colspan` で横に結合する（2 段の見出しなど）。`sortable` を付けると並べ替えのボタンになり、`sort` が
 * `aria-sort` として伝わる。並べ替えそのものはアプリが `jimble-sort` を受けて行う。
 *
 * @tag jimble-table-head-cell
 *
 * @slot - 見出しの文字
 *
 * @csspart button - sortable のときのボタン
 *
 * @fires jimble-sort - 押された(direction: 次の並び順)。preventDefault() すると sort を変えない
 */
export class JimbleTableHeadCell extends JimbleElement {
  static override styles = [sharedSheet, spanSheet]
  static override properties: PropertyDeclarations = {
    align: { reflect: true },
    sortable: { type: Boolean, reflect: true },
    sort: { reflect: true },
    colspan: { type: Number, reflect: true },
  }
  declare align: 'start' | 'center' | 'end'
  /** 横に結合する列の数（2 段の見出しなど） */
  declare colspan: number
  /** 並べ替えのボタンにする */
  declare sortable: boolean
  /** 現在の並び順（sortable のとき） */
  declare sort: SortDirection

  constructor() {
    super()
    this.align = 'start'
    this.sortable = false
    this.sort = 'none'
    this.colspan = 1
  }

  #toggle = () => {
    const direction: SortDirection = this.sort === 'ascending' ? 'descending' : 'ascending'
    // 表(jimble-table)で受ける通知なので、表までバブルさせる(表の中で止まる)
    const event = this.emit('sort', { detail: { direction }, cancelable: true, bubbles: true })
    if (event.defaultPrevented) return
    // 同じ表の中の、ほかの見出しの並び順を解除する
    this.closest('jimble-table')
      ?.querySelectorAll<JimbleTableHeadCell>('jimble-table-head-cell[sortable]')
      .forEach((c) => {
        if (c !== this) c.sort = 'none'
      })
    this.sort = direction
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'columnheader'
    this.internals.ariaSort = this.sortable ? this.sort : null
    applySpan(this, this.internals)
  }

  protected override render() {
    if (!this.sortable) return html`<slot></slot>`
    const icon =
      this.sort === 'ascending' ? arrowUp : this.sort === 'descending' ? arrowDown : chevronUpDown
    return html`<button
      part="button"
      type="button"
      class="inline-flex items-center gap-1 rounded-sm font-[inherit] text-[length:inherit] cursor-pointer outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus hover:text-fg"
      @click=${this.#toggle}
    >
      <slot></slot>
      <span class=${this.sort === 'none' ? 'text-fg-muted' : 'text-fg'} aria-hidden="true"
        >${renderIcon(icon, 'size-4')}</span
      >
    </button>`
  }
}
JimbleTableHeadCell.define('jimble-table-head-cell')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-table': JimbleTable
    'jimble-table-header': JimbleTableHeader
    'jimble-table-body': JimbleTableBody
    'jimble-table-row': JimbleTableRow
    'jimble-table-cell': JimbleTableCell
    'jimble-table-head-cell': JimbleTableHeadCell
  }
  interface HTMLElementEventMap {
    'jimble-sort': CustomEvent<{ direction: SortDirection }>
  }
}
