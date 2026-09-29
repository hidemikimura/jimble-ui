import { html, nothing, type PropertyDeclarations } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleElement } from '../../base/jimble-element.js'
import type { ControlSize } from '../../base/form-element.js'
import { chevronLeft } from '../../icons/chevronLeft.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { renderIcon } from '../../icons/render.js'

const SIZE: Record<ControlSize, string> = {
  sm: 'min-w-8 h-8 px-2 text-sm',
  md: 'min-w-9 h-9 px-2.5 text-sm',
  lg: 'min-w-10 h-10 px-3 text-base',
}
const ITEM =
  'inline-flex items-center justify-center rounded-md font-medium select-none shadow-sm ring-1 ring-inset ' +
  'outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-focus'
const NORMAL = 'bg-surface text-fg ring-line hover:bg-surface-muted cursor-pointer'
const CURRENT = 'bg-primary-600 text-fg-on-primary ring-primary-600'
const DISABLED = 'bg-surface text-fg-disabled ring-line opacity-60 cursor-not-allowed shadow-none'

/** 表示するページ番号の並び。省略は 'ellipsis'。先頭・末尾・現在の前後を残す */
export function pageRange(page: number, total: number, siblings: number): (number | 'ellipsis')[] {
  const count = siblings * 2 + 5 // 先頭・末尾・現在・前後・省略 2 つ
  if (total <= count) return Array.from({ length: total }, (_, i) => i + 1)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, total)
  const showLeft = left > 2
  const showRight = right < total - 1
  const items: (number | 'ellipsis')[] = []
  if (!showLeft) {
    const n = siblings * 2 + 3
    for (let i = 1; i <= n; i++) items.push(i)
    items.push('ellipsis', total)
  } else if (!showRight) {
    const n = siblings * 2 + 3
    items.push(1, 'ellipsis')
    for (let i = total - n + 1; i <= total; i++) items.push(i)
  } else {
    items.push(1, 'ellipsis')
    for (let i = left; i <= right; i++) items.push(i)
    items.push('ellipsis', total)
  }
  return items
}

/**
 * ページネーション。ボタン(既定)またはリンク(`href-template`)で描画する。現在のページは
 * `aria-current="page"`。ページ数は `total-pages`、または `total` と `page-size` から求める。
 *
 * @tag jimble-pagination
 *
 * @csspart base - nav 要素
 * @csspart summary - 「N 件中 a〜b 件」の表示
 * @csspart list - ページの並び
 * @csspart item - 各ボタン/リンク（前へ・次へ・番号）
 * @csspart current - 現在のページ
 *
 * @fires jimble-page-change - ページが選ばれた(page)。preventDefault() すると移動しない
 */
export class JimblePagination extends JimbleElement {
  static override properties: PropertyDeclarations = {
    page: { type: Number, reflect: true },
    totalPages: { type: Number, attribute: 'total-pages' },
    total: { type: Number },
    pageSize: { type: Number, attribute: 'page-size' },
    siblingCount: { type: Number, attribute: 'sibling-count' },
    hrefTemplate: { attribute: 'href-template' },
    size: { reflect: true },
    label: {},
  }

  /** 現在のページ（1 始まり） */
  declare page: number
  declare totalPages: number | undefined
  /** 全件数。page-size と組み合わせるとページ数と「N 件中」の表示が決まる */
  declare total: number | undefined
  declare pageSize: number
  /** 現在のページの前後に出す番号の数 */
  declare siblingCount: number
  /** 指定するとリンクで描画する。`{page}` がページ番号に置き換わる（例: `?page={page}`） */
  declare hrefTemplate: string | undefined
  declare size: ControlSize
  /** nav の名前。省略すると「ページネーション」 */
  declare label: string | undefined

  constructor() {
    super()
    this.page = 1
    this.totalPages = undefined
    this.total = undefined
    this.pageSize = 20
    this.siblingCount = 1
    this.hrefTemplate = undefined
    this.size = 'md'
    this.label = undefined
  }

  get #pages(): number {
    const n =
      this.totalPages ?? (this.total !== undefined ? Math.ceil(this.total / this.pageSize) : 1)
    return Math.max(1, Math.floor(n))
  }

  #go(page: number, event: Event) {
    const target = Math.min(Math.max(1, page), this.#pages)
    if (target === this.page) {
      if (!this.hrefTemplate) event.preventDefault()
      return
    }
    const e = this.emit('page-change', { detail: { page: target }, cancelable: true })
    if (e.defaultPrevented) {
      event.preventDefault()
      return
    }
    // リンクのときはブラウザの遷移に任せる。ボタンのときは自分で更新する
    if (!this.hrefTemplate) this.page = target
  }

  #href(page: number): string | undefined {
    return this.hrefTemplate?.replace(/\{page\}/g, String(page))
  }

  #item(
    content: unknown,
    page: number,
    opts: { label: string; current?: boolean; disabled?: boolean },
  ) {
    const size = SIZE[this.size] ?? SIZE.md
    const cls = `${ITEM} ${size} ${opts.disabled ? DISABLED : opts.current ? CURRENT : NORMAL}`
    const part = opts.current ? 'item current' : 'item'
    if (this.hrefTemplate) {
      return html`<a
        part=${part}
        class=${cls}
        href=${ifDefined(opts.disabled ? undefined : this.#href(page))}
        aria-label=${opts.label}
        aria-current=${opts.current ? 'page' : nothing}
        aria-disabled=${opts.disabled ? 'true' : nothing}
        @click=${(e: Event) => (opts.disabled ? e.preventDefault() : this.#go(page, e))}
        >${content}</a
      >`
    }
    return html`<button
      part=${part}
      type="button"
      class=${cls}
      aria-label=${opts.label}
      aria-current=${opts.current ? 'page' : nothing}
      ?disabled=${opts.disabled}
      @click=${(e: Event) => this.#go(page, e)}
    >
      ${content}
    </button>`
  }

  protected override render() {
    const pages = this.#pages
    const page = Math.min(Math.max(1, this.page), pages)
    const from = this.total !== undefined ? Math.min((page - 1) * this.pageSize + 1, this.total) : 0
    const to = this.total !== undefined ? Math.min(page * this.pageSize, this.total) : 0
    return html`<nav
      part="base"
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
      aria-label=${this.label ?? this.t('pagination.label')}
    >
      ${
        this.total !== undefined
          ? html`<p part="summary" class="text-sm text-fg-muted">
              ${this.t('pagination.summary', { total: this.total, from, to })}
            </p>`
          : nothing
      }
      <ul part="list" class="flex flex-wrap items-center gap-1">
        <li>
          ${this.#item(renderIcon(chevronLeft, 'size-5'), page - 1, {
            label: this.t('pagination.previous'),
            disabled: page <= 1,
          })}
        </li>
        ${pageRange(page, pages, this.siblingCount).map((p) =>
          p === 'ellipsis'
            ? html`<li class="px-1 text-fg-muted" aria-hidden="true">…</li>`
            : html`<li>
                ${this.#item(p, p, {
                  label: this.t('pagination.page', { page: p }),
                  current: p === page,
                })}
              </li>`,
        )}
        <li>
          ${this.#item(renderIcon(chevronRight, 'size-5'), page + 1, {
            label: this.t('pagination.next'),
            disabled: page >= pages,
          })}
        </li>
      </ul>
    </nav>`
  }
}
JimblePagination.define('jimble-pagination')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-pagination': JimblePagination
  }
  interface HTMLElementEventMap {
    'jimble-page-change': CustomEvent<{ page: number }>
  }
}
