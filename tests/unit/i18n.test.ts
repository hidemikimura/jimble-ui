import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getLocale,
  onLocaleChange,
  setLocale,
  setMessages,
  translate,
} from '../../src/i18n/index.ts'
import en from '../../src/locales/en.ts'

afterEach(() => setLocale({ $locale: 'ja' }))

describe('i18n', () => {
  it('既定は日本語', () => {
    expect(getLocale()).toBe('ja')
    expect(translate('alert.dismiss')).toBe('閉じる')
  })

  it('setLocale で切り替わり、足りないキーは日本語にフォールバックする', () => {
    setLocale({ $locale: 'en', 'alert.dismiss': 'Dismiss' })
    expect(getLocale()).toBe('en')
    expect(translate('alert.dismiss')).toBe('Dismiss')
    expect(translate('common.loading')).toBe('読み込み中')
  })

  it('同梱の en 辞書は全キーを持つ', () => {
    setLocale(en)
    for (const key of [
      'common.loading',
      'alert.dismiss',
      'alert.info',
      'alert.success',
      'alert.warning',
      'alert.danger',
    ] as const) {
      expect(translate(key)).not.toMatch(/[ぁ-んァ-ヶ一-龠]/)
    }
  })

  it('setMessages は一部だけ上書きする', () => {
    setMessages({ 'alert.dismiss': '×' })
    expect(translate('alert.dismiss')).toBe('×')
    expect(translate('alert.info')).toBe('情報')
  })

  it('{param} を置換し、関数形の値も使える', () => {
    setMessages({
      'alert.dismiss': 'x{n}件',
      'alert.info': ((p: Record<string, string | number>) =>
        p.n === 1 ? '1 item' : `${p.n} items`) as never,
    })
    expect(translate('alert.dismiss', { n: 3 })).toBe('x3件')
    expect(translate('alert.info', { n: 1 })).toBe('1 item')
    expect(translate('alert.info', { n: 2 })).toBe('2 items')
  })

  it('未定義キーはキー自体を返し、開発時に警告する', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(translate('nope' as never)).toBe('nope')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('変更を購読でき、解除もできる', () => {
    const fn = vi.fn()
    const off = onLocaleChange(fn)
    setLocale(en)
    expect(fn).toHaveBeenCalledTimes(1)
    off()
    setLocale({ $locale: 'ja' })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
