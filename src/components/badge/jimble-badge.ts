import { html } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

// 各 variant は、既定の色を private 変数（--_bg など）で持つ。公開変数 `--jimble-badge-*` を書くと、そちらが勝つ。
// 枠の色（--_rc）は、20% の透明度で使う（元のクラスと同じ）。
const VARIANT: Record<BadgeVariant, string> = {
  neutral:
    '[--_bg:var(--color-surface-sunken)] [--_fg:var(--color-fg-secondary)] [--_rc:var(--color-line-control)]',
  primary:
    '[--_bg:var(--color-surface-accent)] [--_fg:var(--color-fg-accent)] [--_rc:var(--color-icon-accent)]',
  success:
    '[--_bg:var(--color-surface-success)] [--_fg:var(--color-fg-success)] [--_rc:var(--color-icon-success)]',
  warning:
    '[--_bg:var(--color-surface-warning)] [--_fg:var(--color-fg-warning)] [--_rc:var(--color-icon-warning)]',
  danger:
    '[--_bg:var(--color-surface-danger)] [--_fg:var(--color-fg-danger)] [--_rc:var(--color-icon-danger)]',
  info: '[--_bg:var(--color-surface-info)] [--_fg:var(--color-fg-info)] [--_rc:var(--color-icon-info)]',
}
const SIZE: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs gap-1',
  md: 'px-2 py-1 text-sm gap-1.5',
}
const BASE =
  'bg-(--jimble-badge-bg,var(--_bg)) [color:var(--jimble-badge-text,var(--_fg))] [--tw-ring-color:var(--jimble-badge-border,color-mix(in_oklab,var(--_rc)_20%,transparent))] ' +
  'inline-flex items-center whitespace-nowrap font-medium ring-1 ring-inset outline outline-1 ' +
  'outline-transparent [border-radius:var(--jimble-badge-radius,var(--radius-md))]'

/**
 * 状態やカテゴリを示す小さなラベル。色だけで意味を伝えないよう、必ず文字を含めること。
 *
 * @tag jimble-badge
 *
 * @slot - ラベル
 * @slot prefix - ラベルの前のアイコンなど
 *
 * 色は variant で選ぶほか、`--jimble-badge-bg` / `-text` / `-border` で自由に決められる（予約の状態や、
 * テナントが選んだラベルの色など）。文字と背景のコントラスト（4.5:1）は、色を決める側で確かめること。
 * `dot` を付けると、ラベルの前に、文字色の小さな丸を出す。
 *
 * @csspart base - ルート要素
 * @csspart prefix - prefix スロットを包む要素
 * @csspart label - ラベルを包む要素
 * @csspart dot - `dot` のときの丸
 *
 * @cssprop [--jimble-badge-radius=var(--jimble-radius-md)] - 角丸
 * @cssprop [--jimble-badge-bg=variant に応じる] - 背景色
 * @cssprop [--jimble-badge-text=variant に応じる] - 文字色
 * @cssprop [--jimble-badge-border=variant に応じる] - 枠の色
 * @cssprop [--jimble-badge-dot-color=文字色] - `dot` の丸の色
 */
export class JimbleBadge extends JimbleElement {
  static override properties = {
    variant: { reflect: true },
    size: { reflect: true },
    dot: { type: Boolean, reflect: true },
  }

  /** 意味（トーン）。未知の値は neutral にフォールバックする */
  declare variant: BadgeVariant
  declare size: BadgeSize
  /** ラベルの前に、色の丸を出す */
  declare dot: boolean

  #slots = new SlotController(this)

  constructor() {
    super()
    this.variant = 'neutral'
    this.size = 'md'
    this.dot = false
  }

  protected override render() {
    const classes = `${BASE} ${VARIANT[this.variant] ?? VARIANT.neutral} ${SIZE[this.size] ?? SIZE.md}`
    return html`<span part="base" class=${classes}
      >${
        this.dot
          ? html`<span
              part="dot"
              aria-hidden="true"
              class="size-1.5 shrink-0 rounded-full [background-color:var(--jimble-badge-dot-color,currentColor)]"
            ></span>`
          : null
      }<span part="prefix" class=${this.#slots.hasSlot('prefix') ? 'inline-flex' : 'hidden'}
        ><slot name="prefix"></slot></span
      ><span part="label"><slot></slot></span
    ></span>`
  }
}

JimbleBadge.define('jimble-badge')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-badge': JimbleBadge
  }
}
