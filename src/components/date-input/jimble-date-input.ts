import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { handleImplicitSubmit } from '../../base/implicit-submit.js'
import {
  addDays,
  addMonths,
  addYears,
  clamp,
  compare,
  compareDateTime,
  formatDateTime,
  formatDateTimePattern,
  isSame,
  monthMatrix,
  parseDateTimeInput,
  parseISODateTime,
  parseRangeInput,
  toISO,
  toISODateTime,
  today,
  weekday,
  type DateTime,
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
  'inline-flex size-9 items-center justify-center text-sm cursor-pointer outline outline-1 ' +
  'outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-40'
const TEXT_BTN =
  'inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-primary-700 cursor-pointer ' +
  'hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const TIME_INPUT =
  'h-8 w-14 rounded-md bg-surface px-2 text-center text-sm text-fg ring-1 ring-inset ring-line-control ' +
  'outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-1 ' +
  'focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50'

const pad2 = (n: number) => String(n).padStart(2, '0')
type Time = { h: number; m: number }

/**
 * 日付・日時・期間の入力。テキスト欄に入力するか、カレンダー（と時刻の欄）から選ぶ。フォーム関連カスタム要素。
 *
 * | 使い方 | 値の書式 | 例 |
 * | --- | --- | --- |
 * | 日付（既定） | `YYYY-MM-DD` | `2026-09-29` |
 * | 日付と時刻（`time`） | `YYYY-MM-DDTHH:mm` | `2026-09-29T14:30` |
 * | 期間（`range`） | `開始/終了` | `2026-09-01/2026-09-10` |
 * | 期間と時刻（`range time`） | `開始/終了` | `2026-09-01T09:00/2026-09-10T18:30` |
 *
 * - 表示と入力は言語の書式（日本語なら `2026/09/29 14:30`、期間は `2026/09/01 〜 2026/09/10`）。
 *   `2026/9/29`・`2026-09-29`・`2026年9月29日`・`20260929`・`14時30分`・全角の数字でも入力できる。
 * - 期間は、1 回目のクリックで開始日、2 回目で終了日（前後が逆なら入れ替える）。間の日が強調され、選ぶ前にホバーで確認できる。
 * - カレンダーは WAI-ARIA の date picker dialog パターン（矢印キー・PageUp / PageDown・Home / End）。`months="2"` で 2 か月を並べる。
 * - 時刻は 24 時間表記の「時」「分」の欄で、`minute-step` で分の刻みを変えられる。秒・タイムゾーンは扱わない。
 * - `min` / `max`（`YYYY-MM-DD` または `YYYY-MM-DDTHH:mm`）の範囲外の日は選べない。
 * - 日付だけの選択はクリックで閉じる。時刻を伴うときは、時刻を入れられるよう開いたままで、「完了」または Esc で閉じる。
 *
 * @tag jimble-date-input
 *
 * @csspart base - 枠（ring）を持つラッパー
 * @csspart input - テキスト欄
 * @csspart calendar-button - カレンダーを開くボタン
 * @csspart popup - カレンダーの面（role="dialog"）
 * @csspart months - 月のグリッドの並び
 * @csspart header - 月の見出しと前後のボタン
 * @csspart title - 「2026年9月」の表示
 * @csspart grid - 日付のグリッド
 * @csspart day - 各日のボタン
 * @csspart time - 時刻の領域
 * @csspart time-hour - 時の欄
 * @csspart time-minute - 分の欄
 * @csspart footer - 「今日」「クリア」「完了」の領域
 *
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-height=サイズに応じた --jimble-control-height-*] - 高さ
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-date-input-popup-radius=var(--jimble-radius-overlay)] - カレンダーの角丸
 *
 * @fires input - 値が変わった（ネイティブと同じ）
 * @fires change - 入力が確定した（blur・Enter・カレンダーで選択・時刻の変更・クリア）。期間は終了まで選んだとき
 */
export class JimbleDateInput extends JimbleFormElement {
  static implicitSubmitBlocker = true
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    min: {},
    max: {},
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    range: { type: Boolean, reflect: true },
    time: { type: Boolean, reflect: true },
    months: { type: Number },
    minuteStep: { type: Number, attribute: 'minute-step' },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    open: { type: Boolean, reflect: true },
    view: { state: true },
    focusDay: { state: true },
    hoverDay: { state: true },
  }

  declare min: string | undefined
  declare max: string | undefined
  declare placeholder: string | undefined
  declare readonly: boolean
  /** 期間（開始と終了）を選ぶ。値は `開始/終了` */
  declare range: boolean
  /** 時刻（時・分）も選ぶ。値は `YYYY-MM-DDTHH:mm` */
  declare time: boolean
  /** 並べて表示する月の数（1〜3）。既定 1 */
  declare months: number
  /** 分の刻み。既定 1 */
  declare minuteStep: number
  /** 週の最初の曜日（0=日曜、1=月曜 …）。既定 0 */
  declare firstDayOfWeek: number
  /** カレンダーを開いているか */
  declare open: boolean
  declare view: YMD
  declare focusDay: YMD
  declare hoverDay: YMD | null

  // 日付。単一のときは start だけ。期間の途中(1 回目のクリックだけ)は pending に持つ
  #start: YMD | null = null
  #end: YMD | null = null
  #tStart: Time = { h: 0, m: 0 }
  #tEnd: Time = { h: 23, m: 59 }
  #pending: YMD | null = null
  #text = ''
  #typing = false
  #dirty = false
  #fromAttribute = false
  #committed = ''
  #wasOpenOnPointerDown = false
  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined
  #titleId = this.uid('date-title')

  // ---- 値 ------------------------------------------------------------------------------
  #dt(date: YMD | null, t: Time): DateTime | null {
    return date ? { date, h: this.time ? t.h : 0, m: this.time ? t.m : 0 } : null
  }
  get #startDT(): DateTime | null {
    return this.#dt(this.#start, this.#tStart)
  }
  get #endDT(): DateTime | null {
    return this.#dt(this.#end, this.#tEnd)
  }
  #iso(dt: DateTime): string {
    return toISODateTime(dt, this.time)
  }

  /**
   * 現在の値。日付は `YYYY-MM-DD`、`time` なら `YYYY-MM-DDTHH:mm`、`range` なら `開始/終了`。
   * 期間は開始と終了がそろっているときだけ値になる。`value` 属性は初期値（リセット先）、プロパティは現在値
   */
  get value(): string {
    const s = this.#startDT
    if (!s) return ''
    if (!this.range) return this.#iso(s)
    const e = this.#endDT
    return e ? `${this.#iso(s)}/${this.#iso(e)}` : ''
  }
  set value(next: string) {
    const old = this.value
    const raw = String(next ?? '')
    const parts = raw.split('/')
    const a = parseISODateTime(parts[0])
    const b = this.range ? parseISODateTime(parts[1]) : null
    const ok = a && (!this.range || (parts.length === 2 && b))
    this.#start = ok ? a.date : null
    this.#end = ok && this.range && b ? b.date : null
    if (ok) {
      this.#tStart = { h: a.h, m: a.m }
      if (b) this.#tEnd = { h: b.h, m: b.m }
    }
    this.#pending = null
    this.#typing = false
    this.#syncText()
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return
      this.#fromAttribute = true
      super.attributeChangedCallback(name, old, value)
      this.#fromAttribute = false
      this.#committed = this.value
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  /** 期間の開始（`YYYY-MM-DD` または日時）。単一のときは値と同じ */
  get start(): string {
    const s = this.#startDT
    return s ? this.#iso(s) : ''
  }
  /** 期間の終了。`range` でなければ空 */
  get end(): string {
    const e = this.#endDT
    return this.range && e ? this.#iso(e) : ''
  }

  constructor() {
    super()
    this.min = undefined
    this.max = undefined
    this.placeholder = undefined
    this.readonly = false
    this.range = false
    this.time = false
    this.months = 1
    this.minuteStep = 1
    this.firstDayOfWeek = 0
    this.open = false
    this.view = today()
    this.focusDay = today()
    this.hoverDay = null
  }

  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input[part="input"]') ?? null
  }
  get #popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part="popup"]') ?? null
  }
  get #calendarButton(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('[part="calendar-button"]') ?? null
  }
  get #minDT(): DateTime | null {
    return parseISODateTime(this.min)
  }
  get #maxDT(): DateTime | null {
    return parseISODateTime(this.max)
  }
  get #monthCount(): number {
    return Math.min(Math.max(Math.trunc(this.months) || 1, 1), 3)
  }
  get #separator(): string {
    return getLocale().startsWith('ja') ? ' 〜 ' : ' – '
  }

  // ---- 表示の文字 -----------------------------------------------------------------------
  #fmt(dt: DateTime): string {
    return formatDateTime(dt, getLocale(), this.time)
  }
  #formatText(): string {
    const s = this.#startDT
    if (!s) return ''
    const e = this.#endDT
    return this.range && e ? `${this.#fmt(s)}${this.#separator}${this.#fmt(e)}` : this.#fmt(s)
  }
  #syncText() {
    this.#text = this.#formatText()
  }
  #example(): string {
    const at = (h: number) => ({ date: { y: 2026, m: 9, d: 29 }, h, m: 0 })
    const one = this.#fmt(at(14))
    return this.range
      ? `${this.#fmt(at(9))}${this.#separator.trim() ? this.#separator : ' – '}${one}`
      : one
  }
  #placeholder(): string {
    const p = formatDateTimePattern(getLocale(), this.time)
    return this.range ? `${p}${this.#separator}${p}` : p
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string | null {
    return this.value || null
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#fromAttribute = true
    this.#tStart = { h: 0, m: 0 }
    this.#tEnd = { h: 23, m: 59 }
    this.value = this.getAttribute('value') ?? ''
    this.#fromAttribute = false
    this.#committed = this.value
  }
  protected override restoreValue(state: string): void {
    this.value = state
    this.#committed = this.value
  }

  protected override computeValidity(): ValidityResult {
    const anchor = this.nativeControl ?? undefined
    const required = this.required || this.field.required
    const text = this.#text.trim()
    if (!text) {
      return required
        ? { flags: { valueMissing: true }, message: this.t('validation.valueMissing'), anchor }
        : { flags: {}, message: '' }
    }
    const s = this.#startDT
    const e = this.#endDT
    if (!s) {
      return {
        flags: { badInput: true },
        message: this.t('validation.dateFormat', { example: this.#example() }),
        anchor,
      }
    }
    if (this.range && !e) {
      return { flags: { badInput: true }, message: this.t('validation.rangeIncomplete'), anchor }
    }
    if (this.range && e && compareDateTime(e, s) < 0) {
      return { flags: { customError: true }, message: this.t('validation.rangeOrder'), anchor }
    }
    const cmp = (a: DateTime, b: DateTime) =>
      this.time ? compareDateTime(a, b) : compare(a.date, b.date)
    const min = this.#minDT
    const max = this.#maxDT
    if (min && [s, e].some((x) => x && cmp(x, min) < 0)) {
      return {
        flags: { rangeUnderflow: true },
        message: this.t('validation.rangeUnderflow', { min: this.#fmt(min) }),
        anchor,
      }
    }
    if (max && [s, e].some((x) => x && cmp(x, max) > 0)) {
      return {
        flags: { rangeOverflow: true },
        message: this.t('validation.rangeOverflow', { max: this.#fmt(max) }),
        anchor,
      }
    }
    return { flags: {}, message: '' }
  }

  // ---- イベントと確定 -------------------------------------------------------------------
  #emit(type: 'input' | 'change') {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
  }
  /** 確定した値が変わっていたら change を出す */
  #commitChange() {
    const v = this.value
    if (v === this.#committed) return
    this.#committed = v
    this.#emit('change')
  }
  /** カレンダー・時刻・クリアでの値の変更を、input と change で通知する */
  #changed() {
    this.#typing = false
    this.#syncText()
    this.commit()
    this.requestUpdate()
    this.#emit('input')
    this.#commitChange()
  }
  #announce(text: string) {
    this.#announcement = text
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, 3000)
    this.requestUpdate()
  }

  // ---- テキスト入力 ---------------------------------------------------------------------
  #onInput = (event: Event) => {
    this.#text = (event.target as HTMLInputElement).value
    this.#typing = true
    this.#pending = null
    const locale = getLocale()
    if (this.range) {
      const r = parseRangeInput(this.#text, locale, this.time)
      this.#start = r && r !== 'invalid' ? r.start.date : null
      this.#end = r && r !== 'invalid' ? (r.end?.date ?? null) : null
      if (r && r !== 'invalid') {
        this.#tStart = { h: r.start.h, m: r.start.m }
        if (r.end) this.#tEnd = { h: r.end.h, m: r.end.m }
      }
    } else {
      const p = parseDateTimeInput(this.#text, locale, this.time)
      this.#start = p && p !== 'invalid' ? p.date : null
      this.#end = null
      if (p && p !== 'invalid') this.#tStart = { h: p.h, m: p.m }
    }
    this.#dirty = true
    this.requestUpdate('value')
    this.commit()
  }

  /** 入力を確定する(blur・Enter)。有効な値は正規の書式に整える */
  #settle() {
    this.#typing = false
    if (this.#start) this.#syncText()
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
  #dayDisabled(day: YMD): boolean {
    const min = this.#minDT?.date
    const max = this.#maxDT?.date
    return !!((min && compare(day, min) < 0) || (max && compare(day, max) > 0))
  }

  #selectDay(day: YMD) {
    if (this.#dayDisabled(day)) return
    this.focusDay = day
    if (!this.range) {
      this.#start = day
      this.#end = null
      this.#changed()
      if (!this.time) this.#closeToInput()
      return
    }
    if (!this.#pending) {
      this.#pending = day
      this.hoverDay = day
      this.#announce(
        `${this.#fmtDay(day)} (${this.t('date.rangeStartDay')})。${this.t('date.pickEnd')}`,
      )
      this.requestUpdate()
      return
    }
    const a = this.#pending
    this.#pending = null
    this.hoverDay = null
    const [s, e] = compare(day, a) < 0 ? [day, a] : [a, day]
    this.#start = s
    this.#end = e
    this.#changed()
    this.#announce(this.t('date.rangeSelected', { start: this.#fmtDay(s), end: this.#fmtDay(e) }))
    if (!this.time) this.#closeToInput()
  }
  #fmtDay(day: YMD): string {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'full', timeZone: 'UTC' }).format(
      new Date(Date.UTC(day.y, day.m - 1, day.d)),
    )
  }

  #clear = () => {
    this.#start = null
    this.#end = null
    this.#pending = null
    this.#changed()
    this.#closeToInput()
  }
  #pickToday = () => {
    const now = today()
    if (this.#dayDisabled(now)) return
    this.#selectDay(now)
  }
  #done = () => {
    this.#settle()
    this.#closeToInput()
  }

  #closeToInput() {
    this.nativeControl?.focus()
    const popup = this.#popup
    if (popup?.matches(':popover-open')) popup.hidePopover()
    this.open = false
  }

  #openCalendar() {
    const base = this.#start ?? today()
    const day = clamp(base, this.#minDT?.date ?? null, this.#maxDT?.date ?? null)
    this.view = { y: day.y, m: day.m, d: 1 }
    this.focusDay = day
    this.#pending = null
    this.hoverDay = null
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

  /** target の月が表示範囲に入るように view を動かす */
  #ensureVisible(target: YMD) {
    const idx = target.y * 12 + target.m - (this.view.y * 12 + this.view.m)
    if (idx < 0) this.view = { y: target.y, m: target.m, d: 1 }
    else if (idx >= this.#monthCount) {
      this.view = addMonths({ y: target.y, m: target.m, d: 1 }, -(this.#monthCount - 1))
    }
  }
  #moveFocus(day: YMD) {
    const target = clamp(day, this.#minDT?.date ?? null, this.#maxDT?.date ?? null)
    this.focusDay = target
    this.#ensureVisible(target)
    if (this.#pending) this.hoverDay = target
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLElement>(`[data-date="${toISO(target)}"]`)?.focus(),
    )
  }

  #onGridKeydown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const day = this.focusDay
    const fromWeekStart = (weekday(day) - this.firstDayOfWeek + 7) % 7
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
    this.view = addMonths({ ...this.view, d: 1 }, n)
    const idx = this.focusDay.y * 12 + this.focusDay.m - (this.view.y * 12 + this.view.m)
    if (idx < 0 || idx >= this.#monthCount) {
      this.focusDay = clamp(
        { y: this.view.y, m: this.view.m, d: Math.min(this.focusDay.d, 28) },
        this.#minDT?.date ?? null,
        this.#maxDT?.date ?? null,
      )
    }
  }

  #onToggle = (e: Event) => {
    const isOpen = (e as ToggleEvent).newState === 'open'
    if (this.open !== isOpen) this.open = isOpen
    if (isOpen) {
      void this.updateComplete.then(() =>
        this.renderRoot
          .querySelector<HTMLElement>(`[data-date="${toISO(this.focusDay)}"]`)
          ?.focus(),
      )
    } else {
      // 閉じたとき(外側のクリックなど)。選びかけの期間は捨て、値が変わっていれば確定する
      this.#pending = null
      this.hoverDay = null
      this.#settle()
    }
  }

  // ---- 時刻 ----------------------------------------------------------------------------
  #timeOf(which: 'start' | 'end'): Time {
    return which === 'start' ? this.#tStart : this.#tEnd
  }
  #setTime(which: 'start' | 'end', part: 'h' | 'm', raw: string) {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    const t = { ...this.#timeOf(which), [part]: Math.min(Math.max(n, 0), part === 'h' ? 23 : 59) }
    if (which === 'start') this.#tStart = t
    else this.#tEnd = t
    this.#typing = false
    this.#syncText()
    this.commit()
    this.requestUpdate('value')
  }
  #onTimeInput = (which: 'start' | 'end', part: 'h' | 'm') => (event: Event) => {
    this.#setTime(which, part, (event.target as HTMLInputElement).value)
  }
  #onTimeChange = (which: 'start' | 'end', part: 'h' | 'm') => (event: Event) => {
    event.stopPropagation()
    const input = event.target as HTMLInputElement
    this.#setTime(which, part, input.value)
    input.value = pad2(this.#timeOf(which)[part])
    this.#commitChange()
  }

  // ---- 描画の補助 ----------------------------------------------------------------------
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // 言語・モードが変わったら、入力していない間は表示の書式を合わせる
    if (!this.#typing) this.#syncText()
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

  /** 期間の強調に使う範囲(確定済み、または選びかけの開始とホバー) */
  #rangeBounds(): { from: YMD; to: YMD } | null {
    if (!this.range) return null
    if (this.#pending && this.hoverDay) {
      return compare(this.hoverDay, this.#pending) < 0
        ? { from: this.hoverDay, to: this.#pending }
        : { from: this.#pending, to: this.hoverDay }
    }
    return this.#start && this.#end ? { from: this.#start, to: this.#end } : null
  }

  #renderDay(day: YMD | null) {
    if (!day) return html`<td role="presentation"></td>`
    const now = today()
    const disabled = this.#dayDisabled(day)
    const bounds = this.#rangeBounds()
    const pendingStart = this.#pending
    const isStart = this.range
      ? pendingStart
        ? isSame(day, bounds?.from) && isSame(day, pendingStart)
        : isSame(day, this.#start)
      : isSame(day, this.#start)
    const isEnd = this.range && !pendingStart && isSame(day, this.#end)
    const previewEdge =
      !!pendingStart && !!bounds && (isSame(day, bounds.from) || isSame(day, bounds.to))
    const inRange = !!bounds && compare(day, bounds.from) >= 0 && compare(day, bounds.to) <= 0
    const edge = isStart || isEnd || previewEdge
    const isToday = isSame(day, now)
    let label = this.#fmtDay(day)
    if (this.range && isStart) label += ` (${this.t('date.rangeStartDay')})`
    else if (isEnd) label += ` (${this.t('date.rangeEndDay')})`
    const cls = `${DAY} ${
      edge
        ? 'rounded-md bg-primary-600 text-fg-on-primary font-semibold'
        : inRange
          ? 'rounded-none bg-primary-100 text-fg hover:bg-primary-200'
          : isToday
            ? 'rounded-md text-primary-700 font-semibold ring-1 ring-inset ring-primary-600 hover:bg-surface-sunken'
            : 'rounded-md text-fg hover:bg-surface-sunken'
    }`
    return html`<td role="gridcell" aria-selected=${edge || inRange ? 'true' : 'false'}>
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
        @pointerenter=${() => {
          if (this.#pending && !isSame(this.hoverDay, day)) this.hoverDay = day
        }}
        @focus=${() => {
          if (this.#pending && !isSame(this.hoverDay, day)) this.hoverDay = day
        }}
      >
        ${day.d}
      </button>
    </td>`
  }

  #renderMonth(i: number) {
    const locale = getLocale()
    const first = addMonths({ y: this.view.y, m: this.view.m, d: 1 }, i)
    const weeks = monthMatrix(first.y, first.m, this.firstDayOfWeek)
    const weekdayFmt = (style: 'short' | 'long', n: number) =>
      new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
        new Date(Date.UTC(2024, 0, 7 + ((this.firstDayOfWeek + n) % 7))),
      )
    const title = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(first.y, first.m - 1, 1)))
    const count = this.#monthCount
    const titleId = `${this.#titleId}-${i}`
    const spacer = html`<span class="size-7 shrink-0"></span>`
    return html`<div>
      <div part="header" class="mb-2 flex items-center justify-between gap-2">
        ${
          i === 0
            ? html`<button
                type="button"
                class=${ICON_BUTTON}
                aria-label=${this.t('date.previousMonth')}
                @click=${() => this.#shiftMonth(-1)}
              >
                ${renderIcon(chevronLeft, 'size-5')}
              </button>`
            : spacer
        }
        <div
          part="title"
          id=${titleId}
          aria-live=${i === 0 ? 'polite' : 'off'}
          class="text-sm font-semibold"
        >
          ${title}
        </div>
        ${
          i === count - 1
            ? html`<button
                type="button"
                class=${ICON_BUTTON}
                aria-label=${this.t('date.nextMonth')}
                @click=${() => this.#shiftMonth(1)}
              >
                ${renderIcon(chevronRight, 'size-5')}
              </button>`
            : spacer
        }
      </div>
      <table
        part="grid"
        role="grid"
        aria-labelledby=${titleId}
        aria-multiselectable=${this.range ? 'true' : nothing}
        class="border-separate border-spacing-0"
        @keydown=${this.#onGridKeydown}
      >
        <thead>
          <tr>
            ${Array.from(
              { length: 7 },
              (_, n) =>
                html`<th
                  scope="col"
                  class="size-9 text-center text-xs font-medium text-fg-muted"
                  aria-label=${weekdayFmt('long', n)}
                >
                  ${weekdayFmt('short', n)}
                </th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${weeks.map(
            (w) =>
              html`<tr>
                ${w.map((d) => this.#renderDay(d))}
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`
  }

  #renderTimeRow(which: 'start' | 'end', label: string) {
    const t = this.#timeOf(which)
    const has = which === 'start' ? !!this.#start : !!this.#end
    const step = Math.max(Math.trunc(this.minuteStep) || 1, 1)
    return html`<div role="group" aria-label=${label} class="flex items-center gap-2">
      ${this.range ? html`<span class="w-10 text-sm text-fg-muted">${which === 'start' ? this.t('date.timeStart') : this.t('date.timeEnd')}</span>` : nothing}
      <input
        part="time-hour"
        type="number"
        class=${TIME_INPUT}
        min="0"
        max="23"
        step="1"
        inputmode="numeric"
        aria-label=${this.t('date.hour')}
        ?disabled=${!has || this.isDisabled}
        .value=${live(pad2(t.h))}
        @input=${this.#onTimeInput(which, 'h')}
        @change=${this.#onTimeChange(which, 'h')}
      />
      <span aria-hidden="true">:</span>
      <input
        part="time-minute"
        type="number"
        class=${TIME_INPUT}
        min="0"
        max="59"
        step=${step}
        inputmode="numeric"
        aria-label=${this.t('date.minute')}
        ?disabled=${!has || this.isDisabled}
        .value=${live(pad2(t.m))}
        @input=${this.#onTimeInput(which, 'm')}
        @change=${this.#onTimeChange(which, 'm')}
      />
    </div>`
  }

  // ---- 描画 ----------------------------------------------------------------------------
  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const now = today()
    const nowDisabled = this.#dayDisabled(now)
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
          placeholder=${this.placeholder ?? this.#placeholder()}
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
        <div part="months" class="flex flex-wrap gap-x-6 gap-y-3">
          ${Array.from({ length: this.#monthCount }, (_, i) => this.#renderMonth(i))}
        </div>
        ${
          this.time
            ? html`<div part="time" class="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                ${
                  this.range
                    ? html`${this.#renderTimeRow('start', this.t('date.startTime'))}${this.#renderTimeRow('end', this.t('date.endTime'))}`
                    : this.#renderTimeRow('start', this.t('date.time'))
                }
              </div>`
            : nothing
        }
        <div part="footer" class="mt-2 flex items-center justify-between gap-2">
          <span class="flex items-center gap-1">
            ${
              this.range
                ? nothing
                : html`<button
                    type="button"
                    class=${TEXT_BTN}
                    ?disabled=${nowDisabled}
                    @click=${this.#pickToday}
                  >
                    ${this.t('date.today')}
                  </button>`
            }
            <button type="button" class=${TEXT_BTN} @click=${this.#clear}>
              ${this.t('date.clear')}
            </button>
          </span>
          ${
            this.time
              ? html`<button type="button" class=${TEXT_BTN} @click=${this.#done}>
                  ${this.t('date.done')}
                </button>`
              : nothing
          }
        </div>
        <div role="status" class="sr-only">${this.#announcement}</div>
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
