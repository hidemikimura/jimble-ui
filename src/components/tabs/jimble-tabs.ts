import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'

const TAB =
  'inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium select-none outline outline-1 ' +
  'outline-transparent -outline-offset-2 [:host(:focus-visible)_&]:outline-2 [:host(:focus-visible)_&]:outline-focus'
const TAB_OFF = 'text-fg-muted hover:text-fg cursor-pointer'
const TAB_ON_H = 'text-primary-700 shadow-[inset_0_-2px_0_0_var(--color-primary-600)]'
const TAB_ON_V = 'text-primary-700 shadow-[inset_-2px_0_0_0_var(--color-primary-600)]'

let seq = 0

/**
 * タブ。`jimble-tab` と `jimble-tab-panel` を `value` で対応させる（WAI-ARIA の tabs パターン）。
 * 矢印キーで移動し、既定では移動と同時に切り替わる（`activation="manual"` なら Enter / Space で切り替え）。
 *
 * @tag jimble-tabs
 *
 * @slot - jimble-tab-panel
 * @slot tab - jimble-tab（`slot` 属性は自動で付く）
 *
 * @csspart base - ルート要素
 * @csspart tablist - タブを並べる領域（role="tablist"）
 * @csspart panels - パネルの領域
 *
 * @fires jimble-tab-change - 選択中のタブが変わった(value)
 */
export class JimbleTabs extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    activation: { reflect: true },
    orientation: { reflect: true },
    label: {},
  }

  /** 選択中のタブの value。省略すると最初の有効なタブ */
  declare value: string | undefined
  /** auto: 矢印キーで移動すると切り替わる / manual: Enter・Space で切り替える */
  declare activation: 'auto' | 'manual'
  declare orientation: 'horizontal' | 'vertical'
  /** タブ全体の名前（aria-label） */
  declare label: string | undefined

  constructor() {
    super()
    this.value = undefined
    this.activation = 'auto'
    this.orientation = 'horizontal'
    this.label = undefined
  }

  get tabs(): JimbleTab[] {
    return [...this.children].filter((c): c is JimbleTab => c.localName === 'jimble-tab')
  }
  get panels(): JimbleTabPanel[] {
    return [...this.children].filter((c): c is JimbleTabPanel => c.localName === 'jimble-tab-panel')
  }
  #valueOf = (tab: JimbleTab, i: number) => tab.value ?? String(i)

  /** タブとパネルの対応・選択・tabindex・aria を、子に反映する */
  #sync() {
    const tabs = this.tabs
    const panels = this.panels
    const values = tabs.map(this.#valueOf)
    let current = this.value !== undefined && values.includes(this.value) ? this.value : undefined
    current ??= values[tabs.findIndex((t) => !t.disabled)]
    tabs.forEach((tab, i) => {
      const v = values[i]!
      tab.id ||= `jimble-tab-${++seq}`
      const panel = panels.find((p, pi) => (p.value ?? String(pi)) === v)
      if (panel) {
        panel.id ||= `jimble-tabpanel-${++seq}`
        tab.setAttribute('aria-controls', panel.id)
        panel.setAttribute('aria-labelledby', tab.id)
        panel.tabIndex = 0
        panel.hidden = v !== current
      }
      tab.selected = v === current
      tab.vertical = this.orientation === 'vertical'
      tab.tabIndex = tab.selected ? 0 : -1
    })
    // value が未指定・不正だった場合は、実際に選ばれているものを value に反映する
    if (current !== this.value) this.value = current
  }

  #select(tab: JimbleTab, focus: boolean) {
    if (tab.disabled) return
    const v = this.#valueOf(tab, this.tabs.indexOf(tab))
    const changed = v !== this.value
    this.value = v
    this.#sync()
    if (focus) tab.focus()
    if (changed) this.emit('tab-change', { detail: { value: v } })
  }

  #onClick = (e: Event) => {
    const tab = (e.target as Element).closest?.('jimble-tab') as JimbleTab | null
    if (tab && tab.parentElement === this) this.#select(tab, false)
  }

  #onKeydown = (e: KeyboardEvent) => {
    const tab = (e.target as Element).closest?.('jimble-tab') as JimbleTab | null
    if (!tab || tab.parentElement !== this || e.altKey || e.ctrlKey || e.metaKey) return
    const enabled = this.tabs.filter((t) => !t.disabled)
    const at = enabled.indexOf(tab)
    const vertical = this.orientation === 'vertical'
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : 'ArrowRight'
    let target: JimbleTab | undefined
    if (e.key === next) target = enabled[(at + 1) % enabled.length]
    else if (e.key === prev) target = enabled[(at - 1 + enabled.length) % enabled.length]
    else if (e.key === 'Home') target = enabled[0]
    else if (e.key === 'End') target = enabled[enabled.length - 1]
    else if ((e.key === 'Enter' || e.key === ' ') && this.activation === 'manual') {
      e.preventDefault()
      this.#select(tab, false)
      return
    } else return
    e.preventDefault()
    if (!target) return
    if (this.activation === 'auto') this.#select(target, true)
    else {
      // manual: フォーカスだけ移す
      for (const t of this.tabs) t.tabIndex = t === target ? 0 : -1
      target.focus()
    }
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
    const vertical = this.orientation === 'vertical'
    return html`<div part="base" class=${vertical ? 'flex gap-4' : 'flex flex-col'}>
      <div
        part="tablist"
        role="tablist"
        aria-label=${ifDefined(this.label)}
        aria-orientation=${this.orientation}
        class=${
          vertical
            ? 'flex shrink-0 flex-col shadow-[inset_-1px_0_0_0_var(--color-line)]'
            : 'flex overflow-x-auto shadow-[inset_0_-1px_0_0_var(--color-line)]'
        }
        @click=${this.#onClick}
        @keydown=${this.#onKeydown}
      >
        <slot name="tab" @slotchange=${() => this.#sync()}></slot>
      </div>
      <div part="panels" class="min-w-0 flex-1 pt-4">
        <slot @slotchange=${() => this.#sync()}></slot>
      </div>
    </div>`
  }
}
JimbleTabs.define('jimble-tabs')

/**
 * タブ 1 つ。`jimble-tabs` の直接の子。ロール(tab)と選択状態は host が持つ。
 *
 * @tag jimble-tab
 * @slot - タブの文字
 * @csspart base - ルート要素
 */
export class JimbleTab extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    selected: { type: Boolean, attribute: false },
    vertical: { type: Boolean, attribute: false },
  }

  /** 対応する `jimble-tab-panel` の value。省略すると並び順の番号 */
  declare value: string | undefined
  declare disabled: boolean
  declare selected: boolean
  declare vertical: boolean

  constructor() {
    super()
    this.value = undefined
    this.disabled = false
    this.selected = false
    this.vertical = false
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('slot')) this.slot = 'tab'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'tab'
    this.internals.ariaSelected = String(this.selected)
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.setState('selected', this.selected)
  }

  protected override render() {
    const on = this.vertical ? TAB_ON_V : TAB_ON_H
    return html`<span
      part="base"
      class="${TAB} ${this.selected ? on : TAB_OFF} ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
      ><slot></slot
    ></span>`
  }
}
JimbleTab.define('jimble-tab')

/**
 * タブのパネル。`jimble-tabs` の直接の子。選ばれていないパネルは非表示。
 *
 * @tag jimble-tab-panel
 * @slot - パネルの内容
 * @csspart base - ルート要素
 */
export class JimbleTabPanel extends JimbleElement {
  static override properties: PropertyDeclarations = { value: { reflect: true } }

  /** 対応する `jimble-tab` の value。省略すると並び順の番号 */
  declare value: string | undefined

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'tabpanel'
  }

  protected override render() {
    return html`<div part="base"><slot></slot></div>`
  }
}
JimbleTabPanel.define('jimble-tab-panel')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tabs': JimbleTabs
    'jimble-tab': JimbleTab
    'jimble-tab-panel': JimbleTabPanel
  }
  interface HTMLElementEventMap {
    'jimble-tab-change': CustomEvent<{ value: string }>
  }
}
