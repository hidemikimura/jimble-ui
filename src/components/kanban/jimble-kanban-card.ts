import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { ellipsisVertical } from '../../icons/ellipsisVertical.js'
import { lockClosed } from '../../icons/lockClosed.js'
import { renderIcon } from '../../icons/render.js'

/** 「ここに移動」の受け口(カードの前と、列の末尾で使う) */
export const MOVE_TARGET =
  'block w-full rounded-md border border-dashed border-line-control bg-surface px-3 py-1.5 text-center text-sm ' +
  'font-medium text-primary-700 cursor-pointer hover:bg-primary-50 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-focus'
const CARD =
  'flex items-start gap-2 rounded-md bg-surface p-3 text-sm text-fg outline outline-1 outline-transparent ' +
  'outline-offset-2 [:host(:focus-visible)_&]:outline-2 [:host(:focus-visible)_&]:outline-focus'
const MOVE_BUTTON =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-fg-muted cursor-pointer ' +
  'hover:bg-surface-sunken hover:text-fg outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-focus'

/**
 * カンバンのカード。`jimble-kanban-column` の直接の子。ロール(listitem)は host が持つ。
 * ドラッグでの移動のほか、右上の移動ボタン（ポインター 1 本）と Alt + 矢印キーで移せる。
 *
 * @tag jimble-kanban-card
 *
 * @slot - カードの内容（見出し・説明・バッジなど）
 *
 * @csspart base - ルート要素
 * @csspart card - カードの面
 * @csspart move - 移動ボタン
 * @csspart target - 「ここに移動」の受け口（移動先を選んでいる間だけ）
 * @csspart drop-indicator - ドラッグ中の、挿入位置の線
 */
export class JimbleKanbanCard extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    label: {},
    locked: { type: Boolean, reflect: true },
    readonly: { type: Boolean, attribute: false },
    active: { type: Boolean, attribute: false },
    moving: { type: Boolean, attribute: false },
    targeting: { type: Boolean, attribute: false },
    dragging: { type: Boolean, attribute: false },
    dropBefore: { type: Boolean, attribute: false },
  }

  /** カードを識別する値。`jimble-card-move` の detail と、`board` に使われる。省略すると並び順の番号 */
  declare value: string | undefined
  /** 読み上げ・移動の通知に使うカードの名前。省略するとカードの文字 */
  declare label: string | undefined
  /** 移動できないカード（ドラッグ・移動ボタン・キーボードのどれでも動かせない） */
  declare locked: boolean
  /** @internal 親の `jimble-kanban` が設定する */
  declare readonly: boolean
  /** @internal ボードの中でフォーカスの入口になっているカード（移動ボタンも Tab で止まる） */
  declare active: boolean
  /** @internal 移動先を選んでいる、そのカード */
  declare moving: boolean
  /** @internal 移動先として「ここに移動」を出す */
  declare targeting: boolean
  /** @internal ドラッグ中 */
  declare dragging: boolean
  /** @internal ドラッグ中、このカードの前に挿入する線を出す */
  declare dropBefore: boolean

  constructor() {
    super()
    this.value = undefined
    this.label = undefined
    this.locked = false
    this.readonly = false
    this.active = false
    this.moving = false
    this.targeting = false
    this.dragging = false
    this.dropBefore = false
  }

  /** 通知に使う名前 */
  get cardTitle(): string {
    return this.label || (this.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    this.internals.ariaLabel = this.label ?? null
    this.setState('moving', this.moving)
    this.setState('dragging', this.dragging)
    this.setState('locked', this.locked)
  }

  #renderTail() {
    if (this.locked) {
      return html`<span
        part="lock"
        class="inline-flex size-6 shrink-0 items-center justify-center text-fg-muted"
        >${renderIcon(lockClosed, 'size-4')}<span class="sr-only"
          >${this.t('kanban.locked')}</span
        ></span
      >`
    }
    if (this.readonly) return nothing
    return html`<button
      type="button"
      part="move"
      class=${MOVE_BUTTON}
      aria-label=${this.t('kanban.move')}
      aria-pressed=${this.moving ? 'true' : 'false'}
      tabindex=${this.active ? '0' : '-1'}
    >
      ${renderIcon(ellipsisVertical, 'size-4')}
    </button>`
  }

  protected override render() {
    const face = this.moving
      ? 'ring-2 ring-inset ring-focus shadow-sm'
      : this.dragging
        ? 'ring-1 ring-inset ring-line shadow-lg'
        : 'ring-1 ring-inset ring-line shadow-xs'
    return html`<div part="base" class="relative flex flex-col gap-2">
      ${
        this.dropBefore
          ? html`<div
              part="drop-indicator"
              aria-hidden="true"
              class="absolute inset-x-0 -top-1.5 h-0.5 rounded-full bg-focus"
            ></div>`
          : nothing
      }
      ${
        this.targeting
          ? html`<button type="button" part="target" class=${MOVE_TARGET}>
              ${this.t('kanban.moveHere')}
            </button>`
          : nothing
      }
      <div part="card" class="${CARD} ${face}">
        <div class="min-w-0 flex-1"><slot></slot></div>
        ${this.#renderTail()}
      </div>
    </div>`
  }
}
JimbleKanbanCard.define('jimble-kanban-card')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-kanban-card': JimbleKanbanCard
  }
}
