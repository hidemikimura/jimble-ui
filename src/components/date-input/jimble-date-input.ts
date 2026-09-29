import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import {
  addDays,
  addMonths,
  addYears,
  clamp,
  compare,
  formatDate,
  formatPattern,
  isSame,
  monthMatrix,
  parseInput,
  parseISO,
  toISO,
  today,
  weekday,
  type YMD,
} from '../../base/date.js'
import { getLocale } from '../../i18n/index.js'
import { calendarDays } from '../../icons/calendarDays.js'
import { chevronLeft } from '../../icons/chevronLeft.js'
import { chevronRight } from '../../icons/chevronRight.js'
import { renderIcon } from '../../icons/render.js'
import { AFFIX, TEXT_INNER, textWrapClasses } from '../../base/text-control.js'

const ICON_BUTTON =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 outline outline-1 ' +
  'outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const POPUP =
  'rounded-overlay border-0 bg-surface-overlay p-3 text-fg shadow-lg ring-1 ring-inset ring-line ' +
  'outline outline-1 outline-transparent [border-radius:var(--jimble-date-input-popup-radius,var(--radius-overlay))]'
const DAY =
  'inline-flex size-9 items-center justify-center rounded-md text-sm cursor-pointer outline outline-1 ' +
  'outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-40'
const TEXT_BTN =
  'inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-primary-700 cursor-pointer ' +
  'hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/**
 * 日付の入力。テキスト欄に日付を入力するか、カレンダーから選ぶ。値は `YYYY-MM-DD`（例: `2026-09-29`）の文字列で、
 * 表示と入力は言語の書式（日本語なら `2026/09/29`）。フォーム関連カスタム要素。
 *
 * - 入力は `2026/9/29`・`2026-09-29`・`2026年9月29日`・`20260929`・全角の数字でも受け付ける。
 * - カレンダーは WAI-ARIA の date picker dialog パターン（矢印キー・PageUp / PageDown・Home / End）。
 * - `min` / `max`（`YYYY-MM-DD`）の範囲外の日は選べない。
 * - 時刻・期間（範囲選択）は未対応。
 *
 * @tag jimble-date-input
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - テキスト欄
 * @csspart calendar-button - カレンダーを開くボタン
 * @csspart popup - カレンダーの面（role="dialog"）
 * @csspart header - 月の見出しと前後のボタン
 * @csspart title - 「2026年9月」の表示
 * @csspart grid - 日付のグリッド
 * @csspart day - 各日のボタン
 * @csspart footer - 「今日」「クリア」の領域
 *
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - 高さ
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-date-input-popup-radius=var(--jimble-radius-overlay)] - カレンダーの角丸
 *
 * @fires input - 値が変わった（ネイティブと同じ）
 * @fires change - 入力が確定した（blur・Enter・カレンダーで選択・クリア）
 */
export class JimbleDateInput extends JimbleFormElement {
  static implicitSubmitBlocker = true
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    min: {},
    max: {},
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    open: { type: Boolean, reflect: true },
    view: { state: true },
    focusDay: { state: true },
  }

  declare min: string | undefined
  declare max: string | undefined
  declare placeholder: string | undefined
  declare readonly: boolean
  /** 週の最初の曜日（0=日曜、1=月曜 …）。既定 0 */
  declare firstDayOfWeek: number
  /** カレンダーを開いているか */
  declare open: boolean
  declare view: YMD
  declare focusDay: YMD

  #value = ''
  #text = ''
  #typing = false
  #dirty = false
  #fromAttribute = false
  #committed = ''
  #wasOpenOnPointerDown = false
  #titleId = this.uid('date-title')

  /** 現在の日付（`YYYY-MM-DD`）。`value` 属性は初期値（リセット先）、プロパティは現在値 */
  get value(): string {
    return this.#value
  }
  set value(next: string) {
    const old = this.#value
    const ymd = parseISO(String(next ?? ''))
    this.#value = ymd ? toISO(ymd) : ''
    this.#text = ymd ? formatDate(ymd, getLocale()) : ''
    this.#typing = false
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      super.attributeChangedCallback(name, old, value)
      this.#fromAttribute = false
      this.#committed = this.#value
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  constructor() {
    super()
    this.min = undefined
    this.max = undefined
    this.placeholder = undefined
    this.readonly = false
    this.firstDayOfWeek = 0
    this.open = false
    this.view = today()
    this.focusDay = today()
  }

  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null
  }
  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }
  get #calendarButton(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('[part="calendar-button"]') ?? null
  }

  get #minYMD(): YMD | null {
    return parseISO(this.min)
  }
  get #maxYMD(): YMD | null {
    return parseISO(this.max)
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string | null {
    return this.#value || null
  }
  protected resetValue(): void {
    this.#dirty = false
    const ymd = parseISO(this.getAttribute('value'))
    this.#value = ymd ? toISO(ymd) : ''
    this.#text = ymd ? formatDate(ymd, getLocale()) : ''
    this.#typing = false
    this.#committed = this.#value
  }
  protected override restoreValue(state: string): void {
    this.value = state
    this.#committed = this.#value
  }

  protected override computeValidity(): ValidityResult {
    const anchor = this.nativeControl ?? undefined
    const text = this.#text.trim()
    const required = this.required || this.field.required
    if (!text) {
      return required
        ? { flags: { valueMissing: true }, message: this.t('validation.valueMissing'), anchor }
        : { flags: {}, message: '' }
    }
    const parsed = parseInput(text, getLocale())
    if (parsed === 'invalid' || parsed === null) {
      const example = formatDate({ y: 2026, m: 9, d: 29 }, getLocale())
      return {
        flags: { badInput: true },
        message: this.t('validation.dateFormat', { example }),
        anchor,
      }
    }
    const [min, max] = [this.#minYMD, this.#maxYMD]
    if (min && compare(parsed, min) < 0) {
      return {
        flags: { rangeUnderflow: true },
        message: this.t('validation.rangeUnderflow', { min: formatDate(min, getLocale()) }),
        anchor,
      }
    }
    if (max && compare(parsed, max) > 0) {
      return {
        flags: { rangeOverflow: true },
        message: this.t('validation.rangeOverflow', { max: formatDate(max, getLocale()) }),
        anchor,
      }
    }
    return { flags: {}, message: '' }
  }

  // ---- 値の更新 ------------------------------------------------------------------------
  #emit(type: 'input' | 'change') {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
  }

  /** 確定した値が変わっていたら change を出す */
  #commitChange() {
    if (this.#value === this.#committed) return
    this.#committed = this.#value
    this.#emit('change')
  }

  #onInput = (event: Event) => {
    this.#text = (event.target as HTMLInputElement).value
    this.#typing = true
    const parsed = parseInput(this.#text, getLocale())
    const ymd = parsed && parsed !== 'invalid' ? parsed : null
    this.#value = ymd ? toISO(ymd) : ''
    this.#dirty = true
    this.requestUpdate('value')
    this.commit()
  }

  /** 入力を確定する(blur・Enter)。有効な日付は正規の書式に整える */
  #settle() {
    this.#typing = false
    const ymd = parseISO(this.#value)
    if (ymd) this.#text = formatDate(ymd, getLocale())
    this.requestUpdate()
    this.#commitChange()
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (this.ime.isComposing(event)) return
    if (
      event.key === 'ArrowDown' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !this.readonly &&
      !this.isDisabled
    ) {
      event.preventDefault()
      this.#settle()
      this.#openCalendar()
      return
    }
    if (event.key === 'Enter') this.#settle()
    handleImplicitSubmit(event, this.form, this.isDisabled, this.ime)
  }

  // ---- カレンダー ----------------------------------------------------------------------
  #selectDay(day: YMD) {
    const min = this.#minYMD
    const max = this.#maxYMD
    if ((min && compare(day, min) < 0) || (max && compare(day, max) > 0)) return
    this.#setFromCalendar(toISO(day))
  }

  #setFromCalendar(iso: string) {
    const changed = iso !== this.#value
    this.value = iso
    this.commit()
    if (changed) this.#emit('input')
    this.#commitChange()
    this.#closeToInput()
  }

  #closeToInput() {
    this.nativeControl?.focus()
    const popup = this.#popup
    if (popup?.matches(':popover-open')) popup.hidePopover()
    this.open = false
  }

  #openCalendar() {
    const base = parseISO(this.#value) ?? today()
    const day = clamp(base, this.#minYMD, this.#maxYMD)
    this.view = { y: day.y, m: day.m, d: 1 }
    this.focusDay = day
    this.open = true
  }

  #onButtonPointerDown = () => {
    this.#wasOpenOnPointerDown = this.open
  }
  #onButtonClick = () => {
    const wasOpen = this.#wasOpenOnPointerDown
    this.#wasOpenOnPointerDown = false
    if (wasOpen || this.isDisabled || this.readonly) return
    this.#settle()
    this.#openCalendar()
  }

  #moveFocus(day: YMD) {
    const target = clamp(day, this.#minYMD, this.#maxYMD)
    this.focusDay = target
    this.view = { y: target.y, m: target.m, d: 1 }
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLElement>(`[data-date="${toISO(target)}"]`)?.focus(),
    )
  }

  #onGridKeydown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const day = this.focusDay
    const first = this.firstDayOfWeek
    const wd = weekday(day)
    const fromWeekStart = (wd - first + 7) % 7
    let next: YMD
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(day, -1)
        break
      case 'ArrowRight':
        next = addDays(day, 1)
        break
      case 'ArrowUp':
        next = addDays(day, -7)
        break
      case 'ArrowDown':
        next = addDays(day, 7)
        break
      case 'Home':
        next = addDays(day, -fromWeekStart)
        break
      case 'End':
        next = addDays(day, 6 - fromWeekStart)
        break
      case 'PageUp':
        next = event.shiftKey ? addYears(day, -1) : addMonths(day, -1)
        break
      case 'PageDown':
        next = event.shiftKey ? addYears(day, 1) : addMonths(day, 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.#selectDay(day)
        return
      case 'Escape':
        event.preventDefault()
        this.#closeToInput()
        return
      default:
        return
    }
    event.preventDefault()
    this.#moveFocus(next)
  }

  #shiftMonth(n: number) {
    const v = addMonths({ ...this.view, d: 1 }, n)
    this.view = v
    this.focusDay = clamp(
      { y: v.y, m: v.m, d: Math.min(this.focusDay.d, 28) },
      this.#minYMD,
      this.#maxYMD,
    )
  }

  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen) this.open = isOpen
    else if (isOpen) {
      void this.updateComplete.then(() =>
        this.renderRoot
          .querySelector<HTMLElement>(`[data-date="${toISO(this.focusDay)}"]`)
          ?.focus(),
      )
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const popup = this.#popup
    if (popup && changed.has('open')) {
      const shown = popup.matches(':popover-open')
      if (this.open && !shown) popup.showPopover()
      else if (!this.open && shown) popup.hidePopover()
    }
    this.#calendarButton?.setAttribute('aria-expanded', String(this.open))
  }

  // 言語が変わったら、入力していない間は表示の書式を合わせる
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const ymd = parseISO(this.#value)
    if (ymd && !this.#typing) this.#text = formatDate(ymd, getLocale())
  }

  // ---- 描画 ----------------------------------------------------------------------------
  #renderDay(day: YMD | null, selected: YMD | null, now: YMD) {
    if (!day) return html`<td role="presentation"></td>`
    const min = this.#minYMD
    const max = this.#maxYMD
    const disabled = !!((min && compare(day, min) < 0) || (max && compare(day, max) > 0))
    const isSel = isSame(day, selected)
    const isToday = isSame(day, now)
    const label = new Intl.DateTimeFormat(getLocale(), {
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(day.y, day.m - 1, day.d)))
    const cls = `${DAY} ${isSel ? 'bg-primary-600 text-fg-on-primary font-semibold' : isToday ? 'text-primary-700 font-semibold ring-1 ring-inset ring-primary-600 hover:bg-surface-sunken' : 'text-fg hover:bg-surface-sunken'}`
    return html`<td role="gridcell" aria-selected=${isSel ? 'true' : 'false'}>
      <button
        part="day"
        type="button"
        class=${cls}
        tabindex=${isSame(day, this.focusDay) ? 0 : -1}
        data-date=${toISO(day)}
        aria-label=${label}
        aria-current=${isToday ? 'date' : nothing}
        ?disabled=${disabled}
        @click=${() => this.#selectDay(day)}
      >
        ${day.d}
      </button>
    </td>`
  }

  protected override render() {
    const locale = getLocale()
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const selected = parseISO(this.#value)
    const now = today()
    const weeks = monthMatrix(this.view.y, this.view.m, this.firstDayOfWeek)
    const weekdayFmt = (style: 'short' | 'long', i: number) =>
      new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
        new Date(Date.UTC(2024, 0, 7 + ((this.firstDayOfWeek + i) % 7))),
      )
    const title = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(this.view.y, this.view.m - 1, 1)))
    const min = this.#minYMD
    const max = this.#maxYMD
    const todayDisabled = !!((min && compare(now, min) < 0) || (max && compare(now, max) > 0))
    return html`<div
        part="base"
        class=${textWrapClasses(this.size, invalid, disabled, 'items-center')}
      >
        <input
          part="input"
          class=${TEXT_INNER}
          type="text"
          autocomplete="off"
          .value=${this.#text}
          name=${ifDefined(this.name || undefined)}
          placeholder=${this.placeholder ?? formatPattern(locale)}
          ?disabled=${disabled}
          ?readonly=${this.readonly}
          ?required=${this.required || this.field.required}
          aria-label=${ifDefined(this.accessibleName())}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy)}
          @input=${this.#onInput}
          @keydown=${this.#onKeydown}
          @blur=${() => this.#settle()}
          @change=${(e: Event) => e.stopPropagation()}
        />
        <span class=${AFFIX}>
          <button
            part="calendar-button"
            type="button"
            class=${ICON_BUTTON}
            aria-label=${this.t('date.openCalendar')}
            aria-haspopup="dialog"
            aria-expanded="false"
            ?disabled=${disabled || this.readonly}
            @pointerdown=${this.#onButtonPointerDown}
            @click=${this.#onButtonClick}
          >
            ${renderIcon(calendarDays, 'size-5')}
          </button>
        </span>
      </div>
      <div
        part="popup"
        popover="auto"
        role="dialog"
        aria-label=${this.t('date.calendar')}
        class=${POPUP}
        @toggle=${this.#onToggle}
      >
        <div part="header" class="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            class=${ICON_BUTTON}
            aria-label=${this.t('date.previousMonth')}
            @click=${() => this.#shiftMonth(-1)}
          >
            ${renderIcon(chevronLeft, 'size-5')}
          </button>
          <div part="title" id=${this.#titleId} aria-live="polite" class="text-sm font-semibold">
            ${title}
          </div>
          <button
            type="button"
            class=${ICON_BUTTON}
            aria-label=${this.t('date.nextMonth')}
            @click=${() => this.#shiftMonth(1)}
          >
            ${renderIcon(chevronRight, 'size-5')}
          </button>
        </div>
        <table
          part="grid"
          role="grid"
          aria-labelledby=${this.#titleId}
          class="border-separate border-spacing-0"
          @keydown=${this.#onGridKeydown}
        >
          <thead>
            <tr>
              ${Array.from(
                { length: 7 },
                (_, i) =>
                  html`<th
                    scope="col"
                    class="size-9 text-center text-xs font-medium text-fg-muted"
                    aria-label=${weekdayFmt('long', i)}
                  >
                    ${weekdayFmt('short', i)}
                  </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${weeks.map(
              (w) =>
                html`<tr>
                  ${w.map((d) => this.#renderDay(d, selected, now))}
                </tr>`,
            )}
          </tbody>
        </table>
        <div part="footer" class="mt-2 flex items-center justify-between">
          <button
            type="button"
            class=${TEXT_BTN}
            ?disabled=${todayDisabled}
            @click=${() => this.#selectDay(now)}
          >
            ${this.t('date.today')}
          </button>
          <button type="button" class=${TEXT_BTN} @click=${() => this.#setFromCalendar('')}>
            ${this.t('date.clear')}
          </button>
        </div>
      </div>
      ${this.renderDescriptions()}`
  }
}

JimbleDateInput.define('jimble-date-input')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-date-input': JimbleDateInput
  }
}
