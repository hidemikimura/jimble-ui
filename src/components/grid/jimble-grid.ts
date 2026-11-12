import { html, type PropertyDeclarations } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { DEFAULT_GAP, gapCss, gapUnits } from '../stack/layout.js'

/** CSS の長さとして使ってよい値か（`16rem`・`240px`・`20ch` など。式や var() は受け付けない） */
const LENGTH = /^\d+(\.\d+)?(px|rem|em|ch|%)$/

/**
 * 子の要素を、同じ間隔の格子に並べる。数字のカード、カードの一覧、2 列のフォームなどに使う。
 *
 * - `columns` で列の数を決める（既定 1）。
 * - `min-column-width` を付けると、その幅を下回らない範囲で、入るだけの列に並べる
 *   （画面の幅に合わせて列の数が変わる。`columns` より優先する）。狭い画面では 1 列になる。
 * - 間隔（`gap`）は、余白の基準（`--jimble-spacing`、既定 4px）の何倍か。既定は 4（16px）。
 * - 並べるだけで、意味は持たない。中の文字の書体と色は、置いた場所のものを引き継ぐ。
 *
 * @tag jimble-grid
 * @status experimental
 *
 * @slot - 並べる要素
 *
 * @csspart base - 並べる箱（grid）
 */
export class JimbleGrid extends JimbleElement {
  static override properties: PropertyDeclarations = {
    columns: { type: Number, reflect: true },
    minColumnWidth: { attribute: 'min-column-width', reflect: true },
    gap: { type: Number, reflect: true },
  }

  /** 列の数（1 以上の整数） */
  declare columns: number
  /** 列の最小の幅（`16rem` など）。付けると、画面の幅に合わせて列の数が変わる */
  declare minColumnWidth: string | undefined
  /** 間隔。余白の基準（4px）の何倍か（0 以上。小数も可） */
  declare gap: number

  constructor() {
    super()
    this.columns = 1
    this.minColumnWidth = undefined
    this.gap = DEFAULT_GAP
  }

  #template(): string {
    const min = this.minColumnWidth?.trim()
    // 狭い画面でははみ出さないよう、最小の幅を箱の幅で抑える
    if (min && LENGTH.test(min)) return `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`
    const n = Number.isInteger(this.columns) && this.columns >= 1 ? this.columns : 1
    return `repeat(${n}, minmax(0, 1fr))`
  }

  protected override render() {
    // style 属性ではなく CSSOM で渡す（CSP で style-src を絞っていても動く）
    const style = styleMap({
      gridTemplateColumns: this.#template(),
      gap: gapCss(gapUnits(this.gap)),
    })
    return html`<div part="base" class="grid" style=${style}><slot></slot></div>`
  }
}

JimbleGrid.define('jimble-grid')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-grid': JimbleGrid
  }
}
