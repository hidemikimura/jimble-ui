// 余白の段階（密度。設計書 §23）。dist/density.css（tokens/density.generated.css）を読み込み、
// data-jimble-density で、部品の高さと余白が変わることを、3 つのブラウザで確かめる。
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, mount } from '../test/mount.js'
import '../components/button/jimble-button.js'
import '../components/card/jimble-card.js'
import '../components/input/jimble-input.js'
import density from '../../tokens/density.generated.css?raw'

const styles: HTMLStyleElement[] = []
function addCss(css: string) {
  const s = document.createElement('style')
  s.textContent = css
  document.head.append(s)
  styles.push(s)
}
afterEach(() => {
  for (const s of styles.splice(0)) s.remove()
  cleanup()
})
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms))
const base = (host: Element) => host.shadowRoot!.querySelector<HTMLElement>('[part="base"]')!

/** 段階を付けた入れ物に、ボタン・入力欄・カードを置いて、高さと余白を測る */
async function measure(level?: string, style = '') {
  addCss(density)
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<section ${level ? `data-jimble-density="${level}"` : ''} style="${style}">
      <jimble-button>保存</jimble-button>
      <jimble-input aria-label="名前"></jimble-input>
      <jimble-card>本文</jimble-card>
    </section>`
  await tick()
  const q = (s: string) => c.querySelector(s)!
  return {
    button: base(q('jimble-button')).getBoundingClientRect().height,
    input: base(q('jimble-input')).getBoundingClientRect().height,
    cardPadding: parseFloat(
      getComputedStyle(q('jimble-card').shadowRoot!.querySelector('[part="body"]')!).paddingTop,
    ),
  }
}

describe('余白の段階（data-jimble-density）', () => {
  it('付けなければ、これまでどおり（ボタン・入力欄 36px、カードの余白 16px）', async () => {
    expect(await measure()).toEqual({ button: 36, input: 36, cardPadding: 16 })
  })

  it.each([
    ['compact', 32, 12],
    ['default', 36, 16],
    ['comfortable', 40, 20],
    ['spacious', 44, 24],
  ])('%s: 高さ %dpx、カードの余白 %dpx', async (level, height, padding) => {
    expect(await measure(level)).toEqual({ button: height, input: height, cardPadding: padding })
  })

  it('入れ子にした段階が優先する（ゆとりのあるページの中の、詰めた表など）', async () => {
    addCss(density)
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<div data-jimble-density="spacious">
        <jimble-button id="outer">外</jimble-button>
        <div data-jimble-density="compact"><jimble-button id="inner">中</jimble-button></div>
      </div>`
    await tick()
    const h = (id: string) => base(c.querySelector(`#${id}`)!).getBoundingClientRect().height
    expect(h('outer')).toBe(44)
    expect(h('inner')).toBe(32)
  })

  it('利用者が書いた変数は、段階より優先する', async () => {
    expect((await measure('spacious', '--jimble-control-height-md: 3.5rem')).button).toBe(56)
  })
})
