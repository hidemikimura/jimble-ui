import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  addYears,
  clamp,
  compare,
  daysInMonth,
  formatDate,
  formatPattern,
  isValid,
  localeOrder,
  monthMatrix,
  parseInput,
  parseISO,
  toISO,
  weekday,
} from '../../src/base/date.ts'

const v = (y: number, m: number, d: number) => ({ y, m, d })

describe('日付の計算', () => {
  it('月末・うるう年', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2100, 2)).toBe(28) // 100 で割れて 400 で割れない年はうるう年ではない
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
  })

  it('実在する日付だけが有効', () => {
    expect(isValid(v(2026, 2, 30))).toBe(false)
    expect(isValid(v(2026, 13, 1))).toBe(false)
    expect(isValid(v(2026, 0, 1))).toBe(false)
    expect(isValid(v(2026, 9, 29))).toBe(true)
    expect(isValid(v(999, 1, 1))).toBe(false)
  })

  it('ISO の解釈と書き出し(厳密)', () => {
    expect(parseISO('2026-09-29')).toEqual(v(2026, 9, 29))
    expect(toISO(v(2026, 9, 5))).toBe('2026-09-05')
    for (const bad of [
      '2026-9-29',
      '2026/09/29',
      '2026-02-30',
      '',
      null,
      undefined,
      '20260929',
      '2026-09-29T00:00:00',
    ]) {
      expect(parseISO(bad as string), String(bad)).toBeNull()
    }
  })

  it('日・月・年の加算(月末は収める)', () => {
    expect(addDays(v(2026, 12, 31), 1)).toEqual(v(2027, 1, 1))
    expect(addDays(v(2026, 3, 1), -1)).toEqual(v(2026, 2, 28))
    expect(addDays(v(2024, 2, 28), 2)).toEqual(v(2024, 3, 1))
    expect(addMonths(v(2026, 1, 31), 1)).toEqual(v(2026, 2, 28))
    expect(addMonths(v(2024, 1, 31), 1)).toEqual(v(2024, 2, 29))
    expect(addMonths(v(2026, 1, 15), -1)).toEqual(v(2025, 12, 15))
    expect(addMonths(v(2026, 11, 15), 3)).toEqual(v(2027, 2, 15))
    expect(addYears(v(2024, 2, 29), 1)).toEqual(v(2025, 2, 28))
  })

  it('曜日(0=日曜)', () => {
    expect(weekday(v(2026, 9, 29))).toBe(2) // 火曜
    expect(weekday(v(2024, 1, 7))).toBe(0)
    expect(weekday(v(2000, 1, 1))).toBe(6)
  })

  it('比較と範囲への収め', () => {
    expect(compare(v(2026, 1, 1), v(2026, 1, 2))).toBeLessThan(0)
    expect(compare(v(2026, 2, 1), v(2026, 1, 31))).toBeGreaterThan(0)
    expect(clamp(v(2026, 1, 1), v(2026, 3, 1), null)).toEqual(v(2026, 3, 1))
    expect(clamp(v(2026, 9, 1), v(2026, 3, 1), v(2026, 6, 30))).toEqual(v(2026, 6, 30))
    expect(clamp(v(2026, 5, 1), v(2026, 3, 1), v(2026, 6, 30))).toEqual(v(2026, 5, 1))
  })

  it('月のカレンダー: 週の最初の曜日で並びが変わり、週ごとに 7 マス', () => {
    const sun = monthMatrix(2026, 9, 0) // 2026-09-01 は火曜
    expect(sun.every((w) => w.length === 7)).toBe(true)
    expect(sun[0]!.slice(0, 3)).toEqual([null, null, v(2026, 9, 1)])
    expect(sun.flat().filter(Boolean)).toHaveLength(30)
    const mon = monthMatrix(2026, 9, 1)
    expect(mon[0]!.slice(0, 2)).toEqual([null, v(2026, 9, 1)])
    expect(monthMatrix(2026, 2, 0).length).toBe(4) // 2026-02-01 は日曜で 28 日 → ちょうど 4 週
    expect(monthMatrix(2026, 8, 0).length).toBe(6) // 2026-08-01 は土曜で 31 日 → 6 週
    expect(monthMatrix(2026, 2, 0).flat().filter(Boolean)).toHaveLength(28)
  })
})

describe('書式と入力の解釈', () => {
  it('言語ごとの並びと書式', () => {
    expect(localeOrder('ja')).toEqual(['y', 'm', 'd'])
    expect(localeOrder('en-US')).toEqual(['m', 'd', 'y'])
    expect(localeOrder('en-GB')).toEqual(['d', 'm', 'y'])
    expect(formatDate(v(2026, 9, 5), 'ja')).toBe('2026/09/05')
    expect(formatDate(v(2026, 9, 5), 'en-US')).toBe('09/05/2026')
    expect(formatPattern('ja')).toBe('yyyy/mm/dd')
    expect(formatPattern('en-US')).toBe('mm/dd/yyyy')
  })

  it('いろいろな入力を日付として受け付ける', () => {
    const ok = v(2026, 9, 29)
    for (const t of [
      '2026/09/29',
      '2026-09-29',
      '2026.9.29',
      '2026年9月29日',
      '20260929',
      '２０２６／０９／２９',
      ' 2026 9 29 ',
      '2026/9/29',
    ]) {
      expect(parseInput(t, 'ja'), t).toEqual(ok)
    }
  })

  it('言語の並びに従う(年が 4 桁で先頭でないとき)', () => {
    expect(parseInput('09/29/2026', 'en-US')).toEqual(v(2026, 9, 29))
    expect(parseInput('29/09/2026', 'en-GB')).toEqual(v(2026, 9, 29))
    expect(parseInput('09/29/2026', 'ja')).toBe('invalid') // ja は 年/月/日
  })

  it('空は null、解釈できない・実在しないものは invalid', () => {
    expect(parseInput('', 'ja')).toBeNull()
    expect(parseInput('   ', 'ja')).toBeNull()
    for (const t of [
      'abc',
      '2026/13/01',
      '2026/02/30',
      '26/09/29',
      '2026/09',
      '2026/09/29/1',
      '2026-09-29T10:00',
      '明日',
      '2026/9/2x',
    ]) {
      expect(parseInput(t, 'ja'), t).toBe('invalid')
    }
  })
})
