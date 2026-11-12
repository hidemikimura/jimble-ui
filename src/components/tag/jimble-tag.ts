import { html, nothing, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'

export type TagSize = 'sm' | 'md'

export interface TagRemoveDetail {
  /** `value`（無ければラベルの文字） */
  value: string
}

const SIZE: Record<TagSize, string> = {
  sm: 'h-5 gap-0.5 ps-1.5 text-xs',
  md: 'h-6 gap-1 ps-2 text-sm',
}
// ×が無いときは、右の余白を左と同じにする
const END: Record<TagSize, string> = { sm: 'pe-1.5', md: 'pe-2' }
const END_REMOVABLE: Record<TagSize, string> = { sm: 'pe-0.5', md: 'pe-0.5' }
const BASE =
  'inline-flex max-w-full items-center whitespace-nowrap ' +
  'bg-(--jimble-tag-bg,var(--color-surface)) [color:var(--jimble-tag-text,var(--color-fg))] ' +
  'ring-1 ring-inset [--tw-ring-color:var(--jimble-tag-border,var(--color-line-control))] outline outline-1 outline-transparent ' +
  '[border-radius:var(--jimble-tag-radius,var(--radius-sm))]'
const REMOVE: Record<TagSize, string> = {
  sm: 'size-4',
  md: 'size-5',
}
const REMOVE_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-sm cursor-pointer text-current ' +
  'hover:[background-color:color-mix(in_oklab,currentColor_12%,transparent)] outline outline-1 outline-transparent ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus'

/** 外すボタンを持つ、群の中で見えているタグ */
const removableTag = (el: Element | null | undefined): el is JimbleTag =>
  el instanceof JimbleTag && el.removable && el.isConnected

/**
 * もの・条件に付ける、外せる名札（絞り込みの条件・付けたラベル・選んだ宛先）。状態を示すなら `jimble-badge`。
 *
 * - `removable` を付けると×のボタンを出す（名前は「ラベル を外す」）。×にフォーカスがある間は Delete・Backspace でも外せる。
 * - 外すと `jimble-remove`（`detail.value`）が出て、取り消されなければ、タグは自分を DOM から外す。
 *   フォーカスは次のタグの×、無ければ前のタグの×、どちらも無ければ `jimble-tag-group` に移る。
 * - `jimble-remove` はバブルしない。まとめて受けるなら、親に `{ capture: true }` で付ける。
 *
 * @tag jimble-tag
 * @status experimental
 *
 * @slot - ラベル
 *
 * @fires jimble-remove - ×・Delete・Backspace で外すとき（`detail.value`）。preventDefault() すると外さない
 *
 * @csspart base - ルート要素
 * @csspart label - ラベルを包む要素
 * @csspart remove-button - ×のボタン
 *
 * @cssprop [--jimble-tag-bg=var(--jimble-color-surface)] - 背景色
 * @cssprop [--jimble-tag-text=var(--jimble-color-text)] - 文字色
 * @cssprop [--jimble-tag-border=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-tag-radius=var(--jimble-radius-sm)] - 角丸
 */
export class JimbleTag extends JimbleElement {
  // host.focus() で×に入る（外したあと、隣のタグにフォーカスを移すため）
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    removable: { type: Boolean, reflect: true },
    size: { reflect: true },
  }

  /** `jimble-remove` の `detail.value`（無ければラベルの文字） */
  declare value: string | undefined
  /** ×のボタンを出す */
  declare removable: boolean
  declare size: TagSize

  constructor() {
    super()
    this.removable = false
    this.size = 'md'
  }

  get #label(): string {
    return (this.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  /** 外したあとにフォーカスを移す先（次・前のタグ、無ければ群） */
  #nextFocus(): HTMLElement | null {
    const siblings = [...(this.parentElement?.children ?? [])]
    const i = siblings.indexOf(this)
    const next = siblings.slice(i + 1).find(removableTag)
    const prev = siblings.slice(0, i).reverse().find(removableTag)
    return next ?? prev ?? this.closest<HTMLElement>('jimble-tag-group')
  }

  #remove = () => {
    const event = this.emit<TagRemoveDetail>('remove', {
      detail: { value: this.value ?? this.#label },
      cancelable: true,
    })
    if (event.defaultPrevented) return
    const target = this.#nextFocus()
    this.remove()
    target?.focus()
  }

  #onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    e.preventDefault()
    this.#remove()
  }

  protected override render() {
    const size: TagSize = this.size in SIZE ? this.size : 'md'
    const end = this.removable ? END_REMOVABLE[size] : END[size]
    return html`<span part="base" class="${BASE} ${SIZE[size]} ${end}"
      ><span part="label" class="min-w-0 truncate"><slot></slot></span>${
        this.removable
          ? html`<button
              part="remove-button"
              type="button"
              class="${REMOVE_BASE} ${REMOVE[size]}"
              aria-label=${this.t('tag.remove', { label: this.#label })}
              @click=${this.#remove}
              @keydown=${this.#onKeydown}
            >
              ${renderIcon(xMark, size === 'sm' ? 'size-3' : 'size-3.5')}
            </button>`
          : nothing
      }</span
    >`
  }
}

JimbleTag.define('jimble-tag')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-tag': JimbleTag
  }
}
