import { html, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

/**
 * ページの見出し領域。パンくず・見出し・説明・操作ボタンを並べる。
 * 見出しは `heading` 属性または `title` スロット。見出しレベルは `level`（既定 1）。
 *
 * @tag jimble-page-header
 *
 * @slot breadcrumb - パンくず(jimble-breadcrumb)
 * @slot title - 見出しの HTML（heading 属性の代わり）
 * @slot description - 説明
 * @slot actions - 右側の操作ボタン
 * @slot - 見出しの下に置くもの（タブなど）
 *
 * @csspart base - ルート要素
 * @csspart breadcrumb - パンくずの領域
 * @csspart heading - 見出し
 * @csspart description - 説明
 * @csspart actions - 操作の領域
 */
export class JimblePageHeader extends JimbleElement {
  static override properties: PropertyDeclarations = {
    heading: {},
    description: {},
    level: { type: Number },
  }

  declare heading: string
  declare description: string
  /** 見出しのレベル(1〜6)。ページ全体の見出し階層に合わせる */
  declare level: number

  #slots = new SlotController(this)

  constructor() {
    super()
    this.heading = ''
    this.description = ''
    this.level = 1
  }

  protected override render() {
    const hasBreadcrumb = this.#slots.hasSlot('breadcrumb')
    const hasDescription = !!this.description || this.#slots.hasSlot('description')
    const hasActions = this.#slots.hasSlot('actions')
    const level = Math.min(6, Math.max(1, Math.round(this.level) || 1))
    return html`<div part="base" class="flex flex-col gap-2">
      <div part="breadcrumb" class=${hasBreadcrumb ? '' : 'hidden'}>
        <slot name="breadcrumb"></slot>
      </div>
      <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div class="min-w-0 flex-1">
          <div
            part="heading"
            role="heading"
            aria-level=${level}
            class="text-xl font-semibold text-fg"
          >
            ${this.heading}<slot name="title"></slot>
          </div>
          <div part="description" class=${hasDescription ? 'mt-1 text-sm text-fg-muted' : 'hidden'}>
            ${this.description}<slot name="description"></slot>
          </div>
        </div>
        <div part="actions" class=${hasActions ? 'flex flex-wrap items-center gap-2' : 'hidden'}>
          <slot name="actions"></slot>
        </div>
      </div>
      <slot></slot>
    </div>`
  }
}
JimblePageHeader.define('jimble-page-header')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-page-header': JimblePageHeader
  }
}
