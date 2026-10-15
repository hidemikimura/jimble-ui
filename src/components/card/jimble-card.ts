import { html } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

const BASE =
  'bg-surface text-fg [--_shadow:var(--jimble-card-shadow,var(--shadow-sm))] relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:[box-shadow:var(--_shadow)] ring-1 ring-inset ring-line-card ' +
  'outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-card-radius,var(--radius-card))]'
const SECTION = 'p-(--jimble-card-padding,calc(var(--spacing)*4))'
const DIVIDER = 'h-px bg-line-divider'

/**
 * 関連する情報をまとめる面。ヘッダー・フッターは中身があるときだけ描画する。
 * 枠の色は `--jimble-color-ring-card`、ヘッダー・フッターの区切り線の色は `--jimble-color-ring-divider` で変える。
 *
 * @tag jimble-card
 *
 * @slot - 本文
 * @slot header - ヘッダー（見出しや操作）
 * @slot footer - フッター（操作ボタンなど）
 *
 * @csspart base - ルート要素
 * @csspart header - ヘッダー領域
 * @csspart body - 本文領域
 * @csspart footer - フッター領域
 *
 * @cssprop [--jimble-card-radius=var(--jimble-radius-card)] - 角丸
 * @cssprop [--jimble-card-padding=4 単位(1rem)] - 各領域の内側の余白
 * @cssprop [--jimble-card-shadow=var(--jimble-shadow-sm)] - 影
 */
export class JimbleCard extends JimbleElement {
  #slots = new SlotController(this)

  protected override render() {
    const header = this.#slots.hasSlot('header')
    const footer = this.#slots.hasSlot('footer')
    return html`<div part="base" class=${BASE}>
      <div part="header" class=${header ? SECTION : 'hidden'}><slot name="header"></slot></div>
      <div class=${header ? DIVIDER : 'hidden'} aria-hidden="true"></div>
      <div part="body" class=${SECTION}><slot></slot></div>
      <div class=${footer ? DIVIDER : 'hidden'} aria-hidden="true"></div>
      <div part="footer" class=${footer ? SECTION : 'hidden'}><slot name="footer"></slot></div>
    </div>`
  }
}

JimbleCard.define('jimble-card')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-card': JimbleCard
  }
}
