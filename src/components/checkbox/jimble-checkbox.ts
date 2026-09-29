import { html, nothing, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SlotController } from '../../base/slot-controller.js'
import { JimbleToggleControl } from '../../base/toggle-control.js'
import type { ControlSize } from '../../base/form-element.js'
import { check } from '../../icons/check.js'
import { minus } from '../../icons/minus.js'
import { renderIcon } from '../../icons/render.js'

const BOX: Record<ControlSize, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' }
const ICON: Record<ControlSize, string> = { sm: 'size-2.5', md: 'size-3', lg: 'size-3.5' }
const TEXT: Record<ControlSize, string> = { sm: 'text-sm', md: 'text-sm', lg: 'text-base' }
const INPUT =
  'peer appearance-none rounded-sm bg-surface shadow-sm ring-1 ring-inset ring-line-control ' +
  'checked:bg-primary-600 checked:ring-primary-600 indeterminate:bg-primary-600 indeterminate:ring-primary-600 ' +
  'outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-focus disabled:cursor-not-allowed'
const INVALID = 'ring-invalid'

/**
 * チェックボックス。ラベルは既定スロット。フォーム関連カスタム要素で、チェック時のみ `value`
 * （既定 "on"）を送信する。
 *
 * @tag jimble-checkbox
 *
 * @slot - ラベル
 *
 * @csspart base - ルートの label 要素
 * @csspart control - 内部の input 要素（チェックボックス本体）
 * @csspart label - ラベルを包む要素
 *
 * @fires change - チェック状態が変わった（ネイティブと同じ。bubbles + composed）
 */
export class JimbleCheckbox extends JimbleToggleControl {
  static override properties: PropertyDeclarations = {
    indeterminate: { type: Boolean, reflect: true },
  }

  /** 部分選択の表示。ユーザーが操作するとネイティブと同様に解除される */
  declare indeterminate: boolean

  #slots = new SlotController(this)

  constructor() {
    super()
    this.indeterminate = false
  }

  protected override afterToggle(): void {
    this.indeterminate = false
  }

  protected override render() {
    const size = this.size in BOX ? this.size : 'md'
    const invalid = this.showInvalid
    const hasLabel = this.#slots.hasSlot()
    const disabled = this.isDisabled
    // ラベルがあれば <label> で名前が付く。無いときだけ aria-label を使う
    const name = hasLabel ? undefined : this.accessibleName()
    return html`<label
        part="base"
        class="flex min-h-6 items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
      >
        <span class="relative mt-[0.1875rem] inline-flex shrink-0 ${BOX[size]}">
          <input
            part="control"
            type="checkbox"
            class="${INPUT} ${BOX[size]} ${invalid ? INVALID : ''}"
            .checked=${this.checked}
            .indeterminate=${this.indeterminate}
            value=${this.value}
            ?disabled=${disabled}
            ?required=${this.required || this.field.required}
            aria-label=${ifDefined(name)}
            aria-invalid=${invalid ? 'true' : nothing}
            aria-describedby=${ifDefined(this.describedBy)}
            @change=${this.onToggle}
          />
          ${renderIcon(
            check,
            `pointer-events-none absolute inset-0 m-auto hidden text-fg-on-primary peer-[:checked:not(:indeterminate)]:block ${ICON[size]}`,
          )}
          ${renderIcon(
            minus,
            `pointer-events-none absolute inset-0 m-auto hidden text-fg-on-primary peer-indeterminate:block ${ICON[size]}`,
          )}
        </span>
        <span part="label" class="select-none text-fg ${TEXT[size]} ${hasLabel ? '' : 'hidden'}"
          ><slot></slot
        ></span>
      </label>
      ${this.renderDescriptions()}`
  }
}

JimbleCheckbox.define('jimble-checkbox')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-checkbox': JimbleCheckbox
  }
}
