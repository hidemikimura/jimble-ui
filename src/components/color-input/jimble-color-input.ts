import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { hexToHsl, hslToHex, normalizeHex, type HSL } from '../../base/color.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import { renderIcon } from '../../icons/render.js'
import { swatch } from '../../icons/swatch.js'
import { AFFIX, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'

const DEFAULT_PRESETS = [
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0d9488',
  '#0284c7',
  '#4f46e5',
  '#9333ea',
  '#db2777',
  '#374151',
  '#9ca3af',
  '#ffffff',
]

const POPUP =
  'border-0 bg-surface-overlay p-3 text-fg shadow-lg ring-1 ring-inset ring-line ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-color-input-popup-radius,var(--radius-overlay))]'
const PRESET =
  'size-7 rounded-md cursor-pointer ring-1 ring-inset ring-line-control aria-pressed:ring-2 aria-pressed:ring-focus outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const TEXT_BTN =
  'inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-primary-700 cursor-pointer ' +
  'hover:bg-primary-50 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * 色の入力。`#rrggbb` を入力するか、ポップアップで色相・彩度・明度のスライダー、または候補の色から選ぶ。
 * 値は小文字の `#rrggbb`（例: `#4f46e5`）。フォーム関連カスタム要素。
 *
 * - 入力は `#4F46E5`・`4f46e5`・`#46e`（3 桁）・全角でも受け付ける。
 * - 透明度（アルファ）・他の色空間（oklch など）は未対応。
 * - `presets` に空白またはカンマ区切りの色を渡すと、候補の色を差し替えられる。
 *
 * @tag jimble-color-input
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - テキスト欄
 * @csspart swatch - 色見本（ポップアップを開くボタン）
 * @csspart popup - ポップアップの面（role="dialog"）
 * @csspart slider - 色相・彩度・明度のスライダー
 * @csspart presets - 候補の色の並び
 * @csspart preset - 候補の色のボタン
 *
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - 高さ
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-color-input-popup-radius=var(--jimble-radius-overlay)] - ポップアップの角丸
 *
 * @fires input - 値が変わった（入力・スライダーの操作ごと）
 * @fires change - 入力が確定した（blur・Enter・スライダーを離す・候補の選択・クリア）
 */
export class JimbleColorInput extends JimbleFormElement {
  static implicitSubmitBlocker = true
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    presets: {},
    open: { type: Boolean, reflect: true },
  }

  declare placeholder: string | undefined
  declare readonly: boolean
  /** 候補の色（空白またはカンマ区切りの `#rrggbb`）。未指定なら既定の 12 色 */
  declare presets: string | undefined
  declare open: boolean

  #value = ''
  #text = ''
  #dirty = false
  #fromAttribute = false
  #committed = ''
  #hsl: HSL = { h: 240, s: 60, l: 50 }
  #wasOpenOnPointerDown = false

  /** 現在の色（小文字の `#rrggbb`。未選択は空）。`value` 属性は初期値、プロパティは現在値 */
  get value(): string {
    return this.#value
  }
  set value(next: string) {
    const old = this.#value
    const hex = normalizeHex(String(next ?? ''))
    this.#applyValue(hex ?? '')
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      super.attributeChangedCallback(name, old, value)
      this.#fromAttribute = false
      this.#committed = this.#value
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  constructor() {
    super()
    this.placeholder = undefined
    this.readonly = false
    this.presets = undefined
    this.open = false
  }

  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input[type="text"]') ?? null
  }
  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }
  get #swatchButton(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('[part="swatch"]') ?? null
  }

  #applyValue(hex: string) {
    this.#value = hex
    this.#text = hex
    if (hex) this.#hsl = hexToHsl(hex)
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string | null {
    return this.#value || null
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#applyValue(normalizeHex(this.getAttribute('value') ?? '') ?? '')
    this.#committed = this.#value
  }
  protected override restoreValue(state: string): void {
    this.value = state
    this.#committed = this.#value
  }
  protected override computeValidity(): ValidityResult {
    const anchor = this.nativeControl ?? undefined
    const text = this.#text.trim()
    const required = this.required || this.field.required
    if (!text) {
      return required
        ? { flags: { valueMissing: true }, message: this.t('validation.valueMissing'), anchor }
        : { flags: {}, message: '' }
    }
    if (!normalizeHex(text)) {
      return { flags: { badInput: true }, message: this.t('validation.colorFormat'), anchor }
    }
    return { flags: {}, message: '' }
  }

  // ---- 値の更新 ------------------------------------------------------------------------
  #emit(type: 'input' | 'change') {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
  }
  #commitChange() {
    if (this.#value === this.#committed) return
    this.#committed = this.#value
    this.#emit('change')
  }

  #onInput = (event: Event) => {
    this.#text = (event.target as HTMLInputElement).value
    const hex = normalizeHex(this.#text)
    this.#value = hex ?? ''
    if (hex) this.#hsl = hexToHsl(hex)
    this.#dirty = true
    this.requestUpdate('value')
    this.commit()
  }

  #settle() {
    if (this.#value) this.#text = this.#value
    this.requestUpdate()
    this.#commitChange()
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (this.ime.isComposing(event)) return
    if (
      event.key === 'ArrowDown' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !this.readonly &&
      !this.isDisabled
    ) {
      event.preventDefault()
      this.#settle()
      this.open = true
      return
    }
    if (event.key === 'Enter') this.#settle()
    handleImplicitSubmit(event, this.form, this.isDisabled, this.ime)
  }

  // ---- ポップアップ --------------------------------------------------------------------
  /** スライダーの操作。値を更新して input を出す(ネイティブの input も host まで届くので、ここでは出さない) */
  #onSlider = (key: keyof HSL) => (event: Event) => {
    const n = Number((event.target as HTMLInputElement).value)
    this.#hsl = { ...this.#hsl, [key]: n }
    this.#value = hslToHex(this.#hsl)
    this.#text = this.#value
    this.#dirty = true
    this.requestUpdate('value')
    this.commit()
  }
  #onSliderChange = (event: Event) => {
    event.stopPropagation()
    this.#commitChange()
  }

  #pick(hex: string) {
    const changed = hex !== this.#value
    this.value = hex
    this.commit()
    if (changed) this.#emit('input')
    this.#commitChange()
  }
  #clear() {
    this.#pick('')
    this.#closeToInput()
  }
  #closeToInput() {
    this.nativeControl?.focus()
    const popup = this.#popup
    if (popup?.matches(':popover-open')) popup.hidePopover()
    this.open = false
  }

  #onSwatchPointerDown = () => {
    this.#wasOpenOnPointerDown = this.open
  }
  #onSwatchClick = () => {
    const wasOpen = this.#wasOpenOnPointerDown
    this.#wasOpenOnPointerDown = false
    if (wasOpen || this.isDisabled || this.readonly) return
    this.#settle()
    this.open = true
  }

  #onPopupKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault()
      this.#closeToInput()
    }
  }
  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen) this.open = isOpen
    else if (isOpen) {
      this.renderRoot.querySelector<HTMLElement>('[part="slider"]')?.focus()
    }
  }

  get #presetList(): string[] {
    if (this.presets === undefined) return DEFAULT_PRESETS
    return this.presets
      .split(/[\s,]+/)
      .map((c) => normalizeHex(c))
      .filter((c): c is string => !!c)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const popup = this.#popup
    if (popup && changed.has('open')) {
      const shown = popup.matches(':popover-open')
      if (this.open && !shown) popup.showPopover()
      else if (!this.open && shown) popup.hidePopover()
    }
    this.#swatchButton?.setAttribute('aria-expanded', String(this.open))
    // 色は CSSOM で渡す(style 属性は CSP で止められることがあるため)
    const root = this.renderRoot
    const shown = this.#value || 'transparent'
    root.querySelectorAll<HTMLElement>('[data-swatch]').forEach((el) => {
      el.style.setProperty('--_swatch', shown)
    })
    root.querySelectorAll<HTMLElement>('[data-color]').forEach((el) => {
      el.style.setProperty('--_swatch', el.dataset.color!)
    })
    const p = this.#popup
    if (p) {
      p.style.setProperty('--_h', String(this.#hsl.h))
      p.style.setProperty('--_s', `${this.#hsl.s}%`)
      p.style.setProperty('--_l', `${this.#hsl.l}%`)
    }
  }

  // ---- 描画 ----------------------------------------------------------------------------
  #slider(key: keyof HSL, label: string, max: number) {
    return html`<label class="flex items-center gap-3 text-sm">
      <span class="w-10 shrink-0 text-fg-muted">${label}</span>
      <input
        part="slider"
        type="range"
        class="jimble-slider min-w-0 flex-1"
        data-slider=${key}
        min="0"
        max=${max}
        step="1"
        aria-label=${label}
        .value=${String(Math.round(this.#hsl[key]))}
        @input=${this.#onSlider(key)}
        @change=${this.#onSliderChange}
      />
    </label>`
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const label = this.accessibleName()
    return html`<div
        part="base"
        class=${textWrapClasses(this.size, invalid, disabled, 'items-center')}
      >
        <span class=${AFFIX}>
          <button
            part="swatch"
            type="button"
            class="jimble-swatch inline-flex size-6 shrink-0 cursor-pointer rounded-md ring-1 ring-inset ring-line-control outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed"
            data-swatch
            data-empty=${this.#value ? nothing : ''}
            aria-label=${this.t('color.open')}
            aria-haspopup="dialog"
            aria-expanded="false"
            ?disabled=${disabled || this.readonly}
            @pointerdown=${this.#onSwatchPointerDown}
            @click=${this.#onSwatchClick}
          >
            ${this.#value ? nothing : renderIcon(swatch, 'size-4 m-auto text-fg-muted')}
          </button>
        </span>
        <input
          part="input"
          class=${TEXT_INNER}
          type="text"
          autocomplete="off"
          spellcheck="false"
          .value=${this.#text}
          name=${ifDefined(this.name || undefined)}
          placeholder=${this.placeholder ?? '#4f46e5'}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          ?required=${this.required || this.field.required}
          aria-label=${ifDefined(label)}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.#onInput}
          @keydown=${this.#onKeydown}
          @blur=${() => this.#settle()}
          @change=${(e: Event) => e.stopPropagation()}
        />
      </div>
      <div
        part="popup"
        popover="auto"
        role="dialog"
        aria-label=${this.t('color.dialog')}
        class=${POPUP}
        @toggle=${this.#onToggle}
        @keydown=${this.#onPopupKeydown}
      >
        <div class="flex flex-col gap-3">
          <div
            class="jimble-swatch h-10 w-full rounded-md ring-1 ring-inset ring-line-control"
            data-swatch
            aria-hidden="true"
          ></div>
          ${this.#slider('h', this.t('color.hue'), 360)}
          ${this.#slider('s', this.t('color.saturation'), 100)}
          ${this.#slider('l', this.t('color.lightness'), 100)}
          <div
            role="group"
            aria-label=${this.t('color.presets')}
            part="presets"
            class="flex flex-wrap gap-2"
          >
            ${this.#presetList.map(
              (c) =>
                html`<button
                  part="preset"
                  type="button"
                  class=${PRESET + ' jimble-swatch'}
                  data-color=${c}
                  aria-label=${c}
                  aria-pressed=${c === this.#value ? 'true' : 'false'}
                  @click=${() => this.#pick(c)}
                ></button>`,
            )}
          </div>
          <div class="flex justify-end">
            <button type="button" class=${TEXT_BTN} @click=${() => this.#clear()}>
              ${this.t('color.clear')}
            </button>
          </div>
        </div>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleColorInput.define('jimble-color-input')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-color-input': JimbleColorInput
  }
}
