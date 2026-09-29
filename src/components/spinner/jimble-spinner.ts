import { html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { renderIcon } from '../../icons/render.js'
import { spinner } from '../../icons/spinner.js'

export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'current' | 'primary'

const SIZE: Record<SpinnerSize, string> = {
  sm: '[--_size:var(--jimble-spinner-size,calc(var(--spacing)*4))]',
  md: '[--_size:var(--jimble-spinner-size,calc(var(--spacing)*6))]',
  lg: '[--_size:var(--jimble-spinner-size,calc(var(--spacing)*10))]',
}
const VARIANT: Record<SpinnerVariant, string> = {
  current: '',
  primary: 'text-primary-600',
}
const ICON = 'block size-(--_size) motion-safe:animate-spin motion-reduce:animate-pulse'

/**
 * 読み込み中を示すスピナー。既定では「読み込み中」を `role="status"` で伝える。
 * すぐ隣に「読み込み中…」などの文字があるときは、`decorative` で読み上げから外す。
 *
 * - 色は文字色（`currentColor`）に従う。`variant="primary"` で主色。
 * - 「視差効果を減らす」設定では回転せず、点滅する。
 * - ボタンの読み込み中は `jimble-button` の `loading` を使う（スピナーを自分で置かない）。
 *
 * @tag jimble-spinner
 *
 * @csspart base - ルート要素
 * @csspart icon - 回転するアイコン
 *
 * @cssprop [--jimble-spinner-size=サイズに応じる(1 / 1.5 / 2.5rem)] - 大きさ
 */
export class JimbleSpinner extends JimbleElement {
  static override properties: PropertyDeclarations = {
    size: { reflect: true },
    variant: { reflect: true },
    label: {},
    decorative: { type: Boolean, reflect: true },
  }

  /** 大きさ: 1 / 1.5 / 2.5rem。未知の値は md */
  declare size: SpinnerSize
  /** 色。`current`（文字色。既定）または `primary` */
  declare variant: SpinnerVariant
  /** 読み上げる文字。未指定なら「読み込み中」（辞書で変更できる） */
  declare label: string | undefined
  /** 読み上げから外す（隣に同じ意味の文字があるとき） */
  declare decorative: boolean

  constructor() {
    super()
    this.size = 'md'
    this.variant = 'current'
    this.label = undefined
    this.decorative = false
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = this.decorative ? null : 'status'
  }

  protected override render() {
    const size = this.size in SIZE ? this.size : 'md'
    const variant = this.variant in VARIANT ? this.variant : 'current'
    return html`<span part="base" class="inline-flex ${SIZE[size]} ${VARIANT[variant]}"
      ><span part="icon" aria-hidden="true" class="inline-flex">${renderIcon(spinner, ICON)}</span
      >${
        this.decorative
          ? ''
          : html`<span class="sr-only">${this.label || this.t('common.loading')}</span>`
      }</span
    >`
  }
}

JimbleSpinner.define('jimble-spinner')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-spinner': JimbleSpinner
  }
}
