import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import './jimble-stepper.js'
import type { JimbleStep, JimbleStepper } from './jimble-stepper.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))

async function stepper(attrs = '', width = '800px') {
  const c = await mount<HTMLElement>(html`<div style=${`width: ${width}`}></div>`)
  c.innerHTML = `<jimble-stepper label="予約の登録" ${attrs}>
    <jimble-step value="shop">店舗<span slot="description">渋谷店</span></jimble-step>
    <jimble-step value="plan">プラン<span slot="description">カット 60 分</span></jimble-step>
    <jimble-step value="date">日時</jimble-step>
    <jimble-step value="confirm">確認</jimble-step>
  </jimble-stepper>`
  await tick()
  const el = c.querySelector('jimble-stepper') as JimbleStepper
  const steps = [...c.querySelectorAll('jimble-step')] as JimbleStep[]
  return { c, el, steps }
}
const internals = (e: Element) => (e as unknown as { internals: ElementInternals }).internals
const part = (s: JimbleStep, name: string) =>
  s.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
// 読み上げる順の文字（スロットの中身は、Shadow 内の textContent に含まれないので、割り当てられた要素から集める）
const srText = (s: JimbleStep) =>
  [...part(s, 'label')!.childNodes]
    .map((n) =>
      n instanceof HTMLSlotElement
        ? n
            .assignedNodes({ flatten: true })
            .map((a) => a.textContent)
            .join('')
        : (n.textContent ?? ''),
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

describe('状態', () => {
  it('value より前は済、value は現在（aria-current=step）、後は未。親は nav で、リスト', async () => {
    const { el, steps } = await stepper('value="plan"')
    expect(srText(steps[0]!)).toContain('1/4')
    expect(srText(steps[0]!)).toContain('：済')
    expect(srText(steps[1]!)).toContain('：現在')
    expect(srText(steps[2]!)).toContain('：未')
    expect(internals(steps[1]!).ariaCurrent).toBe('step')
    expect(internals(steps[0]!).ariaCurrent).toBeNull()
    expect(internals(steps[0]!).role).toBe('listitem')
    const nav = el.shadowRoot!.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('予約の登録')
    expect(nav.querySelector('ol')).not.toBeNull()
  })

  it('読み上げの文は「3/4 日時：現在」の順（番号・名前・状態）', async () => {
    const { steps } = await stepper('value="date"')
    expect(srText(steps[2]!)).toBe('3/4 日時：現在')
  })

  it('value を変えると状態が変わる。value を空にすると先頭が現在。合わないと、すべて未', async () => {
    const { el, steps } = await stepper('value="shop"')
    el.value = 'date'
    await tick()
    expect(steps.map((s) => internals(s).ariaCurrent)).toEqual([null, null, 'step', null])
    el.value = ''
    await tick()
    expect(internals(steps[0]!).ariaCurrent).toBe('step')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    el.value = 'zzz'
    await tick()
    expect(steps.every((s) => internals(s).ariaCurrent === null)).toBe(true)
    expect(srText(steps[0]!)).toContain('：未')
    warn.mockRestore()
  })

  it('value を省くと、並び順の番号が値になる', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-stepper value="2"><jimble-step>A</jimble-step><jimble-step>B</jimble-step></jimble-stepper>`
    await tick()
    const s = [...c.querySelectorAll('jimble-step')] as JimbleStep[]
    expect(internals(s[1]!).ariaCurrent).toBe('step')
  })

  it('段階を足す・消すと、総数が変わる', async () => {
    const { el, steps } = await stepper('value="shop"')
    el.append(
      Object.assign(document.createElement('jimble-step'), { value: 'x', textContent: '追加' }),
    )
    await tick()
    expect(srText(steps[0]!)).toContain('1/5')
  })

  it('済はチェック、エラーは警告のアイコン、現在・未は番号。丸は読み上げから外れる', async () => {
    const { steps } = await stepper('value="date"')
    steps[1]!.error = true
    await tick()
    expect(part(steps[0]!, 'indicator')!.querySelector('svg')).not.toBeNull()
    expect(part(steps[1]!, 'indicator')!.querySelector('svg')).not.toBeNull()
    expect(srText(steps[1]!)).toContain('：エラーあり')
    expect(part(steps[2]!, 'indicator')!.textContent!.trim()).toBe('3')
    expect(part(steps[3]!, 'indicator')!.textContent!.trim()).toBe('4')
    expect(part(steps[2]!, 'indicator')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('最後の段階には、つなぎ線がない。済のつなぎ線は主色', async () => {
    const { steps } = await stepper('value="date"')
    expect(part(steps[3]!, 'connector')).toBeNull()
    const done = getComputedStyle(part(steps[0]!, 'connector')!).backgroundColor
    const todo = getComputedStyle(part(steps[2]!, 'connector')!).backgroundColor
    expect(done).not.toBe(todo)
  })

  it('description スロットは、中身があるときだけ表示する', async () => {
    const { steps } = await stepper('value="shop"')
    expect(getComputedStyle(part(steps[0]!, 'description')!).display).not.toBe('none')
    expect(getComputedStyle(part(steps[2]!, 'description')!).display).toBe('none')
  })
})

describe('操作（navigable）', () => {
  it('既定は表示だけ。ボタンはない', async () => {
    const { steps } = await stepper('value="plan"')
    expect(steps.every((s) => s.shadowRoot!.querySelector('button') === null)).toBe(true)
  })

  it('済の段階だけ、ボタンになり、押すと jimble-step-change（value は変えない）。Enter でも選べる', async () => {
    const { el, steps } = await stepper('navigable value="date"')
    expect(steps[0]!.shadowRoot!.querySelector('button')).not.toBeNull()
    expect(steps[1]!.shadowRoot!.querySelector('button')).not.toBeNull()
    expect(steps[2]!.shadowRoot!.querySelector('button')).toBeNull() // 現在
    expect(steps[3]!.shadowRoot!.querySelector('button')).toBeNull() // 未
    const seen: string[] = []
    el.addEventListener('jimble-step-change', (e) => seen.push(e.detail.value))
    await userEvent.click(steps[0]!.shadowRoot!.querySelector('button')!)
    steps[1]!.shadowRoot!.querySelector('button')!.focus()
    await userEvent.keyboard('{Enter}')
    expect(seen).toEqual(['shop', 'plan'])
    expect(el.value).toBe('date')
  })

  it('disabled の済の段階は選べない。イベントはバブルしない', async () => {
    const { c, steps } = await stepper('navigable value="date"')
    steps[0]!.disabled = true
    await tick()
    expect(steps[0]!.shadowRoot!.querySelector('button')).toBeNull()
    const outer = vi.fn()
    c.addEventListener('jimble-step-change', outer)
    await userEvent.click(steps[1]!.shadowRoot!.querySelector('button')!)
    expect(outer).not.toHaveBeenCalled()
  })

  it('エラーのある済の段階も選べる（直しに戻るため）', async () => {
    const { steps } = await stepper('navigable value="date"')
    steps[0]!.error = true
    await tick()
    expect(steps[0]!.shadowRoot!.querySelector('button')).not.toBeNull()
  })
})

describe('向きと大きさ', () => {
  it('vertical は縦に並ぶ。幅が狭い横並びも、縦になる', async () => {
    const v = await stepper('value="shop" orientation="vertical"')
    const ol = v.el.shadowRoot!.querySelector('ol')!
    expect(getComputedStyle(ol).flexDirection).toBe('column')
    expect(v.steps[0]!.matches(':state(vertical)')).toBe(true)
    const h = await stepper('value="shop"')
    expect(getComputedStyle(h.el.shadowRoot!.querySelector('ol')!).flexDirection).toBe('row')
    const n = await stepper('value="shop"', '300px')
    expect(getComputedStyle(n.el.shadowRoot!.querySelector('ol')!).flexDirection).toBe('column')
  })

  it('横は、段階が左から右に並ぶ', async () => {
    const { steps } = await stepper('value="shop"')
    const xs = steps.map((s) => s.getBoundingClientRect().left)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    expect(new Set(steps.map((s) => Math.round(s.getBoundingClientRect().top))).size).toBe(1)
  })

  it('size=sm は丸が小さい', async () => {
    const md = await stepper('value="shop"')
    const sm = await stepper('value="shop" size="sm"')
    expect(part(sm.steps[0]!, 'indicator')!.getBoundingClientRect().width).toBeLessThan(
      part(md.steps[0]!, 'indicator')!.getBoundingClientRect().width,
    )
  })
})

describe('見た目の変数', () => {
  it('--jimble-stepper-complete-color で、済の丸の色を変えられる', async () => {
    const { el, steps } = await stepper('value="plan"')
    el.style.setProperty('--jimble-stepper-complete-color', 'rgb(1, 2, 3)')
    expect(getComputedStyle(part(steps[0]!, 'indicator')!).backgroundColor).toBe('rgb(1, 2, 3)')
  })
})

describe('アクセシビリティ', () => {
  it('axe の違反がない（横・縦・navigable・エラー）', async () => {
    const a = await stepper('value="plan" navigable')
    a.steps[2]!.error = true
    await tick()
    await expectNoA11yViolations(a.c)
    const b = await stepper('value="date" orientation="vertical"')
    await expectNoA11yViolations(b.c)
  })
})
