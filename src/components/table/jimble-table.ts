import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { arrowDown } from '../../icons/arrowDown.js'
import { arrowUp } from '../../icons/arrowUp.js'
import { chevronUpDown } from '../../icons/chevronUpDown.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'

export type SortDirection = 'ascending' | 'descending' | 'none'

/**
 * データテーブル。`jimble-table-header` / `jimble-table-body` / `jimble-table-row` /
 * `jimble-table-head-cell` / `jimble-table-cell` を組み合わせる。
 *
 * ネイティブの `<table>` は Shadow DOM のセルにスタイルが届かないため、各要素が `ElementInternals` で
 * 表のロール（table / rowgroup / row / columnheader / cell）を持ち、CSS の `display: table*` で
 * 表のレイアウトになる（スクリーンリーダーには本物の表として伝わる）。
 * `colspan` / `rowspan` は使えない。
 *
 * @tag jimble-table
 *
 * @slot - jimble-table-header / jimble-table-body
 *
 * @csspart scroller - 横・縦にスクロールする領域（はみ出すときだけキーボードで操作できる）
 * @csspart grid - 表のレイアウトを持つ領域
 *
 * @cssprop [--jimble-table-max-height=none] - 表の最大の高さ（超えると縦にスクロール。固定ヘッダーと組み合わせる）
 * @cssprop [--jimble-table-cell-padding-x=3 単位] - セルの左右の余白
 * @cssprop [--jimble-table-cell-padding-y=2 単位] - セルの上下の余白
 *
 * @fires jimble-sort - 並べ替え可能な見出しが押された(direction)。preventDefault() すると見出しの状態を変えない
 */
export class JimbleTable extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    stickyHeader: { type: Boolean, reflect: true, attribute: 'sticky-header' },
    striped: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
  }

  /** 表の名前（aria-label） */
  declare label: string | undefined
  /** 縦にスクロールしても見出しを上に固定する（`--jimble-table-max-height` と組み合わせる） */
  declare stickyHeader: boolean
  /** 1 行おきに背景を付ける */
  declare striped: boolean
  /** 読み込み中。表を薄くして、`aria-busy` を付ける */
  declare loading: boolean

  #resizer?: ResizeObserver

  constructor() {
    super()
    this.label = undefined
    this.stickyHeader = false
    this.striped = false
    this.loading = false
    // 見出しセルの jimble-sort は、表で受ける(セルがバブルさせる)。入れ子の表や外側のリスナーには漏らさず、
    // この表で止める(同じ表に付けた、アプリのリスナーには、これまでどおり届く)
    this.addEventListener('jimble-sort', (e) => e.stopPropagation())
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.internals.role = 'table'
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#resizer?.disconnect()
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
    const scroller = this.renderRoot.querySelector<HTMLElement>('[part="scroller"]')
    const grid = this.renderRoot.querySelector<HTMLElement>('[part="grid"]')
    this.#resizer = new ResizeObserver(this.#updateScrollable)
    if (scroller) this.#resizer.observe(scroller)
    if (grid) this.#resizer.observe(grid)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
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
      <div part="grid" class="table w-full ${this.loading ? 'opacity-60' : ''}"><slot></slot></div>
      ${
        this.loading
          ? html`<div
              class="pointer-events-none absolute inset-0 grid place-items-center text-primary-600"
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
 * 表の行（row）。`selected` を付けると選択中の背景になる（意味づけは行頭のチェックボックスなどで行う）。
 * @tag jimble-table-row
 * @slot - jimble-table-head-cell / jimble-table-cell
 */
export class JimbleTableRow extends TableStructure {
  static override properties: PropertyDeclarations = { selected: { type: Boolean, reflect: true } }
  protected readonly tableRole = 'row'
  /** 選択中の背景にする */
  declare selected: boolean
  constructor() {
    super()
    this.selected = false
  }
}
JimbleTableRow.define('jimble-table-row')

/**
 * 表のセル（cell）。`header` を付けると行見出し（rowheader）になる。
 * @tag jimble-table-cell
 * @slot - セルの内容
 * @csspart base - ルート要素
 */
export class JimbleTableCell extends JimbleElement {
  static override properties: PropertyDeclarations = {
    align: { reflect: true },
    header: { type: Boolean, reflect: true },
  }
  /** 横位置（数値は end） */
  declare align: 'start' | 'center' | 'end'
  /** 行見出し(rowheader)にする */
  declare header: boolean

  constructor() {
    super()
    this.align = 'start'
    this.header = false
  }
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = this.header ? 'rowheader' : 'cell'
  }
  protected override render() {
    return html`<slot></slot>`
  }
}
JimbleTableCell.define('jimble-table-cell')

/**
 * 表の見出しセル（columnheader）。`sortable` を付けると並べ替えのボタンになり、`sort` が
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
  static override properties: PropertyDeclarations = {
    align: { reflect: true },
    sortable: { type: Boolean, reflect: true },
    sort: { reflect: true },
  }
  declare align: 'start' | 'center' | 'end'
  /** 並べ替えのボタンにする */
  declare sortable: boolean
  /** 現在の並び順（sortable のとき） */
  declare sort: SortDirection

  constructor() {
    super()
    this.align = 'start'
    this.sortable = false
    this.sort = 'none'
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
