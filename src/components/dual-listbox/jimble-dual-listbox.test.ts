import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleDualListbox } from './jimble-dual-listbox.js'
import './jimble-dual-listbox.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const rows = (el: JimbleDualListbox, side: 'available' | 'selected') => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>(`[data-side="${side}"] [role="option"]`),
]
const labels = (el: JimbleDualListbox, side: 'available' | 'selected') =>
  rows(el, side).map((r) => r.textContent!.trim())
const part = (el: JimbleDualListbox, name: string) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${name}"]`)!
const search = (el: JimbleDualListbox, side: 'available' | 'selected') =>
  el.shadowRoot!.querySelector<HTMLInputElement>(`[data-side="${side}"] input`)!
const data = (f: HTMLFormElement) => new FormData(f).getAll('tags')

async function make(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-dual-listbox name="tags" aria-label="タグ" ${attrs}>
      <jimble-option value="ga" keywords="じーえー">GA タグ</jimble-option>
      <jimble-option value="test">test</jimble-option>
      <jimble-option value="cv">AdConnect CV タグ</jimble-option>
      <jimble-option value="lp">all_lp</jimble-option>
      <jimble-option value="off" disabled>停止中のタグ</jimble-option>
    </jimble-dual-listbox>`
  const el = f.querySelector('jimble-dual-listbox') as JimbleDualListbox
  await el.updateComplete
  return { f, el }
}

describe('表示と値', () => {
  it('左に未選択、右に選択済み。value 属性(カンマ区切り)が初期値で、フォームには同じ name で複数送られる', async () => {
    const { f, el } = await make('value="cv,ga"')
    expect(labels(el, 'available')).toEqual(['test', 'all_lp', '停止中のタグ'])
    expect(labels(el, 'selected')).toEqual(['AdConnect CV タグ', 'GA タグ']) // 追加した順
    expect(data(f)).toEqual(['cv', 'ga'])
    expect(el.values).toEqual(['cv', 'ga'])
  })

  it('見出しは既定で「未選択項目」「選択済み項目」。属性で変えられ、辞書にも従う', async () => {
    const { el } = await make('available-label="使えるタグ" selected-label="設定中のタグ"')
    const titles = [...el.shadowRoot!.querySelectorAll('[part="panel-title"]')].map((t) =>
      t.textContent!.trim(),
    )
    expect(titles).toEqual(['使えるタグ', '設定中のタグ'])
    const b = await make()
    expect(b.el.shadowRoot!.textContent).toContain('未選択項目')
    setLocale(en)
    await b.el.updateComplete
    expect(b.el.shadowRoot!.textContent).toContain('Available')
  })

  it('reset で初期値に戻る。required で未選択なら valueMissing', async () => {
    const { f, el } = await make('required value="ga"')
    el.values = ['test']
    f.reset()
    await el.updateComplete
    expect(el.values).toEqual(['ga'])
    el.values = []
    await el.updateComplete
    expect(el.validity.valueMissing).toBe(true)
  })
})

describe('移す', () => {
  it('行をクリックで選び(もう一度で解除)、「追加」で右へ。「削除」で左へ戻る。input / change が出る', async () => {
    const { f, el } = await make()
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    expect(part(el, 'add').disabled).toBe(true)
    rows(el, 'available')[0]!.click()
    rows(el, 'available')[1]!.click()
    await el.updateComplete
    expect(rows(el, 'available')[0]!.getAttribute('aria-selected')).toBe('true')
    rows(el, 'available')[1]!.click() // 解除
    await el.updateComplete
    expect(part(el, 'add').disabled).toBe(false)
    part(el, 'add').click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['GA タグ'])
    expect(data(f)).toEqual(['ga'])
    expect(onChange).toHaveBeenCalledTimes(1)
    rows(el, 'selected')[0]!.click()
    await el.updateComplete
    part(el, 'remove').click()
    await tick()
    expect(labels(el, 'selected')).toEqual([])
    expect(data(f)).toEqual([])
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('Shift+クリックで範囲を選べる。無効な項目は選べず、移せない', async () => {
    const { el } = await make()
    rows(el, 'available')[0]!.click()
    rows(el, 'available')[3]!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    )
    await el.updateComplete
    expect(rows(el, 'available').map((r) => r.getAttribute('aria-selected'))).toEqual([
      'true',
      'true',
      'true',
      'true',
      'false',
    ])
    rows(el, 'available')[4]!.click()
    await el.updateComplete
    expect(rows(el, 'available')[4]!.getAttribute('aria-selected')).toBe('false')
    part(el, 'add').click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['GA タグ', 'test', 'AdConnect CV タグ', 'all_lp'])
    expect(labels(el, 'available')).toEqual(['停止中のタグ'])
  })

  it('行の右の ＋ / −、ダブルクリックで、その 1 件だけ移せる', async () => {
    const { el } = await make()
    rows(el, 'available')[1]!.querySelector<HTMLElement>('[part="move"]')!.click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['test'])
    rows(el, 'available')[0]!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await tick()
    expect(labels(el, 'selected')).toEqual(['test', 'GA タグ'])
    rows(el, 'selected')[0]!.querySelector<HTMLElement>('[part="move"]')!.click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['GA タグ'])
  })

  it('move-all で「すべて追加」「すべて削除」(無効な項目は動かさない)', async () => {
    const { el } = await make('move-all')
    part(el, 'add-all').click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['GA タグ', 'test', 'AdConnect CV タグ', 'all_lp'])
    expect(labels(el, 'available')).toEqual(['停止中のタグ'])
    part(el, 'remove-all').click()
    await tick()
    expect(labels(el, 'selected')).toEqual([])
  })

  it('max-items を超えては追加できず、案内が出る', async () => {
    const { el } = await make('max-items="2" move-all')
    part(el, 'add-all').click()
    await tick()
    expect(labels(el, 'selected')).toEqual(['GA タグ', 'test'])
    expect(part(el, 'add-all').disabled).toBe(true)
    expect(part(el, 'add').disabled).toBe(true)
  })

  it('移したあと、フォーカスは元のリストの次の行に残る(ボタンが無効になっても消えない)', async () => {
    const { el } = await make()
    rows(el, 'available')[0]!.click()
    await el.updateComplete
    part(el, 'add').click()
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(rows(el, 'available')[0])
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('1 件を追加')
  })
})

describe('絞り込み', () => {
  it('左右それぞれの検索欄で絞れる(読み・かなも)。見えなくなった項目は選択から外れる', async () => {
    const { el } = await make()
    rows(el, 'available')[0]!.click()
    await el.updateComplete
    search(el, 'available').value = 'test'
    search(el, 'available').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(labels(el, 'available')).toEqual(['test'])
    expect(part(el, 'add').disabled).toBe(true) // GA タグは見えないので選択から外れた
    search(el, 'available').value = 'じーえー'
    search(el, 'available').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(labels(el, 'available')).toEqual(['GA タグ'])
    search(el, 'available').value = 'zzz'
    search(el, 'available').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(
      el.shadowRoot!.querySelector('[data-side="available"] [part="empty"]')!.textContent,
    ).toContain('一致する項目がありません')
  })
})

describe('キーボード', () => {
  it('↑↓ で移動、Space で選び、Enter で移す。選んだものが無ければフォーカス中の 1 件を移す', async () => {
    const { f, el } = await make()
    rows(el, 'available')[0]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(rows(el, 'available')[1])
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard(' ')
    await el.updateComplete
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(data(f)).toEqual(['test', 'cv'])
    // 選択なしで Enter → フォーカス中の 1 件
    rows(el, 'available')[0]!.focus()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(data(f)).toEqual(['test', 'cv', 'ga'])
  })

  it('Shift+↓ で選択を広げ、Ctrl+A で全部選ぶ。Home / End', async () => {
    const { el } = await make()
    rows(el, 'available')[0]!.focus()
    await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}')
    await el.updateComplete
    expect(rows(el, 'available').map((r) => r.getAttribute('aria-selected'))).toEqual([
      'true',
      'true',
      'true',
      'false',
      'false',
    ])
    await userEvent.keyboard('{Control>}a{/Control}')
    await el.updateComplete
    expect(
      rows(el, 'available').filter((r) => r.getAttribute('aria-selected') === 'true').length,
    ).toBe(4)
    await userEvent.keyboard('{End}')
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(rows(el, 'available')[3]) // 無効な項目は飛ばす
  })

  it('検索欄で ↓ を押すとリストへ移り、Enter は何も起こさない', async () => {
    const { el } = await make()
    search(el, 'available').focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(rows(el, 'available')[0])
  })
})

describe('アクセシビリティ', () => {
  it('field の中で名前が付き、リストボックス・ボタンの名前があり、axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="タグ選択" hint="配信するタグを選びます"
        ><jimble-dual-listbox name="tags" move-all value="ga">
          <jimble-option value="ga">GA タグ</jimble-option>
          <jimble-option value="test">test</jimble-option>
        </jimble-dual-listbox></jimble-field
      >`,
    )
    const el = f.querySelector('jimble-dual-listbox') as JimbleDualListbox
    await el.updateComplete
    expect(el.shadowRoot!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe(
      'タグ選択',
    )
    const lists = [...el.shadowRoot!.querySelectorAll('[role="listbox"]')]
    expect(lists.length).toBe(2)
    expect(lists.every((l) => l.getAttribute('aria-multiselectable') === 'true')).toBe(true)
    expect(part(el, 'add').getAttribute('aria-label')).toContain('選択済み項目')
    expect(part(el, 'add').textContent).toContain('追加')
    rows(el, 'available')[0]!.click()
    await el.updateComplete
    await expectNoA11yViolations(f)
  })

  it('項目が 0 件の状態でも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<div><jimble-dual-listbox aria-label="空"></jimble-dual-listbox></div>`,
    )
    await (f.querySelector('jimble-dual-listbox') as JimbleDualListbox).updateComplete
    await expectNoA11yViolations(f)
  })
})

const grouped = (el: JimbleDualListbox, side: 'available' | 'selected') =>
  [...el.shadowRoot!.querySelectorAll(`[data-side="${side}"] [part="group"]`)].map((g) => [
    g.querySelector('[part="group-label"]')!.textContent!.trim(),
    [...g.querySelectorAll('[role="option"]')].map((o) => o.textContent!.trim()),
  ])

async function makeGroups(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-dual-listbox name="tags" aria-label="タグ" ${attrs}>
      <jimble-option value="a" group="header">GA タグ</jimble-option>
      <jimble-option value="b" group="body">test</jimble-option>
      <jimble-option value="c" group="header">検証タグ</jimble-option>
      <jimble-option value="d">共通</jimble-option>
    </jimble-dual-listbox>`
  const el = f.querySelector('jimble-dual-listbox') as JimbleDualListbox
  await el.updateComplete
  return { f, el }
}

describe('グループ分け（group）', () => {
  it('group が同じ項目が見出し付きでまとまる(離れて書いても最初の位置に集まる)。矢印キーは表示順に進む', async () => {
    const { el } = await makeGroups()
    expect(grouped(el, 'available')).toEqual([
      ['header', ['GA タグ', '検証タグ']],
      ['body', ['test']],
    ])
    expect(labels(el, 'available')).toEqual(['GA タグ', '検証タグ', 'test', '共通'])
    rows(el, 'available')[1]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(el.shadowRoot!.activeElement).toBe(rows(el, 'available')[2])
  })

  it('移すと右の一覧でもグループにまとまる。絞り込むと一致のないグループの見出しは消える', async () => {
    const { el } = await makeGroups('value="a,b,c"')
    expect(grouped(el, 'selected')).toEqual([
      ['header', ['GA タグ', '検証タグ']],
      ['body', ['test']],
    ])
    search(el, 'selected').value = 'test'
    search(el, 'selected').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(grouped(el, 'selected')).toEqual([['body', ['test']]])
  })

  it('グループ名では絞り込まない。search-group を付けると絞り込める', async () => {
    const off = await makeGroups()
    search(off.el, 'available').value = 'header'
    search(off.el, 'available').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(labels(off.el, 'available')).toEqual([])
    const on = await makeGroups('search-group')
    search(on.el, 'available').value = 'header'
    search(on.el, 'available').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(labels(on.el, 'available')).toEqual(['GA タグ', '検証タグ'])
  })

  it('グループつきでも axe 違反がない', async () => {
    const { el } = await makeGroups('value="a"')
    await expectNoA11yViolations(el.parentElement!)
  })
})

describe('並べ替え（reorderable）', () => {
  const moveBtn = (el: JimbleDualListbox, n: 'move-up' | 'move-down') => part(el, n)

  it('右の一覧は選んだ順のまま(グループでまとめない)で、グループ名が後ろに出る。reorderable でなければボタンは無い', async () => {
    const { el } = await makeGroups('reorderable value="b,a,c"')
    expect(el.shadowRoot!.querySelector('[data-side="selected"] [part="group"]')).toBeNull()
    expect(rows(el, 'selected').map((r) => r.textContent!.replace(/\s+/g, ''))).toEqual([
      'testbody',
      'GAタグheader',
      '検証タグheader',
    ])
    const off = await make('value="ga,test"')
    expect(off.el.shadowRoot!.querySelector('[part="move-up"]')).toBeNull()
  })

  it('「上へ」「下へ」ボタンで、選んだ項目が動く(端では押せない)。値の順・送信の順・jimble-reorder に反映される', async () => {
    const { f, el } = await make('reorderable value="ga,test,cv,lp"')
    const onReorder = vi.fn()
    el.addEventListener('jimble-reorder', onReorder)
    expect(moveBtn(el, 'move-up').disabled).toBe(true)
    rows(el, 'selected')[2]!.click() // cv
    await el.updateComplete
    moveBtn(el, 'move-up').click()
    await tick()
    expect(data(f)).toEqual(['ga', 'cv', 'test', 'lp'])
    expect((onReorder.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      values: ['ga', 'cv', 'test', 'lp'],
    })
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('4 件中 2 番目')
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.value).toBe('cv')
    moveBtn(el, 'move-down').click()
    await tick()
    expect(data(f)).toEqual(['ga', 'test', 'cv', 'lp'])
    // 複数を選ぶと、まとめて動く
    rows(el, 'selected')[3]!.click() // lp(cv も選択中)
    await el.updateComplete
    moveBtn(el, 'move-down').click() // どちらも端に届く前に動かせないもの: lp は末尾なので変化なし
    await tick()
    expect(data(f)).toEqual(['ga', 'test', 'cv', 'lp'])
    moveBtn(el, 'move-up').click()
    await tick()
    expect(data(f)).toEqual(['ga', 'cv', 'lp', 'test'])
  })

  it('Alt+↑↓ で、フォーカス中の項目が動く。reorderable でなければ動かない', async () => {
    const { f, el } = await make('reorderable value="ga,test,cv"')
    rows(el, 'selected')[1]!.focus()
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}')
    await tick()
    expect(data(f)).toEqual(['test', 'ga', 'cv'])
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.value).toBe('test')
    await userEvent.keyboard('{Alt>}{ArrowDown}{ArrowDown}{/Alt}')
    await tick()
    expect(data(f)).toEqual(['ga', 'cv', 'test'])
    const off = await make('value="ga,test,cv"')
    rows(off.el, 'selected')[1]!.focus()
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(data(off.f)).toEqual(['ga', 'test', 'cv'])
  })

  it('ドラッグで順番を入れ替えられる。右の一覧を絞り込んでいる間は並べ替えられない', async () => {
    const { f, el } = await make('reorderable value="ga,test,cv"')
    expect(rows(el, 'selected')[0]!.getAttribute('draggable')).toBe('true')
    const dt = new DataTransfer()
    rows(el, 'selected')[0]!.dispatchEvent(
      new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }),
    )
    const target = rows(el, 'selected')[2]!
    const r = target.getBoundingClientRect()
    target.dispatchEvent(
      new DragEvent('dragover', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientY: r.bottom - 1,
      }),
    )
    expect(target.dataset.drop).toBe('after')
    target.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientY: r.bottom - 1,
      }),
    )
    await tick()
    expect(data(f)).toEqual(['test', 'cv', 'ga'])
    search(el, 'selected').value = 'cv'
    search(el, 'selected').dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await tick()
    expect(rows(el, 'selected')[0]!.getAttribute('draggable')).toBeNull()
    expect(moveBtn(el, 'move-up').disabled).toBe(true)
  })

  it('並べ替えできる状態でも axe 違反がない', async () => {
    const { el } = await make('reorderable value="ga,test"')
    rows(el, 'selected')[0]!.click()
    await el.updateComplete
    await expectNoA11yViolations(el.parentElement!)
  })
})
