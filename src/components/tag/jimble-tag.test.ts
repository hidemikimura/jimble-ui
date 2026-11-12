import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { setLocale } from '../../i18n/index.js'
import ja from '../../i18n/messages.js'
import en from '../../locales/en.js'
import './jimble-tag.js'
import './jimble-tag-group.js'
import type { JimbleTag, TagRemoveDetail } from './jimble-tag.js'
import type { JimbleTagGroup } from './jimble-tag-group.js'

afterEach(() => {
  cleanup()
  setLocale(ja)
})
const removeButton = (el: JimbleTag) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="remove-button"]')
/** フォーカスのある要素（Shadow DOM の中まで） */
const deepActive = (): Element | null => {
  let a: Element | null = document.activeElement
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
  return a
}

const group = () =>
  mount<JimbleTagGroup>(
    html`<jimble-tag-group label="絞り込みの条件">
      <jimble-tag removable value="open">受付中</jimble-tag>
      <jimble-tag removable value="tokyo">東京</jimble-tag>
      <jimble-tag removable value="vip">VIP</jimble-tag>
    </jimble-tag-group>`,
  )
const tags = (g: JimbleTagGroup) => [...g.querySelectorAll('jimble-tag')]

describe('jimble-tag', () => {
  it('removable でないと×を出さない。removable なら「ラベル を外す」のボタン', async () => {
    const plain = await mount<JimbleTag>(html`<jimble-tag>東京</jimble-tag>`)
    expect(removeButton(plain)).toBeNull()

    const el = await mount<JimbleTag>(html`<jimble-tag removable> 東京 </jimble-tag>`)
    const button = removeButton(el)!
    expect(button.getAttribute('aria-label')).toBe('東京 を外す')
    expect(button.type).toBe('button')
  })

  it('×を押すと jimble-remove（value、無ければラベル）を出し、自分を外す', async () => {
    const g = await group()
    const [first] = tags(g)
    const seen: string[] = []
    first!.addEventListener('jimble-remove', (e) =>
      seen.push((e as CustomEvent<TagRemoveDetail>).detail.value),
    )
    removeButton(first!)!.click()
    expect(seen).toEqual(['open'])
    expect(first!.isConnected).toBe(false)
    expect(tags(g)).toHaveLength(2)

    const noValue = await mount<JimbleTag>(html`<jimble-tag removable>大阪</jimble-tag>`)
    let value = ''
    noValue.addEventListener('jimble-remove', (e) => {
      value = (e as CustomEvent<TagRemoveDetail>).detail.value
    })
    removeButton(noValue)!.click()
    expect(value).toBe('大阪')
  })

  it('preventDefault() すると外さない', async () => {
    const el = await mount<JimbleTag>(html`<jimble-tag removable>東京</jimble-tag>`)
    el.addEventListener('jimble-remove', (e) => e.preventDefault())
    removeButton(el)!.click()
    expect(el.isConnected).toBe(true)
  })

  it('外したら、フォーカスは次のタグの×、無ければ前のタグの×、最後は群に移る', async () => {
    const g = await group()
    const [a, b, c] = tags(g)
    removeButton(b!)!.focus()
    removeButton(b!)!.click()
    expect(deepActive()).toBe(removeButton(c!))

    removeButton(c!)!.click()
    expect(deepActive()).toBe(removeButton(a!))

    removeButton(a!)!.click()
    expect(deepActive()).toBe(g.shadowRoot!.querySelector('[part="base"]'))
  })

  it('×にフォーカスがある間は、Delete・Backspace でも外せる', async () => {
    const g = await group()
    const [a, b] = tags(g)
    removeButton(a!)!.focus()
    await userEvent.keyboard('{Delete}')
    expect(a!.isConnected).toBe(false)
    expect(deepActive()).toBe(removeButton(b!))
    await userEvent.keyboard('{Backspace}')
    expect(b!.isConnected).toBe(false)
  })

  it('次・前が外せないタグなら飛ばす', async () => {
    const g = await mount<JimbleTagGroup>(
      html`<jimble-tag-group>
        <jimble-tag removable>A</jimble-tag>
        <jimble-tag>固定</jimble-tag>
        <jimble-tag removable>C</jimble-tag>
      </jimble-tag-group>`,
    )
    const [a, , c] = tags(g)
    removeButton(a!)!.click()
    expect(deepActive()).toBe(removeButton(c!))
  })

  it('色と角丸は CSS 変数で変えられる', async () => {
    const el = await mount<JimbleTag>(
      html`<jimble-tag
        style="--jimble-tag-bg: rgb(1, 2, 3); --jimble-tag-text: rgb(4, 5, 6); --jimble-tag-radius: 7px"
        >東京</jimble-tag
      >`,
    )
    const style = getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
    expect(style.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(style.color).toBe('rgb(4, 5, 6)')
    expect(style.borderRadius).toBe('7px')
  })

  it('大きさは size で変わる（sm 20px・md 24px）', async () => {
    const height = (el: JimbleTag) =>
      el.shadowRoot!.querySelector('[part="base"]')!.getBoundingClientRect().height
    const md = await mount<JimbleTag>(html`<jimble-tag removable>東京</jimble-tag>`)
    const sm = await mount<JimbleTag>(html`<jimble-tag removable size="sm">東京</jimble-tag>`)
    expect(height(md)).toBe(24)
    expect(height(sm)).toBe(20)
  })

  it('言語を変えると、×の名前も変わる', async () => {
    const el = await mount<JimbleTag>(html`<jimble-tag removable>Tokyo</jimble-tag>`)
    setLocale(en)
    await el.updateComplete
    expect(removeButton(el)!.getAttribute('aria-label')).toBe('Remove Tokyo')
  })

  it('群は label を role="group" の名前にし、折り返して並べる', async () => {
    const g = await group()
    const base = g.shadowRoot!.querySelector('[part="base"]')!
    expect(base.getAttribute('role')).toBe('group')
    expect(base.getAttribute('aria-label')).toBe('絞り込みの条件')
    expect(getComputedStyle(base).flexWrap).toBe('wrap')
  })

  it('axe 違反がない', async () => {
    const g = await group()
    await expectNoA11yViolations(g)
  })
})
