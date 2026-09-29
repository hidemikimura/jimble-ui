import { ContextProvider } from '@lit/context'
import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { fieldContext, type FieldInfo } from '../../base/field-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'

/**
 * ラベル・ヒント・エラーを付けるための入れ物。中に置いた `jimble-input` などのフォーム部品と連携する。
 *
 * ARIA の IDREF は Shadow 境界をまたげないため、ラベル・ヒント・エラーは文字列として部品へ渡され、
 * 部品側の Shadow 内で `aria-label` / `aria-describedby` になる。画面に見えている文言は、
 * 二重に読み上げられないよう支援技術からは隠している。
 *
 * @tag jimble-field
 *
 * @slot - フォーム部品（jimble-input など）
 * @slot label - ラベル（label 属性の代わりに HTML で書くとき。文字列として部品へ渡る）
 * @slot hint - ヒント（同上）
 * @slot error - エラー（同上）
 *
 * @csspart base - ルート要素
 * @csspart label - ラベル
 * @csspart required - 必須の表示
 * @csspart hint - ヒント
 * @csspart error - エラー
 */
export class JimbleField extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    hint: {},
    error: {},
    required: { type: Boolean, reflect: true },
  }

  declare label: string
  /** 補足説明 */
  declare hint: string
  /** 明示するエラー（サーバー側の検証結果など）。空なら、部品自身の検証メッセージ（触れた後）を表示する */
  declare error: string
  /** 必須の表示を出し、中の部品を必須にする */
  declare required: boolean

  #controls = new Set<HTMLElement>()
  #reported = ''
  #provider = new ContextProvider(this, { context: fieldContext })

  constructor() {
    super()
    this.label = ''
    this.hint = ''
    this.error = ''
    this.required = false
  }

  #slotText(name: string): string {
    return [...this.querySelectorAll(`:scope > [slot="${name}"]`)]
      .map((e) => e.textContent?.trim() ?? '')
      .join(' ')
      .trim()
  }

  get #labelText() {
    return this.label || this.#slotText('label')
  }
  get #hintText() {
    return this.hint || this.#slotText('hint')
  }
  get #errorText() {
    return this.error || this.#slotText('error') || this.#reported
  }

  #info(): FieldInfo {
    return {
      label: this.#labelText,
      hint: this.#hintText,
      error: this.#errorText,
      explicitError: !!(this.error || this.#slotText('error')),
      required: this.required,
      register: (control) => {
        this.#controls.add(control)
        this.requestUpdate()
        return () => {
          this.#controls.delete(control)
          this.requestUpdate()
        }
      },
      report: (message) => {
        if (message === this.#reported) return
        this.#reported = message
        this.requestUpdate()
      },
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.#provider.setValue(this.#info())
  }

  #focusControl = () => {
    ;(this.#controls.values().next().value as HTMLElement | undefined)?.focus()
  }

  protected override render() {
    // 部品が登録されているときだけ、見えている文言を支援技術から隠す（部品側が同じ文言を持つため）
    const hide = this.#controls.size > 0 ? 'true' : undefined
    const label = this.#labelText
    const hint = this.#hintText
    const error = this.#errorText
    const slot = (name: string) =>
      html`<slot name=${name} @slotchange=${() => this.requestUpdate()}></slot>`
    return html`<div part="base" class="flex flex-col gap-1.5">
      <div class=${label ? 'flex items-baseline gap-2' : 'hidden'}>
        <span
          part="label"
          class="text-sm font-medium text-fg"
          aria-hidden=${hide ?? nothing}
          @click=${this.#focusControl}
          >${this.label}${slot('label')}</span
        >
        ${
          this.required
            ? html`<span part="required" class="text-xs text-danger-700" aria-hidden="true"
                >${this.t('field.required')}</span
              >`
            : nothing
        }
      </div>
      <slot></slot>
      <p
        part="hint"
        class=${hint ? 'text-sm text-fg-muted' : 'hidden'}
        aria-hidden=${hide ?? nothing}
      >
        ${this.hint}${slot('hint')}
      </p>
      <p
        part="error"
        class=${error ? 'text-sm text-danger-700' : 'hidden'}
        aria-hidden=${hide ?? nothing}
      >
        ${this.error}${slot('error')}${this.error || this.#slotText('error') ? nothing : this.#reported}
      </p>
    </div>`
  }
}

JimbleField.define('jimble-field')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-field': JimbleField
  }
}
