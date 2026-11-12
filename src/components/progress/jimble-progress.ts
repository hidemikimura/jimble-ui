import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { JimbleElement } from '../../base/jimble-element.js'

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger'
export type ProgressSize = 'sm' | 'md'

// 公開変数 --jimble-progress-fill を書けば、そちらが勝つ（既定は variant の色）。
// 溝との対比（3:1）を、ライト・ダークの両方で満たすよう、文字の色（700 / ダークは 300）を使う
const FILL: Record<ProgressVariant, string> = {
  primary: '[background-color:var(--jimble-progress-fill,var(--color-fg-accent))]',
  success: '[background-color:var(--jimble-progress-fill,var(--color-fg-success))]',
  warning: '[background-color:var(--jimble-progress-fill,var(--color-fg-warning))]',
  danger: '[background-color:var(--jimble-progress-fill,var(--color-fg-danger))]',
}
const TRACK: Record<ProgressSize, string> = { sm: 'h-1', md: 'h-2' }

/**
 * 処理の進み具合を、横の棒で示す（ファイルの取り込み・一括の処理・設定の完了の度合い）。
 *
 * - `value`（0〜`max`。`max` の既定は 100）を渡すと、その割合だけ棒を満たす。
 * - `value` を付けないと、終わりの分からない進み具合（不確定）になり、棒が動き続ける
 *   （「視差効果を減らす」設定では、動かずに点滅する）。
 * - **名前が要る**: `label`（棒の上に表示する）か、`aria-label`。
 * - `show-value` で、棒の上の右に割合（`45%`）を出す。
 * - 数秒で終わる処理には `jimble-spinner` を使う。
 *
 * host が `role="progressbar"` と `aria-valuenow` などを持つ（試験の道具から見えるよう、属性にも書く）。
 *
 * @tag jimble-progress
 *
 * @csspart base - ルート要素
 * @csspart header - 名前と割合の行
 * @csspart label - 名前
 * @csspart value - 割合
 * @csspart track - 棒の溝
 * @csspart fill - 棒の満たされた部分
 *
 * @cssstate indeterminate - 不確定（`value` がない）
 *
 * @cssprop [--jimble-progress-fill=variant に応じる] - 満たされた部分の色
 * @cssprop [--jimble-progress-track=var(--jimble-color-surface-track)] - 溝の色
 */
export class JimbleProgress extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    label: { reflect: true },
    variant: { reflect: true },
    size: { reflect: true },
    showValue: { type: Boolean, attribute: 'show-value', reflect: true },
  }

  /** 進み具合（0〜max）。付けないと不確定 */
  declare value: number | undefined
  /** 終わりの値 */
  declare max: number
  /** 名前（棒の上に表示する） */
  declare label: string | undefined
  /** 色 */
  declare variant: ProgressVariant
  /** 棒の太さ 4 / 8px */
  declare size: ProgressSize
  /** 割合を表示する */
  declare showValue: boolean

  constructor() {
    super()
    this.value = undefined
    this.max = 100
    this.label = undefined
    this.variant = 'primary'
    this.size = 'md'
    this.showValue = false
  }

  /** 正した終わりの値（正の数でなければ 100） */
  get #max(): number {
    return Number.isFinite(this.max) && this.max > 0 ? this.max : 100
  }

  /** 正した今の値。不確定なら undefined */
  get #now(): number | undefined {
    if (this.value === undefined || this.value === null || !Number.isFinite(this.value))
      return undefined
    return Math.min(this.#max, Math.max(0, this.value))
  }

  /** 割合（0〜100 の整数）。不確定なら undefined */
  get percent(): number | undefined {
    const now = this.#now
    return now === undefined ? undefined : Math.round((now / this.#max) * 100)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const now = this.#now
    const set = (name: string, value: string | null) => this.reflectAria(name, value)
    this.internals.role = 'progressbar'
    this.internals.ariaValueMin = '0'
    this.internals.ariaValueMax = String(this.#max)
    this.internals.ariaValueNow = now === undefined ? null : String(now)
    this.internals.ariaLabel = this.label || null
    set('role', 'progressbar')
    set('aria-valuemin', '0')
    set('aria-valuemax', String(this.#max))
    set('aria-valuenow', now === undefined ? null : String(now))
    this.setState('indeterminate', now === undefined)
  }

  protected override render() {
    const percent = this.percent
    const fill = FILL[this.variant] ?? FILL.primary
    const indeterminate = percent === undefined
    const showHeader = !!this.label || (this.showValue && !indeterminate)
    return html`<div part="base" class="flex flex-col gap-1.5">
      <div
        part="header"
        class=${showHeader ? 'flex items-baseline justify-between gap-3 text-sm' : 'hidden'}
      >
        <span
          part="label"
          class="text-fg [font-weight:var(--font-weight-medium)]"
          aria-hidden="true"
          >${this.label}</span
        >
        <span
          part="value"
          class=${this.showValue && !indeterminate ? 'tabular-nums text-fg-muted' : 'hidden'}
          aria-hidden="true"
          >${percent}%</span
        >
      </div>
      <div
        part="track"
        class="relative overflow-hidden rounded-full outline outline-1 outline-transparent [background-color:var(--jimble-progress-track,var(--color-surface-track))] ${
          TRACK[this.size] ?? TRACK.md
        }"
      >
        <div
          part="fill"
          class="h-full rounded-full ${fill} ${
            indeterminate ? '' : 'transition-[width] duration-200 motion-reduce:transition-none'
          }"
          style=${styleMap(indeterminate ? {} : { width: `${percent}%` })}
        ></div>
      </div>
    </div>`
  }
}

JimbleProgress.define('jimble-progress')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-progress': JimbleProgress
  }
}
