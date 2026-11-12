import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleRadioGroup } from './jimble-radio-group.js'
import type { JimbleRadio } from './jimble-radio.js'

afterEach(cleanup)
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))

async function group(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-radio-group name="plan" aria-label="プラン" ${attrs}>
      <jimble-radio value="free">無料</jimble-radio>
      <jimble-radio value="pro">Pro</jimble-radio>
      <jimble-radio value="biz" disabled>Business</jimble-radio>
      <jimble-radio value="ent">Enterprise</jimble-radio>
    </jimble-radio-group>`
  const g = f.querySelector('jimble-radio-group') as JimbleRadioGroup
  await g.updateComplete
  await tick()
  return { f, g, radios: [...g.querySelectorAll('jimble-radio')] as JimbleRadio[] }
}

describe('jimble-radio-group', () => {
  it('ロール: グループは radiogroup、ラジオは radio（internals）で checked が反映される', async () => {
    const { g, radios } = await group()
    expect(g.shadowRoot!.querySelector('[part="base"]')!.getAttribute('role')).toBe('radiogroup')
    expect(g.shadowRoot!.querySelector('[part="base"]')!.getAttribute('aria-label')).toBe('プラン')
    await userEvent.click(radios[1]!)
    await radios[1]!.updateComplete
    expect(radios[1]!.matches(':state(checked)')).toBe(true)
    expect(radios[0]!.matches(':state(checked)')).toBe(false)
  })

  it('クリックで選択され、選ばれた value が送信される。input と change が出る', async () => {
    const { f, g, radios } = await group()
    const onChange = vi.fn()
    const onInput = vi.fn()
    g.addEventListener('change', onChange)
    g.addEventListener('input', onInput)
    expect(data(f)).toEqual({})
    await userEvent.click(radios[1]!)
    expect(g.value).toBe('pro')
    expect(data(f)).toEqual({ plan: 'pro' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onInput).toHaveBeenCalledTimes(1)
    await userEvent.click(radios[1]!)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ロービングフォーカス: tabindex 0 は選択中(なければ最初の有効なもの)だけ', async () => {
    const { g, radios } = await group()
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1])
    g.value = 'ent'
    await g.updateComplete
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, -1, 0])
  })

  it('矢印キーで移動と同時に選択(無効はスキップ、端は循環)。Space で選択', async () => {
    const { g, radios } = await group()
    radios[0]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(g.value).toBe('pro')
    expect(document.activeElement).toBe(radios[1])
    await userEvent.keyboard('{ArrowDown}')
    expect(g.value).toBe('ent')
    await userEvent.keyboard('{ArrowRight}')
    expect(g.value).toBe('free')
    await userEvent.keyboard('{ArrowUp}')
    expect(g.value).toBe('ent')
    await userEvent.keyboard('{ArrowLeft}')
    expect(g.value).toBe('pro')
    radios[0]!.focus()
    await userEvent.keyboard(' ')
    expect(g.value).toBe('free')
  })

  it('Tab でグループに入ると選択中のラジオにフォーカスし、次の Tab で出る', async () => {
    const { g, radios } = await group()
    g.value = 'pro'
    await g.updateComplete
    // Tab の移動先になる要素が要る(無いと、新しい Firefox は、ページの外へ出て、フォーカスが残る)
    const next = document.createElement('input')
    next.setAttribute('aria-label', '次の入力欄')
    g.after(next)
    await userEvent.tab()
    expect(document.activeElement).toBe(radios[1])
    await userEvent.tab()
    expect(g.contains(document.activeElement)).toBe(false)
    expect(document.activeElement).toBe(next)
  })

  it('無効なラジオは選べない。グループが disabled なら全部選べず送信もされない', async () => {
    const { f, g, radios } = await group()
    // 無効なラジオは aria-disabled="true" なので、Playwright の click は押せるまで待つ。プログラムから押す
    radios[2]!.click()
    expect(g.value).toBe('')
    g.value = 'pro'
    g.disabled = true
    await g.updateComplete
    await tick()
    expect(radios.every((r) => r.tabIndex === -1)).toBe(true)
    expect(data(f)).toEqual({})
    radios[0]!.click()
    expect(g.value).toBe('pro')
  })

  it('value 属性が初期値で、reset で戻る', async () => {
    const f = await mount<HTMLFormElement>(
      html`<form>
        <jimble-radio-group name="p" value="b" aria-label="x"
          ><jimble-radio value="a">A</jimble-radio
          ><jimble-radio value="b">B</jimble-radio></jimble-radio-group
        >
      </form>`,
    )
    const g = f.querySelector('jimble-radio-group') as JimbleRadioGroup
    await g.updateComplete
    expect(data(f)).toEqual({ p: 'b' })
    await userEvent.click(g.querySelector('jimble-radio[value="a"]')!)
    expect(data(f)).toEqual({ p: 'a' })
    f.reset()
    await g.updateComplete
    expect(g.value).toBe('b')
    expect(
      (g.querySelector('jimble-radio[value="b"]') as JimbleRadio).matches(':state(checked)'),
    ).toBe(true)
  })

  it('required: 未選択だと無効(valueMissing)。メッセージは「いずれかを選択してください」', async () => {
    const { f, g } = await group('required')
    expect(f.checkValidity()).toBe(false)
    expect(g.validity.valueMissing).toBe(true)
    expect(g.validationMessage).toBe('いずれかを選択してください')
    g.value = 'pro'
    await g.updateComplete
    expect(f.checkValidity()).toBe(true)
  })

  it('horizontal で横並びになる', async () => {
    const { radios } = await group('orientation="horizontal"')
    expect(radios[1]!.getBoundingClientRect().top).toBe(radios[0]!.getBoundingClientRect().top)
    const v = await group()
    expect(v.radios[1]!.getBoundingClientRect().top).toBeGreaterThan(
      v.radios[0]!.getBoundingClientRect().top,
    )
  })

  it('選択中は indicator の色が変わる', async () => {
    const { g, radios } = await group()
    const ind = (r: JimbleRadio) => r.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
    const before = getComputedStyle(ind(radios[1]!)).backgroundColor
    g.value = 'pro'
    await g.updateComplete
    await radios[1]!.updateComplete
    expect(getComputedStyle(ind(radios[1]!)).backgroundColor).not.toBe(before)
  })

  for (const [name, attrs] of Object.entries({
    通常: '',
    'required+horizontal': 'required orientation="horizontal"',
    disabled: 'disabled',
  })) {
    it(`axe: ${name}`, async () => {
      const { g } = await group(attrs)
      g.value = 'pro'
      await g.updateComplete
      await expectNoA11yViolations(g.parentElement!)
    })
  }
})

describe('役割と状態を属性にも書く(Playwright などの getByRole で見つかるように)', () => {
  it('ラジオは role="radio"・aria-checked・aria-disabled。選択に追従する', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-radio-group aria-label="サイズ" value="m">
      <jimble-radio value="s">S</jimble-radio><jimble-radio value="m">M</jimble-radio>
      <jimble-radio value="x" disabled>X</jimble-radio></jimble-radio-group>`
    await tick()
    const radios = [...c.querySelectorAll('jimble-radio')] as JimbleRadio[]
    const attrs = (n: string) => radios.map((r) => r.getAttribute(n))
    expect(attrs('role')).toEqual(['radio', 'radio', 'radio'])
    expect(attrs('aria-checked')).toEqual(['false', 'true', 'false'])
    expect(attrs('aria-disabled')).toEqual(['false', 'false', 'true'])
    radios[0]!.click()
    await tick()
    expect(attrs('aria-checked')).toEqual(['true', 'false', 'false'])
  })
})

describe('jimble-radio-group appearance="segmented"', () => {
  const seg = () =>
    mount<JimbleRadioGroup>(
      html`<jimble-radio-group appearance="segmented" aria-label="表示" name="view" value="list">
        <jimble-radio value="list">一覧</jimble-radio>
        <jimble-radio value="card">カード</jimble-radio>
        <jimble-radio value="map" disabled>地図</jimble-radio>
      </jimble-radio-group>`,
    )
  const base = (r: Element) => r.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!

  it('丸い表示部を出さず、横につなげて並べる', async () => {
    const g = await seg()
    const [a, b] = g.radios
    expect(a!.shadowRoot!.querySelector('[part="indicator"]')).toBeNull()
    expect(a!.getBoundingClientRect().top).toBe(b!.getBoundingClientRect().top)
    expect(a!.matches(':state(segmented)')).toBe(true)
  })

  it('選ばれたものは、面と枠で区別する（色だけに頼らない）', async () => {
    const g = await seg()
    const [on, off] = g.radios
    expect(getComputedStyle(base(on!)).boxShadow).not.toBe(getComputedStyle(base(off!)).boxShadow)
    expect(getComputedStyle(base(on!)).backgroundColor).not.toBe(
      getComputedStyle(base(off!)).backgroundColor,
    )
  })

  it('操作と値は、ふつうのラジオと同じ（矢印キーで選び、無効は飛ばす）', async () => {
    const g = await seg()
    const [a, b] = g.radios
    a!.focus()
    a!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    )
    await g.updateComplete
    expect(g.value).toBe('card')
    expect(document.activeElement).toBe(b)
    b!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    )
    await g.updateComplete
    expect(g.value).toBe('list')
  })

  it('appearance を戻すと、ふつうのラジオの見た目になる', async () => {
    const g = await seg()
    g.appearance = 'default'
    await g.updateComplete
    await g.radios[0]!.updateComplete
    expect(g.radios[0]!.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull()
  })

  it('axe 違反がない', async () => {
    const g = await seg()
    await expectNoA11yViolations(g)
  })
})
