import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// 自動入力の背景色はテストで再現できないので、打ち消す指定が消えないことだけを守る
describe('自動入力(オートフィル)の背景', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/base.css'), 'utf8')

  it('Chromium / Safari: input と textarea の内側をラッパーの背景色で塗りつぶす', () => {
    expect(css).toMatch(/input:-webkit-autofill[\s\S]*-webkit-box-shadow: 0 0 0 100rem var\(--_bg/)
    expect(css).toContain('textarea:-webkit-autofill')
    expect(css).toContain('-webkit-text-fill-color')
  })

  it('Firefox: 背景を透明にする', () => {
    expect(css).toMatch(/input:autofill[\s\S]*background-color: transparent/)
  })
})
