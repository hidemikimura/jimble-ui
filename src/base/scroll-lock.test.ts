import { afterEach, describe, expect, it } from 'vitest'
import { lockScroll, unlockScroll } from './scroll-lock.js'

const root = document.documentElement
afterEach(() => {
  // テストが途中で失敗しても、次のテストに影響させない
  unlockScroll()
  unlockScroll()
  unlockScroll()
  delete (root as { clientWidth?: number }).clientWidth
  root.removeAttribute('style')
})
/** スクロールバーが幅を取っている環境を作る(clientWidth を innerWidth より狭くする) */
const withScrollbar = (width: number) =>
  Object.defineProperty(root, 'clientWidth', {
    configurable: true,
    get: () => window.innerWidth - width,
  })

describe('scroll-lock', () => {
  it('overflow: hidden にして、解除で元に戻す。スクロールバーが無ければ余白は足さない', () => {
    withScrollbar(0)
    lockScroll()
    expect(root.style.overflow).toBe('hidden')
    expect(root.style.paddingRight).toBe('')
    unlockScroll()
    expect(root.style.overflow).toBe('')
  })

  it('スクロールバーが幅を取る環境では、その幅を右の余白で補い、解除で戻す(scrollbar-gutter は使わない)', () => {
    withScrollbar(15)
    lockScroll()
    expect(root.style.paddingRight).toBe('15px')
    expect(root.style.scrollbarGutter).toBe('')
    unlockScroll()
    expect(root.style.paddingRight).toBe('')
  })

  it('もとの余白に足す。もとの style も戻す', () => {
    withScrollbar(17)
    root.style.paddingRight = '8px'
    root.style.overflow = 'auto'
    lockScroll()
    expect(root.style.paddingRight).toBe('25px')
    unlockScroll()
    expect(root.style.paddingRight).toBe('8px')
    expect(root.style.overflow).toBe('auto')
  })

  it('重なっても、最後の 1 つが閉じるまで解除されず、余白も二重に足されない', () => {
    withScrollbar(15)
    lockScroll()
    lockScroll()
    expect(root.style.paddingRight).toBe('15px')
    unlockScroll()
    expect(root.style.overflow).toBe('hidden')
    unlockScroll()
    expect(root.style.overflow).toBe('')
    expect(root.style.paddingRight).toBe('')
  })
})
