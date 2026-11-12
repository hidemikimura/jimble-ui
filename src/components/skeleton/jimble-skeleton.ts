import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'

export type SkeletonVariant = 'text' | 'rect' | 'circle'

const MAX_LINES = 20
const SHAPE =
  'block bg-surface-sunken motion-safe:animate-pulse outline outline-1 outline-transparent'

/**
 * 読み込み中に、あとから出る内容と同じ形の、仮の面を出す（表の行・カード・文章）。
 * 内容が出たときに、画面がずれないようにするために使う。
 *
 * - `variant`: `text`（文字の行。`lines` で行の数、最後の行は短い）・`rect`（四角）・`circle`（丸）。
 * - 大きさは `--jimble-skeleton-width` / `--jimble-skeleton-height`（`rect` / `circle` の既定は
 *   幅いっぱい × 4rem、丸は 2.5rem）。
 * - **読み上げには出ない**（飾り）。読み込み中であることは、包む要素に `aria-busy="true"` を付け、
 *   `jimble-spinner` や `role="status"` の文字で伝える。
 * - 「視差効果を減らす」設定では、点滅しない。
 *
 * @tag jimble-skeleton
 *
 * @csspart base - ルート要素
 * @csspart shape - 仮の面（`text` では行ごと）
 *
 * @cssprop [--jimble-skeleton-width=variant に応じる] - 幅
 * @cssprop [--jimble-skeleton-height=variant に応じる] - 高さ（`text` では 1 行の高さ）
 * @cssprop [--jimble-skeleton-radius=variant に応じる] - 角丸
 */
export class JimbleSkeleton extends JimbleElement {
  static override properties: PropertyDeclarations = {
    variant: { reflect: true },
    lines: { type: Number, reflect: true },
  }

  /** 形 */
  declare variant: SkeletonVariant
  /** 行の数（`text` のとき。1〜20） */
  declare lines: number

  constructor() {
    super()
    this.variant = 'text'
    this.lines = 1
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // 飾りなので、読み上げから外す（利用者が host に書いた aria-* が優先される）
    this.internals.ariaHidden = 'true'
  }

  protected override render() {
    if (this.variant === 'rect' || this.variant === 'circle') {
      const round = this.variant === 'circle'
      return html`<span part="base" class="block"
        ><span
          part="shape"
          class="${SHAPE} ${
            round
              ? '[width:var(--jimble-skeleton-width,2.5rem)] [height:var(--jimble-skeleton-height,var(--jimble-skeleton-width,2.5rem))] [border-radius:var(--jimble-skeleton-radius,9999px)]'
              : '[width:var(--jimble-skeleton-width,100%)] [height:var(--jimble-skeleton-height,4rem)] [border-radius:var(--jimble-skeleton-radius,var(--radius-md))]'
          }"
        ></span
      ></span>`
    }
    const n = Number.isInteger(this.lines) ? Math.min(MAX_LINES, Math.max(1, this.lines)) : 1
    return html`<span
      part="base"
      class="flex flex-col gap-2 [width:var(--jimble-skeleton-width,100%)]"
      >${Array.from(
        { length: n },
        (_, i) =>
          html`<span
            part="shape"
            class="${SHAPE} [height:var(--jimble-skeleton-height,0.75rem)] [border-radius:var(--jimble-skeleton-radius,var(--radius-sm))] ${
              n > 1 && i === n - 1 ? 'w-3/5' : 'w-full'
            }"
          ></span>`,
      )}</span
    >`
  }
}

JimbleSkeleton.define('jimble-skeleton')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-skeleton': JimbleSkeleton
  }
}
