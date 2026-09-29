import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import { matches } from '../../base/text-match.js'
import { AFFIX, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'
import { check } from '../../icons/check.js'
import { chevronDown } from '../../icons/chevronDown.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'
import type { JimbleOption } from '../select/jimble-option.js'
import '../select/jimble-option.js'

const ICON_BUTTON =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken hover:text-fg disabled:cursor-not-allowed outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const POPUP =
  'max-h-[min(20rem,50dvh)] overflow-auto border-0 bg-surface-overlay p-1 text-fg shadow-lg ' +
  'ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-combobox-radius,var(--radius-overlay))]'
const OPTION =
  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg select-none ' +
  'cursor-default outline outline-1 outline-transparent hover:bg-surface-sunken'

/** 絞り込みの関数。true なら候補に残す */
export type ComboboxFilter = (query: string, option: JimbleOption) => boolean

/**
 * 絞り込みできるセレクト(WAI-ARIA の combobox・list autocomplete パターン)。文字を入力すると候補が絞られ、
 * 選択肢から 1 つ選ぶ。選択肢は `jimble-option` で書く(`jimble-select` と同じ)。フォーム関連カスタム要素で、
 * 選ばれた選択肢の値を送信する。
 *
 * - 自由入力は値にならない。選択肢に無い文字を入れて離れると、選択中の表示に戻る。
 * - 一致は、全角・半角、大文字・小文字、ひらがな・カタカナ、空白を区別しない。`jimble-option` の `keywords` に
 *   読み(`とうきょう tokyo`)を書くと、それでも一致する。
 * - 独自の絞り込みは `filter` プロパティ、サーバー側で絞る場合は `jimble-search` を受けて選択肢を差し替える。
 * - 複数選択は未対応。
 *
 * @tag jimble-combobox
 *
 * @slot - jimble-option
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - テキスト欄(role="combobox")
 * @csspart clear - 選択を解除するボタン
 * @csspart toggle - 候補を開閉するボタン
 * @csspart popup - 候補の面
 * @csspart listbox - 候補の一覧(role="listbox")
 * @csspart option - 候補
 * @csspart empty - 一致する候補が無いときの表示
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
    match: { reflect: true },
    open: { type: Boolean, reflect: true },
  }

  declare placeholder: string | undefined
  declare readonly: boolean
  /** 選択を解除するボタンを出す */
  declare clearable: boolean
  /** 一致のさせ方。`contains`(含む・既定)または `starts-with`(前方一致) */
  declare match: 'contains' | 'starts-with'
  /** 候補を開いているか */
  declare open: boolean
  /** 独自の絞り込み。指定すると `match` と `keywords` は使われない */
  filter: ComboboxFilter | undefined

  #value = ''
  #dirty = false
  #fromAttribute = false
  #typing = false
  #text = ''
  #active: JimbleOption | undefined
  #listId = this.uid('listbox')
  #notified = false
  #observer: MutationObserver | undefined
  #optionIds = new WeakMap<JimbleOption, string>()

  /** 選ばれている選択肢の value。`value` 属性は初期値（リセット先）、プロパティは現在値 */
  get value(): string {
    return this.#value
  }
  set value(next: string) {
    const old = this.#value
    this.#value = String(next ?? '')
    this.#typing = false
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
    this.readonly = false
    this.clearable = false
    this.match = 'contains'
    this.open = false
    this.filter = undefined
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
  }

  get options(): JimbleOption[] {
    return [...this.children].filter((e): e is JimbleOption => e.localName === 'jimble-option')
  }
  get selectedOption(): JimbleOption | undefined {
    return this.#value === '' ? undefined : this.options.find((o) => o.optionValue === this.#value)
  }
  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null
  }
  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }

  /** いま候補に出すもの */
  get #visible(): JimbleOption[] {
    const query = this.#text.trim()
    if (!this.#typing || !query) return this.options
    return this.options.filter((o) =>
      this.filter
        ? this.filter(this.#text, o)
        : matches(this.#text, o.label, o.keywords, this.match),
    )
  }
  #optionId(o: JimbleOption): string {
    let id = this.#optionIds.get(o)
    if (!id) {
      id = this.uid('option')
      this.#optionIds.set(o, id)
    }
    return id
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string | null {
    return this.#value || null
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#value = this.getAttribute('value') ?? ''
    this.#typing = false
  }
  protected override restoreValue(state: string): void {
    this.#value = state
    this.#dirty = true
    this.#typing = false
  }
  protected override computeValidity(): ValidityResult {
    if ((this.required || this.field.required) && !this.#value) {
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

  // ---- 操作 ----------------------------------------------------------------------------
  #firstEnabled(list: JimbleOption[]) {
    return list.find((o) => !o.disabled)
  }

  #onInput = (event: Event) => {
    // 文字の入力は「検索語の変化」であり、値(選択)は変わらないので input は host へ出さない
    event.stopPropagation()
    this.#text = (event.target as HTMLInputElement).value
    this.#typing = true
    this.#openList()
    this.#active = this.#firstEnabled(this.#visible)
    this.requestUpdate()
    this.emit('search', { detail: { query: this.#text } })
  }

  #openList() {
    if (this.isDisabled || this.readonly) return
    this.open = true
  }

  #move(step: 1 | -1, edge: 'first' | 'last') {
    const enabled = this.#visible.filter((o) => !o.disabled)
    if (!enabled.length) return
    if (!this.open) {
      this.#typing = false
      this.#openList()
      const sel = this.selectedOption
      this.#active = sel && !sel.disabled ? sel : edge === 'last' ? enabled.at(-1) : enabled[0]
      this.requestUpdate()
      return
    }
    const at = this.#active ? enabled.indexOf(this.#active) : -1
    const next = at === -1 ? (step === 1 ? 0 : enabled.length - 1) : at + step
    this.#active = enabled[Math.min(Math.max(next, 0), enabled.length - 1)]
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
          if (this.#active) this.#pick(this.#active)
          return
        }
        break
      case 'Escape':
        if (this.open) {
          event.preventDefault()
          this.#close()
        }
        return
    }
    handleImplicitSubmit(event, this.form, this.isDisabled, this.ime)
  }

  #pick(option: JimbleOption) {
    if (option.disabled) return
    const changed = option.optionValue !== this.#value
    this.value = option.optionValue
    this.commit()
    this.#close()
    if (changed) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  /** 閉じて、入力欄の文字を選択中の表示に戻す */
  #close() {
    this.#typing = false
    this.#active = undefined
    const popup = this.#popup
    if (popup?.matches(':popover-open')) popup.hidePopover()
    this.open = false
    this.requestUpdate()
  }

  #onClear = () => {
    const changed = this.#value !== ''
    this.value = ''
    this.commit()
    this.#close()
    this.nativeControl?.focus()
    if (changed) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  #onToggle = () => {
    if (this.isDisabled || this.readonly) return
    this.nativeControl?.focus()
    if (this.open) this.#close()
    else this.#move(1, 'first')
  }

  /** ボタンを押してもフォーカスを入力欄から動かさない */
  #keepFocus = (event: Event) => event.preventDefault()

  #onOptionClick = (option: JimbleOption) => this.#pick(option)

  #onPopupToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (isOpen === this.#notified) return
    this.#notified = isOpen
    this.emit(isOpen ? 'open' : 'close')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!this.#typing) this.#text = this.selectedOption?.label ?? ''
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
  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const visible = this.#visible
    const active = this.#active && visible.includes(this.#active) ? this.#active : undefined
    const showClear = this.clearable && !!this.#value && !disabled && !this.readonly
    const name = this.accessibleName()
    const empty = visible.length === 0
    const selected = this.selectedOption
    return html`<div
        part="base"
        class=${textWrapClasses(this.size, invalid, disabled, 'items-center')}
      >
        <input
          part="input"
          class=${TEXT_INNER}
          type="text"
          role="combobox"
          autocomplete="off"
          .value=${live(this.#text)}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          aria-label=${ifDefined(name)}
          aria-autocomplete="list"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls=${this.#listId}
          aria-activedescendant=${ifDefined(this.open && active ? this.#optionId(active) : undefined)}
          aria-required=${this.required || this.field.required ? 'true' : nothing}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.#onInput}
          @keydown=${this.#onKeydown}
          @blur=${() => this.#close()}
          @change=${(e: Event) => e.stopPropagation()}
        />
        <span class=${AFFIX}>
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
          ?hidden=${empty}
          @pointerdown=${this.#keepFocus}
        >
          ${visible.map(
            (o) =>
              html`<div
                part="option"
                id=${this.#optionId(o)}
                role="option"
                class="${OPTION} ${o === active ? 'bg-surface-sunken' : ''} ${o.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
                aria-selected=${o === selected ? 'true' : 'false'}
                aria-disabled=${o.disabled ? 'true' : nothing}
                data-active=${o === active ? '' : nothing}
                @click=${() => this.#onOptionClick(o)}
                @pointermove=${() => {
                  if (!o.disabled && this.#active !== o) {
                    this.#active = o
                    this.requestUpdate()
                  }
                }}
              >
                <span class="min-w-0 flex-1">${o.label}</span>${
                  o === selected ? renderIcon(check, 'size-4 shrink-0 text-primary-600') : nothing
                }
              </div>`,
          )}
        </div>
        ${
          empty
            ? html`<div part="empty" class="px-2.5 py-1.5 text-sm text-fg-muted">
                ${this.t('combobox.noResults')}
              </div>`
            : nothing
        }
      </div>
      <div role="status" class="sr-only">
        ${
          this.open && this.#typing
            ? empty
              ? this.t('combobox.noResults')
              : this.t('combobox.results', { count: visible.length })
            : ''
        }
      </div>
      ${this.renderDescriptions()}
      <slot hidden @slotchange=${() => this.requestUpdate()}></slot>`
  }
}

JimbleCombobox.define('jimble-combobox')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-combobox': JimbleCombobox
  }
}
