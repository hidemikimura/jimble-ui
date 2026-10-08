import { html } from 'lit'
import { userEvent } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, mount } from '../test/mount.js'
import '../components/drawer/jimble-drawer.js'
import '../components/select/jimble-option.js'
import '../components/select/jimble-select.js'
import '../components/tabs/jimble-tabs.js'
import type { JimbleDrawer } from '../components/drawer/jimble-drawer.js'
import { JimbleElement } from './jimble-element.js'

afterEach(cleanup)
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms))

class EmitProbe extends JimbleElement {
  fire(name: string, bubbles?: boolean) {
    return this.emit(name, { bubbles })
  }
}
customElements.define('x-emit-probe', EmitProbe)

describe('emit（jimble-* のイベントの伝わり方）', () => {
  it('既定ではバブルしない。発火した部品自身のリスナーには届く', async () => {
    const outer = await mount<HTMLElement>(html`<div><x-emit-probe></x-emit-probe></div>`)
    const probe = outer.querySelector('x-emit-probe') as EmitProbe
    const onParent = vi.fn()
    const onSelf = vi.fn()
    outer.addEventListener('jimble-close', onParent)
    probe.addEventListener('jimble-close', onSelf)
    const event = probe.fire('close')
    expect(event.bubbles).toBe(false)
    expect(onSelf).toHaveBeenCalledTimes(1)
    expect(onParent).not.toHaveBeenCalled()
  })

  it('bubbles: true を指定すると、親にも届く（ルーターなど、アプリ全体で受ける通知）', async () => {
    const outer = await mount<HTMLElement>(html`<div><x-emit-probe></x-emit-probe></div>`)
    const probe = outer.querySelector('x-emit-probe') as EmitProbe
    const onParent = vi.fn()
    outer.addEventListener('jimble-route-change', onParent)
    probe.fire('route-change', true)
    expect(onParent).toHaveBeenCalledTimes(1)
  })
})

describe('入れ子の部品のイベントが、外側に漏れない', () => {
  it('ドロワーの中の select の jimble-open / jimble-close は、ドロワーのリスナーに届かない', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-drawer heading="ドロワー">
      <jimble-select placeholder="選択"><jimble-option value="a">A</jimble-option></jimble-select>
    </jimble-drawer>`
    const drawer = c.querySelector('jimble-drawer') as JimbleDrawer
    const heard: string[] = []
    for (const name of ['jimble-open', 'jimble-close'])
      drawer.addEventListener(name, (e) =>
        heard.push(`${name} from ${(e.target as Element).localName}`),
      )
    drawer.show()
    await drawer.updateComplete
    await vi.waitFor(() => expect(heard).toEqual(['jimble-open from jimble-drawer']))
    heard.length = 0

    const select = c.querySelector('jimble-select')!
    const onSelectOpen = vi.fn()
    const onSelectClose = vi.fn()
    select.addEventListener('jimble-open', onSelectOpen)
    select.addEventListener('jimble-close', onSelectClose)
    select.shadowRoot!.querySelector<HTMLElement>('button, [role="combobox"]')!.click()
    await vi.waitFor(() => expect(onSelectOpen).toHaveBeenCalledTimes(1))
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(onSelectClose).toHaveBeenCalledTimes(1))
    await tick(100)
    // select 自身のリスナーには届くが、ドロワーのリスナーには届かない(ドロワーも閉じていない)
    expect(heard).toEqual([])
  })

  it('タブの中のタブの jimble-tab-change は、外側のタブのリスナーに届かない', async () => {
    const c = await mount<HTMLElement>(html`<div></div>`)
    c.innerHTML = `<jimble-tabs id="outer" label="外">
      <jimble-tab value="a">A</jimble-tab>
      <jimble-tab-panel value="a">
        <jimble-tabs id="inner" label="内">
          <jimble-tab value="x">X</jimble-tab><jimble-tab value="y">Y</jimble-tab>
          <jimble-tab-panel value="x">x</jimble-tab-panel><jimble-tab-panel value="y">y</jimble-tab-panel>
        </jimble-tabs>
      </jimble-tab-panel>
    </jimble-tabs>`
    await tick()
    const outer = c.querySelector('#outer')!
    const inner = c.querySelector('#inner')!
    const onOuter = vi.fn()
    const onInner = vi.fn()
    outer.addEventListener('jimble-tab-change', onOuter)
    inner.addEventListener('jimble-tab-change', onInner)
    inner.querySelector<HTMLElement>('jimble-tab[value="y"]')!.click()
    await tick()
    expect(onInner).toHaveBeenCalledTimes(1)
    expect(onOuter).not.toHaveBeenCalled()
  })
})
