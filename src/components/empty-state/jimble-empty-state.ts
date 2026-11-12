import { html, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

/**
 * 表示するものがないことを伝え、次の一歩を示す（空の一覧・検索の結果なし・まだ作っていない）。
 * 見出し（`heading`）で何がないかを、説明（`description`）で理由や次にすることを書き、
 * 操作（`actions` スロット）に、最初の 1 件を作るボタンなどを置く。
 *
 * - 見出しのレベルは `level`（既定 2）。置いた場所の見出しの構造に合わせる。
 * - 検索や絞り込みの結果として出すときは、件数の変化を読み上げで伝えるのは、アプリの役目
 *   （`role="status"` の要素に「0 件」と書くなど）。
 *
 * @tag jimble-empty-state
 *
 * @slot icon - 上に出すアイコン（`jimble-icon` など。飾りとして読み上げない）
 * @slot title - 見出し（`heading` の代わり）
 * @slot description - 説明（`description` の代わり）
 * @slot actions - 操作（ボタン・リンク）
 * @slot - 説明の下に置く、そのほかの内容
 *
 * @csspart base - ルート要素
 * @csspart icon - アイコンを包む丸
 * @csspart heading - 見出し
 * @csspart description - 説明
 * @csspart actions - 操作を包む要素
 *
 * @cssprop [--jimble-empty-state-padding=calc(var(--jimble-spacing) * 10)] - 上下の余白
 */
export class JimbleEmptyState extends JimbleElement {
  static override properties: PropertyDeclarations = {
    heading: {},
    description: {},
    level: { type: Number },
  }

  /** 見出し（何がないか） */
  declare heading: string
  /** 説明（理由や、次にすること） */
  declare description: string
  /** 見出しのレベル（1〜6） */
  declare level: number

  #slots = new SlotController(this)

  constructor() {
    super()
    this.heading = ''
    this.description = ''
    this.level = 2
  }

  protected override render() {
    const level = Math.min(6, Math.max(1, Math.round(this.level) || 2))
    const has = (name: string) => this.#slots.hasSlot(name)
    const hasDescription = !!this.description || has('description')
    return html`<div
      part="base"
      class="flex flex-col items-center gap-3 px-4 text-center [padding-block:var(--jimble-empty-state-padding,calc(var(--spacing)*10))]"
    >
      <div
        part="icon"
        aria-hidden="true"
        class=${
          has('icon')
            ? 'mb-1 inline-flex size-12 items-center justify-center rounded-full bg-surface-sunken text-fg-secondary'
            : 'hidden'
        }
      >
        <slot name="icon"></slot>
      </div>
      <div
        part="heading"
        role="heading"
        aria-level=${level}
        class="text-base [font-weight:var(--font-weight-semibold)] text-fg"
      >
        ${this.heading}<slot name="title"></slot>
      </div>
      <div
        part="description"
        class=${hasDescription ? 'max-w-prose text-sm text-fg-muted' : 'hidden'}
      >
        ${this.description}<slot name="description"></slot>
      </div>
      <slot></slot>
      <div
        part="actions"
        class=${has('actions') ? 'mt-2 flex flex-wrap justify-center gap-2' : 'hidden'}
      >
        <slot name="actions"></slot>
      </div>
    </div>`
  }
}

JimbleEmptyState.define('jimble-empty-state')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-empty-state': JimbleEmptyState
  }
}
