import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-progress.js'
import type { JimbleProgress } from './jimble-progress.js'

afterEach(cleanup)
const part = (el: JimbleProgress, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
const width = (e: HTMLElement) => e.getBoundingClientRect().width

describe('jimble-progress', () => {
  it('value の割合だけ棒を満たし、progressbar の値を持つ', async () => {
    const el = await mount<JimbleProgress>(
      html`<div style="width: 200px">
        <jimble-progress label="取り込み" value="25"></jimble-progress>
      </div>`,
    )
    const p = el.querySelector<JimbleProgress>('jimble-progress')!
    expect(width(part(p, 'fill'))).toBeCloseTo(width(part(p, 'track')) * 0.25, 0)
    expect(p.getAttribute('role')).toBe('progressbar')
    expect(p.getAttribute('aria-valuenow')).toBe('25')
    expect(p.getAttribute('aria-valuemax')).toBe('100')
    expect(p.percent).toBe(25)
  })

  it('max を変えると割合が変わり、値は 0〜max に収める', async () => {
    const p = await mount<JimbleProgress>(
      html`<jimble-progress label="件数" value="3" max="12"></jimble-progress>`,
    )
    expect(p.percent).toBe(25)
    expect(p.getAttribute('aria-valuemax')).toBe('12')
    p.value = 50
    await p.updateComplete
    expect(p.percent).toBe(100)
    expect(p.getAttribute('aria-valuenow')).toBe('12')
    p.value = -5
    await p.updateComplete
    expect(p.percent).toBe(0)
  })

  it('value がなければ不確定（aria-valuenow なし・:state(indeterminate)）', async () => {
    const p = await mount<JimbleProgress>(html`<jimble-progress label="準備中"></jimble-progress>`)
    expect(p.hasAttribute('aria-valuenow')).toBe(false)
    expect(p.matches(':state(indeterminate)')).toBe(true)
    expect(p.percent).toBeUndefined()
    p.value = 10
    await p.updateComplete
    expect(p.matches(':state(indeterminate)')).toBe(false)
  })

  it('label を表示し、show-value で割合も出す（読み上げは progressbar の名前と値で伝える）', async () => {
    const p = await mount<JimbleProgress>(
      html`<jimble-progress label="完了の度合い" value="45" show-value></jimble-progress>`,
    )
    expect(part(p, 'label').textContent!.trim()).toBe('完了の度合い')
    expect(part(p, 'value').textContent!.trim()).toBe('45%')
    expect(getComputedStyle(part(p, 'value')).display).not.toBe('none')
  })

  it('variant と --jimble-progress-fill で色が変わる', async () => {
    const a = await mount<JimbleProgress>(
      html`<jimble-progress label="a" value="50"></jimble-progress>`,
    )
    const b = await mount<JimbleProgress>(
      html`<jimble-progress label="b" value="50" variant="danger"></jimble-progress>`,
    )
    const bg = (p: JimbleProgress) => getComputedStyle(part(p, 'fill')).backgroundColor
    expect(bg(a)).not.toBe(bg(b))
    expect(bg(a)).not.toBe('rgba(0, 0, 0, 0)')
    const c = await mount<JimbleProgress>(
      html`<jimble-progress
        label="c"
        value="50"
        style="--jimble-progress-fill: rgb(1, 2, 3)"
      ></jimble-progress>`,
    )
    expect(bg(c)).toBe('rgb(1, 2, 3)')
  })

  it('axe 違反がない（確定・不確定・aria-label で名前を付ける）', async () => {
    const wrap = await mount<HTMLElement>(
      html`<div>
        <jimble-progress label="取り込み" value="60" show-value></jimble-progress>
        <jimble-progress label="準備中"></jimble-progress>
        <jimble-progress aria-label="アップロード" value="10"></jimble-progress>
      </div>`,
    )
    await expectNoA11yViolations(wrap)
  })
})
