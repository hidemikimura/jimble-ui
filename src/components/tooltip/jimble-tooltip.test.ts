import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../button/jimble-button.js'
import '../dialog/jimble-dialog.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleTooltip } from './jimble-tooltip.js'
import './jimble-tooltip.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const popup = (el: JimbleTooltip) => el.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!
const shown = (el: JimbleTooltip) => popup(el).matches(':popover-open')
const btn = (el: JimbleTooltip) => el.querySelector('button')!
/** 表示された/隠れたことを待つ(遅い CI でも、固定の待ち時間に頼らない) */
const opened = (el: JimbleTooltip) =>
  vi.waitFor(() => expect(shown(el)).toBe(true), { timeout: 3000 })
const closed = (el: JimbleTooltip) =>
  vi.waitFor(() => expect(shown(el)).toBe(false), { timeout: 3000 })

async function tip(attrs = '', inner = '<button>保存</button>') {
  const wrap = await mount<HTMLElement>(
    html`<div style="padding: 120px 200px"><div id="host"></div></div>`,
  )
  const host = wrap.querySelector('#host')!
  host.innerHTML = `<jimble-tooltip text="変更内容を保存します" ${attrs}>${inner}</jimble-tooltip>`
  const el = host.firstElementChild as JimbleTooltip
  await el.updateComplete
  return { wrap, el }
}

describe('表示と非表示', () => {
  it('マウスを重ねて delay の後に表示し、離すと消える', async () => {
    // 遅い CI でも「まだ出ていない」を確かめられるよう、待ち時間は長めにする(hover 自体に時間がかかっても間に合う)
    const { el } = await tip('delay="800"')
    await userEvent.hover(btn(el))
    expect(shown(el)).toBe(false)
    await vi.waitFor(() => expect(shown(el)).toBe(true), { timeout: 3000 })
    expect(popup(el).textContent!.trim()).toBe('変更内容を保存します')
    await userEvent.unhover(btn(el))
    await vi.waitFor(() => expect(shown(el)).toBe(false), { timeout: 3000 })
  })

  it('フォーカスでは待たずに表示し、blur で消える', async () => {
    const { el } = await tip('delay="1000"')
    btn(el).focus()
    await opened(el)
    btn(el).blur()
    await closed(el)
  })

  it('Esc で消える(フォーカスが残っていても)。閉じているときの Esc は横取りしない', async () => {
    const { el } = await tip()
    const onKey = vi.fn()
    document.addEventListener('keydown', onKey)
    btn(el).focus()
    await opened(el)
    await userEvent.keyboard('{Escape}')
    await closed(el)
    expect(onKey).not.toHaveBeenCalled() // 開いている間の Esc は、ここで止める
    await userEvent.keyboard('{Escape}')
    expect(onKey).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', onKey)
  })

  it('ツールチップの上へポインターを移しても消えない(hoverable)', async () => {
    const { el } = await tip('delay="0"')
    await userEvent.hover(btn(el))
    await opened(el)
    await userEvent.unhover(btn(el))
    popup(el).dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await tick(250)
    expect(shown(el)).toBe(true)
    popup(el).dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await closed(el)
  })

  it('disabled や text が空のときは出ない。タッチのホバーでは出ない', async () => {
    const { el } = await tip('disabled delay="0"')
    btn(el).focus()
    await tick()
    expect(shown(el)).toBe(false)
    el.disabled = false
    el.text = ''
    await el.updateComplete
    btn(el).blur()
    btn(el).focus()
    await tick()
    expect(shown(el)).toBe(false)
    el.text = '説明'
    await el.updateComplete
    btn(el).blur()
    el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    await tick(80)
    expect(shown(el)).toBe(false)
  })

  it('jimble-open / jimble-close を発火する', async () => {
    const { el } = await tip()
    const events: string[] = []
    el.addEventListener('jimble-open', () => events.push('open'))
    el.addEventListener('jimble-close', () => events.push('close'))
    btn(el).focus()
    await opened(el)
    btn(el).blur()
    await closed(el)
    await vi.waitFor(() => expect(events).toEqual(['open', 'close']), { timeout: 3000 })
  })
})

describe('位置と折り返し', () => {
  const pos = async (attrs: string) => {
    const { el } = await tip(attrs)
    btn(el).focus()
    await opened(el)
    return { t: btn(el).getBoundingClientRect(), p: popup(el).getBoundingClientRect() }
  }

  it('既定は対象の上、bottom は下、left / right は横に出る', async () => {
    const top = await pos('')
    expect(top.p.bottom).toBeLessThanOrEqual(top.t.top)
    cleanup()
    const bottom = await pos('placement="bottom"')
    expect(bottom.p.top).toBeGreaterThanOrEqual(bottom.t.bottom)
    cleanup()
    const left = await pos('placement="left"')
    expect(left.p.right).toBeLessThanOrEqual(left.t.left)
    cleanup()
    const right = await pos('placement="right"')
    expect(right.p.left).toBeGreaterThanOrEqual(right.t.right)
  })

  it('multiline でなければ 1 行、multiline なら折り返して改行も効く', async () => {
    const long = 'とても長い説明文。'.repeat(12)
    const { el } = await tip('', '<button>保存</button>')
    el.text = long
    btn(el).focus()
    await opened(el)
    const oneLine = popup(el).getBoundingClientRect()
    expect(getComputedStyle(popup(el)).whiteSpace).toBe('nowrap')
    el.multiline = true
    await el.updateComplete
    const wrapped = popup(el).getBoundingClientRect()
    expect(getComputedStyle(popup(el)).whiteSpace).toBe('pre-line')
    expect(wrapped.height).toBeGreaterThan(oneLine.height)
    expect(wrapped.width).toBeLessThanOrEqual(320 + 1)
    el.text = '1 行目\n2 行目'
    await el.updateComplete
    expect(popup(el).getBoundingClientRect().height).toBeGreaterThan(oneLine.height)
  })
})

describe('アクセシビリティ', () => {
  it('囲んだ要素に aria-describedby が付き、隠した説明の文字が参照される。text の変更・削除に追従する', async () => {
    const { el } = await tip()
    const id = btn(el).getAttribute('aria-describedby')!
    expect(id).toBeTruthy()
    const desc = el.querySelector(`[id="${id}"]`)!
    expect(desc.textContent).toBe('変更内容を保存します')
    expect(desc.hasAttribute('hidden')).toBe(true)
    el.text = '別の説明'
    await el.updateComplete
    expect(desc.textContent).toBe('別の説明')
    el.text = ''
    await el.updateComplete
    expect(btn(el).hasAttribute('aria-describedby')).toBe(false)
    expect(el.querySelector(`[id="${id}"]`)).toBeNull()
  })

  it('もとの aria-describedby を残し、取り外すとトークンだけ消える', async () => {
    const { wrap, el } = await tip('', '<button aria-describedby="mine">保存</button>')
    expect(btn(el).getAttribute('aria-describedby')!.split(' ')).toContain('mine')
    expect(btn(el).getAttribute('aria-describedby')!.split(' ').length).toBe(2)
    el.remove()
    expect(btn(el).getAttribute('aria-describedby')).toBe('mine')
    void wrap
  })

  it('ポップアップは読み上げから外れる(説明は describedby で伝わる)。axe 違反がない', async () => {
    const { wrap, el } = await tip()
    expect(popup(el).getAttribute('aria-hidden')).toBe('true')
    btn(el).focus()
    await opened(el)
    // フェードが終わってからコントラストを測る(固定の待ち時間だと、遅い CI で、半透明の途中を測って落ちる)
    await vi.waitFor(() => expect(getComputedStyle(popup(el)).opacity).toBe('1'), { timeout: 3000 })
    await expectNoA11yViolations(wrap)
  })

  it('jimble-button を囲むと aria-description が付き、内側の button へ渡る。text を消すと戻る', async () => {
    const { wrap, el } = await tip(
      '',
      '<jimble-button aria-description="元の説明">保存</jimble-button>',
    )
    const jb = el.querySelector('jimble-button') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await jb.updateComplete
    expect(jb.getAttribute('aria-description')).toBe('変更内容を保存します')
    expect(jb.hasAttribute('aria-describedby')).toBe(false)
    expect(jb.shadowRoot!.querySelector('button')!.getAttribute('aria-description')).toBe(
      '変更内容を保存します',
    )
    el.text = ''
    await el.updateComplete
    expect(jb.getAttribute('aria-description')).toBe('元の説明')
    el.text = '再び'
    await el.updateComplete
    await jb.updateComplete
    await expectNoA11yViolations(wrap)
  })
})

describe('余白', () => {
  it('ポップアップの中に余分な空白や改行が入らない(multiline の pre-line で余白として出るため)', async () => {
    const { el } = await tip('multiline')
    el.text = '1 行目\n2 行目'
    btn(el).focus()
    await opened(el)
    expect(popup(el).textContent).toBe('1 行目\n2 行目')
    // 2 行ぶんの高さ + 上下の余白だけ(行の高さは 20px、余白は 6px ずつ)
    expect(Math.round(popup(el).getBoundingClientRect().height)).toBe(2 * 20 + 2 * 6)
  })
})
