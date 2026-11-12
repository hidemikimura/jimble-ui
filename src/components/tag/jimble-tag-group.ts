import { html, nothing, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'

/**
 * タグを折り返して並べる。最後のタグを外したときは、フォーカスがここに移る。
 *
 * - `label` を付けると、群（`role="group"`）の名前になる（例: 絞り込みの条件）。
 *
 * @tag jimble-tag-group
 * @status experimental
 *
 * @slot - `jimble-tag` を並べる
 *
 * @csspart base - ルート要素（フォーカスの行き先）
 *
 * @cssprop [--jimble-tag-group-gap=calc(var(--jimble-spacing) * 1.5)] - タグの間隔
 */
export class JimbleTagGroup extends JimbleElement {
  // host.focus() で、中の要素（tabindex="-1"）に入る
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties: PropertyDeclarations = {
    label: { reflect: true },
  }

  /** 群の名前（例: 絞り込みの条件） */
  declare label: string | undefined

  protected override render() {
    const label = this.label?.trim()
    return html`<div
      part="base"
      tabindex="-1"
      role=${label ? 'group' : nothing}
      aria-label=${ifDefined(label || undefined)}
      class="flex flex-wrap items-center gap-(--jimble-tag-group-gap,calc(var(--spacing)_*_1.5)) rounded-sm outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-focus"
    >
      <slot></slot>
    </div>`
  }
}

JimbleTagGroup.define('jimble-tag-group')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tag-group': JimbleTagGroup
  }
}
