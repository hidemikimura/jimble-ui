import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleElement } from '../../base/jimble-element.js'
import { SlotController } from '../../base/slot-controller.js'
import { check } from '../../icons/check.js'
import { exclamationCircle } from '../../icons/exclamationCircle.js'
import { renderIcon } from '../../icons/render.js'

export type StepperOrientation = 'horizontal' | 'vertical'
export type StepperSize = 'sm' | 'md'
export type StepStatus = 'complete' | 'current' | 'upcoming'

/** `jimble-step-change` の `detail` */
export interface StepChangeDetail {
  /** 選ばれた段階の `value` */
  value: string
}

/** 横に並べる最小の幅。これより狭いと、縦に並べる */
const NARROW_WIDTH = 512

/** 段階から、親のステッパーへ伝える窓口(部品の外には見せない) */
interface StepperHub {
  /** 段階の `value`・`disabled` が変わった(全体を数え直す) */
  resync(): void
  /** 利用者が、選べる段階を選んだ */
  select(step: JimbleStep): void
}
const hubs = new WeakMap<JimbleStepper, StepperHub>()

/**
 * 段階を踏む入力（予約の登録など）の、今の位置と進み具合を見せる。`jimble-step` を並べる。
 *
 * 状態は `value`（今の段階の `value`）から決まる: 前の段階は「済」、今は「現在」、後は「未」。
 * 利用者が操作しても `value` は変わらない（アプリが決める）。`navigable` を付けると、済の段階を押して選べて、
 * `jimble-step-change` が出る（未の段階・現在の段階・`disabled` は選べない）。
 * `value` が空のときは、先頭が現在。`value` が、どの段階にも合わないときは、現在の段階がない（すべて未）。
 *
 * スクリーンリーダーには、`nav`（`label`）の中の順序付きリストとして、「3/8 プラン：済」のように、
 * 番号・総数・名前・状態が伝わる（文言は辞書）。色だけに頼らず、済はチェック、エラーは警告のアイコンで示す。
 * 横に並べるときも、幅が約 32rem より狭いと、縦に並ぶ。
 *
 * @tag jimble-stepper
 *
 * @slot - jimble-step
 *
 * @csspart base - nav 要素
 * @csspart list - 段階を並べる領域
 *
 * @cssprop [--jimble-stepper-complete-color=var(--jimble-color-primary-600)] - 済の段階の丸と、済のつなぎ線の色
 * @cssprop [--jimble-stepper-current-color=var(--jimble-color-primary-600)] - 現在の段階の枠と番号の色
 * @cssprop [--jimble-stepper-upcoming-color=var(--jimble-color-ring-control)] - 未の段階の枠の色
 * @cssprop [--jimble-stepper-connector-color=var(--jimble-color-ring-divider)] - 済でないつなぎ線の色
 *
 * @fires jimble-step-change - `navigable` で、済の段階が選ばれた。`detail` は `{ value }`。`value` は、アプリが変える
 */
export class JimbleStepper extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    orientation: { reflect: true },
    size: { reflect: true },
    navigable: { type: Boolean, reflect: true },
    label: {},
    _narrow: { state: true },
  }

  /** 今の段階の `jimble-step` の `value` */
  declare value: string
  declare orientation: StepperOrientation
  declare size: StepperSize
  /** 済の段階を押して選べるようにする（`jimble-step-change`） */
  declare navigable: boolean
  /** nav の名前。省略すると「進行状況」（辞書） */
  declare label: string | undefined
  declare _narrow: boolean

  #resizer?: ResizeObserver
  #syncQueued = false

  constructor() {
    super()
    this.value = ''
    this.orientation = 'horizontal'
    this.size = 'md'
    this.navigable = false
    this.label = undefined
    this._narrow = false
    hubs.set(this, {
      resync: this.#queueSync,
      select: (step) => {
        if (this.navigable)
          this.emit<StepChangeDetail>('step-change', { detail: { value: step.effectiveValue } })
      },
    })
  }

  get #vertical(): boolean {
    return this.orientation === 'vertical' || this._narrow
  }

  get #steps(): JimbleStep[] {
    return [...this.querySelectorAll<JimbleStep>(':scope > jimble-step')]
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#resizer ??= new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? NARROW_WIDTH
      this._narrow = width > 0 && width < NARROW_WIDTH
    })
    this.#resizer.observe(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#resizer?.disconnect()
  }

  // 段階が増減・変更されたときは、マイクロタスクで 1 回にまとめて数え直す
  #queueSync = () => {
    if (this.#syncQueued) return
    this.#syncQueued = true
    queueMicrotask(() => {
      this.#syncQueued = false
      this.#sync()
    })
  }

  /** 段階ごとに、番号・総数・状態を決めて伝える */
  #sync() {
    const steps = this.#steps
    const values = steps.map((s) => s.effectiveValue)
    const found = this.value === '' ? 0 : values.indexOf(this.value)
    if (found < 0 && __DEV__ && steps.length) {
      this.warn(`value="${this.value}" に合う jimble-step がありません。`)
    }
    steps.forEach((step, i) => {
      const status: StepStatus =
        found < 0 || i > found ? 'upcoming' : i < found ? 'complete' : 'current'
      step.apply({
        index: i + 1,
        total: steps.length,
        status,
        last: i === steps.length - 1,
        vertical: this.#vertical,
        size: this.size,
        interactive: this.navigable && status === 'complete' && !step.disabled,
      })
    })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.#sync()
  }

  protected override render() {
    return html`<nav part="base" aria-label=${this.label ?? this.t('stepper.label')}>
      <ol
        part="list"
        class=${`m-0 flex list-none p-0 ${this.#vertical ? 'flex-col' : 'items-start gap-x-2'}`}
      >
        <slot @slotchange=${this.#queueSync}></slot>
      </ol>
    </nav>`
  }
}
JimbleStepper.define('jimble-stepper')

interface StepApply {
  index: number
  total: number
  status: StepStatus
  last: boolean
  vertical: boolean
  size: StepperSize
  interactive: boolean
}

const INDICATOR_SIZE: Record<StepperSize, string> = {
  sm: 'size-6 text-xs',
  md: 'size-8 text-sm',
}
const FOCUS =
  'outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

/**
 * ステッパーの 1 段階。既定スロットが段階の名前、`description` スロットが補足（選んだ値の要約など）。
 * 状態（済・現在・未）と番号は、親の `jimble-stepper` が決める。`error` を付けると、警告のアイコンと色で示す。
 *
 * @tag jimble-step
 *
 * @slot - 段階の名前
 * @slot description - 補足（選んだ値の要約など）
 *
 * @csspart base - ルート要素（押せるときはボタン）
 * @csspart indicator - 番号・チェック・警告のアイコンの丸
 * @csspart label - 名前
 * @csspart description - 補足
 * @csspart connector - 次の段階へのつなぎ線（最後の段階にはない）
 *
 * @cssstate vertical - 縦並び（`orientation="vertical"`、または幅が狭いとき）
 */
export class JimbleStep extends JimbleElement {
  static override properties: PropertyDeclarations = {
    value: { reflect: true },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _state: { state: true },
  }

  /** この段階の値（親の `value` と照らす）。省略すると、並び順の番号（"1"、"2"…） */
  declare value: string
  /** この段階に誤りがある */
  declare error: boolean
  /** 選べない（`navigable` のとき）。表示は変わらない */
  declare disabled: boolean
  declare _state: StepApply

  #slots = new SlotController(this)

  constructor() {
    super()
    this.value = ''
    this.error = false
    this.disabled = false
    this._state = {
      index: 1,
      total: 1,
      status: 'upcoming',
      last: true,
      vertical: false,
      size: 'md',
      interactive: false,
    }
  }

  /** 親が照らす値（`value` が空なら、並び順の番号） */
  get effectiveValue(): string {
    return this.value || String(this._state.index)
  }

  /** 親が、番号・状態などを伝える(変わったときだけ描き直す) */
  apply(next: StepApply): void {
    const prev = this._state
    const same = (Object.keys(next) as (keyof StepApply)[]).every((k) => prev[k] === next[k])
    if (same) return
    this._state = next
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#hub?.resync()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#hub?.resync()
  }

  get #hub(): StepperHub | undefined {
    const stepper = this.closest('jimble-stepper')
    return stepper ? hubs.get(stepper) : undefined
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.internals.role = 'listitem'
    this.internals.ariaCurrent = this._state.status === 'current' ? 'step' : null
    this.setState('vertical', this._state.vertical)
    if (changed.has('value') || changed.has('disabled')) this.#hub?.resync()
  }

  #select = () => this.#hub?.select(this)

  protected override render() {
    const { index, total, status, last, vertical, size, interactive } = this._state
    const tone = this.error ? 'error' : status
    const labelColor = {
      error: 'text-fg-danger',
      complete: 'text-fg',
      current: 'text-fg font-semibold',
      upcoming: 'text-fg-muted',
    }[tone]
    // 丸: 済は塗りつぶし、現在・未は枠、エラーは危険色の枠(色は公開変数。既定は意味トークン)
    const indicatorTone = {
      error:
        'text-fg-danger [background-color:var(--color-surface-danger)] [border-color:currentColor]',
      complete:
        'text-fg-on-primary [background-color:var(--jimble-stepper-complete-color,var(--color-primary-600))] [border-color:var(--jimble-stepper-complete-color,var(--color-primary-600))]',
      current:
        '[color:var(--jimble-stepper-current-color,var(--color-fg-accent))] [border-color:var(--jimble-stepper-current-color,var(--color-primary-600))] [background-color:var(--color-surface)]',
      upcoming:
        'text-fg-muted [border-color:var(--jimble-stepper-upcoming-color,var(--color-line-control))] [background-color:var(--color-surface)]',
    }[tone]
    const indicator = html`<span
      part="indicator"
      aria-hidden="true"
      class=${`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-medium outline outline-1 outline-transparent ${INDICATOR_SIZE[size]} ${indicatorTone}`}
      >${
        this.error
          ? renderIcon(exclamationCircle, size === 'sm' ? 'size-4' : 'size-5')
          : status === 'complete'
            ? renderIcon(check, size === 'sm' ? 'size-4' : 'size-5')
            : index
      }</span
    >`
    const statusText = this.error
      ? this.t('stepper.error')
      : this.t(`stepper.${status}` as 'stepper.current')
    const text = html`<span class="flex min-w-0 flex-col text-start">
      <span part="label" class=${`text-sm break-words ${labelColor}`}
        ><span class="sr-only">${this.t('stepper.position', { index, total })}</span><slot></slot
        ><span class="sr-only">${statusText}</span></span
      >
      <span
        part="description"
        class=${`text-xs break-words text-fg-muted ${this.#slots.hasSlot('description') ? '' : 'hidden'}`}
        ><slot name="description"></slot
      ></span>
    </span>`
    const connectorTone =
      status === 'complete'
        ? '[background-color:var(--jimble-stepper-complete-color,var(--color-primary-600))]'
        : '[background-color:var(--jimble-stepper-connector-color,var(--color-line-divider))]'
    const connector = last
      ? nothing
      : html`<span
          part="connector"
          aria-hidden="true"
          class=${
            vertical
              ? `mt-1 w-0.5 flex-1 min-h-6 ${connectorTone}`
              : `mx-2 mt-[calc(var(--_ind)_/_2)] h-0.5 min-w-4 flex-1 ${connectorTone}`
          }
        ></span>`
    // 縦: 左に丸とつなぎ線、右に名前と補足。横: 丸と名前の右に、つなぎ線
    const inner = vertical
      ? html`<span class="flex flex-col items-center">${indicator}${connector}</span
          ><span class=${`min-w-0 pt-1 ${last ? '' : 'pb-6'}`}>${text}</span>`
      : html`${indicator}${text}`
    const layout = vertical ? 'flex w-full gap-3 text-start' : 'flex items-start gap-3 text-start'
    const body = interactive
      ? html`<button
          part="base"
          type="button"
          class=${`${layout} rounded-md cursor-pointer ${FOCUS}`}
          @click=${this.#select}
        >
          ${inner}
        </button>`
      : html`<span part="base" class=${layout}>${inner}</span>`
    const style = `--_ind:${size === 'sm' ? '1.5rem' : '2rem'}`
    return vertical
      ? html`<span class="flex" style=${style}>${body}</span>`
      : html`<span class="flex items-start" style=${style}>${body}${connector}</span>`
  }
}
JimbleStep.define('jimble-step')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-stepper': JimbleStepper
    'jimble-step': JimbleStep
  }
  interface HTMLElementEventMap {
    'jimble-step-change': CustomEvent<StepChangeDetail>
  }
}
