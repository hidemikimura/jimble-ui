import { html, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { nothing } from 'lit'
import { AFFIX, JimbleTextControl, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import { SlotController } from '../../base/slot-controller.js'

export type InputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'

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

  /** Enter による暗黙の送信の対象になる部品(base/implicit-submit.ts) */
  static implicitSubmitBlocker = true

  #onKeydown = (event: KeyboardEvent) =>
    handleImplicitSubmit(event, this.form, this.isDisabled, this.ime)

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
