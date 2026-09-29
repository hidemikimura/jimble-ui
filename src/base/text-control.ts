import type { PropertyDeclarations, PropertyValues } from 'lit'
import { JimbleFormElement, type ControlSize } from './form-element.js'
import type { ValidationContext } from './validation.js'

// クラス名は完全な文字列リテラルで書く（Tailwind のスキャナが検出できるように）。公開 API ではない。
const VARS =
  '[--_bg:var(--jimble-input-bg,var(--color-surface))] ' +
  '[--_fg:var(--jimble-input-fg,var(--color-fg))] ' +
  '[--_ph:var(--jimble-input-placeholder,var(--color-fg-placeholder))] ' +
  '[--_ring:var(--jimble-input-ring,var(--color-line-control))] ' +
  '[--_ring-focus:var(--jimble-input-ring-focus,var(--color-focus))]'
const INVALID_VARS =
  '[--_ring:var(--jimble-input-ring-invalid,var(--color-invalid))] ' +
  '[--_ring-focus:var(--jimble-input-ring-invalid,var(--color-invalid))]'
export const TEXT_SIZE: Record<ControlSize, string> = {
  sm:
    '[--_h:var(--jimble-input-height,var(--jimble-control-height-sm,2rem))] ' +
    '[--_px:var(--jimble-input-padding-x,calc(var(--spacing)*2.5))] text-sm',
  md:
    '[--_h:var(--jimble-input-height,var(--jimble-control-height-md,2.25rem))] ' +
    '[--_px:var(--jimble-input-padding-x,calc(var(--spacing)*3))] text-sm',
  lg:
    '[--_h:var(--jimble-input-height,var(--jimble-control-height-lg,2.5rem))] ' +
    '[--_px:var(--jimble-input-padding-x,calc(var(--spacing)*3.5))] text-base',
}
const WRAP =
  'flex w-full min-h-(--_h) gap-2 bg-(--_bg) text-(--_fg) px-(--_px) shadow-sm ' +
  'ring-1 ring-inset ring-(--_ring) focus-within:ring-2 focus-within:ring-(--_ring-focus) ' +
  '[border-radius:var(--jimble-input-radius,var(--radius-control))] ' +
  'outline outline-1 outline-transparent focus-within:outline-2'
const DISABLED = 'cursor-not-allowed opacity-50 bg-surface-sunken'

export function textWrapClasses(
  size: ControlSize,
  invalid: boolean,
  disabled: boolean,
  extra = '',
): string {
  return [
    WRAP,
    VARS,
    TEXT_SIZE[size] ?? TEXT_SIZE.md,
    invalid ? INVALID_VARS : '',
    disabled ? DISABLED : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
export const TEXT_INNER =
  'min-w-0 flex-1 bg-transparent p-0 outline-none placeholder:text-(--_ph) disabled:cursor-not-allowed'
export const AFFIX = 'inline-flex shrink-0 items-center text-fg-muted'

/**
 * input / textarea 共通の基底。値（属性=デフォルト値、プロパティ=現在値）、イベント、
 * ネイティブの制約検証、IME 対応の共通部分を持つ。
 */
export abstract class JimbleTextControl extends JimbleFormElement {
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    minlength: { type: Number },
    maxlength: { type: Number },
    autocomplete: {},
    inputmode: {},
    enterkeyhint: {},
  }

  declare placeholder: string | undefined
  /** 読み取り専用。送信対象・フォーカス可・変更不可 */
  declare readonly: boolean
  declare minlength: number | undefined
  declare maxlength: number | undefined
  declare autocomplete: string | undefined
  declare inputmode: string | undefined
  declare enterkeyhint: string | undefined

  // value: 属性はデフォルト値（リセット先）、プロパティは現在値。ネイティブの <input> と同じ（設計書 §5.1）
  #value = ''
  #dirty = false
  #fromAttribute = false

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
      if (this.#dirty) return // 利用者が触った後は、属性の変更で上書きしない（ネイティブ準拠）
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
    this.minlength = undefined
    this.maxlength = undefined
    this.autocomplete = undefined
    this.inputmode = undefined
    this.enterkeyhint = undefined
  }

  protected get formValue(): string {
    return this.#value
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#value = this.getAttribute('value') ?? ''
  }
  protected override restoreValue(state: string): void {
    this.#value = state
    this.#dirty = true
  }
  protected override get validationContext(): ValidationContext {
    const c = this.nativeControl
    return {
      minLength: this.minlength,
      maxLength: this.maxlength,
      min: c && 'min' in c ? (c as HTMLInputElement).min : undefined,
      max: c && 'max' in c ? (c as HTMLInputElement).max : undefined,
    }
  }

  // ---- ネイティブの入力イベントを受ける -----------------------------------------------------
  /** input イベントはネイティブのものが host まで届く（composed）。値だけ取り込む */
  protected onInput = (event: Event) => {
    this.value = (event.target as HTMLInputElement).value
    this.commit()
  }
  /** change は composed ではないので、host から再発火する */
  protected onChange = (event: Event) => {
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  // ---- 公開メソッド（ネイティブに委譲） ----------------------------------------------------
  override focus(options?: FocusOptions): void {
    this.nativeControl?.focus(options)
  }
  select(): void {
    this.nativeControl?.select()
  }
  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void {
    this.nativeControl?.setSelectionRange(start, end, direction)
  }
  get selectionStart(): number | null {
    return this.nativeControl?.selectionStart ?? null
  }
  get selectionEnd(): number | null {
    return this.nativeControl?.selectionEnd ?? null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.setState('readonly', this.readonly)
  }
}
