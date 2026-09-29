import { html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SlotController } from '../../base/slot-controller.js'
import { JimbleToggleControl } from '../../base/toggle-control.js'
import type { ControlSize } from '../../base/form-element.js'

const TRACK: Record<ControlSize, string> = { sm: 'h-5 w-9', md: 'h-6 w-11', lg: 'h-7 w-14' }
const THUMB: Record<ControlSize, string> = {
  sm: 'size-4 peer-checked:translate-x-4',
  md: 'size-5 peer-checked:translate-x-5',
  lg: 'size-6 peer-checked:translate-x-7',
}
const TEXT: Record<ControlSize, string> = { sm: 'text-sm', md: 'text-sm', lg: 'text-base' }

/**
 * オン/オフのスイッチ。ラベルは既定スロット。フォーム関連カスタム要素で、オン時のみ `value`
 * （既定 "on"）を送信する。
 *
 * @tag jimble-switch
 *
 * @slot - ラベル
 *
 * @csspart base - ルートの label 要素
 * @csspart control - 内部の input 要素（role="switch"）
 * @csspart track - つまみの背景
 * @csspart thumb - つまみ
 * @csspart label - ラベルを包む要素
 *
 * @fires change - 状態が変わった（ネイティブと同じ。bubbles + composed）
 */
export class JimbleSwitch extends JimbleToggleControl {
  #slots = new SlotController(this)

  protected override render() {
    const size = this.size in TRACK ? this.size : 'md'
    const invalid = this.showInvalid
    const hasLabel = this.#slots.hasSlot()
    const disabled = this.isDisabled
    const name = hasLabel ? undefined : this.accessibleName()
    return html`<label
        part="base"
        class="flex min-h-6 items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
      >
        <span class="relative inline-flex shrink-0 ${TRACK[size]}">
          <input
            part="control"
            type="checkbox"
            role="switch"
            class="peer sr-only"
            .checked=${this.checked}
            value=${this.value}
            ?disabled=${disabled}
            ?required=${this.required || this.field.required}
            aria-label=${ifDefined(name)}
            aria-invalid=${invalid ? 'true' : nothing}
            aria-describedby=${ifDefined(this.describedBy)}
            @change=${this.onToggle}
          />
          <span
            part="track"
            aria-hidden="true"
            class="absolute inset-0 rounded-full bg-neutral-200 ring-1 ring-inset transition-colors
              ${invalid ? 'ring-invalid' : 'ring-line-control'}
              peer-checked:bg-primary-600 peer-checked:ring-primary-600
              outline outline-1 outline-transparent peer-focus-visible:outline-2
              peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
          ></span>
          <span
            part="thumb"
            aria-hidden="true"
            class="pointer-events-none absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform motion-reduce:transition-none ${THUMB[size]}"
          ></span>
        </span>
        <span part="label" class="select-none text-fg ${TEXT[size]} ${hasLabel ? '' : 'hidden'}"
          ><slot></slot
        ></span>
      </label>
      ${this.renderDescriptions()}`
  }
}

JimbleSwitch.define('jimble-switch')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-switch': JimbleSwitch
  }
}
