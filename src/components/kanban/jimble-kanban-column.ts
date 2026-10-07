import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { MOVE_TARGET, JimbleKanbanCard } from './jimble-kanban-card.js'

/**
 * カンバンの列。`jimble-kanban` の直接の子。ロール(group)と名前（見出しと件数）は host が持つ。
 *
 * @tag jimble-kanban-column
 *
 * @slot - `jimble-kanban-card`
 * @slot actions - 見出しの右に置く操作（カードの追加ボタンなど）
 * @slot empty - カードがないときの表示（既定は「カードがありません」）
 *
 * @csspart base - ルート要素
 * @csspart header - 見出しの領域
 * @csspart heading - 見出しの文字
 * @csspart count - カードの件数
 * @csspart list - カードを並べる領域（role="list"）
 * @csspart empty - カードがないときの表示
 * @csspart target - 列の末尾への「ここに移動」の受け口（移動先を選んでいる間だけ）
 * @csspart drop-indicator - ドラッグ中の、列の末尾に挿入する線
 */
export class JimbleKanbanColumn extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    heading: {},
    targeting: { type: Boolean, attribute: false },
    over: { type: Boolean, attribute: false },
    dropEnd: { type: Boolean, attribute: false },
  }

  /** 列を識別する値。`jimble-card-move` の detail と、`board` に使われる。省略すると並び順の番号 */
  declare value: string | undefined
  /** 列の見出し */
  declare heading: string | undefined
  /** @internal 末尾に「ここに移動」を出す */
  declare targeting: boolean
  /** @internal ドラッグ中、ポインターがこの列の上にある */
  declare over: boolean
  /** @internal ドラッグ中、列の末尾に挿入する線を出す */
  declare dropEnd: boolean

  constructor() {
    super()
    this.value = undefined
    this.heading = undefined
    this.targeting = false
    this.over = false
    this.dropEnd = false
  }

  /** この列のカード */
  get cards(): JimbleKanbanCard[] {
    return [...this.children].filter((c): c is JimbleKanbanCard => c instanceof JimbleKanbanCard)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'group'
    this.internals.ariaLabel = this.t('kanban.columnLabel', {
      heading: this.heading ?? this.value ?? '',
      count: this.cards.length,
    })
    this.setState('over', this.over)
  }

  protected override render() {
    const count = this.cards.length
    return html`<div
      part="base"
      class="flex w-(--jimble-kanban-column-width,18rem) shrink-0 flex-col rounded-lg bg-surface-sunken ${
        this.over ? 'ring-2 ring-inset ring-focus' : 'ring-1 ring-inset ring-line'
      } outline outline-1 outline-transparent"
    >
      <div part="header" class="flex items-center gap-2 px-3 py-2.5">
        <span part="heading" class="min-w-0 flex-1 truncate text-sm font-semibold text-fg"
          >${this.heading}</span
        >
        <span part="count" aria-hidden="true" class="text-sm tabular-nums text-fg">${count}</span>
        <slot name="actions"></slot>
      </div>
      <div class="flex min-h-12 flex-1 flex-col gap-2 px-2 pb-2">
        <div role="list" part="list" class="flex flex-col gap-2">
          <slot @slotchange=${() => this.requestUpdate()}></slot>
        </div>
        ${
          count === 0
            ? html`<div part="empty" class="px-1 py-2 text-center text-sm text-fg">
                <slot name="empty">${this.t('kanban.empty')}</slot>
              </div>`
            : nothing
        }
        ${
          this.targeting
            ? html`<button type="button" part="target" class=${MOVE_TARGET}>
                ${this.t('kanban.moveHere')}
              </button>`
            : nothing
        }
        ${
          this.dropEnd
            ? html`<div
                part="drop-indicator"
                aria-hidden="true"
                class="h-0.5 rounded-full bg-focus"
              ></div>`
            : nothing
        }
      </div>
    </div>`
  }
}
JimbleKanbanColumn.define('jimble-kanban-column')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-kanban-column': JimbleKanbanColumn
  }
}
