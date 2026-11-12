import { html, type PropertyDeclarations } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { gapCss, gapUnits, DEFAULT_GAP } from './layout.js'

export type StackDirection = 'vertical' | 'horizontal'
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type StackJustify = 'start' | 'center' | 'end' | 'between'

const DIRECTION: Record<StackDirection, string> = {
  vertical: 'flex-col',
  horizontal: 'flex-row',
}
const ALIGN: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}
const JUSTIFY: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

/**
 * 子の要素を、同じ間隔で縦（または横）に並べる。フォームの項目、ボタンの並び、カードの中身など、
 * 余白をそろえたいところに使う。
 *
 * - 間隔（`gap`）は、余白の基準（`--jimble-spacing`、既定 4px）の何倍か。既定は 4（16px）。
 *   ページ全体の密度（`--jimble-spacing`）を変えると、一緒に変わる。
 * - 並べるだけで、意味（ランドマーク・リスト）は持たない。リストなら `<ul>` を使う。
 * - 中の文字の書体と色は、置いた場所のものを引き継ぐ（部品の既定の書体にしない）。
 *
 * @tag jimble-stack
 *
 * @slot - 並べる要素
 *
 * @csspart base - 並べる箱（flex）
 */
export class JimbleStack extends JimbleElement {
  static override properties: PropertyDeclarations = {
    direction: { reflect: true },
    gap: { type: Number, reflect: true },
    align: { reflect: true },
    justify: { reflect: true },
    wrap: { type: Boolean, reflect: true },
  }

  /** 並べる向き */
  declare direction: StackDirection
  /** 間隔。余白の基準（4px）の何倍か（0 以上。小数も可） */
  declare gap: number
  /** 並べる向きと直角の方向のそろえ方。省略すると stretch（縦なら幅いっぱい） */
  declare align: StackAlign | undefined
  /** 並べる向きのそろえ方。between は両端にそろえて、間を均等に空ける */
  declare justify: StackJustify
  /** 収まらないときに折り返す（横のとき） */
  declare wrap: boolean

  constructor() {
    super()
    this.direction = 'vertical'
    this.gap = DEFAULT_GAP
    this.align = undefined
    this.justify = 'start'
    this.wrap = false
  }

  protected override render() {
    // 間隔は style 属性ではなく CSSOM（styleMap）で渡す（CSP で style-src を絞っていても動く）
    const classes = [
      'flex',
      DIRECTION[this.direction] ?? DIRECTION.vertical,
      this.align ? (ALIGN[this.align] ?? '') : '',
      JUSTIFY[this.justify] ?? JUSTIFY.start,
      this.wrap ? 'flex-wrap' : '',
    ].join(' ')
    return html`<div
      part="base"
      class=${classes}
      style=${styleMap({ gap: gapCss(gapUnits(this.gap)) })}
    >
      <slot></slot>
    </div>`
  }
}

JimbleStack.define('jimble-stack')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-stack': JimbleStack
  }
}
