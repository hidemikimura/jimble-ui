import { html, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { nothing } from 'lit'
import { AFFIX, JimbleTextControl, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'
import { SlotController } from '../../base/slot-controller.js'

export type InputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'

// Enter で暗黙の送信を止める入力欄の type（ネイティブの「送信をブロックするフィールド」）
const IMPLICIT_SUBMIT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
  'number',
])

/**
 * 1 行のテキスト入力。フォーム関連カスタム要素で、値の送信・検証・リセット・fieldset の disabled に対応する。
 *
 * `size` はネイティブの `<input size>`（文字数の幅）ではなく、sm / md / lg の大きさ。幅は
 * `--jimble-input-width` で指定する。
 *
 * @tag jimble-input
 *
 * @slot prefix - 入力欄の前のアイコンや単位
 * @slot suffix - 入力欄の後の単位や操作
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - 内部の input 要素
 * @csspart prefix - prefix スロットを包む要素
 * @csspart suffix - suffix スロットを包む要素
 *
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - 高さ（最小）
 * @cssprop [--jimble-input-padding-x=サイズに応じる] - 左右の余白
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-bg=var(--jimble-color-surface)] - 背景色
 * @cssprop [--jimble-input-fg=var(--jimble-color-text)] - 文字色
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-input-ring-focus=var(--jimble-color-ring-focus)] - フォーカス時の枠の色
 * @cssprop [--jimble-input-ring-invalid=var(--jimble-color-ring-invalid)] - エラー時の枠の色
 * @cssprop [--jimble-input-placeholder=var(--jimble-color-text-placeholder)] - プレースホルダーの色
 */
export class JimbleInput extends JimbleTextControl {
  static override properties: PropertyDeclarations = {
    type: { reflect: true },
    min: {},
    max: {},
    step: {},
    pattern: {},
  }

  /** 入力の種類。日付系は対象外 */
  declare type: InputType
  declare min: string | undefined
  declare max: string | undefined
  declare step: string | undefined
  declare pattern: string | undefined

  #slots = new SlotController(this)

  constructor() {
    super()
    this.type = 'text'
    this.min = undefined
    this.max = undefined
    this.step = undefined
    this.pattern = undefined
  }

  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null
  }

  /** type=number のときの数値（それ以外は NaN） */
  get valueAsNumber(): number {
    return this.nativeControl?.valueAsNumber ?? NaN
  }

  // Enter による暗黙の送信。Shadow 内の input は外側の form に属さないので自前で行う（設計書 §5.4）
  #onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.defaultPrevented || this.ime.isComposing(event)) return
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
    if (!this.form || this.isDisabled) return
    // ネイティブでは送信は「既定動作」なので、祖先の keydown リスナーの preventDefault() で止められる。
    // 同じにするため、イベント配信が終わってから defaultPrevented を見て送信する。
    setTimeout(() => {
      if (!event.defaultPrevented) this.#implicitSubmit()
    })
  }

  #implicitSubmit() {
    const form = this.form
    if (!form) return
    const button = form.querySelector<HTMLElement>(
      'button:not([type="button"]):not([type="reset"]), input[type="submit"], input[type="image"], jimble-button[type="submit"]',
    )
    if (button) {
      if (button.localName === 'jimble-button') {
        const b = button as HTMLElement & { disabled: boolean; loading: boolean }
        if (b.disabled || b.loading || button.matches(':state(disabled)')) return
        form.requestSubmit()
      } else if (!(button as HTMLButtonElement).disabled) {
        form.requestSubmit(button as HTMLButtonElement)
      }
      return
    }
    // 送信ボタンが無いときは、送信をブロックするフィールドが 1 つだけの場合に限って送信する
    const blockers = [...form.elements].filter(
      (e) =>
        (e instanceof HTMLInputElement && IMPLICIT_SUBMIT_TYPES.has(e.type)) ||
        e instanceof JimbleInput,
    )
    if (blockers.length <= 1) form.requestSubmit()
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const hasPrefix = this.#slots.hasSlot('prefix')
    const hasSuffix = this.#slots.hasSlot('suffix')
    return html`<div
        part="base"
        class=${textWrapClasses(this.size, invalid, disabled, 'items-center')}
      >
        <span part="prefix" class=${hasPrefix ? AFFIX : 'hidden'}><slot name="prefix"></slot></span>
        <input
          part="input"
          class=${TEXT_INNER}
          type=${this.type}
          name=${ifDefined(this.name || undefined)}
          .value=${live(this.value)}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          ?required=${this.required || this.field.required}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          min=${ifDefined(this.min)}
          max=${ifDefined(this.max)}
          step=${ifDefined(this.step)}
          pattern=${ifDefined(this.pattern)}
          autocomplete=${ifDefined(this.autocomplete)}
          inputmode=${ifDefined(this.inputmode)}
          enterkeyhint=${ifDefined(this.enterkeyhint)}
          aria-label=${ifDefined(this.accessibleName())}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.onInput}
          @change=${this.onChange}
          @keydown=${this.#onKeydown}
        />
        <span part="suffix" class=${hasSuffix ? AFFIX : 'hidden'}><slot name="suffix"></slot></span>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleInput.define('jimble-input')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-input': JimbleInput
  }
}
