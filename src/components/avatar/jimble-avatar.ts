import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import { renderIcon } from '../../icons/render.js'
import { user } from '../../icons/user.js'
import { initials } from './initials.js'

export type AvatarSize = 'sm' | 'md' | 'lg'
export type AvatarShape = 'circle' | 'square'

// 大きさは間隔の倍数（余白の段階で変わる）。--jimble-avatar-size を書くと、そちらが勝つ。
const SIZE: Record<AvatarSize, string> = {
  sm: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_6))] text-xs',
  md: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_8))] text-sm',
  lg: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_10))] text-base',
}
const SHAPE: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  square: '[border-radius:var(--jimble-avatar-radius,var(--radius-md))]',
}
const BASE =
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none font-medium leading-none ' +
  'bg-(--jimble-avatar-bg,var(--color-surface-accent-strong)) [color:var(--jimble-avatar-text,var(--color-fg-accent))] ' +
  '[box-shadow:0_0_0_2px_var(--jimble-avatar-ring,transparent)] outline outline-1 outline-transparent'

/**
 * 人（担当者・作成者・ユーザー）を、画像か頭文字の小さな丸で示す。
 *
 * - `name` は頭文字と、読み上げる名前になる（`role="img"`）。隣に名前の文字があるときは `decorative` にして、
 *   読み上げから外す（同じ名前を 2 回読ませない）。`name` が無いときも、飾りとして扱う。
 * - `src` の画像が読めなかったとき・`src` が無いときは、頭文字を出す。名前も無いときは、人の形のアイコン。
 * - 頭文字は、ラテン文字の名前なら最初と最後の語から 2 文字（Hanako Sato → HS）、日本語などは最初の 1 文字（佐藤 花子 → 佐）。
 * - 重ねて並べるときは `jimble-avatar-group` に入れる。
 *
 * @tag jimble-avatar
 * @status experimental
 *
 * @csspart base - ルート要素（`role="img"`）
 * @csspart image - 画像
 * @csspart initials - 頭文字
 *
 * @cssprop [--jimble-avatar-size=size に応じる] - 大きさ（幅と高さ）
 * @cssprop [--jimble-avatar-bg=var(--jimble-color-surface-accent-strong)] - 頭文字の背景色
 * @cssprop [--jimble-avatar-text=var(--jimble-color-text-accent)] - 頭文字の色
 * @cssprop [--jimble-avatar-radius=var(--jimble-radius-md)] - `shape="square"` の角丸
 * @cssprop [--jimble-avatar-ring=transparent] - 外側の輪の色（`jimble-avatar-group` の中では面の色）
 */
export class JimbleAvatar extends JimbleElement {
  static override properties: PropertyDeclarations = {
    name: { reflect: true },
    src: { reflect: true },
    size: { reflect: true },
    shape: { reflect: true },
    decorative: { type: Boolean, reflect: true },
    failed: { state: true },
  }

  /** 名前（頭文字と、読み上げる名前） */
  declare name: string
  /** 画像の URL */
  declare src: string | undefined
  declare size: AvatarSize
  /** `circle`（人）か `square`（組織・プロジェクト） */
  declare shape: AvatarShape
  /** 読み上げから外す（隣に名前の文字があるとき） */
  declare decorative: boolean
  /** 画像が読めなかった */
  declare failed: boolean

  constructor() {
    super()
    this.name = ''
    this.size = 'md'
    this.shape = 'circle'
    this.decorative = false
    this.failed = false
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('src')) this.failed = false
  }

  #content() {
    if (this.src && !this.failed)
      return html`<img
        part="image"
        src=${this.src}
        alt=""
        class="size-full object-cover"
        @error=${() => (this.failed = true)}
      />`
    const text = initials(this.name)
    if (text) return html`<span part="initials" aria-hidden="true">${text}</span>`
    return renderIcon(user, 'size-3/5')
  }

  protected override render() {
    const hidden = this.decorative || !this.name.trim()
    const classes = `${BASE} ${SIZE[this.size] ?? SIZE.md} ${SHAPE[this.shape] ?? SHAPE.circle}`
    return html`<span
      part="base"
      class=${classes}
      role=${hidden ? nothing : 'img'}
      aria-label=${ifDefined(hidden ? undefined : this.name.trim())}
      aria-hidden=${hidden ? 'true' : nothing}
      >${this.#content()}</span
    >`
  }
}

JimbleAvatar.define('jimble-avatar')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-avatar': JimbleAvatar
  }
}
