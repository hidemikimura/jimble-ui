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
// 区切った見た目（appearance="segmented"）の 1 つ分。選ばれたものは、面・枠・影・太字で示す（色だけに頼らない）
const SEGMENT: Record<ControlSize, string> = {
  sm: 'px-2.5 py-0.5 text-sm',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}
const SEGMENT_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md select-none ' +
  'outline outline-1 outline-transparent [:host(:focus-visible)_&]:outline-2 ' +
  '[:host(:focus-visible)_&]:outline-offset-1 [:host(:focus-visible)_&]:outline-focus'
const SEGMENT_ON =
  'bg-surface text-fg shadow-sm ring-1 ring-inset ring-line-control [font-weight:var(--font-weight-medium)]'
const SEGMENT_OFF = 'text-fg-secondary hover:text-fg'

/**
 * ラジオ。`jimble-radio-group` の直接の子として使う。フォームへの参加・キーボード操作・
 * ロービングフォーカスは親のグループが管理する。ラベルは既定スロット。
 *
 * @tag jimble-radio
 *
 * @slot - ラベル
 *
 * @csspart base - ルート要素
 * @csspart indicator - 丸い表示部（区切った見た目では、ない）
 * @csspart label - ラベルを包む要素
 *
 * @cssstate checked - 選ばれている
 * @cssstate disabled - 操作できない（自身かグループが `disabled`）
 * @cssstate segmented - 区切った見た目（グループの `appearance="segmented"`）
 */
export class JimbleRadio extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    size: { reflect: true },
    checked: { type: Boolean, attribute: false },
    groupDisabled: { type: Boolean, attribute: false },
    segmented: { type: Boolean, attribute: false },
  }

  /** このラジオが選ばれたときにグループが持つ値 */
  declare value: string
  declare disabled: boolean
  declare size: ControlSize
  /** 選択状態（グループが設定する。直接は変更しない） */
  declare checked: boolean
  /** グループ全体が無効（グループが設定する） */
  declare groupDisabled: boolean
  /** 区切った見た目で描く（グループの appearance="segmented"。グループが設定する） */
  declare segmented: boolean

  constructor() {
    super()
    this.value = ''
    this.disabled = false
    this.size = 'md'
    this.checked = false
    this.groupDisabled = false
    this.segmented = false
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
    // 試験の道具(Playwright の getByRole)からも見えるよう、属性にも書く
    this.reflectAria('role', 'radio')
    this.reflectAria('aria-checked', String(this.checked))
    this.reflectAria('aria-disabled', this.isDisabled ? 'true' : 'false')
    this.setState('checked', this.checked)
    this.setState('disabled', this.isDisabled)
    this.setState('segmented', this.segmented)
  }

  #renderSegment(size: ControlSize, disabled: boolean) {
    return html`<span
      part="base"
      class="${SEGMENT_BASE} ${SEGMENT[size]} ${this.checked ? SEGMENT_ON : SEGMENT_OFF} ${
        disabled ? 'cursor-not-allowed opacity-(--jimble-opacity-disabled,0.5)' : 'cursor-pointer'
      }"
      ><span part="label"><slot></slot></span
    ></span>`
  }

  protected override render() {
    const size = this.size in BOX ? this.size : 'md'
    const disabled = this.isDisabled
    if (this.segmented) return this.#renderSegment(size, disabled)
    return html`<span
      part="base"
      class="flex min-h-6 items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-(--jimble-opacity-disabled,0.5)' : 'cursor-pointer'}"
    >
      <span
        part="indicator"
        class="${INDICATOR} ${BOX[size]} ${this.checked ? 'bg-primary-600 ring-primary-600' : 'bg-surface ring-line-control'}"
        ><span
          class="rounded-full bg-fg-on-primary ${DOT[size]} ${this.checked ? '' : 'hidden'}"
        ></span
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
