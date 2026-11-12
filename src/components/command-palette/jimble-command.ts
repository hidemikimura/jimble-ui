import { css, type PropertyDeclarations } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'

/** コマンド 1 つ（`jimble-command-palette` の候補） */
export interface CommandItem {
  /** 選んだときに `jimble-select` の `detail.value` になる値 */
  value: string
  /** 表示する名前 */
  label: string
  /** 絞り込みで一致させる追加の語（読みなど。空白・カンマ区切り） */
  keywords?: string
  /** グループ名。同じ名前のコマンドが見出し付きでまとまる */
  group?: string
  /** 名前の前のアイコン（`jimble-icon` の名前） */
  icon?: string
  /** 右に表示するショートカット（表示だけ。例 `⌘N`） */
  shortcut?: string
  /** 選んだら、閉じたあとにこのページへ移動する */
  href?: string
  /** 選べない */
  disabled?: boolean
}

/**
 * コマンドパレットのコマンド 1 つ。`jimble-command-palette` の子として書く（画面には出ない。パレットが描く）。
 * 名前は中身の文字。
 *
 * @tag jimble-command
 *
 * @slot - 名前
 */
export class JimbleCommand extends JimbleElement {
  static override styles = [
    css`
      :host {
        display: none !important;
      }
    `,
  ]
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    keywords: { reflect: true },
    group: { reflect: true },
    icon: { reflect: true },
    shortcut: { reflect: true },
    href: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  }

  /** 値（無ければ名前） */
  declare value: string
  /** 絞り込みで一致させる追加の語（読みなど） */
  declare keywords: string
  /** グループ名 */
  declare group: string
  /** 名前の前のアイコン（`jimble-icon` の名前） */
  declare icon: string
  /** 右に表示するショートカット（表示だけ） */
  declare shortcut: string
  /** 選んだら移動するページ */
  declare href: string
  /** 選べない */
  declare disabled: boolean

  constructor() {
    super()
    this.value = ''
    this.keywords = ''
    this.group = ''
    this.icon = ''
    this.shortcut = ''
    this.href = ''
    this.disabled = false
  }

  /** 名前（中身の文字） */
  get label(): string {
    return (this.textContent ?? '').trim()
  }

  /** パレットが扱う形 */
  toItem(): CommandItem {
    return {
      value: this.value || this.label,
      label: this.label,
      keywords: this.keywords || undefined,
      group: this.group || undefined,
      icon: this.icon || undefined,
      shortcut: this.shortcut || undefined,
      href: this.href || undefined,
      disabled: this.disabled,
    }
  }

  protected override render() {
    return null
  }
}

JimbleCommand.define('jimble-command')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-command': JimbleCommand
  }
}
