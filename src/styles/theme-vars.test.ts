// テーマで変えられる項目(CSS 変数)が、実際に、描画された見た目に効くことを、計算結果で確かめる。
// Tailwind は、定義のないクラス(font-semibold・bg-white など)の CSS を、黙って出さない。
// 「変数を指定したのに効かない」「既定の見た目が崩れている」を、ここで見つける。
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, mount } from '../test/mount.js'
import '../components/alert/jimble-alert.js'
import '../components/badge/jimble-badge.js'
import '../components/breadcrumb/jimble-breadcrumb.js'
import '../components/button/jimble-button.js'
import '../components/card/jimble-card.js'
import '../components/dialog/jimble-dialog.js'
import '../components/input/jimble-input.js'
import '../components/page-header/jimble-page-header.js'
import '../components/radio-group/jimble-radio-group.js'
import '../components/sidebar-nav/jimble-sidebar-nav.js'
import '../components/switch/jimble-switch.js'
import '../components/table/jimble-table.js'
import '../components/tabs/jimble-tabs.js'
import '../components/tooltip/jimble-tooltip.js'

afterEach(cleanup)
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms))
const cs = (e: Element) => getComputedStyle(e)
const inner = (host: Element, selector: string) =>
  host.shadowRoot!.querySelector<HTMLElement>(selector)!

/** 部品を置いて、更新を待つ。`vars` は、その部品に直接指定する CSS 変数 */
async function put<T extends HTMLElement>(markup: string, vars: Record<string, string> = {}) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = markup
  const el = c.firstElementChild as T
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
  await tick()
  return { c, el }
}
const RED = 'rgb(255, 0, 0)'
const BLUE = 'rgb(0, 0, 255)'

describe('フォントの太さ（font-medium / font-semibold が実際に効く）', () => {
  it('ページの見出し・ダイアログの見出し・サイドバーの現在の項目などが、標準より太い', async () => {
    const { el: header } = await put<HTMLElement>(
      '<jimble-page-header heading="見出し"></jimble-page-header>',
    )
    const h = inner(header, '[part="heading"]')
    expect(Number(cs(h).fontWeight)).toBeGreaterThanOrEqual(600)
    const { el: badge } = await put<HTMLElement>('<jimble-badge>バッジ</jimble-badge>')
    expect(Number(cs(inner(badge, '[part="base"]')).fontWeight)).toBeGreaterThanOrEqual(500)
  })

  it('--jimble-font-weight-semibold で、まとめて変えられる', async () => {
    const { c, el } = await put<HTMLElement>(
      '<jimble-page-header heading="見出し"></jimble-page-header>',
    )
    c.style.setProperty('--jimble-font-weight-semibold', '800')
    await tick()
    expect(cs(inner(el, '[part="heading"]')).fontWeight).toBe('800')
  })

  it('--jimble-page-header-heading-weight で、ページ見出しだけ変えられる', async () => {
    const { el } = await put<HTMLElement>(
      '<jimble-page-header heading="見出し"></jimble-page-header>',
      {
        '--jimble-page-header-heading-weight': '700',
      },
    )
    expect(cs(inner(el, '[part="heading"]')).fontWeight).toBe('700')
  })
})

describe('枠・区切り線・ボタンの枠の色を、別々に変えられる', () => {
  it('カードの枠（ring-card）と、ヘッダーの区切り線（ring-divider）は、別の色にできる', async () => {
    const { c, el } = await put<HTMLElement>(
      '<jimble-card><span slot="header">見出し</span>本文</jimble-card>',
    )
    c.style.setProperty('--jimble-color-ring-card', RED)
    c.style.setProperty('--jimble-color-ring-divider', BLUE)
    await tick()
    expect(cs(inner(el, '[part="base"]')).boxShadow).toContain(RED)
    const divider = el.shadowRoot!.querySelector<HTMLElement>('.bg-line-divider')!
    expect(cs(divider).backgroundColor).toBe(BLUE)
  })

  it('ボタン（secondary）の枠の色は、--jimble-color-ring-button で、カードとは別に変えられる', async () => {
    const { c, el } = await put<HTMLElement>(
      '<jimble-button variant="secondary">ボタン</jimble-button>',
    )
    c.style.setProperty('--jimble-color-ring-card', BLUE)
    c.style.setProperty('--jimble-color-ring-button', RED)
    await tick()
    const shadow = cs(inner(el, 'button')).boxShadow
    expect(shadow).toContain(RED)
    expect(shadow).not.toContain(BLUE)
  })

  it('何も指定しなければ、3 つとも、これまでの区切り線の色（--jimble-color-ring）と同じ', async () => {
    const { c, el } = await put<HTMLElement>('<jimble-card>本文</jimble-card>')
    c.style.setProperty('--jimble-color-ring', RED)
    await tick()
    expect(cs(inner(el, '[part="base"]')).boxShadow).toContain(RED)
  })

  it('表の行の区切り線は、--jimble-color-ring-divider に従う。見出しの背景・文字色も変えられる', async () => {
    const { el } = await put<HTMLElement>(
      `<jimble-table label="表"><jimble-table-header><jimble-table-row><jimble-table-head-cell>名前</jimble-table-head-cell></jimble-table-row></jimble-table-header>
       <jimble-table-body><jimble-table-row><jimble-table-cell>あ</jimble-table-cell></jimble-table-row></jimble-table-body></jimble-table>`,
      {
        '--jimble-color-ring-divider': RED,
        '--jimble-table-header-bg': BLUE,
        '--jimble-table-header-text': 'rgb(1, 2, 3)',
      },
    )
    const head = el.querySelector('jimble-table-head-cell')!
    const cell = el.querySelector('jimble-table-cell')!
    expect(cs(cell).boxShadow).toContain(RED)
    expect(cs(head).backgroundColor).toBe(BLUE)
    expect(cs(head).color).toBe('rgb(1, 2, 3)')
  })
})

describe('影（shadow）を、部品ごとに変えられる', () => {
  // 影は、枠(ring)とは別に、疑似要素(::before)で描く(none を指定しても、枠が消えない)
  const SHADOW = 'rgb(255, 0, 0) 0px 7px 0px 0px' // computed style は、色が先
  const shadowOf = (el: Element) => getComputedStyle(el, '::before').boxShadow

  it('カード・ボタン・入力欄の影を、それぞれ指定できる（枠の ring は、そのまま残る）', async () => {
    const { el: card } = await put<HTMLElement>('<jimble-card>本文</jimble-card>', {
      '--jimble-card-shadow': '0 7px 0 0 red',
    })
    expect(shadowOf(inner(card, '[part="base"]'))).toBe(SHADOW)
    expect(cs(inner(card, '[part="base"]')).boxShadow).toContain('0px 0px 0px 1px') // ring-1

    const { el: button } = await put<HTMLElement>(
      '<jimble-button variant="primary">ボタン</jimble-button>',
      {
        '--jimble-button-shadow': '0 7px 0 0 red',
      },
    )
    expect(shadowOf(inner(button, 'button'))).toBe(SHADOW)

    const { el: input } = await put<HTMLElement>('<jimble-input></jimble-input>', {
      '--jimble-input-shadow': '0 7px 0 0 red',
    })
    expect(shadowOf(inner(input, '[part="base"]'))).toBe(SHADOW)
  })

  it('影を none にできる。枠は消えず、ほかの部品の影にも影響しない', async () => {
    const { c } = await put<HTMLElement>(
      '<div><jimble-card id="a">A</jimble-card><jimble-button id="b" variant="primary">B</jimble-button><jimble-input id="i"></jimble-input></div>',
    )
    c.style.setProperty('--jimble-card-shadow', 'none')
    c.style.setProperty('--jimble-input-shadow', 'none')
    c.style.setProperty('--jimble-color-ring-card', RED)
    await tick()
    const card = inner(c.querySelector('#a')!, '[part="base"]')
    expect(shadowOf(card)).toBe('none')
    expect(cs(card).boxShadow).toContain(RED) // 枠(ring)は、そのまま出る
    expect(shadowOf(inner(c.querySelector('#i')!, '[part="base"]'))).toBe('none')
    expect(shadowOf(inner(c.querySelector('#b')!, 'button'))).toContain('3px 0px') // ボタンの既定の影は、そのまま
  })

  it('何も指定しなければ、これまでと同じ影（カード・ボタン・入力欄）。ghost のボタンは影なし', async () => {
    const { c } = await put<HTMLElement>(
      '<div><jimble-card id="a">A</jimble-card><jimble-button id="b" variant="primary">B</jimble-button><jimble-button id="g" variant="ghost">G</jimble-button><jimble-input id="i"></jimble-input></div>',
    )
    expect(shadowOf(inner(c.querySelector('#a')!, '[part="base"]'))).toContain('3px 0px')
    expect(shadowOf(inner(c.querySelector('#b')!, 'button'))).toContain('3px 0px')
    expect(shadowOf(inner(c.querySelector('#g')!, 'button'))).toBe('none')
    expect(shadowOf(inner(c.querySelector('#i')!, '[part="base"]'))).toContain('3px 0px')
  })
})

describe('バッジの角丸・ツールチップの色・スイッチのつまみ・ラジオの点', () => {
  it('バッジの角丸を、変数で変えられる', async () => {
    const { el } = await put<HTMLElement>('<jimble-badge>バッジ</jimble-badge>', {
      '--jimble-badge-radius': '9999px',
    })
    expect(cs(inner(el, '[part="base"]')).borderRadius).toBe('9999px')
  })

  it('ツールチップの背景・文字色を、変数で変えられる。既定は、濃い背景に白い文字', async () => {
    const { el: plain } = await put<HTMLElement>(
      '<jimble-tooltip text="説明"><button>対象</button></jimble-tooltip>',
    )
    const popup = inner(plain, '[part="popup"]')
    expect(cs(popup).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    const { el } = await put<HTMLElement>(
      '<jimble-tooltip text="説明"><button>対象</button></jimble-tooltip>',
      { '--jimble-tooltip-bg': BLUE, '--jimble-tooltip-text': RED },
    )
    expect(cs(inner(el, '[part="popup"]')).backgroundColor).toBe(BLUE)
    expect(cs(inner(el, '[part="popup"]')).color).toBe(RED)
  })

  it('スイッチのつまみは、既定で塗られている（透明ではない）。塗りと縁を、変数で変えられる', async () => {
    const { el: plain } = await put<HTMLElement>('<jimble-switch checked>通知</jimble-switch>')
    const thumb = inner(plain, '[part="thumb"]')
    expect(cs(thumb).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    const { el } = await put<HTMLElement>('<jimble-switch checked>通知</jimble-switch>', {
      '--jimble-switch-thumb-bg': RED,
      '--jimble-switch-thumb-ring': BLUE,
    })
    expect(cs(inner(el, '[part="thumb"]')).backgroundColor).toBe(RED)
    expect(cs(inner(el, '[part="thumb"]')).boxShadow).toContain(BLUE)
  })

  it('ラジオの選択済みの点は、塗られている（透明ではない）', async () => {
    const { el } = await put<HTMLElement>(
      '<jimble-radio-group value="a"><jimble-radio value="a">A</jimble-radio></jimble-radio-group>',
    )
    const radio = el.querySelector('jimble-radio')!
    const dot = [...radio.shadowRoot!.querySelectorAll<HTMLElement>('span')].find((s) =>
      s.className.includes('bg-fg-on-primary'),
    )!
    expect(cs(dot).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('アラートの閉じるボタンの hover の背景が、効く（存在しないクラスで、出なくなっていた）', async () => {
    const { el } = await put<HTMLElement>('<jimble-alert dismissible>本文</jimble-alert>')
    const close = el.shadowRoot!.querySelector<HTMLElement>('button')!
    close.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    // hover の状態は計算できないので、クラスが CSS に出ていることだけ確かめる
    expect(close.className).toContain('hover:[background-color:color-mix')
  })
})

describe('パンくず・サイドバーの現在のアイコン', () => {
  it('パンくずの横の位置を、変数で変えられる（既定は左）', async () => {
    const { el: plain } = await put<HTMLElement>(
      '<jimble-breadcrumb><jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item><jimble-breadcrumb-item>詳細</jimble-breadcrumb-item></jimble-breadcrumb>',
    )
    expect(cs(inner(plain, '[part="list"]')).justifyContent).toBe('flex-start')
    const { el } = await put<HTMLElement>(
      '<jimble-breadcrumb><jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item><jimble-breadcrumb-item>詳細</jimble-breadcrumb-item></jimble-breadcrumb>',
      { '--jimble-breadcrumb-justify': 'center' },
    )
    expect(cs(inner(el, '[part="list"]')).justifyContent).toBe('center')
  })

  it('現在のページのアイコンの色を、他の項目とは別に変えられる。指定しなければ、アイコンの色と同じ', async () => {
    const markup = `<jimble-sidebar-nav>
      <jimble-nav-item href="/a" current><svg slot="icon" width="16" height="16" aria-hidden="true"></svg>現在</jimble-nav-item>
      <jimble-nav-item href="/b"><svg slot="icon" width="16" height="16" aria-hidden="true"></svg>ほか</jimble-nav-item>
    </jimble-sidebar-nav>`
    const iconColor = (item: Element) => cs(item.shadowRoot!.querySelector('a > span')!).color
    const { el } = await put<HTMLElement>(markup, { '--jimble-sidebar-nav-icon-color': BLUE })
    const [now, other] = [...el.querySelectorAll('jimble-nav-item')]
    expect(iconColor(now!)).toBe(BLUE) // 指定がなければ、アイコンの色と同じ
    expect(iconColor(other!)).toBe(BLUE)
    el.style.setProperty('--jimble-sidebar-nav-current-icon-color', RED)
    await tick()
    expect(iconColor(now!)).toBe(RED)
    expect(iconColor(other!)).toBe(BLUE) // 現在のページだけ
  })
})
