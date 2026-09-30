import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { matches } from '../../base/text-match.js'
import { AFFIX, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'
import { arrowLeft } from '../../icons/arrowLeft.js'
import { arrowDown } from '../../icons/arrowDown.js'
import { arrowRight } from '../../icons/arrowRight.js'
import { arrowUp } from '../../icons/arrowUp.js'
import { minusCircle } from '../../icons/minusCircle.js'
import { plusCircle } from '../../icons/plusCircle.js'
import { magnifyingGlass } from '../../icons/magnifyingGlass.js'
import { renderIcon } from '../../icons/render.js'
import type { ComboboxItem } from '../combobox/jimble-combobox.js'
import type { JimbleOption } from '../select/jimble-option.js'
import '../select/jimble-option.js'

type Side = 'available' | 'selected'

const LIST = 'h-(--_h) overflow-auto rounded-md border border-line-control bg-surface'
const ROW =
  'flex w-full items-center justify-between gap-2 border-b border-line px-3 py-2 text-sm text-fg select-none ' +
  'cursor-default outline outline-1 outline-transparent -outline-offset-2 ' +
  'focus-visible:outline-2 focus-visible:outline-focus'
const MOVE_BTN =
  'inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium cursor-pointer ' +
  'bg-surface text-primary-700 ring-1 ring-inset ring-line-control hover:bg-primary-50 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
const PRIMARY_BTN =
  'inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium cursor-pointer ' +
  'bg-primary-600 text-fg-on-primary hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'disabled:hover:bg-primary-600 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

/**
 * 左右に分かれた選択(デュアルリストボックス)。左に未選択の項目、右に選択済みの項目を並べ、「追加」「削除」で移す。
 * 項目は `jimble-option` で書く(`jimble-select` / `jimble-combobox` と同じ)。フォーム関連カスタム要素で、
 * 選択済みの値を、同じ `name` で複数送信する。
 *
 * - 各リストは複数選択のリストボックス。行をクリックで選び(もう一度で解除。Shift でまとめて)、「追加」「削除」で移す。
 *   行の右の ＋ / − をクリックするか、行をダブルクリックすると、その 1 件だけを移す。
 * - キーボード: ↑ ↓ Home End で移動(Shift で選択を広げる)、Space で選ぶ、Ctrl+A で全部選ぶ、Enter で移す
 *   (選んだ項目。選んだものが無ければ、フォーカス中の 1 件)。
 * - それぞれのリストに、項目名の絞り込み欄がある(読み・全角半角・かなの違いを無視)。
 * - 選択済みは、追加した順に並ぶ。`max-items` で選べる数の上限を決められる。
 * - `reorderable` で右の一覧を並べ替えられる(Alt+↑↓、「上へ」「下へ」ボタン、ドラッグ)。
 * - `jimble-option` の `group` 属性で、項目を見出し付きにまとめる。`search-group` でグループ名でも絞り込める。
 *
 * @tag jimble-dual-listbox
 *
 * @csspart base - 全体
 * @csspart panel - 左右それぞれの領域
 * @csspart panel-title - 領域の見出し
 * @csspart search - 絞り込み欄
 * @csspart listbox - リストボックス
 * @csspart option - 項目
 * @csspart move - 行の右の ＋ / − の表示
 * @csspart empty - 項目が無いときの表示
 * @csspart group - 項目のグループ(role="group")
 * @csspart group-label - グループの見出し
 * @csspart group-tag - 並べ替えできる右の一覧で、項目の後ろに出るグループ名
 * @csspart move-up - 「上へ」ボタン(reorderable)
 * @csspart move-down - 「下へ」ボタン(reorderable)
 * @csspart controls - 中央のボタンの並び
 * @csspart add - 「追加」ボタン
 * @csspart remove - 「削除」ボタン
 * @csspart add-all - 「すべて追加」ボタン
 * @csspart remove-all - 「すべて削除」ボタン
 *
 * @cssprop [--jimble-dual-listbox-height=16rem] - リストの高さ
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 絞り込み欄の角丸
 *
 * @fires input - 選択済みの項目が変わった
 * @fires change - 選択済みの項目が変わった
 * @fires jimble-reorder - 右の一覧を並べ替えた(`reorderable`)。`detail.values` は新しい順の値
 */
export class JimbleDualListbox extends JimbleFormElement {
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    availableLabel: { attribute: 'available-label' },
    selectedLabel: { attribute: 'selected-label' },
    moveAll: { type: Boolean, reflect: true, attribute: 'move-all' },
    maxItems: { type: Number, attribute: 'max-items' },
    match: { reflect: true },
    reorderable: { type: Boolean, reflect: true },
    searchGroup: { type: Boolean, reflect: true, attribute: 'search-group' },
    items: { attribute: false },
    pickedAvailable: { state: true },
    pickedSelected: { state: true },
    queryAvailable: { state: true },
    querySelected: { state: true },
  }

  /** 左の見出し。未指定なら「未選択項目」 */
  declare availableLabel: string | undefined
  /** 右の見出し。未指定なら「選択済み項目」 */
  declare selectedLabel: string | undefined
  /** 「すべて追加」「すべて削除」のボタンを出す */
  declare moveAll: boolean
  /** 選べる数の上限 */
  declare maxItems: number | undefined
  /** 絞り込みの一致のさせ方。`contains`(含む・既定)または `starts-with` */
  declare match: 'contains' | 'starts-with'
  /** 右の一覧(選択済み)の並べ替えを許可する。Alt+↑↓、「上へ」「下へ」ボタン、ドラッグ。並べ替えると、右の一覧はグループでまとめず、選んだ順に並ぶ */
  declare reorderable: boolean
  /** グループ名も絞り込みの対象にする。既定はしない */
  declare searchGroup: boolean
  /** `jimble-option` の代わり(または追加)の項目 */
  declare items: ComboboxItem[]
  declare pickedAvailable: string[]
  declare pickedSelected: string[]
  declare queryAvailable: string
  declare querySelected: string

  #values: string[] = []
  #dirty = false
  #fromAttribute = false
  #observer: MutationObserver | undefined
  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined
  #active: Record<Side, string | undefined> = { available: undefined, selected: undefined }
  #anchor: Record<Side, string | undefined> = { available: undefined, selected: undefined }
  #hintId = this.uid('dl-hint')
  #ids = { available: this.uid('dl-available'), selected: this.uid('dl-selected') }
  #labels = new Map<string, string>()

  /** 選択済みの値(先頭)。`value` 属性は初期値（リセット先。カンマ区切り）、プロパティは現在値 */
  get value(): string {
    return this.#values[0] ?? ''
  }
  set value(next: string) {
    this.values = next ? [String(next)] : []
  }
  /** 選択済みの値の配列（追加した順） */
  get values(): string[] {
    return [...this.#values]
  }
  set values(next: string[]) {
    const old = this.#values
    this.#values = [...new Set((next ?? []).map(String))]
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

  constructor() {
    super()
    this.availableLabel = undefined
    this.selectedLabel = undefined
    this.moveAll = false
    this.maxItems = undefined
    this.match = 'contains'
    this.reorderable = false
    this.searchGroup = false
    this.items = []
    this.pickedAvailable = []
    this.pickedSelected = []
    this.queryAvailable = ''
    this.querySelected = ''
  }

  override connectedCallback(): void {
    super.connectedCallback()
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
  }

  get options(): JimbleOption[] {
    return [...this.children].filter((e): e is JimbleOption => e.localName === 'jimble-option')
  }
  get #all(): ComboboxItem[] {
    const seen = new Set<string>()
    return [
      ...this.options.map((o) => ({
        value: o.optionValue,
        label: o.label,
        keywords: o.keywords,
        disabled: o.disabled,
        group: o.group || undefined,
      })),
      ...this.items,
    ].filter((i) => (seen.has(i.value) ? false : (seen.add(i.value), true)))
  }
  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input[part="search"]') ?? null
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): FormData | null {
    if (!this.name || !this.#values.length) return null
    const data = new FormData()
    for (const v of this.#values) data.append(this.name, v)
    return data
  }
  protected override get formState(): string | null {
    return JSON.stringify(this.#values)
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#fromAttribute = true
    this.values = this.#parseAttribute(this.getAttribute('value'))
    this.#fromAttribute = false
    this.pickedAvailable = []
    this.pickedSelected = []
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

  // ---- 行の一覧 ------------------------------------------------------------------------
  #rows(side: Side): ComboboxItem[] {
    const all = this.#all
    const chosen = new Set(this.#values)
    const base =
      side === 'available'
        ? all.filter((i) => !chosen.has(i.value))
        : this.#values.map((v) => all.find((i) => i.value === v) ?? { value: v, label: v })
    const query = side === 'available' ? this.queryAvailable : this.querySelected
    const filtered = query.trim()
      ? base.filter(
          (i) =>
            matches(query, i.label, i.keywords ?? '', this.match) ||
            (this.searchGroup && !!i.group && matches(query, i.group, '', this.match)),
        )
      : base
    if (!this.#grouped(side)) return filtered
    // 同じグループを、最初に現れた位置でまとめる(矢印キーの移動順と表示順を一致させる)
    const order: string[] = []
    const byGroup = new Map<string, ComboboxItem[]>()
    for (const i of filtered) {
      const g = i.group ?? ''
      if (!byGroup.has(g)) {
        byGroup.set(g, [])
        order.push(g)
      }
      byGroup.get(g)!.push(i)
    }
    return order.flatMap((g) => byGroup.get(g)!)
  }
  /** グループでまとめて表示するか(並べ替えできる右の一覧は、選んだ順なのでまとめない) */
  #grouped(side: Side): boolean {
    return side === 'available' || !this.reorderable
  }
  #groupIds = new Map<string, string>()
  #groupId(side: Side, g: string): string {
    const key = `${side}:${g}`
    let id = this.#groupIds.get(key)
    if (!id) {
      id = this.uid('dl-group')
      this.#groupIds.set(key, id)
    }
    return id
  }
  #picked(side: Side): string[] {
    return side === 'available' ? this.pickedAvailable : this.pickedSelected
  }
  #setPicked(side: Side, next: string[]) {
    if (side === 'available') this.pickedAvailable = next
    else this.pickedSelected = next
  }
  #enabled(side: Side): ComboboxItem[] {
    return this.#rows(side).filter((i) => !i.disabled)
  }
  get #room(): number {
    return this.maxItems == null ? Infinity : Math.max(this.maxItems - this.#values.length, 0)
  }

  // ---- 移す ----------------------------------------------------------------------------
  #announce(text: string) {
    this.#announcement = text
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, 3000)
    this.requestUpdate()
  }

  /** 値を移す。side は「移す元」 */
  #move(side: Side, values: string[]) {
    if (this.isDisabled) return
    const movable = new Set(this.#enabled(side).map((i) => i.value))
    let list = values.filter((v) => movable.has(v))
    if (side === 'available') list = list.slice(0, this.#room)
    if (!list.length) {
      if (side === 'available' && values.length && this.#room === 0) {
        this.#announce(this.t('combobox.maxReached', { max: this.maxItems ?? 0 }))
      }
      return
    }
    // 移したあとの、元のリストでのフォーカス先(移した最初の行の次、なければ前)
    const rows = this.#enabled(side).map((i) => i.value)
    const firstIndex = rows.indexOf(list[0]!)
    const remaining = rows.filter((v) => !list.includes(v))
    const nextActive = remaining[Math.min(firstIndex, remaining.length - 1)]
    for (const v of this.#all) this.#labels.set(v.value, v.label)
    this.values =
      side === 'available'
        ? [...this.#values, ...list]
        : this.#values.filter((v) => !list.includes(v))
    this.#setPicked(
      side,
      this.#picked(side).filter((v) => !list.includes(v)),
    )
    this.#active[side] = nextActive
    this.#anchor[side] = undefined
    this.commit()
    this.requestUpdate()
    this.#announce(
      this.t(side === 'available' ? 'transfer.added' : 'transfer.removed', { count: list.length }),
    )
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    // ボタンが無効になってフォーカスが消えないよう、元のリストへ戻す
    void this.updateComplete.then(() => this.#focusList(side))
  }

  #moveSelected(side: Side) {
    this.#move(side, this.#picked(side))
  }
  #moveAll(side: Side) {
    this.#move(
      side,
      this.#enabled(side).map((i) => i.value),
    )
  }

  // ---- 並べ替え(右の一覧) --------------------------------------------------------------
  /** 並べ替えできるか(右の一覧を絞り込んでいる間は、見えていない項目との前後が分からないので、できない) */
  get #canReorder(): boolean {
    return this.reorderable && !this.isDisabled && !this.querySelected.trim()
  }
  /** picked のブロックを 1 つ上 / 下へ動かす。動かせたら true */
  #shift(picked: string[], dir: -1 | 1): boolean {
    const next = [...this.#values]
    const set = new Set(picked)
    let changed = false
    const indexes = next.map((_, i) => i)
    for (const i of dir < 0 ? indexes : indexes.reverse()) {
      const j = i + dir
      if (set.has(next[i]!) && j >= 0 && j < next.length && !set.has(next[j]!)) {
        ;[next[i], next[j]] = [next[j]!, next[i]!]
        changed = true
      }
    }
    if (changed) this.#values = next
    return changed
  }
  #canShift(dir: -1 | 1): boolean {
    if (!this.#canReorder) return false
    const picked = new Set(this.pickedSelected)
    return this.#values.some((v, i) => {
      const j = i + dir
      return picked.has(v) && j >= 0 && j < this.#values.length && !picked.has(this.#values[j]!)
    })
  }
  /** ボタンで動かしたあとにフォーカスする項目(動かす向きの先頭) */
  #firstPicked(dir: -1 | 1): string {
    const picked = this.#values.filter((v) => this.pickedSelected.includes(v))
    return (dir < 0 ? picked[0] : picked[picked.length - 1]) ?? ''
  }
  #reorderByStep(picked: string[], dir: -1 | 1, focusValue: string) {
    if (!this.#canReorder || !picked.length) return
    if (!this.#shift(picked, dir)) return
    this.#afterReorder(focusValue)
  }
  #reorderTo(value: string, target: string, after: boolean) {
    if (!this.#canReorder || value === target) return
    const rest = this.#values.filter((v) => v !== value)
    const at = rest.indexOf(target)
    if (at < 0) return
    rest.splice(after ? at + 1 : at, 0, value)
    if (rest.join('\0') === this.#values.join('\0')) return
    this.#values = rest
    this.#afterReorder(value)
  }
  #afterReorder(value: string) {
    const pos = this.#values.indexOf(value)
    this.#active.selected = value
    this.commit()
    this.requestUpdate('value')
    this.#announce(
      this.t('combobox.moved', {
        label: this.#labels.get(value) ?? value,
        pos: pos + 1,
        total: this.#values.length,
      }),
    )
    this.emit('reorder', { detail: { values: [...this.#values] } })
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    void this.updateComplete.then(() => this.#focusList('selected'))
  }

  // ドラッグ(マウス)での並べ替え。キーボードは Alt+↑↓、ポインター 1 本での代わりは「上へ」「下へ」ボタン
  #dragValue: string | undefined
  #onDragStart = (event: DragEvent, value: string) => {
    if (!this.#canReorder) return event.preventDefault()
    this.#dragValue = value
    event.dataTransfer?.setData('text/plain', value)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
  #dropAfter(event: DragEvent, target: HTMLElement): boolean {
    const rect = target.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2
  }
  #clearDrop() {
    for (const r of this.renderRoot.querySelectorAll<HTMLElement>('[data-drop]'))
      delete r.dataset.drop
  }
  #onDragOver = (event: DragEvent) => {
    if (this.#dragValue === undefined) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    const target = event.currentTarget as HTMLElement
    this.#clearDrop()
    target.dataset.drop = this.#dropAfter(event, target) ? 'after' : 'before'
  }
  #onDrop = (event: DragEvent) => {
    const value = this.#dragValue
    this.#dragValue = undefined
    this.#clearDrop()
    if (value === undefined) return
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    this.#reorderTo(value, target.dataset.value!, this.#dropAfter(event, target))
  }
  #onDragEnd = () => {
    this.#dragValue = undefined
    this.#clearDrop()
  }

  #focusList(side: Side) {
    const rows = this.renderRoot.querySelectorAll<HTMLElement>(
      `[data-side="${side}"] [role="option"]`,
    )
    const active = [...rows].find((r) => r.dataset.value === this.#active[side]) ?? rows[0]
    if (active) active.focus()
    else this.renderRoot.querySelector<HTMLElement>(`[data-side="${side}"] input`)?.focus()
  }

  // ---- 選ぶ ----------------------------------------------------------------------------
  #toggle(side: Side, value: string) {
    const picked = this.#picked(side)
    this.#setPicked(
      side,
      picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value],
    )
  }
  /** anchor から value までを選ぶ(Shift) */
  #selectRange(side: Side, value: string) {
    const rows = this.#enabled(side).map((i) => i.value)
    const from = rows.indexOf(this.#anchor[side] ?? this.#active[side] ?? value)
    const to = rows.indexOf(value)
    if (from < 0 || to < 0) return
    const [a, b] = from < to ? [from, to] : [to, from]
    this.#setPicked(side, [...new Set([...this.#picked(side), ...rows.slice(a, b + 1)])])
  }

  #onRowClick = (side: Side, item: ComboboxItem, event: MouseEvent) => {
    if (this.isDisabled || item.disabled) return
    this.#active[side] = item.value
    if (event.shiftKey) this.#selectRange(side, item.value)
    else {
      this.#toggle(side, item.value)
      this.#anchor[side] = item.value
    }
    this.requestUpdate()
  }
  #onRowDblClick = (side: Side, item: ComboboxItem) => {
    if (item.disabled) return
    this.#move(side, [item.value])
  }

  #onListKeydown = (side: Side, event: KeyboardEvent) => {
    if (
      event.altKey &&
      side === 'selected' &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      const current = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]')?.dataset
        .value
      if (current && this.reorderable) {
        event.preventDefault()
        const picked = this.pickedSelected
        this.#reorderByStep(
          picked.includes(current) && picked.length > 1 ? picked : [current],
          event.key === 'ArrowUp' ? -1 : 1,
          current,
        )
      }
      return
    }
    if (event.altKey || event.metaKey) return
    const rows = this.#enabled(side).map((i) => i.value)
    if (!rows.length) return
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]')?.dataset
      .value
    const at = current ? rows.indexOf(current) : -1
    const goto = (index: number) => {
      const value = rows[Math.min(Math.max(index, 0), rows.length - 1)]!
      event.preventDefault()
      if (event.shiftKey) {
        this.#anchor[side] ??= current
        this.#active[side] = value
        this.#selectRange(side, value)
      } else this.#active[side] = value
      this.requestUpdate()
      void this.updateComplete.then(() => this.#focusList(side))
    }
    switch (event.key) {
      case 'ArrowDown':
        goto(at + 1)
        return
      case 'ArrowUp':
        goto(at - 1)
        return
      case 'Home':
        goto(0)
        return
      case 'End':
        goto(rows.length - 1)
        return
      case ' ':
        if (current) {
          event.preventDefault()
          this.#toggle(side, current)
          this.#anchor[side] = current
          this.requestUpdate()
        }
        return
      case 'a':
      case 'A':
        if (event.ctrlKey) {
          event.preventDefault()
          this.#setPicked(side, rows)
        }
        return
      case 'Enter': {
        event.preventDefault()
        const picked = this.#picked(side)
        this.#move(side, picked.length ? picked : current ? [current] : [])
        return
      }
    }
  }

  #onSearch = (side: Side) => (event: Event) => {
    const q = (event.target as HTMLInputElement).value
    if (side === 'available') this.queryAvailable = q
    else this.querySelected = q
    // 見えなくなった項目は、選択から外す(見えていないものを移してしまわないため)
    queueMicrotask(() => {
      const visible = new Set(this.#rows(side).map((i) => i.value))
      this.#setPicked(
        side,
        this.#picked(side).filter((v) => visible.has(v)),
      )
    })
  }
  #onSearchKeydown = (side: Side, event: KeyboardEvent) => {
    if (this.ime.isComposing(event)) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.#focusList(side)
    } else if (event.key === 'Enter') event.preventDefault()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    for (const i of this.#all) this.#labels.set(i.value, i.label)
    // 存在しなくなった項目を、選択・フォーカスから外す
    for (const side of ['available', 'selected'] as const) {
      const known = new Set(this.#rows(side).map((i) => i.value))
      const picked = this.#picked(side)
      if (picked.some((v) => !known.has(v)))
        this.#setPicked(
          side,
          picked.filter((v) => known.has(v)),
        )
    }
  }

  // ---- 描画 ----------------------------------------------------------------------------
  #renderBlocks(
    side: Side,
    rows: ComboboxItem[],
    picked: Set<string>,
    activeValue: string | undefined,
  ) {
    if (!this.#grouped(side)) return rows.map((r) => this.#renderRow(side, r, picked, activeValue))
    const blocks: { group: string; rows: ComboboxItem[] }[] = []
    for (const r of rows) {
      const g = r.group ?? ''
      const last = blocks[blocks.length - 1]
      if (last && last.group === g) last.rows.push(r)
      else blocks.push({ group: g, rows: [r] })
    }
    return blocks.map((b) =>
      b.group
        ? html`<div part="group" role="group" aria-labelledby=${this.#groupId(side, b.group)}>
            <div
              part="group-label"
              id=${this.#groupId(side, b.group)}
              role="presentation"
              class="border-b border-line bg-surface-muted px-3 py-1.5 text-xs font-semibold text-fg-muted"
            >
              ${b.group}
            </div>
            ${b.rows.map((r) => this.#renderRow(side, r, picked, activeValue))}
          </div>`
        : b.rows.map((r) => this.#renderRow(side, r, picked, activeValue)),
    )
  }

  #renderRow(side: Side, r: ComboboxItem, picked: Set<string>, activeValue: string | undefined) {
    const disabled = this.isDisabled
    const isPicked = picked.has(r.value)
    const drag = side === 'selected' && this.#canReorder && !r.disabled
    return html`<div
      part="option"
      role="option"
      data-value=${r.value}
      aria-selected=${isPicked ? 'true' : 'false'}
      aria-disabled=${r.disabled ? 'true' : nothing}
      tabindex=${r.value === activeValue ? '0' : '-1'}
      draggable=${drag ? 'true' : nothing}
      class="${ROW} ${isPicked ? 'bg-primary-50' : 'hover:bg-surface-sunken'} ${r.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
      @click=${(e: MouseEvent) => this.#onRowClick(side, r, e)}
      @dblclick=${() => this.#onRowDblClick(side, r)}
      @dragstart=${(e: DragEvent) => this.#onDragStart(e, r.value)}
      @dragover=${side === 'selected' ? this.#onDragOver : nothing}
      @drop=${side === 'selected' ? this.#onDrop : nothing}
      @dragend=${this.#onDragEnd}
    >
      <span class="min-w-0 flex-1 truncate">${r.label}</span>
      ${
        side === 'selected' && this.reorderable && r.group
          ? html`<span part="group-tag" class="shrink-0 text-xs text-fg-muted">${r.group}</span>`
          : nothing
      }
      ${
        disabled || r.disabled
          ? nothing
          : html`<span
              part="move"
              aria-hidden="true"
              class="inline-flex shrink-0 rounded-full text-fg-muted hover:text-primary-700"
              @click=${(e: Event) => {
                e.stopPropagation()
                this.#move(side, [r.value])
              }}
              >${renderIcon(side === 'available' ? plusCircle : minusCircle, 'size-5')}</span
            >`
      }
    </div>`
  }

  #renderPanel(side: Side) {
    const rows = this.#rows(side)
    const picked = new Set(this.#picked(side))
    const label = side === 'available' ? this.#availableLabel : this.#selectedLabel
    const query = side === 'available' ? this.queryAvailable : this.querySelected
    const disabled = this.isDisabled
    const firstEnabled = rows.find((r) => !r.disabled)?.value
    const activeValue = rows.some((r) => r.value === this.#active[side] && !r.disabled)
      ? this.#active[side]
      : firstEnabled
    const total =
      side === 'available' ? this.#all.length - this.#values.length : this.#values.length
    return html`<div part="panel" data-side=${side} class="flex min-w-0 flex-1 flex-col gap-2">
      <div part="panel-title" id=${this.#ids[side]} class="text-sm font-semibold">${label}</div>
      <div part="search-wrap" class=${textWrapClasses(this.size, false, disabled, 'items-center')}>
        <input
          part="search"
          class=${TEXT_INNER}
          type="text"
          autocomplete="off"
          .value=${query}
          placeholder=${this.t('transfer.search')}
          aria-label=${this.t('transfer.searchLabel', { label })}
          ?disabled=${disabled}
          @input=${this.#onSearch(side)}
          @keydown=${(e: KeyboardEvent) => this.#onSearchKeydown(side, e)}
        />
        <span class=${AFFIX}>${renderIcon(magnifyingGlass, 'size-4')}</span>
      </div>
      <div class="[--_h:var(--jimble-dual-listbox-height,16rem)]">
        ${
          rows.length
            ? html`<div
                part="listbox"
                role="listbox"
                aria-multiselectable="true"
                aria-labelledby=${this.#ids[side]}
                aria-describedby=${side === 'selected' && this.reorderable ? this.#hintId : nothing}
                class=${LIST}
                @keydown=${(e: KeyboardEvent) => this.#onListKeydown(side, e)}
              >
                ${this.#renderBlocks(side, rows, picked, activeValue)}
              </div>`
            : html`<div
                part="empty"
                class="${LIST} flex items-center justify-center px-3 text-sm text-fg-muted"
              >
                ${query.trim() && total > 0 ? this.t('transfer.noMatch') : this.t('transfer.empty')}
              </div>`
        }
      </div>
    </div>`
  }

  get #availableLabel(): string {
    return this.availableLabel || this.t('transfer.available')
  }
  get #selectedLabel(): string {
    return this.selectedLabel || this.t('transfer.selected')
  }

  protected override render() {
    const disabled = this.isDisabled
    const name = this.accessibleName()
    const target = this.#selectedLabel
    const room = this.#room
    return html`<div
        part="base"
        role="group"
        aria-label=${ifDefined(name)}
        aria-describedby=${ifDefined(this.describedBy)}
        class="flex flex-col gap-3 @container"
      >
        <div class="flex flex-col gap-3 @[36rem]:flex-row @[36rem]:items-stretch">
          ${this.#renderPanel('available')}
          <div
            part="controls"
            class="flex flex-row items-center justify-center gap-2 @[36rem]:flex-col @[36rem]:pt-24"
          >
            ${
              this.moveAll
                ? html`<button
                    part="add-all"
                    type="button"
                    class=${MOVE_BTN}
                    ?disabled=${disabled || this.#enabled('available').length === 0 || room === 0}
                    aria-label=${this.t('transfer.addAllLabel', { target })}
                    @click=${() => this.#moveAll('available')}
                  >
                    ${this.t('transfer.addAll')}
                  </button>`
                : nothing
            }
            <button
              part="add"
              type="button"
              class=${PRIMARY_BTN}
              ?disabled=${disabled || this.pickedAvailable.length === 0 || room === 0}
              aria-label=${this.t('transfer.addLabel', { target })}
              @click=${() => this.#moveSelected('available')}
            >
              ${this.t('transfer.add')}${renderIcon(arrowRight, 'size-4 @[36rem]:rotate-0 rotate-90')}
            </button>
            <button
              part="remove"
              type="button"
              class=${MOVE_BTN}
              ?disabled=${disabled || this.pickedSelected.length === 0}
              aria-label=${this.t('transfer.removeLabel', { target })}
              @click=${() => this.#moveSelected('selected')}
            >
              ${renderIcon(arrowLeft, 'size-4 @[36rem]:rotate-0 rotate-90')}${this.t('transfer.remove')}
            </button>
            ${
              this.moveAll
                ? html`<button
                    part="remove-all"
                    type="button"
                    class=${MOVE_BTN}
                    ?disabled=${disabled || this.#values.length === 0}
                    aria-label=${this.t('transfer.removeAllLabel', { target })}
                    @click=${() => this.#moveAll('selected')}
                  >
                    ${this.t('transfer.removeAll')}
                  </button>`
                : nothing
            }
            ${
              this.reorderable
                ? html`<button
                      part="move-up"
                      type="button"
                      class=${MOVE_BTN}
                      ?disabled=${!this.#canShift(-1)}
                      aria-label=${this.t('transfer.moveUpLabel')}
                      @click=${() => this.#reorderByStep(this.pickedSelected, -1, this.#firstPicked(-1))}
                    >
                      ${renderIcon(arrowUp, 'size-4')}${this.t('transfer.moveUp')}
                    </button>
                    <button
                      part="move-down"
                      type="button"
                      class=${MOVE_BTN}
                      ?disabled=${!this.#canShift(1)}
                      aria-label=${this.t('transfer.moveDownLabel')}
                      @click=${() => this.#reorderByStep(this.pickedSelected, 1, this.#firstPicked(1))}
                    >
                      ${renderIcon(arrowDown, 'size-4')}${this.t('transfer.moveDown')}
                    </button>`
                : nothing
            }
          </div>
          ${this.#renderPanel('selected')}
        </div>
        ${this.reorderable ? html`<span id=${this.#hintId} class="sr-only">${this.t('transfer.reorderHint')}</span>` : nothing}
        <div role="status" class="sr-only">${this.#announcement}</div>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleDualListbox.define('jimble-dual-listbox')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-dual-listbox': JimbleDualListbox
  }
}
