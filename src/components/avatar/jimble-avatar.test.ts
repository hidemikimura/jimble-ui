import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { setLocale } from '../../i18n/index.js'
import ja from '../../i18n/messages.js'
import en from '../../locales/en.js'
import { initials } from './initials.js'
import './jimble-avatar.js'
import './jimble-avatar-group.js'
import type { JimbleAvatar } from './jimble-avatar.js'
import type { JimbleAvatarGroup } from './jimble-avatar-group.js'

afterEach(() => {
  cleanup()
  setLocale(ja)
})
const part = (el: HTMLElement, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
const nextFrame = () => new Promise((r) => setTimeout(r, 30))
// 読めない画像（1x1 の PNG として壊れたデータ）と、読める画像（1x1 の透明な GIF）
const BROKEN = 'data:image/png;base64,AAAA'
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

describe('initials（頭文字）', () => {
  it.each([
    ['Hanako Sato', 'HS'],
    ['hanako', 'H'],
    ['Mary Jane Watson', 'MW'],
    ['佐藤 花子', '佐'],
    ['佐藤　花子', '佐'],
    ['ジョン・スミス', 'ジ'],
    ['  ', ''],
    ['👩‍💻 dev', '👩‍💻'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('jimble-avatar', () => {
  it('名前は role="img" の名前になり、頭文字を出す', async () => {
    const el = await mount<JimbleAvatar>(html`<jimble-avatar name="佐藤 花子"></jimble-avatar>`)
    const base = part(el, 'base')!
    expect(base.getAttribute('role')).toBe('img')
    expect(base.getAttribute('aria-label')).toBe('佐藤 花子')
    expect(part(el, 'initials')!.textContent).toBe('佐')
  })

  it('decorative と、名前が無いときは、読み上げから外す（名前が無いと人の形のアイコン）', async () => {
    const deco = await mount<JimbleAvatar>(
      html`<jimble-avatar name="Hanako Sato" decorative></jimble-avatar>`,
    )
    expect(part(deco, 'base')!.getAttribute('aria-hidden')).toBe('true')
    expect(part(deco, 'base')!.hasAttribute('role')).toBe(false)
    expect(part(deco, 'initials')!.textContent).toBe('HS')

    const anon = await mount<JimbleAvatar>(html`<jimble-avatar></jimble-avatar>`)
    expect(part(anon, 'base')!.getAttribute('aria-hidden')).toBe('true')
    expect(anon.shadowRoot!.querySelector('svg')).not.toBeNull()
  })

  it('画像を出し、読めなかったら頭文字に戻す。src を変えたら、もう一度画像を試す', async () => {
    const el = await mount<JimbleAvatar>(
      html`<jimble-avatar name="Hanako Sato" src=${PIXEL}></jimble-avatar>`,
    )
    const img = part(el, 'image') as HTMLImageElement
    expect(img.getAttribute('alt')).toBe('')
    expect(part(el, 'initials')).toBeNull()

    el.src = BROKEN
    await el.updateComplete
    await expect.poll(() => part(el, 'initials')?.textContent).toBe('HS')
    expect(part(el, 'image')).toBeNull()

    el.src = PIXEL
    await el.updateComplete
    expect(part(el, 'image')).not.toBeNull()
  })

  it('大きさは size で変わり、--jimble-avatar-size が勝つ。square は角丸', async () => {
    const width = (el: JimbleAvatar) => part(el, 'base')!.getBoundingClientRect().width
    const sm = await mount<JimbleAvatar>(html`<jimble-avatar name="A" size="sm"></jimble-avatar>`)
    const md = await mount<JimbleAvatar>(html`<jimble-avatar name="A"></jimble-avatar>`)
    const lg = await mount<JimbleAvatar>(html`<jimble-avatar name="A" size="lg"></jimble-avatar>`)
    expect(width(sm)).toBe(24)
    expect(width(md)).toBe(32)
    expect(width(lg)).toBe(40)

    const custom = await mount<JimbleAvatar>(
      html`<jimble-avatar name="A" style="--jimble-avatar-size: 3rem"></jimble-avatar>`,
    )
    expect(width(custom)).toBe(48)

    const square = await mount<JimbleAvatar>(
      html`<jimble-avatar
        name="A"
        shape="square"
        style="--jimble-avatar-radius: 3px"
      ></jimble-avatar>`,
    )
    expect(getComputedStyle(part(square, 'base')!).borderRadius).toBe('3px')
    expect(getComputedStyle(part(md, 'base')!).borderRadius).not.toBe('0px')
  })

  it('色は CSS 変数で変えられる', async () => {
    const el = await mount<JimbleAvatar>(
      html`<jimble-avatar
        name="A"
        style="--jimble-avatar-bg: rgb(1, 2, 3); --jimble-avatar-text: rgb(4, 5, 6)"
      ></jimble-avatar>`,
    )
    const style = getComputedStyle(part(el, 'base')!)
    expect(style.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(style.color).toBe('rgb(4, 5, 6)')
  })

  it('axe 違反がない', async () => {
    const el = await mount<HTMLElement>(
      html`<div>
        <jimble-avatar name="佐藤 花子"></jimble-avatar>
        <jimble-avatar name="Hanako Sato" src=${PIXEL}></jimble-avatar>
        <jimble-avatar name="開発部" shape="square"></jimble-avatar>
        <span><jimble-avatar name="鈴木 一郎" decorative size="sm"></jimble-avatar> 鈴木 一郎</span>
      </div>`,
    )
    await expectNoA11yViolations(el)
  })
})

describe('jimble-avatar-group', () => {
  const group = (max?: number) =>
    mount<JimbleAvatarGroup>(
      html`<jimble-avatar-group label="担当者" max=${max ?? 5}>
        <jimble-avatar name="佐藤 花子"></jimble-avatar>
        <jimble-avatar name="鈴木 一郎"></jimble-avatar>
        <jimble-avatar name="高橋 次郎"></jimble-avatar>
        <jimble-avatar name="田中 三郎"></jimble-avatar>
      </jimble-avatar-group>`,
    )
  const shown = (el: JimbleAvatarGroup) =>
    el
      .shadowRoot!.querySelector('slot')!
      .assignedElements()
      .map((a) => a.getAttribute('name'))

  it('max 以下なら全員を出し、「+N」は出さない。群の名前は label', async () => {
    const el = await group()
    await nextFrame()
    expect(shown(el)).toHaveLength(4)
    expect(part(el, 'more')).toBeNull()
    const base = part(el, 'base')!
    expect(base.getAttribute('role')).toBe('group')
    expect(base.getAttribute('aria-label')).toBe('担当者')
  })

  it('max を超えた分は描画から外し、「+N」が隠れた人の名前を読み上げる', async () => {
    const el = await group(2)
    await nextFrame()
    expect(shown(el)).toEqual(['佐藤 花子', '鈴木 一郎'])
    const hidden = el.querySelectorAll('jimble-avatar')[3]!
    expect(hidden.getBoundingClientRect().width).toBe(0)
    const more = part(el, 'more')!
    expect(more.textContent!.trim()).toBe('+2')
    expect(more.getAttribute('role')).toBe('img')
    expect(more.getAttribute('aria-label')).toBe('ほか 2 人（高橋 次郎、田中 三郎）')
  })

  it('子を足す・外すと、数を数え直す', async () => {
    const el = await group(3)
    await nextFrame()
    expect(part(el, 'more')!.textContent!.trim()).toBe('+1')
    el.lastElementChild!.remove()
    await expect.poll(() => part(el, 'more')).toBeNull()
    const added = document.createElement('jimble-avatar')
    added.setAttribute('name', '伊藤 四郎')
    el.append(added)
    await expect.poll(() => part(el, 'more')?.textContent?.trim()).toBe('+1')
    expect(part(el, 'more')!.getAttribute('aria-label')).toBe('ほか 1 人（伊藤 四郎）')
  })

  it('2 つ目からは重ねて並べ、境目に面の色の輪を付ける', async () => {
    const el = await group()
    await nextFrame()
    const [a, b] = [...el.querySelectorAll('jimble-avatar')]
    expect(getComputedStyle(b!).marginInlineStart).toBe('-8px')
    expect(getComputedStyle(a!).marginInlineStart).toBe('0px')
    const ring = getComputedStyle(part(a as JimbleAvatar, 'base')!).boxShadow
    expect(ring).not.toBe('none')
    expect(ring).toContain('2px')
  })

  it('言語を変えると、「+N」の名前も変わる', async () => {
    const el = await group(3)
    await nextFrame()
    setLocale(en)
    await el.updateComplete
    expect(part(el, 'more')!.getAttribute('aria-label')).toBe('1 more: 田中 三郎')
  })

  it('axe 違反がない', async () => {
    const el = await group(2)
    await nextFrame()
    await expectNoA11yViolations(el)
  })
})
