import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { TEXT_SIZE, textWrapClasses } from '../../base/text-control.js'
import { Typeahead } from '../../base/typeahead.js'
import { chevronUpDown } from '../../icons/chevronUpDown.js'
import { renderIcon } from '../../icons/render.js'
import type { JimbleOption } from './jimble-option.js'
import './jimble-option.js'

const LIST =
  'max-h-[min(20rem,50dvh)] overflow-auto rounded-overlay border-0 bg-surface-overlay p-1 text-fg shadow-lg ' +
  'ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-select-radius,var(--radius-overlay))]'

/**
 * セレクト(WAI-ARIA の collapsible dropdown listbox パターン)。選択肢は `jimble-option` で書く。
 * フォーム関連カスタム要素で、選ばれた選択肢の値を送信する。一覧は Popover API のトップレイヤーに出て、
 * 位置は CSS Anchor Positioning で決まる。
 *
 * 絞り込み(コンボボックス)・複数選択は未対応。
 *
 * @tag jimble-select
 *
 * @slot - jimble-option
 *
 * @csspart base - ルート要素
 * @csspart button - 現在の値を表示するボタン
 * @csspart value - 値の表示
 * @csspart listbox - 選択肢の一覧(role="listbox")
 *
 * @cssprop [--jimble-select-radius=var(--jimble-radius-overlay)] - 一覧の角丸
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - ボタンの角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - ボタンの高さ
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 *
 * @fires input - 選択が変わった(ネイティブと同じ)
 * @fires change - 選択が変わった(ネイティブと同じ)
 */
export class JimbleSelect extends JimbleFormElement {
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    placeholder: {},
    open: { type: Boolean, reflect: true },
  }

  declare placeholder: string | undefined
  /** 一覧を開いているか */
  declare open: boolean

  #value = ''
  #dirty = false
  #fromAttribute = false
  #typeahead = new Typeahead()
  #listId = this.uid('listbox')
  #labelId = this.uid('label')
  #valueId = this.uid('value')
  #focusOnOpen: 'selected' | 'last' = 'selected'
  #wasOpenOnPointerDown = false
  #notified = false

  /** 選ばれている選択肢の value。`value` 属性はデフォルト（リセット先）、プロパティは現在値 */
  get value(): string {
    return this.#value
  }
  set value(next: string) {
    const old = this.#value
    this.#value = String(next ?? '')
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      super.attributeChangedCallback(name, old, value)
      this.#fromAttribute = false
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  constructor() {
    super()
    this.placeholder = undefined
    this.open = false
  }

  get options(): JimbleOption[] {
    return (
      this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot')
        ?.assignedElements({ flatten: true }) ?? []
    ).filter((e): e is JimbleOption => e.localName === 'jimble-option')
  }
  /** 現在の値に対応する選択肢（`selected` フラグは描画後に同期されるので、値から直接探す） */
  get selectedOption(): JimbleOption | undefined {
    return this.#value === '' ? undefined : this.options.find((o) => o.optionValue === this.#value)
  }
  get #button(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector('button') ?? null
  }
  get #list(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="listbox"]') ?? null
  }
  #enabled = () => this.options.filter((o) => !o.disabled)

  protected get formValue(): string | null {
    return this.#value || null
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#value = this.getAttribute('value') ?? ''
  }
  protected override restoreValue(state: string): void {
    this.#value = state
    this.#dirty = true
  }
  protected override computeValidity(): ValidityResult {
    if ((this.required || this.field.required) && !this.#value) {
      return {
        flags: { valueMissing: true },
        message: this.t('validation.valueMissing'),
        anchor: this.#button ?? undefined,
      }
    }
    return { flags: {}, message: '' }
  }

  show(): void {
    this.#focusOnOpen = 'selected'
    this.open = true
  }
  hide(): void {
    this.open = false
  }

  /** 選択肢の選択状態を value に合わせる */
  #sync() {
    for (const o of this.options) o.selected = o.optionValue === this.#value && this.#value !== ''
    for (const o of this.options) if (!o.hasAttribute('tabindex')) o.tabIndex = -1
  }

  #choose(option: JimbleOption) {
    if (option.disabled) return
    const changed = option.optionValue !== this.#value
    this.value = option.optionValue
    this.#sync()
    this.commit()
    if (changed) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  #focusOption(option: JimbleOption | undefined) {
    if (!option) return
    for (const o of this.options) o.tabIndex = o === option ? 0 : -1
    option.focus()
  }

  // ---- ボタン -----------------------------------------------------------------------------
  #onButtonPointerDown = () => {
    this.#wasOpenOnPointerDown = this.open
  }
  #onButtonClick = () => {
    const wasOpen = this.#wasOpenOnPointerDown
    this.#wasOpenOnPointerDown = false
    if (wasOpen || this.isDisabled) return
    this.show()
  }
  #onButtonKeydown = (e: KeyboardEvent) => {
    if (this.isDisabled || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.#focusOnOpen = e.key === 'ArrowUp' ? 'last' : 'selected'
      this.open = true
      return
    }
    // 閉じているとき、文字を打つとネイティブの select と同じように値が変わる
    if (Typeahead.isChar(e) && !this.ime.isComposing(e)) {
      const enabled = this.#enabled()
      const hit = this.#typeahead.match(e.key, enabled, this.selectedOption, (o) => o.label)
      if (hit) this.#choose(hit)
    }
  }

  // ---- 一覧 -------------------------------------------------------------------------------
  #onListKeydown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const enabled = this.#enabled()
    const current = (e.target as Element).closest?.('jimble-option') as JimbleOption | null
    const at = current ? enabled.indexOf(current) : -1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.#focusOption(enabled[Math.min(at + 1, enabled.length - 1)])
        return
      case 'ArrowUp':
        e.preventDefault()
        this.#focusOption(enabled[Math.max(at - 1, 0)])
        return
      case 'Home':
        e.preventDefault()
        this.#focusOption(enabled[0])
        return
      case 'End':
        e.preventDefault()
        this.#focusOption(enabled[enabled.length - 1])
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (current) this.#pick(current)
        return
      case 'Escape':
        e.preventDefault()
        this.#closeToButton()
        return
      case 'Tab':
        // 選択は変えずに閉じ、ボタンの次へ進む
        this.#closeToButton()
        return
    }
    if (Typeahead.isChar(e) && !this.ime.isComposing(e)) {
      const hit = this.#typeahead.match(e.key, enabled, current ?? undefined, (o) => o.label)
      if (hit) this.#focusOption(hit)
    }
  }

  #pick(option: JimbleOption) {
    if (option.disabled) return
    this.#choose(option)
    this.#closeToButton()
  }
  #closeToButton() {
    this.#button?.focus()
    // 同期的に隠す（描画を待つと、Tab の既定動作が表示中の選択肢へ移ってしまう）
    const list = this.#list
    if (list?.matches(':popover-open')) list.hidePopover()
    this.open = false
  }
  #onListClick = (e: Event) => {
    const option = (e.target as Element).closest?.('jimble-option') as JimbleOption | null
    if (option && option.parentElement === this) this.#pick(option)
  }
  #onListPointerMove = (e: PointerEvent) => {
    const option = (e.target as Element).closest?.('jimble-option') as JimbleOption | null
    if (option && !option.disabled && document.activeElement !== option) this.#focusOption(option)
  }

  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen) this.open = isOpen
    else this.#afterToggle(isOpen)
  }
  #afterToggle(isOpen: boolean) {
    if (isOpen === this.#notified) return // 開閉の通知は 1 回だけ
    this.#notified = isOpen
    const button = this.#button
    if (button) button.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) {
      const enabled = this.#enabled()
      this.#focusOption(
        this.#focusOnOpen === 'last'
          ? enabled[enabled.length - 1]
          : this.selectedOption && !this.selectedOption.disabled
            ? this.selectedOption
            : enabled[0],
      )
      this.emit('open')
    } else {
      this.emit('close')
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.#sync()
    const list = this.#list
    if (list && changed.has('open')) {
      const shown = list.matches(':popover-open')
      if (this.open && !shown) list.showPopover()
      else if (!this.open && shown) list.hidePopover()
      else this.#afterToggle(this.open)
    }
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const selected = this.selectedOption
    const shownText = selected?.label || this.placeholder || this.t('select.placeholder')
    const name = this.accessibleName()
    const size = this.size in TEXT_SIZE ? this.size : 'md'
    return html`<button
        part="button"
        type="button"
        class=${textWrapClasses(size, invalid, disabled, 'items-center text-left cursor-pointer')}
        ?disabled=${disabled}
        aria-haspopup="listbox"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${this.#listId}
        aria-labelledby=${ifDefined(name ? `${this.#labelId} ${this.#valueId}` : undefined)}
        aria-invalid=${invalid ? 'true' : nothing}
        aria-describedby=${ifDefined(this.describedBy)}
        @pointerdown=${this.#onButtonPointerDown}
        @click=${this.#onButtonClick}
        @keydown=${this.#onButtonKeydown}
      >
        <span
          part="value"
          id=${this.#valueId}
          class="min-w-0 flex-1 truncate ${selected ? '' : 'text-fg-placeholder'}"
          >${shownText}</span
        >
        ${renderIcon(chevronUpDown, 'size-5 shrink-0 text-fg-muted')}
      </button>
      ${
        name
          ? html`<span id=${this.#labelId} class="sr-only"
              >${name}${this.required || this.field.required ? ` (${this.t('field.required')})` : ''}</span
            >`
          : nothing
      }
      <div
        part="listbox"
        id=${this.#listId}
        popover="auto"
        role="listbox"
        class=${LIST}
        aria-label=${name ?? this.placeholder ?? this.t('select.placeholder')}
        @toggle=${this.#onToggle}
        @keydown=${this.#onListKeydown}
        @click=${this.#onListClick}
        @pointermove=${this.#onListPointerMove}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
        ${
          this.options.length === 0
            ? html`<div
                role="option"
                aria-disabled="true"
                class="px-2.5 py-1.5 text-sm text-fg-muted"
              >
                ${this.t('select.noOptions')}
              </div>`
            : nothing
        }
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleSelect.define('jimble-select')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-select': JimbleSelect
  }
}
