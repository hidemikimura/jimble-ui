import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { getIcon, onIconsChange } from '../../icons/registry.js'
import { renderIcon } from '../../icons/render.js'

export type IconSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<IconSize, string> = {
  sm: '[--_size:var(--jimble-icon-size,1rem)]',
  md: '[--_size:var(--jimble-icon-size,1.25rem)]',
  lg: '[--_size:var(--jimble-icon-size,1.5rem)]',
  xl: '[--_size:var(--jimble-icon-size,2rem)]',
}

/**
 * アイコン。名前（`name`）で選ぶ。色は周りの文字色（`currentColor`）に従う。
 *
 * - 使えるアイコンは、ドキュメントの一覧か、`import { ICON_NAMES } from '@hidemikimura/jimble-ui/icons/names'` で分かる。
 * - **アイコンは使う分だけ読み込める。** 全部品を読み込む入口（`@hidemikimura/jimble-ui`・CDN）にはすべて入っている。個別に読み込むときは
 *   `import '@hidemikimura/jimble-ui/icon'` と `import '@hidemikimura/jimble-ui/icons/check'`（すべてなら `.../icons`）を使う。
 * - `label` を付けると、その文字で読み上げられる（`role="img"`）。付けなければ装飾として、読み上げから外れる。
 *   **意味を持つアイコンには、必ず `label` を付ける。** 隣に同じ意味の文字があるときは付けない。
 * - 独自のアイコンは `registerIcon(name, { viewBox, fill, body })` で登録できる（`body` は Lit の `svg` テンプレート）。
 * - アイコンだけのボタンには、ボタン側に `aria-label` を付ける（アイコンの `label` ではなく）。
 *
 * @tag jimble-icon
 *
 * @csspart base - 内部の svg 要素
 *
 * @cssprop [--jimble-icon-size=サイズに応じる(1 / 1.25 / 1.5 / 2rem)] - 大きさ
 */
export class JimbleIcon extends JimbleElement {
  static override properties: PropertyDeclarations = {
    name: { reflect: true },
    size: { reflect: true },
    label: {},
  }

  /** アイコンの名前（例: `check`、`arrow-down-tray`）。登録されていない名前は何も表示しない */
  declare name: string
  /** 大きさ: 1 / 1.25 / 1.5 / 2rem。未知の値は md */
  declare size: IconSize
  /** 読み上げる文字。付けなければ装飾として扱う */
  declare label: string | undefined

  #off: (() => void) | undefined

  constructor() {
    super()
    this.name = ''
    this.size = 'md'
    this.label = undefined
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // アイコンが後から登録されたら描き直す(個別 import の順序に依存しない)
    this.#off = onIconsChange(() => this.requestUpdate())
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#off?.()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = this.label ? 'img' : null
    this.internals.ariaLabel = this.label || null
    if (__DEV__ && this.name && !getIcon(this.name) && changed.has('name')) {
      this.warn(`アイコン "${this.name}" は登録されていません。`)
    }
  }

  protected override render() {
    const icon = this.name ? getIcon(this.name) : undefined
    if (!icon) return nothing
    const size = this.size in SIZE ? this.size : 'md'
    return html`<span part="base" class="inline-flex ${SIZE[size]}"
      >${renderIcon(icon, 'block size-(--_size)')}</span
    >`
  }
}

JimbleIcon.define('jimble-icon')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-icon': JimbleIcon
  }
}
