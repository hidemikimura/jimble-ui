import { type PropertyDeclarations } from 'lit'
import { JimbleDialog, type DialogSize } from '../dialog/jimble-dialog.js'

export type DrawerPlacement = 'end' | 'start' | 'top' | 'bottom'

// クラス名は完全な文字列リテラルで書く(Tailwind のスキャナが検出できるように)。公開 API ではない。
const BASE = 'max-w-none overflow-visible border-0 bg-transparent p-0 text-fg backdrop:bg-backdrop'
const SIDE = 'm-0 h-dvh max-h-none'
const PLACEMENT: Record<DrawerPlacement, string> = {
  end: `${SIDE} ms-auto`,
  start: `${SIDE} me-auto`,
  top: 'm-0 mb-auto w-full max-h-none',
  bottom: 'm-0 mt-auto w-full max-h-none',
}
const WIDTH: Record<DialogSize, string> = {
  sm: 'w-[min(100%,20rem)]',
  md: 'w-[min(100%,28rem)]',
  lg: 'w-[min(100%,40rem)]',
}
const PANEL_BASE =
  'flex flex-col bg-surface-overlay shadow-lg ring-1 ring-inset ring-line outline outline-1 outline-transparent ' +
  '[--_r:var(--jimble-drawer-radius,var(--radius-overlay))]'
const PANEL: Record<DrawerPlacement, string> = {
  end: `${PANEL_BASE} h-full [border-radius:var(--_r)_0_0_var(--_r)]`,
  start: `${PANEL_BASE} h-full [border-radius:0_var(--_r)_var(--_r)_0]`,
  top: `${PANEL_BASE} max-h-[80dvh] [border-radius:0_0_var(--_r)_var(--_r)]`,
  bottom: `${PANEL_BASE} max-h-[80dvh] [border-radius:var(--_r)_var(--_r)_0_0]`,
}

/**
 * 画面の端から出るモーダルのパネル(サイドモーダル・ドロワー・スライドパネル・ボトムシート)。
 * `jimble-dialog` と同じく、ネイティブの `<dialog>` の `showModal()` を使う。開閉、`jimble-close-request`、
 * `data-dialog-close`、`heading` / `title` / `footer`、フォーカスの閉じ込めと復帰、Esc・背景クリック・
 * IME の扱いは `jimble-dialog` と同じ。
 *
 * - 開いている間は背面が操作できない(モーダル)。背面を操作しながら見せる非モーダルのパネルは未対応。
 * - 出入りにスライドの動きが付く(`prefers-reduced-motion` では動かさない)。
 * - ナビゲーションのメニューは、`jimble-app-shell` が狭い画面で出すドロワーを使う。
 *
 * @tag jimble-drawer
 *
 * @slot - 本文
 * @slot title - 見出しに入れる HTML（`heading` 属性の代わり）
 * @slot footer - フッター（操作ボタンなど）
 *
 * @csspart base - 内部の dialog 要素
 * @csspart panel - 面
 * @csspart header - ヘッダー領域
 * @csspart title - 見出し
 * @csspart close-button - 閉じるボタン
 * @csspart body - 本文領域
 * @csspart footer - フッター領域
 *
 * @cssprop [--jimble-drawer-radius=var(--jimble-radius-overlay)] - 画面の内側の角の丸み
 * @cssprop [--jimble-dialog-padding=4 単位(1rem)] - 各領域の内側の余白
 *
 * @fires jimble-open - 開いた
 * @fires jimble-close-request - 閉じようとしている(reason: escape / backdrop / action)。preventDefault() すると閉じない
 * @fires jimble-close - 閉じた(reason)
 */
export class JimbleDrawer extends JimbleDialog {
  static override properties: PropertyDeclarations = {
    placement: { reflect: true },
  }

  /** 出る位置。`end`(右。既定)・`start`(左)・`top`・`bottom`。横幅は `size`(20 / 28 / 40rem) */
  declare placement: DrawerPlacement

  constructor() {
    super()
    this.placement = 'end'
  }

  get #placement(): DrawerPlacement {
    return this.placement in PLACEMENT ? this.placement : 'end'
  }

  protected override dialogClasses(size: DialogSize): string {
    const p = this.#placement
    const across = p === 'start' || p === 'end' ? WIDTH[size] : ''
    return `${BASE} ${PLACEMENT[p]} ${across}`
  }
  protected override panelClasses(): string {
    return PANEL[this.#placement]
  }
}

JimbleDrawer.define('jimble-drawer')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-drawer': JimbleDrawer
  }
}
