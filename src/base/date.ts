// 日付の計算(タイムゾーンに依存しない)。日付は {y, m, d} の整数で持ち、値は ISO 文字列 `YYYY-MM-DD`。
// 内部で Date を使うのは、曜日と月末の計算だけ(UTC で行うので、夏時間・タイムゾーンの影響を受けない)。

export interface YMD {
  y: number
  m: number
  d: number
}

const utc = (v: YMD) => {
  const date = new Date(0)
  date.setUTCFullYear(v.y, v.m - 1, v.d) // 0〜99 年が 1900 年代にならないよう setUTCFullYear を使う
  return date
}

export function daysInMonth(y: number, m: number): number {
  return utc({ y, m: m + 1, d: 0 }).getUTCDate()
}

/** 実在する日付か(2026-02-30 などは false) */
export function isValid(v: YMD): boolean {
  return (
    Number.isInteger(v.y) &&
    v.y >= 1000 &&
    v.y <= 9999 &&
    v.m >= 1 &&
    v.m <= 12 &&
    v.d >= 1 &&
    v.d <= daysInMonth(v.y, v.m)
  )
}

/** `YYYY-MM-DD` を厳密に解釈する。不正なら null */
export function parseISO(s: string | null | undefined): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  if (!m) return null
  const v = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
  return isValid(v) ? v : null
}

export const toISO = (v: YMD): string =>
  `${String(v.y).padStart(4, '0')}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`

export const compare = (a: YMD, b: YMD): number => a.y - b.y || a.m - b.m || a.d - b.d
export const isSame = (a: YMD | null | undefined, b: YMD | null | undefined): boolean =>
  !!a && !!b && compare(a, b) === 0

const fromUTC = (date: Date): YMD => ({
  y: date.getUTCFullYear(),
  m: date.getUTCMonth() + 1,
  d: date.getUTCDate(),
})

export function addDays(v: YMD, n: number): YMD {
  const date = utc(v)
  date.setUTCDate(date.getUTCDate() + n)
  return fromUTC(date)
}

/** n か月後。日が月末を超えるときは月末に収める(1/31 の 1 か月後は 2/28 か 2/29) */
export function addMonths(v: YMD, n: number): YMD {
  const index = v.y * 12 + (v.m - 1) + n
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) }
}
export const addYears = (v: YMD, n: number): YMD => addMonths(v, n * 12)

/** 曜日(0=日曜) */
export const weekday = (v: YMD): number => utc(v).getUTCDay()

export function today(): YMD {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

export function clamp(v: YMD, min: YMD | null, max: YMD | null): YMD {
  if (min && compare(v, min) < 0) return min
  if (max && compare(v, max) > 0) return max
  return v
}

/** 月のカレンダー(週ごとの配列)。月の外のマスは null。firstDay は週の最初の曜日(0=日曜) */
export function monthMatrix(y: number, m: number, firstDay: number): (YMD | null)[][] {
  const lead = (weekday({ y, m, d: 1 }) - firstDay + 7) % 7
  const cells: (YMD | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ y, m, d: i + 1 })),
  ]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

/** その言語での年・月・日の並び(例: ja → y m d、en-US → m d y、en-GB → d m y) */
export function localeOrder(locale: string): ('y' | 'm' | 'd')[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).formatToParts(new Date(0))
  const order = parts.flatMap((p) =>
    p.type === 'year'
      ? ['y' as const]
      : p.type === 'month'
        ? ['m' as const]
        : p.type === 'day'
          ? ['d' as const]
          : [],
  )
  return order.length === 3 ? order : ['y', 'm', 'd']
}

/** 表示用の書式(日本語なら 2026/09/29) */
export function formatDate(v: YMD, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .formatToParts(utc(v))
    .map((p) => p.value)
    .join('')
}

/**
 * 入力された文字を日付として解釈する。
 * - 空(空白のみ) → null
 * - 全角の数字・記号も可(NFKC で正規化)。区切りは / - . 年月日 空白 のどれでもよい
 * - 4 桁の年が先頭なら 年月日、そうでなければその言語の並びで解釈する。8 桁の数字(20260929)も可
 * - 解釈できない・実在しない日付 → 'invalid'
 */
export function parseInput(text: string, locale: string): YMD | null | 'invalid' {
  const normalized = text.normalize('NFKC').trim()
  if (!normalized) return null
  const groups = normalized.match(/\d+/g)
  if (!groups || /[^\d\s/.\-年月日]/.test(normalized)) return 'invalid'
  let y: number, m: number, d: number
  if (groups.length === 1 && groups[0]!.length === 8) {
    const s = groups[0]!
    ;[y, m, d] = [Number(s.slice(0, 4)), Number(s.slice(4, 6)), Number(s.slice(6, 8))]
  } else if (groups.length === 3) {
    const [a, b, c] = groups as [string, string, string]
    if (a.length === 4) [y, m, d] = [Number(a), Number(b), Number(c)]
    else {
      const byOrder = {
        [localeOrder(locale)[0]!]: a,
        [localeOrder(locale)[1]!]: b,
        [localeOrder(locale)[2]!]: c,
      } as Record<'y' | 'm' | 'd', string>
      if (byOrder.y.length !== 4) return 'invalid'
      ;[y, m, d] = [Number(byOrder.y), Number(byOrder.m), Number(byOrder.d)]
    }
  } else return 'invalid'
  const v = { y, m, d }
  return isValid(v) ? v : 'invalid'
}

/** 入力の書式の目安(例: ja → yyyy/mm/dd)。プレースホルダー用 */
export function formatPattern(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(0))
    .map((p) =>
      p.type === 'year' ? 'yyyy' : p.type === 'month' ? 'mm' : p.type === 'day' ? 'dd' : p.value,
    )
    .join('')
}

// ---- 日時・期間 ------------------------------------------------------------------------
// 値の書式: 日時は `YYYY-MM-DDTHH:mm`(タイムゾーンなし)、期間は `開始/終了`(ISO 8601 の期間の書き方)。

/** 日付 + 時刻(時・分。タイムゾーンなし) */
export interface DateTime {
  date: YMD
  h: number
  m: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export const compareDateTime = (a: DateTime, b: DateTime): number =>
  compare(a.date, b.date) || a.h - b.h || a.m - b.m

export function isValidTime(h: number, m: number): boolean {
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59
}

/** `YYYY-MM-DD` または `YYYY-MM-DDTHH:mm`。日付だけなら時刻は 00:00。不正なら null */
export function parseISODateTime(s: string | null | undefined): DateTime | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s ?? '')
  if (!match) return null
  const date = parseISO(match[1])
  const h = match[2] === undefined ? 0 : Number(match[2])
  const m = match[3] === undefined ? 0 : Number(match[3])
  return date && isValidTime(h, m) ? { date, h, m } : null
}

/** 値の文字列にする。withTime なら `YYYY-MM-DDTHH:mm`、そうでなければ `YYYY-MM-DD` */
export const toISODateTime = (v: DateTime, withTime: boolean): string =>
  withTime ? `${toISO(v.date)}T${pad2(v.h)}:${pad2(v.m)}` : toISO(v.date)

/** 表示用(日本語なら `2026/09/29 14:30`) */
export function formatDateTime(v: DateTime, locale: string, withTime: boolean): string {
  return withTime
    ? `${formatDate(v.date, locale)} ${pad2(v.h)}:${pad2(v.m)}`
    : formatDate(v.date, locale)
}

/**
 * 入力された文字を日時として解釈する。時刻は `14:30`・`14時30分`・`14時` を末尾に置く(全角も可)。
 * withTime でも時刻が無ければ 00:00。withTime でなければ時刻は無視せず、あれば 'invalid'。
 */
export function parseDateTimeInput(
  text: string,
  locale: string,
  withTime: boolean,
): DateTime | null | 'invalid' {
  let rest = text.normalize('NFKC').trim()
  if (!rest) return null
  let h = 0
  let m = 0
  const time =
    /(?:^|[\sT])(\d{1,2})\s*[:時]\s*(\d{1,2})\s*分?\s*$/.exec(rest) ??
    /(?:^|[\sT])(\d{1,2})\s*時\s*$/.exec(rest)
  if (time) {
    if (!withTime) return 'invalid'
    h = Number(time[1])
    m = time[2] === undefined ? 0 : Number(time[2])
    if (!isValidTime(h, m)) return 'invalid'
    rest = rest.slice(0, time.index).trim()
  }
  const date = parseInput(rest, locale)
  if (date === null) return 'invalid' // 時刻だけ
  if (date === 'invalid') return 'invalid'
  return { date, h, m }
}

/** 期間の区切り(前後に空白のある `-`、`〜`、`~`、`–`、`—`、`to`)。日付の区切りの `-` とは区別する */
const RANGE_SEPARATOR = /\s+[-]\s+|\s*[〜~–—]\s*|\s+to\s+/i

/**
 * 入力された文字を期間として解釈する。終了だけが空なら end が null(入力の途中)。
 * 空 → null。解釈できない → 'invalid'
 */
export function parseRangeInput(
  text: string,
  locale: string,
  withTime: boolean,
): { start: DateTime; end: DateTime | null } | null | 'invalid' {
  const normalized = text.normalize('NFKC').trim()
  if (!normalized) return null
  const parts = normalized.split(RANGE_SEPARATOR).map((s) => s.trim())
  if (parts.length > 2) return 'invalid'
  const start = parseDateTimeInput(parts[0]!, locale, withTime)
  if (!start || start === 'invalid') return 'invalid'
  if (parts.length === 1 || parts[1] === '') return { start, end: null }
  const end = parseDateTimeInput(parts[1]!, locale, withTime)
  if (!end || end === 'invalid') return 'invalid'
  return { start, end }
}

/** 入力の書式の目安(プレースホルダー用): `yyyy/mm/dd hh:mm` など */
export function formatDateTimePattern(locale: string, withTime: boolean): string {
  return withTime ? `${formatPattern(locale)} hh:mm` : formatPattern(locale)
}
