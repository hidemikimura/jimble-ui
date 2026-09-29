import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { check } from '../../icons/check.js'
import { renderIcon } from '../../icons/render.js'

const BASE =
  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg select-none ' +
  'cursor-default outline outline-1 outline-transparent hover:bg-surface-sunken ' +
  '[:host(:focus)_&]:bg-surface-sunken'

/**
 * セレクトの選択肢。`jimble-select` の直接の子として使う。ロール(option)と選択状態は host が持つ。
 *
 * @tag jimble-option
 *
 * @slot - 表示する文字
 *
 * @csspart base - ルート要素
 */
export class JimbleOption extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    keywords: {},
    selected: { type: Boolean, attribute: false },
  }

  /** 送信される値。省略すると表示している文字が値になる */
  declare value: string | undefined
  declare disabled: boolean
  /** 絞り込み(jimble-combobox)で一致させる、読みなどの追加の語。空白・カンマ区切り(例: `とうきょう tokyo`) */
  declare keywords: string
  /** 選ばれているか（親のセレクトが設定する） */
  declare selected: boolean

  constructor() {
    super()
    this.value = undefined
    this.disabled = false
    this.keywords = ''
    this.selected = false
  }

  /** 実際の値（value 属性、なければ表示している文字） */
  get optionValue(): string {
    return this.value ?? this.label
  }
  /** 表示している文字 */
  get label(): string {
    return (this.textContent ?? '').trim()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'option'
    this.internals.ariaSelected = String(this.selected)
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.setState('selected', this.selected)
  }

  protected override render() {
    return html`<span
      part="base"
      class="${BASE} ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
      ><span class="min-w-0 flex-1"><slot></slot></span
      >${this.selected ? renderIcon(check, 'size-4 shrink-0 text-primary-600') : nothing}</span
    >`
  }
}

JimbleOption.define('jimble-option')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-option': JimbleOption
  }
}
