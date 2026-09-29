import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'

/**
 * 項目名と値の一覧（詳細画面など）。`jimble-description-item` を並べる。
 * 広い画面では項目名を左の列に、狭い画面では値の上に置く（`layout="vertical"` で常に縦）。
 *
 * @tag jimble-description-list
 *
 * @slot - jimble-description-item
 *
 * @cssprop [--jimble-description-label-width=max-content(最小 8rem)] - 項目名の列の幅
 */
export class JimbleDescriptionList extends JimbleElement {
  static override properties: PropertyDeclarations = {
    layout: { reflect: true },
  }

  /** horizontal（広い画面で 2 列）/ vertical（常に縦） */
  declare layout: 'horizontal' | 'vertical'

  constructor() {
    super()
    this.layout = 'horizontal'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
  }

  protected override render() {
    return html`<slot></slot>`
  }
}
JimbleDescriptionList.define('jimble-description-list')

/**
 * 一覧の 1 項目。項目名は `label` 属性または `label` スロット、値は既定スロット。
 *
 * @tag jimble-description-item
 *
 * @slot - 値
 * @slot label - 項目名（label 属性の代わりに HTML で書くとき）
 *
 * @csspart label - 項目名
 * @csspart value - 値
 */
export class JimbleDescriptionItem extends JimbleElement {
  static override properties: PropertyDeclarations = { label: {} }

  declare label: string | undefined

  protected override render() {
    return html`<div part="label" role="term" class="text-sm font-medium text-fg-muted">
        ${this.label}<slot name="label"></slot>
      </div>
      <div part="value" role="definition" class="text-sm text-fg"><slot></slot></div>`
  }
}
JimbleDescriptionItem.define('jimble-description-item')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-description-list': JimbleDescriptionList
    'jimble-description-item': JimbleDescriptionItem
  }
}
