import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it } from 'vitest'
import '../field/jimble-field.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import type { JimbleTree } from './jimble-tree.js'
import type { JimbleTreeItem } from './jimble-tree-item.js'
import './jimble-tree.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))

const ITEMS = `
  <jimble-tree-item label="食品" value="food" expanded>
    <jimble-tree-item label="野菜" value="veg"></jimble-tree-item>
    <jimble-tree-item label="果物" value="fruit">
      <jimble-tree-item label="りんご" value="apple"></jimble-tree-item>
      <jimble-tree-item label="みかん" value="orange"></jimble-tree-item>
    </jimble-tree-item>
  </jimble-tree-item>
  <jimble-tree-item label="家電" value="appliance"></jimble-tree-item>`

async function tree(attrs = '', items = ITEMS) {
  const c = await mount<HTMLElement>(html`<div></div>`)
  c.innerHTML = `<jimble-tree aria-label="カテゴリ" ${attrs}>${items}</jimble-tree><input id="after" aria-label="次">`
  const el = c.querySelector('jimble-tree') as JimbleTree
  await el.updateComplete
  await tick()
  const item = (v: string) => el.querySelector<JimbleTreeItem>(`jimble-tree-item[value="${v}"]`)!
  return { c, el, item }
}
const row = (i: JimbleTreeItem) => i.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!
const toggle = (i: JimbleTreeItem) =>
  i.shadowRoot!.querySelector<HTMLElement>('[data-tree-toggle]')!
const key = async (target: Element, k: string) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }))
  await tick()
}
const visibleLabels = (el: JimbleTree) =>
  el.items.filter((i) => i.checkVisibility()).map((i) => i.label)

describe('jimble-tree: 構造と役割', () => {
  it('木は role="tree"、項目は treeitem で、階層・位置・数を持つ', async () => {
    const { el, item } = await tree()
    expect(el.shadowRoot!.querySelector('[part="base"]')!.getAttribute('role')).toBe('tree')
    const apple = item('apple')
    expect(apple.getAttribute('role')).toBe('treeitem')
    expect(apple.getAttribute('aria-level')).toBe('3')
    expect(apple.getAttribute('aria-posinset')).toBe('1')
    expect(apple.getAttribute('aria-setsize')).toBe('2')
    expect(item('appliance').getAttribute('aria-level')).toBe('1')
    expect(item('appliance').getAttribute('aria-posinset')).toBe('2')
  })

  it('子のある項目だけが aria-expanded を持ち、子の無い項目には group も描かない（設計書 §22.3）', async () => {
    const { item } = await tree()
    expect(item('food').getAttribute('aria-expanded')).toBe('true')
    expect(item('fruit').getAttribute('aria-expanded')).toBe('false')
    expect(item('veg').hasAttribute('aria-expanded')).toBe(false)
    expect(item('veg').shadowRoot!.querySelector('[role="group"]')).toBeNull()
    expect(item('fruit').shadowRoot!.querySelector('[role="group"]')).not.toBeNull()
  })

  it('閉じた項目の子は見えない。開閉の印で開閉し、jimble-expand / jimble-collapse が木から出る', async () => {
    const { el, item } = await tree()
    const events: string[] = []
    el.addEventListener('jimble-expand', (e) => events.push(`+${e.detail.item.label}`))
    el.addEventListener('jimble-collapse', (e) => events.push(`-${e.detail.item.label}`))
    expect(visibleLabels(el)).toEqual(['食品', '野菜', '果物', '家電'])
    await userEvent.click(toggle(item('fruit')))
    await tick()
    expect(visibleLabels(el)).toEqual(['食品', '野菜', '果物', 'りんご', 'みかん', '家電'])
    await userEvent.click(toggle(item('food')))
    await tick()
    expect(visibleLabels(el)).toEqual(['食品', '家電'])
    expect(events).toEqual(['+果物', '-食品'])
  })

  it('子は字下げされ、--jimble-tree-indent で変えられる', async () => {
    const { item } = await tree()
    const left = (i: JimbleTreeItem) => row(i).getBoundingClientRect().left
    expect(left(item('veg')) - left(item('food'))).toBe(20)
    const { item: item2 } = await tree('style="--jimble-tree-indent: 2rem"')
    expect(left(item2('veg')) - left(item2('food'))).toBe(32)
  })
})

describe('jimble-tree: キー操作（APG）', () => {
  it('Tab で入るのは 1 つだけ（最初の項目）。↓↑ で表示中の項目を移動', async () => {
    const { el, item } = await tree()
    expect(el.items.filter((i) => i.tabIndex === 0)).toEqual([item('food')])
    item('food').focus()
    await key(item('food'), 'ArrowDown')
    expect(document.activeElement).toBe(item('veg'))
    await key(item('veg'), 'ArrowDown')
    expect(document.activeElement).toBe(item('fruit'))
    await key(item('fruit'), 'ArrowDown') // 果物は閉じているので、次は家電
    expect(document.activeElement).toBe(item('appliance'))
    await key(item('appliance'), 'ArrowUp')
    expect(document.activeElement).toBe(item('fruit'))
    expect(item('fruit').tabIndex).toBe(0)
  })

  it('→ で開き、もう一度 → で最初の子へ。← で親へ、もう一度 ← で閉じる', async () => {
    const { item } = await tree()
    item('fruit').focus()
    await key(item('fruit'), 'ArrowRight')
    expect(item('fruit').expanded).toBe(true)
    await key(item('fruit'), 'ArrowRight')
    expect(document.activeElement).toBe(item('apple'))
    await key(item('apple'), 'ArrowLeft')
    expect(document.activeElement).toBe(item('fruit'))
    await key(item('fruit'), 'ArrowLeft')
    expect(item('fruit').expanded).toBe(false)
  })

  it('Home / End、文字で先頭一致、* で同じ階層をすべて開く', async () => {
    const { item } = await tree()
    item('veg').focus()
    await key(item('veg'), 'End')
    expect(document.activeElement).toBe(item('appliance'))
    await key(item('appliance'), 'Home')
    expect(document.activeElement).toBe(item('food'))
    await key(item('food'), '家')
    expect(document.activeElement).toBe(item('appliance'))
    item('veg').focus()
    await key(item('veg'), '*')
    expect(item('fruit').expanded).toBe(true)
  })

  it('閉じた項目の子孫にフォーカスがあれば、閉じた項目へ移る', async () => {
    const { el, item } = await tree()
    item('veg').focus()
    el.setExpanded(item('food'), false)
    await tick()
    expect(document.activeElement).toBe(item('food'))
  })
})

describe('jimble-tree: 選ぶ（single）', () => {
  it('クリック・Enter で選び、aria-selected と values が変わり、selection-change と change が出る', async () => {
    const { el, item } = await tree('selection="single"')
    const changes: string[][] = []
    let native = 0
    el.addEventListener('jimble-selection-change', (e) =>
      changes.push((e as CustomEvent).detail.values),
    )
    el.addEventListener('change', () => native++)
    await userEvent.click(row(item('veg')))
    await tick()
    expect(item('veg').getAttribute('aria-selected')).toBe('true')
    expect(item('food').getAttribute('aria-selected')).toBe('false')
    expect(el.value).toBe('veg')
    await key(item('veg'), 'ArrowDown')
    await key(item('fruit'), 'Enter')
    expect(el.values).toEqual(['fruit'])
    expect(item('veg').getAttribute('aria-selected')).toBe('false')
    expect(changes).toEqual([['veg'], ['fruit']])
    expect(native).toBe(2)
  })

  it('value 属性が初期値で、Tab で入る先は選ばれている項目', async () => {
    const { el, item } = await tree('selection="single" value="veg"')
    expect(el.value).toBe('veg')
    expect(item('veg').tabIndex).toBe(0)
  })

  it('disabled の項目は選べないが、移動はできる', async () => {
    const { el, item } = await tree('selection="single"')
    item('veg').disabled = true
    await tick()
    await userEvent.click(row(item('veg')))
    await tick()
    expect(el.values).toEqual([])
    expect(item('veg').getAttribute('aria-disabled')).toBe('true')
  })

  it('selection="none" では選ばず、子のある行のクリックで開閉する', async () => {
    const { el, item } = await tree()
    await userEvent.click(row(item('fruit')))
    await tick()
    expect(item('fruit').expanded).toBe(true)
    expect(el.values).toEqual([])
    expect(item('fruit').hasAttribute('aria-selected')).toBe(false)
  })
})

describe('jimble-tree: 付け外し（multiple）', () => {
  it('木は aria-multiselectable、項目は aria-checked。親を付けると子孫がすべて付く', async () => {
    const { el, item } = await tree('selection="multiple"')
    const base = el.shadowRoot!.querySelector('[part="base"]')!
    expect(base.getAttribute('aria-multiselectable')).toBe('true')
    expect(item('food').getAttribute('aria-checked')).toBe('false')
    item('food').focus()
    await key(item('food'), ' ')
    for (const v of ['food', 'veg', 'fruit', 'apple', 'orange'])
      expect(item(v).getAttribute('aria-checked'), v).toBe('true')
    expect(item('appliance').getAttribute('aria-checked')).toBe('false')
  })

  it('子の一部だけなら親は mixed、すべてなら true。外すと祖先も決め直す', async () => {
    const { el, item } = await tree('selection="multiple"')
    await userEvent.click(row(item('veg')))
    await tick()
    expect(item('food').getAttribute('aria-checked')).toBe('mixed')
    expect(item('food').matches(':state(mixed)')).toBe(true)
    el.setExpanded(item('fruit'), true)
    await tick()
    await userEvent.click(row(item('apple')))
    await userEvent.click(row(item('orange')))
    await tick()
    expect(item('fruit').getAttribute('aria-checked')).toBe('true')
    expect(item('food').getAttribute('aria-checked')).toBe('true')
    await userEvent.click(row(item('apple')))
    await tick()
    expect(item('fruit').getAttribute('aria-checked')).toBe('mixed')
    expect(item('food').getAttribute('aria-checked')).toBe('mixed')
  })

  it('values は付いている項目すべて（親も）。checked-values="leaves" なら子の無い項目だけ', async () => {
    const { el, item } = await tree('selection="multiple"')
    await userEvent.click(row(item('food')))
    await tick()
    expect(el.values).toEqual(['food', 'veg', 'fruit', 'apple', 'orange'])
    el.checkedValues = 'leaves'
    await tick()
    expect(el.values).toEqual(['veg', 'apple', 'orange'])
  })

  it('value 属性（カンマ区切り）の初期値も、親子の連動に合わせて整える', async () => {
    const { el, item } = await tree('selection="multiple" value="fruit,veg"')
    expect(item('apple').getAttribute('aria-checked')).toBe('true')
    expect(item('food').getAttribute('aria-checked')).toBe('true')
    expect(el.values).toEqual(['food', 'veg', 'fruit', 'apple', 'orange'])
  })
})

describe('jimble-tree: フォーム', () => {
  it('name があれば、values を同じ名前で送る。リセットで初期値に戻る', async () => {
    const c = await mount<HTMLFormElement>(
      html`<form>
        <jimble-tree
          name="cat"
          selection="multiple"
          aria-label="カテゴリ"
          value="veg"
        ></jimble-tree>
      </form>`,
    )
    const el = c.querySelector('jimble-tree') as JimbleTree
    el.innerHTML = ITEMS
    await tick()
    expect(new FormData(c).getAll('cat')).toEqual(['veg'])
    el.values = ['fruit']
    await tick()
    expect(new FormData(c).getAll('cat')).toEqual(['fruit', 'apple', 'orange'])
    c.reset()
    await tick()
    expect(new FormData(c).getAll('cat')).toEqual(['veg'])
  })

  it('required は 1 つ以上。jimble-field のラベルが木の名前になる', async () => {
    const c = await mount<HTMLElement>(
      html`<jimble-field label="カテゴリ" required
        ><jimble-tree name="cat" selection="single"></jimble-tree
      ></jimble-field>`,
    )
    const el = c.querySelector('jimble-tree') as JimbleTree
    el.innerHTML = ITEMS
    await tick(80)
    expect(el.checkValidity()).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="base"]')!.getAttribute('aria-label')).toBe(
      'カテゴリ',
    )
    el.value = 'veg'
    await tick()
    expect(el.checkValidity()).toBe(true)
  })
})

describe('jimble-tree: 遅延読み込み（lazy）', () => {
  const LAZY = `<jimble-tree-item label="東京本社" value="hq" lazy></jimble-tree-item>`

  it('子が無くても開く印を出し、開くと jimble-expand。子が足されるまで読み込み中', async () => {
    const { el, item } = await tree('selection="multiple"', LAZY)
    const hq = item('hq')
    expect(hq.getAttribute('aria-expanded')).toBe('false')
    let expanded: JimbleTreeItem | undefined
    el.addEventListener('jimble-expand', (e) => (expanded = e.detail.item))
    hq.focus()
    await key(hq, 'ArrowRight')
    expect(expanded).toBe(hq)
    expect(hq.loading).toBe(true)
    expect(
      hq.getAttribute('aria-busy') ??
        (hq as unknown as { internals: ElementInternals }).internals?.ariaBusy,
    ).toBeDefined()
    hq.insertAdjacentHTML(
      'beforeend',
      '<jimble-tree-item label="営業部" value="sales"></jimble-tree-item>',
    )
    await tick(80)
    expect(hq.loading).toBe(false)
    expect(item('sales').getAttribute('aria-level')).toBe('2')
  })

  it('付いている親に、あとから読み込まれた子は、付いた状態を受け継ぐ', async () => {
    const { el, item } = await tree('selection="multiple" value="hq"', LAZY)
    expect(el.values).toEqual(['hq'])
    item('hq').insertAdjacentHTML(
      'beforeend',
      '<jimble-tree-item label="営業部" value="sales"></jimble-tree-item><jimble-tree-item label="開発部" value="dev"></jimble-tree-item>',
    )
    await tick(80)
    expect(item('sales').getAttribute('aria-checked')).toBe('true')
    expect(el.values).toEqual(['hq', 'sales', 'dev'])
  })
})

describe('jimble-tree: axe', () => {
  for (const selection of ['none', 'single', 'multiple'])
    it(`axe 違反がない（selection="${selection}"、一部を開いた状態）`, async () => {
      const { c, el, item } = await tree(`selection="${selection}" guides`)
      el.setExpanded(item('fruit'), true)
      await tick()
      await expectNoA11yViolations(c)
    })
})
