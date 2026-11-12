import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { check } from '../../icons/check.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { minus } from '../../icons/minus.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'

/** 木の選び方（`jimble-tree` の `selection`） */
export type TreeSelection = 'none' | 'single' | 'multiple'
/** チェックボックスの状態（`multiple`） */
export type TreeCheckState = 'true' | 'false' | 'mixed'

// 行: host のフォーカス(:host(:focus-visible))に連動してリングを出す。クラス名は文字列リテラルで書く
const ROW =
  'flex min-h-8 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm select-none cursor-default ' +
  'outline outline-1 outline-transparent [:host(:focus-visible)_&]:outline-2 ' +
  '[:host(:focus-visible)_&]:-outline-offset-2 [:host(:focus-visible)_&]:outline-focus'
const ROW_HOVER = 'hover:[background-color:var(--color-item-hover)]'
const ROW_SELECTED = 'bg-surface-accent text-fg-accent [font-weight:var(--font-weight-medium)]'
const TOGGLE =
  'inline-flex size-5 shrink-0 items-center justify-center rounded text-fg-muted cursor-pointer ' +
  'hover:[background-color:var(--jimble-icon-button-hover-bg,var(--color-surface-sunken))]'
const BOX =
  'inline-flex size-4 shrink-0 items-center justify-center rounded-sm shadow-sm ring-1 ring-inset ' +
  'outline outline-1 outline-transparent'
const BOX_ON = 'bg-primary-600 ring-primary-600 text-fg-on-primary'
const BOX_OFF = 'bg-surface ring-line-control'
// 子の項目の字下げ: 子は親の group の中にあるので、group の余白が階層ごとに積み重なる。
// 階層の線(guides)は、開閉の印の中央の真下に、group の左の線として描く
const GROUP =
  'ms-[0.875rem] ps-[calc(var(--jimble-tree-indent,1.25rem)_-_0.875rem_-_1px)] border-s border-transparent'
const GROUP_GUIDES =
  'ms-[0.875rem] ps-[calc(var(--jimble-tree-indent,1.25rem)_-_0.875rem_-_1px)] border-s border-line-divider'

/**
 * 木の項目。`jimble-tree` の中に置き、子の項目は、そのまま中に入れ子で書く。
 * 名前は `label`（表示する文字。読み上げの名前にもなる）。値は `value`（無ければ `label`）。開閉・選択・キー操作は、親の `jimble-tree` が管理する。
 *
 * - `expanded`: 子の項目を開いている。
 * - `lazy`: 子をまだ読み込んでいない（開く印を出す）。開くと、木から `jimble-expand` が出て、子が足されるまで読み込み中になる。
 * - `disabled`: 選べない（開閉と移動はできる）。
 *
 * @tag jimble-tree-item
 *
 * @slot - 子の項目（jimble-tree-item）
 * @slot icon - 名前の前のアイコン（jimble-icon など）
 * @slot end - 行の右の補足（件数のバッジなど）
 *
 * @csspart row - 1 行（開閉の印・チェックボックス・アイコン・名前・補足）
 * @csspart toggle - 開閉の印
 * @csspart checkbox - チェックボックスの印（`selection="multiple"`）
 * @csspart label - 名前
 * @csspart group - 子の項目のまとまり（role="group"）
 *
 * @cssstate expanded - 開いている
 * @cssstate selected - 選ばれている（`single`）
 * @cssstate checked - 付いている（`multiple`）
 * @cssstate mixed - 子の一部だけが付いている（`multiple`）
 * @cssstate disabled - 選べない
 */
export class JimbleTreeItem extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: { reflect: true },
    value: { reflect: true },
    expanded: { type: Boolean, reflect: true },
    lazy: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    // 以下は木が設定する
    loading: { type: Boolean, attribute: false },
    level: { type: Number, attribute: false },
    posinset: { type: Number, attribute: false },
    setsize: { type: Number, attribute: false },
    selection: { attribute: false },
    selected: { type: Boolean, attribute: false },
    checkState: { attribute: false },
    guides: { type: Boolean, attribute: false },
    treeDisabled: { type: Boolean, attribute: false },
  }

  /** 名前 */
  declare label: string
  /** 値（選択・送信に使う）。無ければ `label` */
  declare value: string
  /** 子の項目を開いている */
  declare expanded: boolean
  /** 子をまだ読み込んでいない（開くと、木から jimble-expand が出る） */
  declare lazy: boolean
  /** 選べない（開閉と移動はできる） */
  declare disabled: boolean
  /** 子を読み込み中（木が設定する） */
  declare loading: boolean
  /** 階層（1 始まり。木が設定する） */
  declare level: number
  /** 兄弟の中の位置（1 始まり。木が設定する） */
  declare posinset: number
  /** 兄弟の数（木が設定する） */
  declare setsize: number
  /** 木の選び方（木が設定する） */
  declare selection: TreeSelection
  /** 選ばれている（`single`。木が設定する） */
  declare selected: boolean
  /** チェックボックスの状態（`multiple`。木が設定する） */
  declare checkState: TreeCheckState
  /** 階層の線を描く（木が設定する） */
  declare guides: boolean
  /** 木全体が無効（木が設定する） */
  declare treeDisabled: boolean

  #slots = new SlotController(this)

  constructor() {
    super()
    this.label = ''
    this.value = ''
    this.expanded = false
    this.lazy = false
    this.disabled = false
    this.loading = false
    this.level = 1
    this.posinset = 1
    this.setsize = 1
    this.selection = 'none'
    this.selected = false
    this.checkState = 'false'
    this.guides = false
    this.treeDisabled = false
  }

  /** 値（`value`、無ければ `label`） */
  get itemValue(): string {
    return this.value || this.label
  }
  /** 子の項目（直接の子だけ） */
  get childItems(): JimbleTreeItem[] {
    return [...this.children].filter((c): c is JimbleTreeItem => c.localName === 'jimble-tree-item')
  }
  /** 開閉できるか（子の項目があるか、まだ読み込んでいない） */
  get expandable(): boolean {
    return this.lazy || this.childItems.length > 0
  }
  /** 親の項目（一番上の項目なら undefined） */
  get parentItem(): JimbleTreeItem | undefined {
    const p = this.parentElement
    return p?.localName === 'jimble-tree-item' ? (p as JimbleTreeItem) : undefined
  }
  get isDisabled(): boolean {
    return this.disabled || this.treeDisabled
  }

  // 意味（ロール）は host が持つ。試験の道具（Playwright の getByRole）からも見えるよう、属性にも書く
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const expandable = this.expandable
    const expanded = expandable ? String(this.expanded) : null
    const checked = this.selection === 'multiple' ? this.checkState : null
    const selected = this.selection === 'single' ? String(this.selected) : null
    const i = this.internals
    i.role = 'treeitem'
    i.ariaLevel = String(this.level)
    i.ariaPosInSet = String(this.posinset)
    i.ariaSetSize = String(this.setsize)
    i.ariaExpanded = expanded
    i.ariaChecked = checked
    i.ariaSelected = selected
    i.ariaDisabled = this.isDisabled ? 'true' : null
    i.ariaBusy = this.loading ? 'true' : null
    this.reflectAria('role', 'treeitem')
    this.reflectAria('aria-level', String(this.level))
    this.reflectAria('aria-posinset', String(this.posinset))
    this.reflectAria('aria-setsize', String(this.setsize))
    this.reflectAria('aria-expanded', expanded)
    this.reflectAria('aria-checked', checked)
    this.reflectAria('aria-selected', selected)
    this.reflectAria('aria-disabled', this.isDisabled ? 'true' : null)
    this.setState('expanded', expandable && this.expanded)
    this.setState('selected', this.selection === 'single' && this.selected)
    this.setState('checked', this.selection === 'multiple' && this.checkState === 'true')
    this.setState('mixed', this.selection === 'multiple' && this.checkState === 'mixed')
    this.setState('disabled', this.isDisabled)
  }

  #renderToggle() {
    if (this.loading)
      return html`<span
        part="toggle"
        aria-hidden="true"
        class="inline-flex size-5 shrink-0 items-center justify-center text-fg-muted"
        >${renderIcon(spinner, 'size-3.5 motion-safe:animate-spin')}</span
      >`
    if (!this.expandable)
      return html`<span
        part="toggle"
        aria-hidden="true"
        class="inline-flex size-5 shrink-0"
      ></span>`
    return html`<span part="toggle" aria-hidden="true" class=${TOGGLE} data-tree-toggle
      >${renderIcon(
        chevronRight,
        `size-3.5 transition-transform motion-reduce:transition-none ${this.expanded ? 'rotate-90' : ''}`,
      )}</span
    >`
  }

  #renderCheckbox() {
    if (this.selection !== 'multiple') return nothing
    const on = this.checkState !== 'false'
    return html`<span part="checkbox" aria-hidden="true" class="${BOX} ${on ? BOX_ON : BOX_OFF}"
      >${
        this.checkState === 'true'
          ? renderIcon(check, 'size-3')
          : this.checkState === 'mixed'
            ? renderIcon(minus, 'size-3')
            : nothing
      }</span
    >`
  }

  protected override render() {
    const disabled = this.isDisabled
    const selected = this.selection === 'single' && this.selected
    const hasChildren = this.childItems.length > 0
    return html`<div
        part="row"
        class="${ROW} ${selected ? ROW_SELECTED : `text-fg ${disabled ? '' : ROW_HOVER}`} ${
          disabled ? 'opacity-50' : ''
        }"
      >
        ${this.#renderToggle()} ${this.#renderCheckbox()}
        <span class=${this.#slots.hasSlot('icon') ? 'inline-flex shrink-0 text-fg-muted' : 'hidden'}
          ><slot name="icon"></slot
        ></span>
        <span part="label" class="min-w-0 flex-1 truncate">${this.label}</span>
        <span class=${this.#slots.hasSlot('end') ? 'inline-flex shrink-0' : 'hidden'}
          ><slot name="end"></slot
        ></span>
      </div>
      ${
        hasChildren
          ? html`<div
              part="group"
              role="group"
              class=${this.guides ? GROUP_GUIDES : GROUP}
              ?hidden=${!this.expanded}
            >
              <slot @slotchange=${() => this.requestUpdate()}></slot>
            </div>`
          : html`<slot hidden @slotchange=${() => this.requestUpdate()}></slot>`
      }`
  }
}

JimbleTreeItem.define('jimble-tree-item')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tree-item': JimbleTreeItem
  }
}
