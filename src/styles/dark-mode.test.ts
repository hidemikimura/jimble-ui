// ダークモード（設計書 §4.8）。既定値は light-dark(明, 暗) で持ち、利用者の color-scheme で切り替わる。
// 何も指定しないページはライトのまま。ページの一部だけ、トップレイヤー（ダイアログ）でも切り替わる。
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, mount } from '../test/mount.js'
import '../components/alert/jimble-alert.js'
import '../components/card/jimble-card.js'
import '../components/dialog/jimble-dialog.js'

afterEach(cleanup)
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms))
const cs = (e: Element) => getComputedStyle(e)
const inner = (host: Element, selector: string) =>
  host.shadowRoot!.querySelector<HTMLElement>(selector)!

// tokens.json の neutral-900 / neutral-100（ダークの面と文字）
const NEUTRAL_900 = 'oklch(21% 0.034 264.665)'
const NEUTRAL_100 = 'oklch(96.7% 0.003 264.542)'

/** CSS の色を、ブラウザが計算した形に揃える（比べるため） */
async function computed(color: string) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.style.color = color
  return cs(c).color
}

/** color-scheme を指定した入れ物に、部品を置く */
async function put(markup: string, scheme?: string, vars: Record<string, string> = {}) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  if (scheme) c.style.colorScheme = scheme
  for (const [k, v] of Object.entries(vars)) c.style.setProperty(k, v)
  c.innerHTML = markup
  await tick()
  return c.firstElementChild as HTMLElement
}

describe('ダークモード', () => {
  it('color-scheme を指定しないページは、これまでどおりライト', async () => {
    const card = await put('<jimble-card>本文</jimble-card>')
    expect(cs(inner(card, '[part="base"]')).backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('color-scheme: dark の中では、面と文字がダークの値になる', async () => {
    const card = await put('<jimble-card>本文</jimble-card>', 'dark')
    expect(cs(inner(card, '[part="base"]')).backgroundColor).toBe(await computed(NEUTRAL_900))
    expect(cs(card).color).toBe(await computed(NEUTRAL_100))
  })

  it('ページの一部だけをダークにできる（外側はライトのまま）', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML =
      '<jimble-card id="light">外</jimble-card>' +
      '<section style="color-scheme: dark"><jimble-card id="dark">中</jimble-card></section>'
    await tick()
    const bg = (id: string) =>
      cs(inner(c.querySelector(`#${id}`)!, '[part="base"]')).backgroundColor
    expect(bg('light')).toBe('rgb(255, 255, 255)')
    expect(bg('dark')).toBe(await computed(NEUTRAL_900))
  })

  it('状態の色（alert）も、ダークの淡い面に変わる', async () => {
    const light = await put('<jimble-alert variant="danger">エラー</jimble-alert>')
    const dark = await put('<jimble-alert variant="danger">エラー</jimble-alert>', 'dark')
    const bg = (el: HTMLElement) => cs(inner(el, '[part="base"]')).backgroundColor
    expect(bg(dark)).not.toBe(bg(light))
    expect(bg(dark)).toBe(await computed('oklch(25.8% 0.092 26.042)')) // danger-950
  })

  it('利用者が変数で指定した色は、ダークでも勝つ', async () => {
    const card = await put('<jimble-card>本文</jimble-card>', 'dark', {
      '--jimble-color-surface': 'rgb(255, 0, 0)',
    })
    expect(cs(inner(card, '[part="base"]')).backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('利用者も light-dark() で、ライトとダークの色を別々に指定できる', async () => {
    const vars = { '--jimble-color-surface': 'light-dark(rgb(255, 0, 0), rgb(0, 0, 255))' }
    const light = await put('<jimble-card>本文</jimble-card>', 'light', vars)
    const dark = await put('<jimble-card>本文</jimble-card>', 'dark', vars)
    expect(cs(inner(light, '[part="base"]')).backgroundColor).toBe('rgb(255, 0, 0)')
    expect(cs(inner(dark, '[part="base"]')).backgroundColor).toBe('rgb(0, 0, 255)')
  })

  it('モーダルのダイアログ（トップレイヤー）も、置いた場所の color-scheme に従う', async () => {
    const dialog = await put('<jimble-dialog heading="確認" open>本文</jimble-dialog>', 'dark')
    await tick(100)
    const panel = inner(dialog, '[part="panel"]')
    const base = inner(dialog, '[part="base"]')
    const bg = [cs(base).backgroundColor, cs(panel).backgroundColor]
    expect(bg).not.toContain('rgb(255, 255, 255)')
    expect(bg).toContain(await computed('oklch(27.8% 0.033 256.848)')) // neutral-800（surface-overlay）
  })
})
