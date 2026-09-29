import { describe, expect, it } from 'vitest'
import { fold, matches } from '../../src/base/text-match.ts'

describe('絞り込みの一致判定', () => {
  it('全角/半角・大文字/小文字・ひらがな/カタカナ・空白を区別しない', () => {
    expect(fold('ＴＯＫＹＯ　Tower')).toBe('tokyotower')
    expect(fold('トウキョウ')).toBe('とうきょう')
    expect(matches('とうきょう', 'トウキョウ')).toBe(true)
    expect(matches('ABC', 'abc')).toBe(true)
    expect(matches('ａｂｃ', 'ABC')).toBe(true)
    expect(matches('東 京', '東京都')).toBe(true)
  })

  it('空の検索語は常に一致', () => {
    expect(matches('', '何でも')).toBe(true)
    expect(matches('  ', '何でも')).toBe(true)
  })

  it('部分一致(既定)と前方一致', () => {
    expect(matches('京', '東京都')).toBe(true)
    expect(matches('京', '東京都', '', 'starts-with')).toBe(false)
    expect(matches('東', '東京都', '', 'starts-with')).toBe(true)
  })

  it('keywords(読みなど)でも一致する。区切りは空白・カンマ・読点', () => {
    expect(matches('とうきょう', '東京都', 'とうきょう トウキョウ tokyo')).toBe(true)
    expect(matches('tokyo', '東京都', 'とうきょう,tokyo')).toBe(true)
    expect(matches('osaka', '東京都', 'とうきょう、tokyo')).toBe(false)
    expect(matches('とう', '東京都', 'とうきょう', 'starts-with')).toBe(true)
  })

  it('濁点・半濁点・長音は区別する(勝手に同一視しない)', () => {
    expect(matches('か', 'が')).toBe(false)
    expect(matches('コーヒー', 'こーひー')).toBe(true)
  })
})
