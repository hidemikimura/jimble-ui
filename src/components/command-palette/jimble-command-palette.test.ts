import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it } from 'vitest'
import '../button/jimble-button.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { isEditableTarget, matchesHotkey, parseHotkey } from './hotkey.js'
import type { CommandItem } from './jimble-command.js'
import { JimbleCommandPalette } from './jimble-command-palette.js'

afterEach(cleanup)
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms))

const COMMANDS = `
  <jimble-command value="orders" group="ページ" keywords="ちゅうもん" icon="shopping-cart">注文の一覧</jimble-command>
  <jimble-command value="customers" group="ページ" keywords="こきゃく">顧客の一覧</jimble-command>
  <jimble-command value="new-order" group="操作" shortcut="⌘N">注文を登録</jimble-command>
  <jimble-command value="export" group="操作" disabled>CSV に書き出す</jimble-command>`

async function palette(attrs = '', commands = COMMANDS) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<button id="opener">開く</button><jimble-command-palette ${attrs}>${commands}</jimble-command-palette>`
  const el = c.querySelector('jimble-command-palette') as JimbleCommandPalette
  await el.updateComplete
  return { c, el }
}
const root = (el: JimbleCommandPalette) => el.shadowRoot!
const input = (el: JimbleCommandPalette) =>
  root(el).querySelector<HTMLInputElement>('[part="input"]')!
const dialog = (el: JimbleCommandPalette) => root(el).querySelector('dialog')!
const options = (el: JimbleCommandPalette) => [
  ...root(el).querySelectorAll<HTMLElement>('[role="option"]'),
]
const labels = (el: JimbleCommandPalette) =>
  options(el).map((o) => o.textContent!.trim().split(/\s/)[0])
const activeOption = (el: JimbleCommandPalette) =>
  root(el).getElementById(input(el).getAttribute('aria-activedescendant') ?? '')
async function open(el: JimbleCommandPalette) {
  el.show()
  await el.updateComplete
  await tick()
}
async function type(el: JimbleCommandPalette, text: string) {
  const i = input(el)
  i.value = text
  i.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await tick()
}
async function key(el: JimbleCommandPalette, k: string) {
  input(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }))
  await el.updateComplete
  await tick(20)
}

describe('jimble-command-palette: 開閉', () => {
  it('開くとモーダルのダイアログで、入力欄にフォーカスする。名前は既定で「コマンド」', async () => {
    const { el } = await palette()
    await open(el)
    expect(dialog(el).open).toBe(true)
    expect(dialog(el).matches(':modal')).toBe(true)
    expect(dialog(el).getAttribute('aria-label')).toBe('コマンド')
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('入力欄は combobox で、一覧は listbox。グループは見出し付き', async () => {
    const { el } = await palette()
    await open(el)
    const i = input(el)
    expect(i.getAttribute('role')).toBe('combobox')
    expect(i.getAttribute('aria-expanded')).toBe('true')
    const list = root(el).getElementById(i.getAttribute('aria-controls')!)!
    expect(list.getAttribute('role')).toBe('listbox')
    const groups = [...list.querySelectorAll('[role="group"]')]
    expect(
      groups.map((g) =>
        root(el).getElementById(g.getAttribute('aria-labelledby')!)!.textContent!.trim(),
      ),
    ).toEqual(['ページ', '操作'])
    expect(labels(el)).toEqual(['注文の一覧', '顧客の一覧', '注文を登録', 'CSV'])
  })

  it('Esc で閉じて、開く前の要素へフォーカスが戻る（reason: escape）', async () => {
    const { c, el } = await palette()
    const reasons: string[] = []
    el.addEventListener('jimble-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    const opener = c.querySelector<HTMLButtonElement>('#opener')!
    opener.focus()
    await open(el)
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(el.open).toBe(false)
    expect(reasons).toEqual(['escape'])
    expect(document.activeElement).toBe(opener)
  })

  it('開くたびに、検索語を空に戻す', async () => {
    const { el } = await palette()
    await open(el)
    await type(el, '顧客')
    el.hide()
    await tick()
    await open(el)
    expect(input(el).value).toBe('')
    expect(options(el)).toHaveLength(4)
  })
})

describe('jimble-command-palette: 絞り込みと選択', () => {
  it('文字で絞り込む（読み・ひらがなでも一致）。名前の先頭に一致するものが先', async () => {
    const { el } = await palette()
    await open(el)
    await type(el, 'こきゃく')
    expect(labels(el)).toEqual(['顧客の一覧'])
    await type(el, '注文')
    expect(labels(el)).toEqual(['注文の一覧', '注文を登録'])
    await type(el, '一覧')
    expect(labels(el)).toEqual(['注文の一覧', '顧客の一覧'])
  })

  it('一致しなければ、その旨を表示し、listbox を置かない', async () => {
    const { el } = await palette()
    await open(el)
    await type(el, 'ぜったいにない')
    expect(options(el)).toHaveLength(0)
    expect(root(el).querySelector('[part="empty"]')!.textContent).toContain(
      '一致するものがありません',
    )
    expect(input(el).hasAttribute('aria-controls')).toBe(false)
  })

  it('↓↑ で選ぶ候補が動き（無効は飛ばし、端で一周）、aria-activedescendant が指す', async () => {
    const { el } = await palette()
    await open(el)
    expect(activeOption(el)!.textContent).toContain('注文の一覧')
    await key(el, 'ArrowDown')
    expect(activeOption(el)!.textContent).toContain('顧客の一覧')
    expect(activeOption(el)!.getAttribute('aria-selected')).toBe('true')
    await key(el, 'ArrowDown')
    await key(el, 'ArrowDown') // 「CSV に書き出す」は無効なので飛ばして、先頭へ
    expect(activeOption(el)!.textContent).toContain('注文の一覧')
    await key(el, 'ArrowUp')
    expect(activeOption(el)!.textContent).toContain('注文を登録')
  })

  it('Enter で実行して jimble-select（value・item）、閉じる（reason: select）', async () => {
    const { el } = await palette()
    const selected: string[] = []
    const reasons: string[] = []
    el.addEventListener('jimble-select', (e) => selected.push((e as CustomEvent).detail.value))
    el.addEventListener('jimble-close', (e) => reasons.push((e as CustomEvent).detail.reason))
    await open(el)
    await key(el, 'ArrowDown')
    await key(el, 'Enter')
    await tick()
    expect(selected).toEqual(['customers'])
    expect(el.open).toBe(false)
    expect(reasons).toEqual(['select'])
  })

  it('クリックでも実行する。preventDefault() すると閉じない', async () => {
    const { el } = await palette()
    el.addEventListener('jimble-select', (e) => e.preventDefault())
    await open(el)
    await userEvent.click(options(el)[2]!)
    await tick()
    expect(el.open).toBe(true)
  })

  it('無効な候補は選べない（クリックしても何も起きない）', async () => {
    const { el } = await palette()
    let count = 0
    el.addEventListener('jimble-select', () => count++)
    await open(el)
    options(el)[3]!.click()
    await tick()
    expect(count).toBe(0)
    expect(options(el)[3]!.getAttribute('aria-disabled')).toBe('true')
  })

  it('commands プロパティのコマンドも並ぶ。ショートカットとアイコンを表示する', async () => {
    const { el } = await palette('', '')
    el.commands = [
      { value: 'help', label: 'ヘルプを開く', shortcut: '?', icon: 'question-mark-circle' },
    ] satisfies CommandItem[]
    await open(el)
    expect(labels(el)).toEqual(['ヘルプを開く'])
    expect(root(el).querySelector('[part="shortcut"]')!.textContent).toBe('?')
    expect(root(el).querySelector('jimble-icon')!.getAttribute('name')).toBe('question-mark-circle')
  })
})

describe('jimble-command-palette: load', () => {
  it('開くと空の検索語で呼び、入力が止まってから呼ぶ。古い検索は中止する', async () => {
    const { el } = await palette('load-delay="30"', '')
    const calls: string[] = []
    const aborted: string[] = []
    el.load = async (q, signal) => {
      calls.push(q)
      signal.addEventListener('abort', () => aborted.push(q))
      await new Promise((r) => setTimeout(r, 40))
      return [{ value: `r-${q}`, label: `結果 ${q || '最近'}` }]
    }
    await open(el)
    await tick(80)
    expect(labels(el)).toEqual(['結果'])
    // 続けて打つ（load-delay の間に次の文字）と、間の検索語では呼ばない
    const i = input(el)
    for (const text of ['あ', 'あい']) {
      i.value = text
      i.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    await tick(150)
    expect(calls).toEqual(['', 'あい'])
    expect(options(el)[0]!.textContent).toContain('結果 あい')
  })

  it('失敗したら、その旨を表示して jimble-load-error', async () => {
    const { el } = await palette('', '')
    let failed = false
    el.addEventListener('jimble-load-error', () => (failed = true))
    el.load = async () => {
      throw new Error('500')
    }
    await open(el)
    await tick(80)
    expect(failed).toBe(true)
    expect(root(el).querySelector('[part="empty"]')!.textContent).toContain('読み込めませんでした')
  })
})

describe('jimble-command-palette: ショートカット', () => {
  const press = (init: KeyboardEventInit, target: EventTarget = document.body) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init }),
    )

  it('既定ではショートカットで開かない', async () => {
    const { el } = await palette()
    press({ key: 'k', ctrlKey: true })
    press({ key: 'k', metaKey: true })
    await tick()
    expect(el.open).toBe(false)
  })

  it('hotkey="mod+k" で、文書のどこからでも開閉する（入力欄の中では奪わない）', async () => {
    const { c, el } = await palette('hotkey="mod+k"')
    const mod = /mac/i.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true }
    press({ key: 'k', ...mod })
    await tick()
    expect(el.open).toBe(true)
    el.hide()
    await tick()
    const field = document.createElement('input')
    c.append(field)
    press({ key: 'k', ...mod }, field)
    await tick()
    expect(el.open).toBe(false)
  })

  it('hotkey の読み取りと一致', () => {
    expect(parseHotkey('mod+k')).toMatchObject({ key: 'k', mod: true })
    expect(parseHotkey('ctrl+shift+p')).toMatchObject({ key: 'p', ctrl: true, shift: true })
    expect(parseHotkey('mod+')).toBeUndefined()
    expect(parseHotkey('hyper+k')).toBeUndefined()
    const hk = parseHotkey('mod+k')!
    const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)
    expect(matchesHotkey(ev({ key: 'k', metaKey: true }), hk, true)).toBe(true)
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true }), hk, true)).toBe(false)
    expect(matchesHotkey(ev({ key: 'K', ctrlKey: true }), hk, false)).toBe(true)
    expect(matchesHotkey(ev({ key: 'k', ctrlKey: true, shiftKey: true }), hk, false)).toBe(false)
  })

  it('入力欄の中か（ショートカットを奪わない）', () => {
    const field = document.createElement('input')
    document.body.append(field)
    let editable = false
    field.addEventListener('keydown', (e) => (editable = isEditableTarget(e)))
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true }))
    field.remove()
    expect(editable).toBe(true)
  })
})

describe('jimble-command-palette: axe', () => {
  it('axe 違反がない（開いた状態・絞り込んだ状態）', async () => {
    const { c, el } = await palette()
    await open(el)
    await expectNoA11yViolations(c)
    await type(el, '注文')
    await expectNoA11yViolations(c)
  })
})
