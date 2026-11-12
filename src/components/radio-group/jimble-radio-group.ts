import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import type { ValidationContext } from '../../base/validation.js'
import type { JimbleRadio } from './jimble-radio.js'
import './jimble-radio.js'

export type RadioGroupAppearance = 'default' | 'segmented'

/**
 * ラジオのグループ。フォーム関連カスタム要素で、選ばれた `jimble-radio` の `value` を送信する。
 * キーボード操作は WAI-ARIA の radio group パターンに従う（Tab でグループに入り、矢印キーで
 * 移動と同時に選択、Space で選択）。
 *
 * `appearance="segmented"` で、ボタンを横につなげた見た目（セグメンテッドコントロール）になる。
 * 表示の切り替え（一覧・カード、日・週・月）など、少ない選択肢を 1 つ選ぶときに使う。
 * 操作・値・フォームへの参加は、ふつうのラジオと同じ（`orientation` は効かず、常に横）。
 *
 * @tag jimble-radio-group
 *
 * @slot - jimble-radio（直接の子）
 *
 * @csspart base - role="radiogroup" を持つ要素
 *
 * @fires change - 選択が変わった（ネイティブと同じ。bubbles + composed）
 * @fires input - 選択が変わった（同上）
 */
export class JimbleRadioGroup extends JimbleFormElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open' }
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    orientation: { reflect: true },
    appearance: { reflect: true },
  }

  /** 並べる向き */
  declare orientation: 'vertical' | 'horizontal'
  /** 見た目。`segmented` は、ボタンを横につなげた見た目 */
  declare appearance: RadioGroupAppearance

  #value = ''
  #dirty = false
  #fromAttribute = false

  /** 選ばれているラジオの value。`value` 属性はデフォルト（リセット先）で、現在値はプロパティ */
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
    this.orientation = 'vertical'
    this.appearance = 'default'
  }

  get #segmented(): boolean {
    return this.appearance === 'segmented'
  }

  get radios(): JimbleRadio[] {
    return [...this.children].filter((c): c is JimbleRadio => c.localName === 'jimble-radio')
  }
  #enabled = () => this.radios.filter((r) => !r.isDisabled && !this.isDisabled)

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
  protected override get validationContext(): ValidationContext {
    return { missing: 'choice' }
  }

  protected override computeValidity(): ValidityResult {
    if (this.required && !this.#value) {
      return {
        flags: { valueMissing: true },
        message: this.t('validation.valueMissing.choice'),
        anchor: this.#enabled()[0] ?? this.radios[0],
      }
    }
    return { flags: {}, message: '' }
  }

  /** 選択・tabindex・サイズ・無効状態を、子のラジオに反映する */
  #sync() {
    const enabled = this.#enabled()
    const current = this.radios.find((r) => r.value === this.#value && !r.isDisabled)
    const stop = current ?? enabled[0]
    for (const r of this.radios) {
      r.checked = r.value === this.#value
      r.size = this.size
      r.groupDisabled = this.isDisabled
      r.segmented = this.#segmented
      r.tabIndex = r === stop && !this.isDisabled ? 0 : -1
    }
  }

  #select(radio: JimbleRadio) {
    if (radio.isDisabled || this.isDisabled) return
    if (radio.value === this.#value) return
    this.value = radio.value
    this.#sync()
    this.commit()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  #onClick = (event: Event) => {
    const radio = (event.target as Element).closest?.('jimble-radio') as JimbleRadio | null
    if (radio && radio.parentElement === this) {
      this.#select(radio)
      radio.focus()
    }
  }

  #onKeydown = (event: KeyboardEvent) => {
    const radio = (event.target as Element).closest?.('jimble-radio') as JimbleRadio | null
    if (!radio || radio.parentElement !== this || event.altKey || event.ctrlKey || event.metaKey)
      return
    if (event.key === ' ') {
      event.preventDefault()
      this.#select(radio)
      return
    }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    if (!step) return
    const enabled = this.#enabled()
    if (enabled.length === 0) return
    event.preventDefault()
    const i = enabled.indexOf(radio)
    const next = enabled[(i + step + enabled.length) % enabled.length]!
    next.focus()
    this.#select(next)
  }

  override focus(options?: FocusOptions): void {
    this.radios.find((r) => r.tabIndex === 0)?.focus(options)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.#sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.#sync()
  }

  protected override render() {
    const invalid = this.showInvalid
    const layout = this.#segmented
      ? 'inline-flex flex-row gap-1 rounded-control bg-surface-sunken p-1 outline outline-1 outline-transparent'
      : this.orientation === 'horizontal'
        ? 'flex flex-row flex-wrap gap-x-6 gap-y-2'
        : 'flex flex-col gap-2'
    return html`<div
        part="base"
        role="radiogroup"
        class=${layout}
        aria-label=${ifDefined(this.accessibleName())}
        aria-required=${this.required || this.field.required ? 'true' : nothing}
        aria-invalid=${invalid ? 'true' : nothing}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        aria-describedby=${ifDefined(this.describedBy)}
        @click=${this.#onClick}
        @keydown=${this.#onKeydown}
      >
        <slot @slotchange=${() => this.#sync()}></slot>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleRadioGroup.define('jimble-radio-group')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-radio-group': JimbleRadioGroup
  }
}
