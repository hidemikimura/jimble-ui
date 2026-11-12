import { html, nothing, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { getLocale } from '../../i18n/index.js'
import { JimbleElement } from '../../base/jimble-element.js'
import type { AvatarSize } from './jimble-avatar.js'

const DEFAULT_MAX = 5

// 「+N」の大きさ（jimble-avatar と同じ。最初のアバターの size に合わせる）
const MORE_SIZE: Record<AvatarSize, string> = {
  sm: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_6))] text-xs',
  md: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_8))] text-sm',
  lg: 'size-[var(--jimble-avatar-size,calc(var(--spacing)_*_10))] text-base',
}
const MORE =
  'relative -ms-2 inline-flex shrink-0 items-center justify-center rounded-full font-medium leading-none ' +
  'bg-surface-sunken text-fg-secondary [box-shadow:0_0_0_2px_var(--color-surface)] outline outline-1 outline-transparent'
// 重ねる: 2 つ目からは左に寄せ、境目に面の色の輪を付ける
const SLOT =
  'contents [&::slotted(*)]:[--jimble-avatar-ring:var(--color-surface)] [&::slotted(:not(:first-child))]:-ms-2'

/**
 * アバターを重ねて並べる。`max` を超えた分は隠し、「+N」を出す。
 *
 * - 子は `jimble-avatar`。大きさは、子に同じ `size` を付ける（「+N」は最初の子の大きさに合わせる）。
 * - 隠れた分は、描画にも読み上げにも出ない。「+N」は、隠れた人の名前を「ほか N 人（名前）」として読み上げる。
 * - `label` を付けると、群（`role="group"`）の名前になる（例: 担当者）。
 *
 * @tag jimble-avatar-group
 * @status experimental
 *
 * @slot - `jimble-avatar` を並べる
 *
 * @csspart base - ルート要素
 * @csspart more - 「+N」
 */
export class JimbleAvatarGroup extends JimbleElement {
  // 見せる子だけをスロットに割り当てる（利用者の要素に hidden を書かない）
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' }

  static override properties: PropertyDeclarations = {
    max: { type: Number, reflect: true },
    label: { reflect: true },
  }

  /** 並べる数の上限。超えた分は「+N」にまとめる */
  declare max: number
  /** 群の名前（例: 担当者） */
  declare label: string | undefined

  // 子の追加・削除と、名前・大きさの変更で描き直す
  #observer = new MutationObserver(() => this.requestUpdate())

  constructor() {
    super()
    this.max = DEFAULT_MAX
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#observer.observe(this, { childList: true, attributes: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer.disconnect()
  }

  get #limit(): number {
    return Number.isFinite(this.max) && this.max >= 1 ? Math.floor(this.max) : DEFAULT_MAX
  }

  protected override updated(): void {
    const slot = this.shadowRoot?.querySelector('slot')
    slot?.assign(...[...this.children].slice(0, this.#limit))
  }

  #moreLabel(hidden: Element[]): string {
    // 子がまだ定義されていないこともあるので、属性から読む
    const names = hidden
      .map((el) => el.getAttribute('name')?.trim())
      .filter((n): n is string => !!n)
    const count = hidden.length
    if (!names.length) return this.t('avatarGroup.more', { count })
    const list = new Intl.ListFormat(getLocale(), { type: 'conjunction' }).format(names)
    return this.t('avatarGroup.moreNames', { count, names: list })
  }

  protected override render() {
    const children = [...this.children]
    const hidden = children.slice(this.#limit)
    const size = (children[0]?.getAttribute('size') ?? 'md') as AvatarSize
    const label = this.label?.trim()
    const more = hidden.length ? this.#moreLabel(hidden) : ''
    return html`<div
      part="base"
      class="inline-flex items-center"
      role=${label ? 'group' : nothing}
      aria-label=${ifDefined(label || undefined)}
    >
      <slot class=${SLOT}></slot>${
        hidden.length
          ? html`<span
              part="more"
              role="img"
              aria-label=${more}
              title=${more}
              class="${MORE} ${MORE_SIZE[size] ?? MORE_SIZE.md}"
              ><span aria-hidden="true">+${hidden.length}</span></span
            >`
          : nothing
      }
    </div>`
  }
}

JimbleAvatarGroup.define('jimble-avatar-group')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-avatar-group': JimbleAvatarGroup
  }
}
