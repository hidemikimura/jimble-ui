// 既製のテーマ（設計書 §4.9）。tokens/themes/<名前>.generated.css を読み込むと、ページ全体、
// または data-jimble-theme を付けた所だけ、色と角丸が変わる。利用者の :root の上書きは、読み込む順によらず勝つ。
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, mount } from '../test/mount.js'
import '../components/button/jimble-button.js'
import ocean from '../../tokens/themes/ocean.generated.css?raw'
import plum from '../../tokens/themes/plum.generated.css?raw'

const styles: HTMLStyleElement[] = []
/** ページ（document）に CSS を足す。テーマの <link> を読み込むのと同じ */
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

/** CSS の色を、ブラウザが計算した形に揃える（比べるため） */
async function computed(color: string) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.style.color = color
  return getComputedStyle(c).color
}

// tailwindcss/theme.css の値
const INDIGO_600 = 'oklch(51.1% 0.262 276.966)' // 既定の primary-600
const BLUE_600 = 'oklch(54.6% 0.245 262.881)' // ocean の primary-600
const VIOLET_600 = 'oklch(54.1% 0.281 293.009)' // plum の primary-600

async function put(markup: string) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = markup
  await tick()
  return c
}
const bg = (c: HTMLElement, selector = 'jimble-button') =>
  getComputedStyle(base(c.querySelector(selector)!)).backgroundColor
const radius = (c: HTMLElement, selector = 'jimble-button') =>
  getComputedStyle(base(c.querySelector(selector)!)).borderTopLeftRadius

describe('既製のテーマ', () => {
  it('読み込まなければ、既定の見た目のまま', async () => {
    const c = await put('<jimble-button variant="primary">保存</jimble-button>')
    expect(bg(c)).toBe(await computed(INDIGO_600))
    expect(radius(c)).toBe('8px') // radius-lg
  })

  it('読み込むと、ページ全体の主色と角丸が変わる', async () => {
    addCss(ocean)
    const c = await put('<jimble-button variant="primary">保存</jimble-button>')
    expect(bg(c)).toBe(await computed(BLUE_600))
    expect(radius(c)).toBe('6px') // ocean は radius-control を radius-md に
  })

  it('data-jimble-theme を付けた所だけ、別のテーマにできる', async () => {
    addCss(ocean)
    addCss(plum) // ページ全体は、後に読み込んだ plum
    const c = await put(
      '<jimble-button id="page" variant="primary">外</jimble-button>' +
        '<section data-jimble-theme="ocean"><jimble-button id="part" variant="primary">中</jimble-button></section>',
    )
    expect(bg(c, '#page')).toBe(await computed(VIOLET_600))
    expect(bg(c, '#part')).toBe(await computed(BLUE_600))
    expect(radius(c, '#part')).toBe('6px')
  })

  it('利用者の :root の上書きは、テーマより後に書かなくても勝つ', async () => {
    addCss(':root { --jimble-color-primary-600: rgb(255, 0, 0); }')
    addCss(ocean)
    const c = await put('<jimble-button variant="primary">保存</jimble-button>')
    expect(bg(c)).toBe('rgb(255, 0, 0)')
  })

  it('ダークでも、テーマの灰色から面の色を作る', async () => {
    addCss(ocean)
    const c = await put('<div style="color-scheme: dark"><jimble-button>取消</jimble-button></div>')
    // secondary の背景は surface（ダークでは neutral-900 = slate-900）
    expect(bg(c)).toBe(await computed('oklch(20.8% 0.042 265.755)'))
  })
})
