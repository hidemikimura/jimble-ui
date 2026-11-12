import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it } from 'vitest'
import '../button/jimble-button.js'
import '../select/jimble-select.js'
import '../field/jimble-field.js'
import '../input/jimble-input.js'
import { getDeepActiveElement } from '../../base/focus.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { radiusTests } from '../../test/radius.js'
import type { JimbleButton } from '../button/jimble-button.js'
import { JimblePopover } from './jimble-popover.js'

afterEach(cleanup)
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms))
const panel = (el: JimblePopover) => el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
const isOpen = (el: JimblePopover) => panel(el).matches(':popover-open')
const innerButton = (b: Element) => (b as JimbleButton).shadowRoot!.querySelector('button')!
const active = () => getDeepActiveElement()

async function popover(attrs = 'heading="絞り込み"', content = '') {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-popover ${attrs}>
      <jimble-button slot="trigger" id="trigger">条件</jimble-button>
      ${content || '<jimble-field label="キーワード"><jimble-input id="q"></jimble-input></jimble-field><jimble-button id="apply" data-popover-close>適用</jimble-button>'}
    </jimble-popover><input id="after" aria-label="次">`
  const el = c.querySelector('jimble-popover') as JimblePopover
  await el.updateComplete
  await tick()
  return { c, el, trigger: c.querySelector('#trigger') as JimbleButton }
}
function closes(el: JimblePopover) {
  const reasons: string[] = []
  el.addEventListener('jimble-close', (e) => reasons.push((e as CustomEvent).detail.reason))
  return reasons
}

describe('jimble-popover', () => {
  it('トリガーを押すと開き、もう一度押すと閉じる。トリガーは dialog を開くことを伝える', async () => {
    const { el, trigger } = await popover()
    expect(innerButton(trigger).getAttribute('aria-haspopup')).toBe('dialog')
    expect(innerButton(trigger).getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(innerButton(trigger))
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(el.open).toBe(true)
    expect(innerButton(trigger).getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(innerButton(trigger))
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(el.open).toBe(false)
  })

  it('パネルは role="dialog" で、名前は heading（または label）', async () => {
    const { el } = await popover()
    const p = panel(el)
    expect(p.getAttribute('role')).toBe('dialog')
    expect(p.hasAttribute('aria-modal')).toBe(false)
    const labelledby = p.getAttribute('aria-labelledby')!
    expect(el.shadowRoot!.getElementById(labelledby)!.textContent!.trim()).toBe('絞り込み')
    const { el: other } = await popover('label="表示の設定"')
    expect(panel(other).getAttribute('aria-label')).toBe('表示の設定')
    expect(panel(other).hasAttribute('aria-labelledby')).toBe(false)
  })

  it('開くと、中の最初のフォーカスできる要素へ。autofocus があればそちら', async () => {
    const { el, c } = await popover()
    el.show()
    await tick()
    expect(
      active()?.closest?.('jimble-input') ?? (active()?.getRootNode() as ShadowRoot).host,
    ).toBe(c.querySelector('#q'))
    const { el: el2, c: c2 } = await popover(
      'heading="x"',
      '<jimble-input aria-label="a"></jimble-input><jimble-button id="b2" autofocus>決定</jimble-button>',
    )
    el2.show()
    await tick()
    expect((active()?.getRootNode() as ShadowRoot).host).toBe(c2.querySelector('#b2'))
  })

  it('フォーカスできる要素がなければ、パネル自身へ', async () => {
    const { el } = await popover('label="説明"', '<p>Ctrl+S で保存します。</p>')
    el.show()
    await tick()
    expect(active()).toBe(panel(el))
  })

  it('Esc で閉じて、トリガーへ戻る（reason: escape）', async () => {
    const { el, trigger } = await popover()
    const reasons = closes(el)
    await userEvent.click(innerButton(trigger))
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(reasons).toEqual(['escape'])
    expect(active()).toBe(innerButton(trigger))
  })

  it('外側をクリックすると閉じる（reason: outside）', async () => {
    const { el, c } = await popover()
    const reasons = closes(el)
    el.show()
    await tick()
    await userEvent.click(c.querySelector('#after')!)
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(reasons).toEqual(['outside'])
  })

  it('Tab でパネルの外へ出ると閉じる（reason: tab）。中での Tab は閉じない', async () => {
    const { el, c } = await popover(
      'heading="x" hide-close-button',
      '<jimble-input id="a" aria-label="a"></jimble-input><jimble-input id="b" aria-label="b"></jimble-input>',
    )
    const reasons = closes(el)
    el.show()
    await tick()
    ;(c.querySelector('#b') as HTMLElement).focus()
    await tick()
    expect(isOpen(el)).toBe(true)
    ;(c.querySelector('#after') as HTMLElement).focus()
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(reasons).toEqual(['tab'])
  })

  it('data-popover-close の要素と、閉じるボタンで閉じて、トリガーへ戻る', async () => {
    const { el, c, trigger } = await popover()
    const reasons = closes(el)
    el.show()
    await tick()
    await userEvent.click(innerButton(c.querySelector('#apply')!))
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(active()).toBe(innerButton(trigger))
    el.show()
    await tick()
    await userEvent.click(el.shadowRoot!.querySelector<HTMLElement>('[part="close-button"]')!)
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(reasons).toEqual(['close-button', 'close-button'])
  })

  it('heading がなければ見出しの行と閉じるボタンを出さない。hide-close-button でも消せる', async () => {
    const { el } = await popover('label="x"', '<p>本文</p>')
    expect(getComputedStyle(el.shadowRoot!.querySelector('[part="header"]')!).display).toBe('none')
    const { el: el2 } = await popover('heading="見出し" hide-close-button', '<p>本文</p>')
    expect(el2.shadowRoot!.querySelector('[part="close-button"]')).toBeNull()
  })

  it('中のセレクトを開いて選んでも、閉じない（設計書 §22.1 のスパイク S1）', async () => {
    const { el, c } = await popover(
      'heading="x"',
      '<jimble-select id="s" aria-label="役割"><jimble-option value="a">A</jimble-option><jimble-option value="b">B</jimble-option></jimble-select>',
    )
    el.show()
    await tick()
    const select = c.querySelector('#s') as HTMLElement & { value: string }
    await userEvent.click(select.shadowRoot!.querySelector('button')!)
    await tick(150)
    await userEvent.click(c.querySelectorAll('jimble-option')[1]!)
    await tick(150)
    expect(select.value).toBe('b')
    expect(isOpen(el)).toBe(true)
  })

  it('jimble-open / jimble-close は 1 回ずつ。hide() は reason: api', async () => {
    const { el } = await popover()
    let opened = 0
    el.addEventListener('jimble-open', () => opened++)
    const reasons = closes(el)
    el.show()
    await tick()
    el.show()
    await tick()
    el.hide()
    await tick()
    expect(opened).toBe(1)
    expect(reasons).toEqual(['api'])
  })

  it('幅は --jimble-popover-width で変えられ、画面の幅を超えない', async () => {
    const { el } = await popover('heading="x" style="--jimble-popover-width: 15rem"')
    el.show()
    await tick()
    expect(panel(el).getBoundingClientRect().width).toBe(240)
  })

  it('axe 違反がない（開いた状態）', async () => {
    const { el, c } = await popover()
    el.show()
    await tick()
    await expectNoA11yViolations(c)
  })
})

radiusTests('--jimble-popover-radius', async () => {
  const { el } = await popover()
  el.show()
  await tick()
  return { host: el, target: panel(el) }
})
