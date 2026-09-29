import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimblePagination, pageRange } from './jimble-pagination.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const items = (el: JimblePagination) => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part~="item"]'),
]
const labels = (el: JimblePagination) => items(el).map((i) => i.getAttribute('aria-label'))

async function pager(attrs: string) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-pagination ${attrs}></jimble-pagination>`
  const el = c.querySelector('jimble-pagination') as JimblePagination
  await el.updateComplete
  return { c, el }
}

describe('pageRange(表示するページ番号の並び)', () => {
  it('少なければ全部', () => {
    expect(pageRange(1, 1, 1)).toEqual([1])
    expect(pageRange(3, 5, 1)).toEqual([1, 2, 3, 4, 5])
    expect(pageRange(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('多いときは先頭・末尾・現在の前後を残して省略する', () => {
    expect(pageRange(1, 10, 1)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
    expect(pageRange(3, 10, 1)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
    expect(pageRange(5, 10, 1)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
    expect(pageRange(8, 10, 1)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
    expect(pageRange(10, 10, 1)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
  })
  it('sibling-count を増やすと前後が増える。項目数は常に一定', () => {
    expect(pageRange(10, 20, 2)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12, 'ellipsis', 20])
    for (let p = 1; p <= 20; p++) expect(pageRange(p, 20, 1)).toHaveLength(7)
  })
})

describe('jimble-pagination(ボタン)', () => {
  it('nav ランドマーク。現在のページは aria-current、前へは 1 ページ目で無効', async () => {
    const { el } = await pager('page="1" total-pages="5"')
    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('ページネーション')
    expect(labels(el)).toEqual([
      '前のページ',
      '1 ページ目',
      '2 ページ目',
      '3 ページ目',
      '4 ページ目',
      '5 ページ目',
      '次のページ',
    ])
    const cur = items(el).filter((i) => i.getAttribute('aria-current') === 'page')
    expect(cur.map((i) => i.textContent!.trim())).toEqual(['1'])
    expect((items(el)[0] as HTMLButtonElement).disabled).toBe(true)
    expect((items(el).at(-1) as HTMLButtonElement).disabled).toBe(false)
  })

  it('クリックで移動し、jimble-page-change が出る。preventDefault() すると移動しない', async () => {
    const { el } = await pager('page="2" total-pages="5"')
    const on = vi.fn()
    el.addEventListener('jimble-page-change', on)
    await userEvent.click(items(el).at(-1)!)
    expect(el.page).toBe(3)
    expect((on.mock.calls[0]![0] as CustomEvent).detail).toEqual({ page: 3 })
    el.addEventListener('jimble-page-change', (e) => e.preventDefault())
    await userEvent.click(items(el).find((i) => i.textContent!.trim() === '5')!)
    expect(el.page).toBe(3)
  })

  it('現在のページを押しても何も起きない。範囲外の page は収まる', async () => {
    const { el } = await pager('page="2" total-pages="5"')
    const on = vi.fn()
    el.addEventListener('jimble-page-change', on)
    await userEvent.click(items(el).find((i) => i.getAttribute('aria-current') === 'page')!)
    expect(on).not.toHaveBeenCalled()
    el.page = 99
    await el.updateComplete
    expect(
      items(el)
        .find((i) => i.getAttribute('aria-current') === 'page')!
        .textContent!.trim(),
    ).toBe('5')
  })

  it('total と page-size からページ数が決まり、「N 件中 a〜b 件」が出る(辞書に追従)', async () => {
    const { el } = await pager('page="3" total="45" page-size="20"')
    expect(items(el).filter((i) => /^\d+$/.test(i.textContent!.trim()))).toHaveLength(3)
    const summary = el.shadowRoot!.querySelector('[part="summary"]')!
    expect(summary.textContent!.trim()).toBe('45 件中 41〜45 件')
    setLocale(en)
    await el.updateComplete
    expect(summary.textContent!.trim()).toBe('41–45 of 45')
  })

  it('キーボードで押せる(Enter / Space)', async () => {
    const { el } = await pager('page="1" total-pages="3"')
    items(el).at(-1)!.focus()
    await userEvent.keyboard('{Enter}')
    expect(el.page).toBe(2)
    await userEvent.keyboard(' ')
    expect(el.page).toBe(3)
  })

  it('現在のページは色で区別される(primary の背景)', async () => {
    const { el } = await pager('page="2" total-pages="3"')
    const [a, b] = [items(el)[1]!, items(el)[2]!]
    expect(getComputedStyle(b).backgroundColor).not.toBe(getComputedStyle(a).backgroundColor)
    expect(getComputedStyle(b).boxShadow).toContain('inset')
  })
})

describe('jimble-pagination(リンク: href-template)', () => {
  it('リンクで描画し、{page} が置き換わる。無効な端は href を持たない', async () => {
    const { el } = await pager('page="1" total-pages="3" href-template="?page={page}"')
    const links = items(el)
    expect(links.every((l) => l.tagName === 'A')).toBe(true)
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      null,
      '?page=1',
      '?page=2',
      '?page=3',
      '?page=2',
    ])
    expect(links[0]!.getAttribute('aria-disabled')).toBe('true')
    expect(links[1]!.getAttribute('aria-current')).toBe('page')
  })

  it('リンクでもイベントは出るが、遷移は止めない(preventDefault しない)', async () => {
    const { el } = await pager('page="1" total-pages="3" href-template="#page-{page}"')
    const on = vi.fn()
    el.addEventListener('jimble-page-change', on)
    await userEvent.click(items(el)[2]!)
    await tick()
    expect(on).toHaveBeenCalledTimes(1)
    expect(location.hash).toBe('#page-2')
    history.replaceState(null, '', location.pathname + location.search)
  })
})

describe('アクセシビリティ(axe)', () => {
  it('ボタン・リンク・無効・省略で違反なし', async () => {
    for (const attrs of [
      'page="1" total-pages="3"',
      'page="5" total-pages="20" total="400"',
      'page="2" total-pages="4" href-template="?p={page}"',
      'size="sm" page="3" total-pages="9"',
    ]) {
      const { c } = await pager(attrs)
      await expectNoA11yViolations(c)
    }
  })
})
