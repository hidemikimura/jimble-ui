import { html, nothing, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { JimbleTextControl, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'

// field-sizing: content に未対応のブラウザ向けに、高さを内容に合わせる JS のフォールバックを使う
const NATIVE_AUTOSIZE = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

/**
 * 複数行のテキスト入力。Enter は改行（フォームは送信しない）。フォーム関連カスタム要素。
 *
 * @tag jimble-textarea
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - 内部の textarea 要素
 *
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-padding-x=サイズに応じる] - 左右の余白
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-bg=var(--jimble-color-surface)] - 背景色
 * @cssprop [--jimble-input-fg=var(--jimble-color-text)] - 文字色
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-input-ring-focus=var(--jimble-color-ring-focus)] - フォーカス時の枠の色
 * @cssprop [--jimble-input-ring-invalid=var(--jimble-color-ring-invalid)] - エラー時の枠の色
 * @cssprop [--jimble-input-placeholder=var(--jimble-color-text-placeholder)] - プレースホルダーの色
 */
export class JimbleTextarea extends JimbleTextControl {
  static override properties: PropertyDeclarations = {
    rows: { type: Number },
    autosize: { type: Boolean, reflect: true },
  }

  /** 表示する行数（autosize のときは最小の行数） */
  declare rows: number
  /** 入力に合わせて高さを自動で伸ばす */
  declare autosize: boolean

  constructor() {
    super()
    this.rows = 3
    this.autosize = false
  }

  protected override get nativeControl(): HTMLTextAreaElement | null {
    return this.renderRoot?.querySelector<HTMLTextAreaElement>('textarea') ?? null
  }

  #fit() {
    const t = this.nativeControl
    if (!t || !this.autosize || NATIVE_AUTOSIZE) return
    t.style.height = 'auto'
    t.style.height = `${t.scrollHeight}px`
  }

  protected override onInput = (event: Event) => {
    this.value = (event.target as HTMLTextAreaElement).value
    this.#fit()
    this.commit()
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed)
    this.#fit()
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    return html`<div part="base" class=${textWrapClasses(this.size, invalid, disabled, 'py-1.5')}>
        <textarea
          part="input"
          class="${TEXT_INNER} ${this.autosize ? 'resize-none [field-sizing:content]' : 'resize-y'}"
          .value=${live(this.value)}
          rows=${this.rows}
          name=${ifDefined(this.name || undefined)}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          ?required=${this.required || this.field.required}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          autocomplete=${ifDefined(this.autocomplete)}
          inputmode=${ifDefined(this.inputmode)}
          enterkeyhint=${ifDefined(this.enterkeyhint)}
          aria-label=${ifDefined(this.accessibleName())}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.onInput}
          @change=${this.onChange}
        ></textarea>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleTextarea.define('jimble-textarea')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-textarea': JimbleTextarea
  }
}
