import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import type { ControlSize } from '../../base/form-element.js'

const BOX: Record<ControlSize, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' }
const DOT: Record<ControlSize, string> = { sm: 'size-1.5', md: 'size-1.5', lg: 'size-2' }
// host のフォーカス(:host(:focus-visible))に連動してリングを出す。クラス名は文字列リテラルで書く
const INDICATOR =
  'mt-[0.1875rem] inline-flex shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-inset ' +
  'outline outline-1 outline-transparent [:host(:focus-visible)_&]:outline-2 ' +
  '[:host(:focus-visible)_&]:outline-offset-2 [:host(:focus-visible)_&]:outline-focus'
const TEXT: Record<ControlSize, string> = { sm: 'text-sm', md: 'text-sm', lg: 'text-base' }

/**
 * ラジオ。`jimble-radio-group` の直接の子として使う。フォームへの参加・キーボード操作・
 * ロービングフォーカスは親のグループが管理する。ラベルは既定スロット。
 *
 * @tag jimble-radio
 *
 * @slot - ラベル
 *
 * @csspart base - ルート要素
 * @csspart indicator - 丸い表示部
 * @csspart label - ラベルを包む要素
 */
export class JimbleRadio extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    size: { reflect: true },
    checked: { type: Boolean, attribute: false },
    groupDisabled: { type: Boolean, attribute: false },
  }

  /** このラジオが選ばれたときにグループが持つ値 */
  declare value: string
  declare disabled: boolean
  declare size: ControlSize
  /** 選択状態（グループが設定する。直接は変更しない） */
  declare checked: boolean
  /** グループ全体が無効（グループが設定する） */
  declare groupDisabled: boolean

  constructor() {
    super()
    this.value = ''
    this.disabled = false
    this.size = 'md'
    this.checked = false
    this.groupDisabled = false
  }

  get isDisabled(): boolean {
    return this.disabled || this.groupDisabled
  }

  // 意味（ロール）は host が持つ。利用者が host に書いた role / aria-* は internals より優先される
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'radio'
    this.internals.ariaChecked = String(this.checked)
    this.internals.ariaDisabled = this.isDisabled ? 'true' : 'false'
    this.setState('checked', this.checked)
    this.setState('disabled', this.isDisabled)
  }

  protected override render() {
    const size = this.size in BOX ? this.size : 'md'
    const disabled = this.isDisabled
    return html`<span
      part="base"
      class="flex min-h-6 items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
    >
      <span
        part="indicator"
        class="${INDICATOR} ${BOX[size]} ${this.checked ? 'bg-primary-600 ring-primary-600' : 'bg-surface ring-line-control'}"
        ><span class="rounded-full bg-white ${DOT[size]} ${this.checked ? '' : 'hidden'}"></span
      ></span>
      <span part="label" class="select-none text-fg ${TEXT[size]}"><slot></slot></span>
    </span>`
  }
}

JimbleRadio.define('jimble-radio')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-radio': JimbleRadio
  }
}
