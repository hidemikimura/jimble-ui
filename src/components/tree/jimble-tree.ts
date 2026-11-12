import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { ImeController } from '../../base/ime-controller.js'
import { Typeahead } from '../../base/typeahead.js'
import type { ValidationContext } from '../../base/validation.js'
import { JimbleTreeItem, type TreeCheckState, type TreeSelection } from './jimble-tree-item.js'
import './jimble-tree-item.js'

export type { TreeCheckState, TreeSelection } from './jimble-tree-item.js'
/** `values` に入れる項目（`multiple`）。`all` は付いている項目すべて、`leaves` は子の無い項目だけ */
export type TreeCheckedValues = 'all' | 'leaves'

const ITEM = 'jimble-tree-item'

// 木の処理は、項目が登録（upgrade）される前にも動く（value 属性の処理など）ので、項目の getter ではなく DOM と属性から読む
const isItem = (n: Element | null | undefined): n is JimbleTreeItem => n?.localName === ITEM
/** 直接の子の項目 */
const kidsOf = (el: Element): JimbleTreeItem[] => [...el.children].filter(isItem)
/** 親の項目 */
const parentOf = (el: Element): JimbleTreeItem | undefined =>
  isItem(el.parentElement) ? el.parentElement : undefined
/** 項目の値（value、無ければ label） */
const valueOf = (i: JimbleTreeItem): string =>
  i.getAttribute('value') || i.getAttribute('label') || ''

/**
 * 開閉できる階層の一覧（WAI-ARIA の Tree View パターン）。商品カテゴリ・部署・フォルダなど、
 * データの階層を見て選ぶのに使う（ページの移動には `jimble-sidebar-nav` の `jimble-nav-group`）。
 * 項目は `jimble-tree-item` で、子の項目はそのまま入れ子に書く。
 *
 * - `selection`: `none`（既定。開閉だけ）・`single`（1 つを選ぶ）・`multiple`（チェックボックスで付け外し。
 *   親を付けると子孫がすべて付き、子の一部だけが付いていると親は「一部」になる）。
 * - 現在値は `values`（`single` は `value` も）。`value` 属性は初期値（リセット先。`multiple` はカンマ区切り）。
 * - `name` を付けると、フォームに `values` を同じ名前で送る。`required` は 1 つ以上。ラベルは `jimble-field`
 *   か `aria-label` で付ける。
 * - キー操作: ↓↑ で表示中の項目を移動、→ で開く・最初の子へ、← で閉じる・親へ、Home / End、
 *   Enter / Space で選ぶ（`multiple` は付け外し）、文字で先頭一致の項目へ、`*` で同じ階層をすべて開く。
 * - 子を後から読み込む項目には `lazy` を付ける。開くと `jimble-expand` が出て、子が足されるまで読み込み中になる
 *   （子が無いと分かったら `lazy` を外す）。
 *
 * @tag jimble-tree
 * @status experimental
 *
 * @slot - jimble-tree-item
 *
 * @csspart base - role="tree" を持つ要素
 *
 * @cssprop [--jimble-tree-indent=1.25rem] - 階層ごとの字下げ
 *
 * @fires jimble-selection-change - 選択が変わった。`detail.values`
 * @fires jimble-expand - 項目を開いた。`detail.item`（`lazy` の項目なら、ここで子を読み込む）
 * @fires jimble-collapse - 項目を閉じた。`detail.item`
 * @fires change - 選択が変わった（ネイティブと同じ。bubbles + composed）
 * @fires input - 選択が変わった（同上）
 */
export class JimbleTree extends JimbleFormElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open' }
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    selection: { reflect: true },
    checkedValues: { attribute: 'checked-values', reflect: true },
    guides: { type: Boolean, reflect: true },
  }

  /** 選び方 */
  declare selection: TreeSelection
  /** `values` に入れる項目（`multiple`） */
  declare checkedValues: TreeCheckedValues
  /** 階層の線を描く */
  declare guides: boolean

  #ime = new ImeController(this)
  #typeahead = new Typeahead()
  #observer: MutationObserver | undefined
  /** 選ばれている・付いている項目の値。`multiple` では、付いている項目すべて（親も含む） */
  #checked = new Set<string>()
  #dirty = false
  #fromAttribute = false
  /** 最後にフォーカスした項目（ロービングフォーカスの位置） */
  #active: JimbleTreeItem | undefined
  /** 子を読み込み中の項目（子が足されたら終わる） */
  #loading = new Set<JimbleTreeItem>()

  constructor() {
    super()
    this.selection = 'none'
    this.checkedValues = 'all'
    this.guides = false
  }

  // ---- 値 -----------------------------------------------------------------------------------
  /** 選ばれている値（先頭）。`value` 属性は初期値（リセット先） */
  get value(): string {
    return this.values[0] ?? ''
  }
  set value(next: string) {
    this.values = next ? [String(next)] : []
  }
  /** 選ばれている・付いている値。`multiple` の `checked-values="leaves"` なら、子の無い項目だけ */
  get values(): string[] {
    if (this.selection === 'none') return []
    if (this.selection === 'single') return [...this.#checked].slice(0, 1)
    const items = this.items.filter((i) => this.#checked.has(valueOf(i)))
    return (this.checkedValues === 'leaves' ? items.filter((i) => !kidsOf(i).length) : items).map(
      (i) => valueOf(i),
    )
  }
  set values(next: string[]) {
    const old = this.values
    const list = [...new Set((next ?? []).map(String))]
    this.#checked = new Set(this.selection === 'single' ? list.slice(0, 1) : list)
    if (this.selection === 'multiple') this.#normalizeChecked()
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  #parseAttribute(v: string | null): string[] {
    return (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      this.values = this.#parseAttribute(value)
      this.#fromAttribute = false
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  // ---- 項目 ---------------------------------------------------------------------------------
  /** すべての項目（文書の順） */
  get items(): JimbleTreeItem[] {
    return [...this.querySelectorAll<JimbleTreeItem>(ITEM)]
  }
  /** 一番上の項目 */
  get #roots(): JimbleTreeItem[] {
    return kidsOf(this)
  }
  /** 表示中の項目（祖先がすべて開いている。文書の順） */
  get #visible(): JimbleTreeItem[] {
    const out: JimbleTreeItem[] = []
    const walk = (list: JimbleTreeItem[]) => {
      for (const i of list) {
        out.push(i)
        if (i.expanded) walk(kidsOf(i))
      }
    }
    walk(this.#roots)
    return out
  }
  #descendants(item: JimbleTreeItem): JimbleTreeItem[] {
    return [...item.querySelectorAll<JimbleTreeItem>(ITEM)]
  }

  // ---- チェック（multiple）。親子の連動 -----------------------------------------------------
  /** 付いている親の子孫を付け、子がすべて付いている親を付け、一部だけの親を外す（下から順に） */
  #normalizeChecked() {
    for (const item of this.items) {
      const parent = parentOf(item)
      if (parent && this.#checked.has(valueOf(parent))) this.#checked.add(valueOf(item))
    }
    for (const item of this.items.reverse()) {
      const kids = kidsOf(item)
      if (!kids.length) continue
      if (kids.every((k) => this.#checked.has(valueOf(k)))) this.#checked.add(valueOf(item))
      else this.#checked.delete(valueOf(item))
    }
  }
  #checkState(item: JimbleTreeItem): TreeCheckState {
    if (this.#checked.has(valueOf(item))) return 'true'
    const some = this.#descendants(item).some((d) => this.#checked.has(valueOf(d)))
    return some ? 'mixed' : 'false'
  }

  /** 項目を選ぶ（single）・付け外しする（multiple） */
  #activate(item: JimbleTreeItem) {
    if (item.isDisabled || this.isDisabled || this.selection === 'none') return
    if (this.selection === 'single') {
      if (this.#checked.has(valueOf(item))) return
      this.#checked = new Set([valueOf(item)])
    } else {
      const on = this.#checkState(item) !== 'true'
      for (const i of [item, ...this.#descendants(item)]) {
        if (i !== item && i.isDisabled) continue
        if (on) this.#checked.add(valueOf(i))
        else this.#checked.delete(valueOf(i))
      }
      // 祖先は、子の状態から決め直す
      for (let p = parentOf(item); p; p = parentOf(p)) this.#checked.delete(valueOf(p))
      this.#normalizeChecked()
    }
    this.#dirty = true
    this.#sync()
    this.commit()
    this.requestUpdate()
    this.emit('selection-change', { detail: { values: this.values } })
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  // ---- 開閉 ---------------------------------------------------------------------------------
  /** 項目を開く・閉じる */
  setExpanded(item: JimbleTreeItem, expanded: boolean): void {
    if (!item.expandable || item.expanded === expanded) return
    item.expanded = expanded
    if (expanded) {
      if (item.lazy && !kidsOf(item).length) this.#loading.add(item)
      this.emit('expand', { detail: { item } })
    } else {
      // 閉じた項目の子孫にフォーカスがあれば、閉じた項目へ移す
      if (this.#active && item.contains(this.#active) && this.#active !== item) this.#focus(item)
      this.emit('collapse', { detail: { item } })
    }
    this.#sync()
  }

  // ---- 同期 ---------------------------------------------------------------------------------
  /** 階層・位置・選択・チェック・tabindex を、項目に反映する */
  #sync() {
    const items = this.items
    if (this.selection === 'multiple') this.#normalizeChecked()
    for (const item of [...this.#loading])
      if (kidsOf(item).length || !item.lazy || !item.isConnected) this.#loading.delete(item)
    const setLevels = (list: JimbleTreeItem[], level: number) =>
      list.forEach((item, i) => {
        item.level = level
        item.posinset = i + 1
        item.setsize = list.length
        setLevels(kidsOf(item), level + 1)
      })
    setLevels(this.#roots, 1)
    const visible = this.#visible
    // 木の外にフォーカスがあるときは、Tab で入る先を、選ばれている項目に合わせ直す
    const focusedInside = !!document.activeElement && this.contains(document.activeElement)
    if (!this.#active || !visible.includes(this.#active) || !focusedInside) {
      this.#active =
        visible.find(
          (i) =>
            this.#checked.has(valueOf(i)) ||
            (this.selection === 'multiple' && this.#checkState(i) === 'mixed'),
        ) ?? visible[0]
    }
    for (const item of items) {
      item.selection = this.selection
      item.selected = this.selection === 'single' && this.#checked.has(valueOf(item))
      item.checkState = this.selection === 'multiple' ? this.#checkState(item) : 'false'
      item.guides = this.guides
      item.treeDisabled = this.isDisabled
      item.loading = this.#loading.has(item)
      item.tabIndex = item === this.#active && !this.isDisabled ? 0 : -1
    }
  }

  // ---- フォーカスとキー操作 ------------------------------------------------------------------
  #focus(item: JimbleTreeItem | undefined) {
    if (!item) return
    this.#active = item
    for (const i of this.items) i.tabIndex = i === item ? 0 : -1
    item.focus()
  }

  override focus(options?: FocusOptions): void {
    ;(this.#active ?? this.#visible[0])?.focus(options)
  }

  /** イベントの元の項目（このツリーの項目だけ） */
  #itemOf(e: Event): JimbleTreeItem | undefined {
    const item = e
      .composedPath()
      .find((n): n is JimbleTreeItem => n instanceof Element && n.localName === ITEM)
    return item && this.contains(item) ? item : undefined
  }

  #onFocusIn = (e: FocusEvent) => {
    const item = this.#itemOf(e)
    if (item && item !== this.#active) {
      this.#active = item
      for (const i of this.items) i.tabIndex = i === item ? 0 : -1
    }
  }

  #onClick = (e: MouseEvent) => {
    const item = this.#itemOf(e)
    if (!item) return
    const onToggle = e
      .composedPath()
      .some((n) => n instanceof Element && n.hasAttribute('data-tree-toggle'))
    this.#focus(item)
    // 開閉の印、または選ばない木（selection="none"）の行は、開閉する
    if (onToggle || (this.selection === 'none' && item.expandable))
      this.setExpanded(item, !item.expanded)
    else this.#activate(item)
  }

  #onKeydown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const item = this.#itemOf(e)
    if (!item) return
    const visible = this.#visible
    const at = visible.indexOf(item)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.#focus(visible[at + 1])
        return
      case 'ArrowUp':
        e.preventDefault()
        this.#focus(visible[at - 1])
        return
      case 'Home':
        e.preventDefault()
        this.#focus(visible[0])
        return
      case 'End':
        e.preventDefault()
        this.#focus(visible[visible.length - 1])
        return
      case 'ArrowRight':
        e.preventDefault()
        if (!item.expandable) return
        if (!item.expanded) this.setExpanded(item, true)
        else this.#focus(kidsOf(item)[0])
        return
      case 'ArrowLeft':
        e.preventDefault()
        if (item.expandable && item.expanded) this.setExpanded(item, false)
        else this.#focus(parentOf(item))
        return
      case 'Enter':
      case ' ':
        if (this.#ime.isComposing(e)) return
        e.preventDefault()
        this.#activate(item)
        return
      case '*': {
        e.preventDefault()
        const siblings = kidsOf(parentOf(item) ?? this)
        for (const s of siblings) this.setExpanded(s, true)
        return
      }
    }
    if (Typeahead.isChar(e) && !this.#ime.isComposing(e)) {
      const hit = this.#typeahead.match(e.key, visible, item, (i) => i.label)
      if (hit) {
        e.preventDefault()
        this.#focus(hit)
      }
    }
  }

  // ---- フォーム ------------------------------------------------------------------------------
  protected get formValue(): FormData | null {
    const values = this.values
    if (!this.name || !values.length) return null
    const data = new FormData()
    for (const v of values) data.append(this.name, v)
    return data
  }
  protected override get formState(): string | null {
    return JSON.stringify([...this.#checked])
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#fromAttribute = true
    this.values = this.#parseAttribute(this.getAttribute('value'))
    this.#fromAttribute = false
  }
  protected override restoreValue(state: string): void {
    try {
      const parsed: unknown = JSON.parse(state)
      this.values = Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      this.values = []
    }
    this.#dirty = true
  }
  protected override get validationContext(): ValidationContext {
    return { missing: 'choice' }
  }
  protected override computeValidity(): ValidityResult {
    if ((this.required || this.field.required) && !this.values.length) {
      return {
        flags: { valueMissing: true },
        message: this.t('validation.valueMissing.choice'),
        anchor: this.#active ?? this.items[0],
      }
    }
    return { flags: {}, message: '' }
  }

  // ---- ライフサイクル ------------------------------------------------------------------------
  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.#onFocusIn)
    // 項目の追加・削除（遅延読み込み）と、開閉・値の変化を追う
    this.#observer = new MutationObserver(() => {
      this.#sync()
      this.commit()
    })
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['expanded', 'disabled', 'value', 'label', 'lazy'],
    })
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.#onFocusIn)
    this.#observer?.disconnect()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('selection') && this.selection === 'single' && this.#checked.size > 1)
      this.#checked = new Set([...this.#checked].slice(0, 1))
    this.#sync()
  }

  protected override render() {
    const invalid = this.showInvalid
    return html`<div
        part="base"
        role="tree"
        aria-label=${ifDefined(this.accessibleName())}
        aria-multiselectable=${this.selection === 'multiple' ? 'true' : nothing}
        aria-required=${this.required || this.field.required ? 'true' : nothing}
        aria-invalid=${invalid ? 'true' : nothing}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        aria-describedby=${ifDefined(this.describedBy)}
        class="flex flex-col"
        @click=${this.#onClick}
        @keydown=${this.#onKeydown}
      >
        <slot @slotchange=${() => this.#sync()}></slot>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleTree.define('jimble-tree')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tree': JimbleTree
  }
  interface HTMLElementEventMap {
    'jimble-expand': CustomEvent<{ item: JimbleTreeItem }>
    'jimble-collapse': CustomEvent<{ item: JimbleTreeItem }>
  }
}
