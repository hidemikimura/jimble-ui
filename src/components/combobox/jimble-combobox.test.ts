import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { JimbleCombobox } from './jimble-combobox.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))
const input = (el: JimbleCombobox) => el.shadowRoot!.querySelector<HTMLInputElement>('input')!
const popup = (el: JimbleCombobox) => el.shadowRoot!.querySelector<HTMLElement>('[part="popup"]')!
const isOpen = (el: JimbleCombobox) => popup(el).matches(':popover-open')
const shown = (el: JimbleCombobox) =>
  [...el.shadowRoot!.querySelectorAll('[part="option"]')].map((o) => o.textContent!.trim())
const data = (f: HTMLFormElement) => Object.fromEntries(new FormData(f))

async function make(attrs = '') {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-combobox name="pref" aria-label="都道府県" ${attrs}>
      <jimble-option value="tokyo" keywords="とうきょう">東京都</jimble-option>
      <jimble-option value="osaka" keywords="おおさか osaka">大阪府</jimble-option>
      <jimble-option value="kyoto" keywords="きょうと">京都府</jimble-option>
      <jimble-option value="hokkaido" disabled>北海道</jimble-option>
    </jimble-combobox>`
  const el = f.querySelector('jimble-combobox') as JimbleCombobox
  await el.updateComplete
  return { f, el }
}
async function type(el: JimbleCombobox, text: string) {
  input(el).focus()
  input(el).value = text
  input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await el.updateComplete
}

describe('表示と値', () => {
  it('value 属性の選択肢の文字を表示し、value を送信する', async () => {
    const { f, el } = await make('value="osaka"')
    expect(input(el).value).toBe('大阪府')
    expect(data(f)).toEqual({ pref: 'osaka' })
  })

  it('未選択は送信されない。reset で戻る', async () => {
    const { f, el } = await make('value="osaka"')
    el.value = 'kyoto'
    await el.updateComplete
    expect(input(el).value).toBe('京都府')
    f.reset()
    await el.updateComplete
    expect(input(el).value).toBe('大阪府')
    const b = await make()
    expect(data(b.f)).toEqual({})
  })

  it('required で未選択なら valueMissing', async () => {
    const { el } = await make('required')
    expect(el.validity.valueMissing).toBe(true)
    el.value = 'tokyo'
    await el.updateComplete
    expect(el.validity.valid).toBe(true)
  })

  it('ロールと属性が付く', async () => {
    const { el } = await make()
    expect(input(el).getAttribute('role')).toBe('combobox')
    expect(input(el).getAttribute('aria-autocomplete')).toBe('list')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).getAttribute('aria-label')).toBe('都道府県')
  })
})

describe('絞り込み', () => {
  it('入力すると開いて絞られる。読み(keywords)・ひらがな/カタカナ・大文字小文字でも一致する', async () => {
    const { el } = await make()
    await type(el, '京')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(shown(el)).toEqual(['東京都', '京都府'])
    await type(el, 'おおさか')
    expect(shown(el)).toEqual(['大阪府'])
    await type(el, 'オオサカ')
    expect(shown(el)).toEqual(['大阪府'])
    await type(el, 'OSAKA')
    expect(shown(el)).toEqual(['大阪府'])
  })

  it('一致しなければ「一致する選択肢がありません」を出す', async () => {
    const { el } = await make()
    await type(el, 'zzz')
    await tick()
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('一致する')
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('一致する')
  })

  it('件数が live region で伝わる', async () => {
    const { el } = await make()
    await type(el, '京')
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('2 件')
  })

  it('match="starts-with" は前方一致', async () => {
    const { el } = await make('match="starts-with"')
    await type(el, '京')
    expect(shown(el)).toEqual(['京都府'])
  })

  it('filter プロパティで独自に絞れる', async () => {
    const { el } = await make()
    el.filter = (_q, o) => o.value === 'tokyo'
    await type(el, 'x')
    expect(shown(el)).toEqual(['東京都'])
  })

  it('文字の入力では input/change を出さず、jimble-search を出す', async () => {
    const { el } = await make()
    const onInput = vi.fn()
    const onSearch = vi.fn()
    el.addEventListener('input', onInput)
    el.addEventListener('jimble-search', onSearch)
    await type(el, '京')
    expect(onInput).not.toHaveBeenCalled()
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect((onSearch.mock.calls[0]![0] as CustomEvent).detail).toEqual({ query: '京' })
  })
})

describe('選択', () => {
  it('↓ で先頭が active、Enter で選択。閉じて文字が選択肢の表示になる', async () => {
    const { f, el } = await make()
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    await type(el, '京')
    await tick()
    expect(input(el).getAttribute('aria-activedescendant')).toBeTruthy()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await tick()
    expect(data(f)).toEqual({ pref: 'kyoto' })
    expect(input(el).value).toBe('京都府')
    expect(isOpen(el)).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ArrowDown で閉じた状態から全件を開き、無効な選択肢は飛ばす', async () => {
    const { el } = await make()
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    expect(isOpen(el)).toBe(true)
    expect(shown(el)).toHaveLength(4)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    await tick()
    const id = input(el).getAttribute('aria-activedescendant')!
    expect(el.shadowRoot!.getElementById(id)!.textContent).toContain('京都府')
  })

  it('クリックで選べる。無効な選択肢は選べない', async () => {
    const { f, el } = await make()
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick()
    const opts = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    opts[3]!.click()
    expect(data(f)).toEqual({})
    opts[1]!.click()
    await el.updateComplete
    expect(data(f)).toEqual({ pref: 'osaka' })
  })

  it('Escape で閉じ、入力途中の文字は選択中の表示に戻る。値は変わらない', async () => {
    const { f, el } = await make('value="tokyo"')
    await type(el, 'abc')
    await tick()
    await userEvent.keyboard('{Escape}')
    await tick()
    expect(isOpen(el)).toBe(false)
    expect(input(el).value).toBe('東京都')
    expect(data(f)).toEqual({ pref: 'tokyo' })
  })

  it('選択肢に無い文字のまま離れると戻る(自由入力は値にならない)', async () => {
    const { f, el } = await make('value="tokyo"')
    await type(el, 'abc')
    input(el).blur()
    await el.updateComplete
    expect(input(el).value).toBe('東京都')
    expect(data(f)).toEqual({ pref: 'tokyo' })
  })

  it('開いている間の Enter は送信せず、閉じているときは送信する', async () => {
    const { f, el } = await make()
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    f.addEventListener('submit', onSubmit)
    await type(el, '京')
    await tick()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('clearable で解除できる', async () => {
    const { f, el } = await make('value="osaka" clearable')
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    await el.updateComplete
    expect(data(f)).toEqual({})
    expect(input(el).value).toBe('')
    expect(el.shadowRoot!.querySelector('[part="clear"]')).toBeNull()
  })

  it('ボタンで開閉できる', async () => {
    const { el } = await make()
    const t = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle"]')!
    t.click()
    await tick()
    expect(isOpen(el)).toBe(true)
    t.click()
    await tick()
    expect(isOpen(el)).toBe(false)
  })

  it('disabled / readonly では開かない', async () => {
    const a = await make('disabled')
    expect(input(a.el).disabled).toBe(true)
    const b = await make('readonly')
    b.el.show()
    await tick()
    expect(isOpen(b.el)).toBe(false)
  })

  it('選択肢を後から追加しても反映される', async () => {
    const { el } = await make('value="nagoya"')
    expect(input(el).value).toBe('')
    el.insertAdjacentHTML('beforeend', '<jimble-option value="nagoya">名古屋市</jimble-option>')
    await tick()
    await el.updateComplete
    expect(input(el).value).toBe('名古屋市')
  })
})

describe('アクセシビリティ', () => {
  it('field の中で名前が付き、閉じた状態・開いた状態・結果なしとも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="都道府県"
        ><jimble-combobox name="pref" value="osaka">
          <jimble-option value="tokyo">東京都</jimble-option>
          <jimble-option value="osaka">大阪府</jimble-option>
        </jimble-combobox></jimble-field
      >`,
    )
    const el = f.querySelector('jimble-combobox') as JimbleCombobox
    await el.updateComplete
    expect(input(el).getAttribute('aria-label')).toBe('都道府県')
    await expectNoA11yViolations(f)
    el.show()
    await tick()
    await expectNoA11yViolations(f)
    await type(el, 'zzz')
    await tick()
    await expectNoA11yViolations(f)
  })
})

async function makeWith(attrs: string, setup?: (el: JimbleCombobox) => void) {
  const r = await make(attrs)
  setup?.(r.el)
  await r.el.updateComplete
  return r
}
const chips = (el: JimbleCombobox) =>
  [...el.shadowRoot!.querySelectorAll('[part="chip"]')].map((c) => c.textContent!.trim())
const status = (el: JimbleCombobox) =>
  el.shadowRoot!.querySelector('[role="status"]')!.textContent!.trim()

describe('関数で候補を取得する(load)', () => {
  const items = [
    { value: 'a', label: 'アルファ' },
    { value: 'b', label: 'ブラボー' },
  ]

  it('入力が止まってから呼ばれ、返した項目がそのまま表示される(絞り込みはしない)', async () => {
    const load = vi.fn(async (q: string) => items.map((i) => ({ ...i, label: `${i.label}:${q}` })))
    const { el } = await makeWith('load-delay="30"', (e) => (e.load = load))
    await type(el, 'a')
    await type(el, 'ab')
    expect(load).not.toHaveBeenCalled()
    await tick(120)
    expect(load).toHaveBeenCalledTimes(1)
    expect(load.mock.calls[0]![0]).toBe('ab')
    expect(shown(el)).toEqual(['アルファ:ab', 'ブラボー:ab'])
  })

  it('取得中は「読み込み中」、古い検索の結果は捨てて signal で中止する', async () => {
    const signals: AbortSignal[] = []
    const resolvers: Array<(v: { value: string; label: string }[]) => void> = []
    const load = (_q: string, signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<{ value: string; label: string }[]>((r) => resolvers.push(r))
    }
    const { el } = await makeWith('load-delay="0"', (e) => (e.load = load))
    await type(el, 'a')
    await tick(30)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('読み込み中')
    await type(el, 'ab')
    await tick(30)
    expect(signals[0]!.aborted).toBe(true)
    resolvers[0]!([{ value: 'old', label: '古い' }])
    resolvers[1]!([{ value: 'new', label: '新しい' }])
    await tick(30)
    expect(shown(el)).toEqual(['新しい'])
  })

  it('失敗すると「読み込めませんでした」を出し、jimble-load-error を発火する', async () => {
    const onError = vi.fn()
    const { el } = await makeWith('load-delay="0"', (e) => {
      e.load = () => Promise.reject(new Error('500'))
    })
    el.addEventListener('jimble-load-error', onError)
    await type(el, 'x')
    await tick(60)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('読み込めません')
  })

  it('load-min-length 未満では呼ばず、入力を促す', async () => {
    const load = vi.fn(async () => items)
    const { el } = await makeWith('load-delay="0" load-min-length="2"', (e) => (e.load = load))
    await type(el, 'a')
    await tick(40)
    expect(load).not.toHaveBeenCalled()
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('2 文字')
    await type(el, 'ab')
    await tick(40)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('検索語なしで開くと、空の検索語で取得する。選ぶと値になり、表示は items から補える', async () => {
    const { f, el } = await makeWith('value="z"', (e) => {
      e.items = [{ value: 'z', label: 'ゼータ' }]
      e.load = async () => items
    })
    expect(input(el).value).toBe('ゼータ')
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}')
    await tick(60)
    expect(shown(el)).toEqual(['アルファ', 'ブラボー'])
    await userEvent.keyboard('{Enter}') // 取得後は先頭が active
    await tick()
    expect(data(f)).toEqual({ pref: 'a' })
    expect(input(el).value).toBe('アルファ')
  })
})

describe('複数選択(multiple)', () => {
  it('選ぶとチップになり、同じ name で複数の値が送信される。開いたままになる', async () => {
    const { f, el } = await make('multiple')
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}{Enter}{ArrowDown}{Enter}')
    await tick()
    expect(chips(el)).toEqual(['東京都', '大阪府'])
    expect(f && new FormData(f).getAll('pref')).toEqual(['tokyo', 'osaka'])
    expect(isOpen(el)).toBe(true)
    expect(
      el.shadowRoot!.querySelector('[role="listbox"]')!.getAttribute('aria-multiselectable'),
    ).toBe('true')
    expect(status(el)).toContain('選択しました')
    expect(el.values).toEqual(['tokyo', 'osaka'])
  })

  it('もう一度選ぶと解除される。チップの × でも、空の入力で Backspace でも削除できる', async () => {
    const { f, el } = await make('multiple value="tokyo,osaka,kyoto"')
    expect(chips(el)).toEqual(['東京都', '大阪府', '京都府'])
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="chip-remove"]')[1]!.click()
    await el.updateComplete
    expect(new FormData(f).getAll('pref')).toEqual(['tokyo', 'kyoto'])
    input(el).focus()
    await userEvent.keyboard('{Backspace}')
    await el.updateComplete
    expect(chips(el)).toEqual(['東京都'])
    expect(status(el)).toContain('解除')
    el.show()
    await tick()
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')][0]!.click()
    await el.updateComplete
    expect(el.values).toEqual([])
  })

  it('チップの削除ボタンに名前が付く。change が出る。reset で戻る', async () => {
    const { f, el } = await make('multiple value="tokyo"')
    const remove = el.shadowRoot!.querySelector('[part="chip-remove"]')!
    expect(remove.getAttribute('aria-label')).toBe('東京都 を削除')
    const onChange = vi.fn()
    el.addEventListener('change', onChange)
    el.values = ['osaka', 'kyoto']
    await el.updateComplete
    f.reset()
    await el.updateComplete
    expect(el.values).toEqual(['tokyo'])
    el.show()
    await tick()
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')][1]!.click()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('required は 1 つも選ばれていないとエラー。絞り込んでも選択済みは残る', async () => {
    const { el } = await make('multiple required')
    expect(el.validity.valueMissing).toBe(true)
    el.values = ['tokyo']
    await el.updateComplete
    expect(el.validity.valid).toBe(true)
    await type(el, '大阪')
    expect(shown(el)).toEqual(['大阪府'])
    expect(chips(el)).toEqual(['東京都'])
  })
})

describe('一覧にない値の追加(creatable)', () => {
  it('入力に一致する項目が無ければ「追加」が出て、Enter で値になる。jimble-create が出る', async () => {
    const { f, el } = await make('creatable')
    const onCreate = vi.fn()
    el.addEventListener('jimble-create', onCreate)
    await type(el, '札幌市')
    await tick()
    expect(shown(el)).toEqual(['「札幌市」を追加'])
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(data(f)).toEqual({ pref: '札幌市' })
    expect(input(el).value).toBe('札幌市')
    expect((onCreate.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      value: '札幌市',
      label: '札幌市',
    })
  })

  it('同じ表示の項目があれば「追加」は出ない。一致する候補は先に並ぶ', async () => {
    const { el } = await make('creatable')
    await type(el, '東京都')
    expect(shown(el)).toEqual(['東京都'])
    await type(el, '東京')
    expect(shown(el)).toEqual(['東京都', '「東京」を追加'])
  })

  it('multiple と組み合わせると、追加した項目がチップになり、後の候補にも残る', async () => {
    const { f, el } = await make('multiple creatable')
    await type(el, 'タグ1')
    await tick()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(chips(el)).toEqual(['タグ1'])
    expect(new FormData(f).getAll('pref')).toEqual(['タグ1'])
    await type(el, 'タグ')
    expect(shown(el)).toEqual(['タグ1', '「タグ」を追加'])
  })

  it('create 関数で項目の作り方を決められる(非同期。null なら追加しない)', async () => {
    const { f, el } = await makeWith('creatable', (e) => {
      e.create = async (text) => (text === 'NG' ? null : { value: `id-${text}`, label: text })
    })
    await type(el, 'NG')
    await tick()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(data(f)).toEqual({})
    await type(el, 'OK')
    await tick()
    await userEvent.keyboard('{Enter}')
    await tick()
    expect(data(f)).toEqual({ pref: 'id-OK' })
    expect(input(el).value).toBe('OK')
  })

  it('load と組み合わせても追加できる', async () => {
    const { f, el } = await makeWith('creatable load-delay="0"', (e) => {
      e.load = async () => [{ value: 'x', label: 'エックス' }]
    })
    await type(el, 'ワイ')
    await tick(60)
    expect(shown(el)).toEqual(['エックス', '「ワイ」を追加'])
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')][1]!.click()
    await tick()
    expect(data(f)).toEqual({ pref: 'ワイ' })
  })
})

describe('アクセシビリティ(取得・複数・追加)', () => {
  it('チップ・追加・読み込み中の状態でも axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="タグ"
        ><jimble-combobox name="tag" multiple creatable value="a,b" load-delay="0">
          <jimble-option value="a">A</jimble-option>
          <jimble-option value="b">B</jimble-option>
        </jimble-combobox></jimble-field
      >`,
    )
    const el = f.querySelector('jimble-combobox') as JimbleCombobox
    await el.updateComplete
    await expectNoA11yViolations(f)
    await type(el, 'new')
    await tick()
    await expectNoA11yViolations(f)
    el.load = () => new Promise(() => {})
    await type(el, 'wait')
    await tick(30)
    await expectNoA11yViolations(f)
  })
})

const chipEl = (el: JimbleCombobox, i: number) =>
  el.shadowRoot!.querySelectorAll<HTMLElement>('[part="chip"]')[i]!
const groups = (el: JimbleCombobox) =>
  [...el.shadowRoot!.querySelectorAll('[part="group"]')].map((g) => [
    g.querySelector('[part="group-label"]')!.textContent!.trim(),
    [...g.querySelectorAll('[part="option"]')].map((o) => o.textContent!.trim()),
  ])

describe('選択数の上限(max-items)', () => {
  it('上限に達すると未選択の候補は選べなくなり、案内が読み上げられる。解除すると選べる', async () => {
    const { el } = await make('multiple max-items="2" value="tokyo,osaka"')
    el.show()
    await tick()
    const opts = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(opts[2]!.getAttribute('aria-disabled')).toBe('true')
    expect(opts[0]!.getAttribute('aria-disabled')).toBeNull()
    opts[2]!.click()
    await el.updateComplete
    expect(el.values).toEqual(['tokyo', 'osaka'])
    expect(status(el)).toContain('最大 2 件')
    opts[0]!.click()
    await el.updateComplete
    opts[2]!.click()
    await el.updateComplete
    expect(el.values).toEqual(['osaka', 'kyoto'])
  })

  it('矢印キーは選べない候補を飛ばす', async () => {
    const { el } = await make('multiple max-items="1" value="osaka"')
    input(el).focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    await tick()
    const id = input(el).getAttribute('aria-activedescendant')!
    expect(el.shadowRoot!.getElementById(id)!.textContent).toContain('大阪府')
  })
})

describe('候補のグループ分け', () => {
  it('group が同じ候補が見出し付きでまとまり、離れていても最初の位置に集まる', async () => {
    const f = await mount<HTMLFormElement>(html`<form></form>`)
    f.innerHTML = `<jimble-combobox name="c" aria-label="都市">
      <jimble-option value="a" group="関東">東京</jimble-option>
      <jimble-option value="b" group="関西">大阪</jimble-option>
      <jimble-option value="c" group="関東">横浜</jimble-option>
      <jimble-option value="d">その他</jimble-option>
    </jimble-combobox>`
    const el = f.querySelector('jimble-combobox') as JimbleCombobox
    await el.updateComplete
    el.show()
    await tick()
    expect(groups(el)).toEqual([
      ['関東', ['東京', '横浜']],
      ['関西', ['大阪']],
    ])
    expect(shown(el)).toEqual(['東京', '横浜', '大阪', 'その他'])
    await type(el, '横')
    expect(groups(el)).toEqual([['関東', ['横浜']]])
    await expectNoA11yViolations(f)
  })

  it('load の項目でも group が効く', async () => {
    const { el } = await makeWith('load-delay="0"', (e) => {
      e.load = async () => [
        { value: '1', label: 'A', group: 'G1' },
        { value: '2', label: 'B', group: 'G2' },
      ]
    })
    await type(el, 'x')
    await tick(60)
    expect(groups(el)).toEqual([
      ['G1', ['A']],
      ['G2', ['B']],
    ])
  })
})

describe('チップの並べ替え(reorderable)', () => {
  it('入力が空のとき ← で最後のチップへ移り、← → で移動、→ の端で入力欄に戻る', async () => {
    const { el } = await make('multiple value="tokyo,osaka,kyoto"')
    input(el).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(el.shadowRoot!.activeElement).toBe(chipEl(el, 2))
    await userEvent.keyboard('{ArrowLeft}')
    expect(el.shadowRoot!.activeElement).toBe(chipEl(el, 1))
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(el.shadowRoot!.activeElement).toBe(input(el))
  })

  it('Alt+←/→ で順番が変わり、送信順・jimble-reorder・読み上げに反映される。フォーカスは動かしたチップに残る', async () => {
    const { f, el } = await make('multiple reorderable value="tokyo,osaka,kyoto"')
    const onReorder = vi.fn()
    el.addEventListener('jimble-reorder', onReorder)
    chipEl(el, 2).focus()
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    await tick()
    expect(el.values).toEqual(['tokyo', 'kyoto', 'osaka'])
    expect(new FormData(f).getAll('pref')).toEqual(['tokyo', 'kyoto', 'osaka'])
    expect((onReorder.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      values: ['tokyo', 'kyoto', 'osaka'],
    })
    expect(status(el)).toContain('3 件中 2 番目')
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.value).toBe('kyoto')
    await userEvent.keyboard('{Alt>}{Home}{/Alt}')
    await tick()
    expect(el.values).toEqual(['kyoto', 'tokyo', 'osaka'])
  })

  it('reorderable でなければ Alt+矢印で並べ替わらない', async () => {
    const { el } = await make('multiple value="tokyo,osaka"')
    chipEl(el, 1).focus()
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(el.values).toEqual(['tokyo', 'osaka'])
  })

  it('Delete でチップを削除し、次のチップにフォーカスが移る', async () => {
    const { el } = await make('multiple value="tokyo,osaka,kyoto"')
    chipEl(el, 1).focus()
    await userEvent.keyboard('{Delete}')
    await tick()
    expect(el.values).toEqual(['tokyo', 'kyoto'])
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.value).toBe('kyoto')
  })

  it('ドラッグで順番を入れ替えられる', async () => {
    const { el } = await make('multiple reorderable value="tokyo,osaka,kyoto"')
    expect(chipEl(el, 0).getAttribute('draggable')).toBe('true')
    const dt = new DataTransfer()
    chipEl(el, 0).dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }))
    const r = chipEl(el, 2).getBoundingClientRect()
    chipEl(el, 2).dispatchEvent(
      new DragEvent('dragover', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientX: r.right - 1,
      }),
    )
    expect(chipEl(el, 2).dataset.drop).toBe('after')
    chipEl(el, 2).dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientX: r.right - 1,
      }),
    )
    await el.updateComplete
    expect(el.values).toEqual(['osaka', 'kyoto', 'tokyo'])
    expect(chips(el)).toEqual(['大阪府', '京都府', '東京都'])
  })

  it('チップ・ヒントを含めて axe 違反がない', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="優先順"
        ><jimble-combobox name="p" multiple reorderable value="a,b">
          <jimble-option value="a">A</jimble-option>
          <jimble-option value="b">B</jimble-option>
        </jimble-combobox></jimble-field
      >`,
    )
    const el = f.querySelector('jimble-combobox') as JimbleCombobox
    await el.updateComplete
    await expectNoA11yViolations(f)
    chipEl(el, 0).focus()
    await expectNoA11yViolations(f)
  })
})

describe('前へ / 後ろへボタン(タッチの代わり)', () => {
  it('チップにフォーカスすると表示され、押すと順番が入れ替わってフォーカスが残る', async () => {
    const { el } = await make('multiple reorderable value="tokyo,osaka,kyoto"')
    const move = (i: number, dir: '前へ' | '後ろへ') =>
      chipEl(el, i).querySelector<HTMLButtonElement>(`[aria-label$="${dir}移動"]`)!
    expect(getComputedStyle(move(1, '前へ')).display).toBe('none')
    chipEl(el, 1).focus()
    expect(getComputedStyle(move(1, '前へ')).display).not.toBe('none')
    expect(move(1, '前へ').getAttribute('aria-label')).toBe('大阪府 を前へ移動')
    move(1, '前へ').click()
    await tick()
    expect(el.values).toEqual(['osaka', 'tokyo', 'kyoto'])
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.value).toBe('osaka')
    expect(move(0, '前へ').disabled).toBe(true)
    move(0, '後ろへ').click()
    await tick()
    expect(el.values).toEqual(['tokyo', 'osaka', 'kyoto'])
  })

  it('reorderable でなければボタンは出ない', async () => {
    const { el } = await make('multiple value="tokyo,osaka"')
    expect(el.shadowRoot!.querySelector('[part="chip-move"]')).toBeNull()
  })
})
