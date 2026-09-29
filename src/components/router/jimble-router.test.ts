import { html } from 'lit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { JimbleRouter, type RouteConfig, type RouteContext } from './jimble-router.js'

const P = '/__jimble_router_test__'
const original = location.href
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
let router: JimbleRouter

/** ルーターを置いて、いまの URL のページが出るまで待つ */
async function mountRouter(routes: RouteConfig[], setup?: (r: JimbleRouter) => void, at = `${P}/`) {
  history.replaceState(null, '', at)
  router = document.createElement('jimble-router')
  document.body.append(router)
  setup?.(router)
  router.routes = routes
  await router.updateComplete
  await tick(60)
  return router
}
const text = () => router.querySelector('[data-jimble-outlet]')!.textContent!.trim()
const go = async (fn: () => unknown) => {
  await fn()
  await tick(60)
}

beforeEach(() => {
  document.title = 'テスト'
})
afterEach(() => {
  router?.remove()
  history.replaceState(null, '', original)
})

const home: RouteConfig = { path: `${P}/`, render: () => html`<p>ホーム</p>` }
const user: RouteConfig = {
  path: `${P}/users/:id`,
  name: 'user',
  render: ({ params, query, data }) =>
    html`<p>ユーザー${params.id}:${query.get('tab') ?? '-'}:${String(data?.flash ?? '-')}</p>`,
  title: ({ params }) => `ユーザー ${params.id}`,
}

describe('表示', () => {
  it('いまの URL のルートを表示する。パスの値・検索文字列・タイトルが渡る', async () => {
    await mountRouter([home, user], undefined, `${P}/users/12?tab=a`)
    expect(text()).toBe('ユーザー12:a:-')
    expect(document.title).toBe('ユーザー 12')
    expect(router.current.params).toEqual({ id: '12' })
  })

  it('load の結果が render の第 2 引数に渡り、完了するまで busy になる。DOM の要素も返せる', async () => {
    let done!: (v: string) => void
    await mountRouter([
      {
        path: `${P}/`,
        load: () => new Promise<string>((r) => (done = r)),
        render: (_c, loaded: string) => {
          const el = document.createElement('p')
          el.textContent = `読み込み: ${loaded}`
          return el
        },
      },
    ])
    expect(router.busy).toBe(true)
    done('OK')
    await tick(60)
    expect(router.busy).toBe(false)
    expect(text()).toBe('読み込み: OK')
  })

  it('どのルートにもマッチしないとき、fallback を表示する。ルートの追加・差し替えにも追従する', async () => {
    await mountRouter(
      [home],
      (r) => (r.fallback = { render: () => html`<p>見つかりません</p>` }),
      `${P}/nope`,
    )
    expect(text()).toBe('見つかりません')
    router.routes = [{ path: `${P}/nope`, render: () => html`<p>できた</p>` }, home]
    await router.updateComplete
    await tick(60)
    expect(text()).toBe('できた')
  })
})

describe('遷移', () => {
  it('リンク(a href)のクリックが、ページの再読み込みなしに遷移になる。data-router-ignore は除く', async () => {
    await mountRouter([
      { path: `${P}/`, render: () => html`<a id="l" href="${P}/users/3">ユーザー</a>` },
      user,
    ])
    const marker = router.querySelector('#l')
    ;(marker as HTMLAnchorElement).click()
    await tick(80)
    expect(location.pathname).toBe(`${P}/users/3`)
    expect(text()).toBe('ユーザー3:-:-')
    expect(document.contains(router)).toBe(true) // ページごと読み込み直されていない
  })

  it('navigate: data は遷移先に 1 回きり渡り、戻る・進むでは渡らない', async () => {
    await mountRouter([home, user])
    await go(() => router.navigate(`${P}/users/1`, { data: { flash: '保存しました' } }))
    expect(text()).toBe('ユーザー1:-:保存しました')
    await go(() => router.navigate(`${P}/users/2`))
    await go(() => router.back())
    expect(text()).toBe('ユーザー1:-:-') // 戻ったときは、data は無い
  })

  it('state は履歴に保存され、戻る・進むで復元される', async () => {
    const seen: unknown[] = []
    await mountRouter([
      home,
      {
        path: `${P}/s`,
        render: (c: RouteContext) => {
          seen.push(c.state)
          return html`<p>s</p>`
        },
      },
    ])
    await go(() => router.navigate(`${P}/s`, { state: { filter: 'open', n: 2 } }))
    expect(seen.at(-1)).toEqual({ filter: 'open', n: 2 })
    await go(() => router.navigate(`${P}/`))
    await go(() => router.back())
    expect(seen.at(-1)).toEqual({ filter: 'open', n: 2 })
    router.setEntryState({ filter: 'done' })
    expect(router.current.state).toEqual({ filter: 'done' })
    expect(navigation.currentEntry?.getState()).toEqual({ filter: 'done' })
  })

  it('replace は履歴を増やさない(push は増える)', async () => {
    await mountRouter([home, user])
    const index = () => navigation.currentEntry!.index
    const before = index()
    await go(() => router.navigate(`${P}/users/1`, { history: 'replace' }))
    expect(index()).toBe(before)
    await go(() => router.navigate(`${P}/users/2`))
    expect(index()).toBe(before + 1)
  })

  it('redirect(文字列・関数)。data は引き継がれる', async () => {
    await mountRouter([
      home,
      user,
      { path: `${P}/old`, redirect: `${P}/users/9` },
      { path: `${P}/old/:id`, redirect: (c) => `${P}/users/${c.params.id}` },
    ])
    await go(() => router.navigate(`${P}/old`, { data: { flash: 'あ' } }))
    expect(location.pathname).toBe(`${P}/users/9`)
    expect(text()).toBe('ユーザー9:-:あ')
    await go(() => router.navigate(`${P}/old/5`))
    expect(location.pathname).toBe(`${P}/users/5`)
  })

  it('別の遷移に置き換わると、前の load は中止(signal)され、あとの結果だけが表示される', async () => {
    const signals: AbortSignal[] = []
    const resolvers = new Map<string, (v: string) => void>()
    await mountRouter([
      home,
      {
        path: `${P}/slow/:id`,
        load: ({ params, signal }) => {
          signals.push(signal)
          return new Promise<string>((r) => resolvers.set(params.id!, r))
        },
        render: (_c, v: string) => html`<p>${v}</p>`,
      },
    ])
    void router.navigate(`${P}/slow/a`)
    await tick(40)
    void router.navigate(`${P}/slow/b`)
    await tick(40)
    expect(signals[0]!.aborted).toBe(true)
    resolvers.get('b')!('B')
    resolvers.get('a')!('A')
    await tick(80)
    expect(text()).toBe('B')
  })
})

describe('名前つきのルート', () => {
  it('url で、パスの値(エンコード)と検索文字列から URL を組み立て、navigateTo で遷移できる', async () => {
    await mountRouter([home, user])
    expect(router.url('user', { id: 5 })).toBe(`${P}/users/5`)
    expect(router.url('user', { id: 'a b/c' }, { tab: ['x', 'y'], q: '', n: 1 })).toBe(
      `${P}/users/a%20b%2Fc?tab=x&tab=y&n=1`,
    )
    await go(() =>
      router.navigateTo('user', { id: 7 }, { query: { tab: 'z' }, data: { flash: '!' } }),
    )
    expect(text()).toBe('ユーザー7:z:!')
  })
})

describe('setQuery（再描画なしに URL の検索文字列だけを差し替える）', () => {
  it('ページは再描画されず、URL だけが変わる。merge・削除・配列。イベントは queryOnly', async () => {
    const renders = vi.fn()
    await mountRouter(
      [
        {
          path: `${P}/list`,
          render: () => {
            renders()
            return html`<p id="p">一覧</p>`
          },
        },
      ],
      undefined,
      `${P}/list?keep=1&page=1`,
    )
    const page = router.querySelector('#p')
    const events: unknown[] = []
    router.addEventListener('jimble-route-change', (e) => events.push((e as CustomEvent).detail))
    await go(() => router.setQuery({ page: 2, q: 'abc' }))
    expect(location.search).toBe('?keep=1&page=2&q=abc')
    expect(router.querySelector('#p')).toBe(page)
    expect(renders).toHaveBeenCalledTimes(1)
    expect(events.at(-1)).toMatchObject({ queryOnly: true })
    expect(router.current.url.searchParams.get('page')).toBe('2')
    await go(() => router.setQuery({ q: null, tag: ['a', 'b'] }))
    expect(location.search).toBe('?keep=1&page=2&tag=a&tag=b')
    await go(() => router.setQuery({ only: 1 }, { merge: false }))
    expect(location.search).toBe('?only=1')
  })

  it('既定は replace(履歴が増えない)。push なら増え、戻ると前の検索文字列になる', async () => {
    await mountRouter(
      [{ path: `${P}/list`, render: () => html`<p>一覧</p>` }],
      undefined,
      `${P}/list?page=1`,
    )
    const index = () => navigation.currentEntry!.index
    const before = index()
    await go(() => router.setQuery({ page: 2 }))
    expect(index()).toBe(before)
    await go(() => router.setQuery({ page: 3 }, { history: 'push' }))
    expect(index()).toBe(before + 1)
    await go(() => router.back())
    expect(location.search).toBe('?page=2')
  })
})

describe('スクロール（内側の要素）', () => {
  it('scroll-container の位置を履歴ごとに保存し、戻ると復元、新しい遷移は先頭に戻す', async () => {
    const box = document.createElement('div')
    box.id = 'scroller'
    box.style.cssText = 'height:100px;overflow:auto'
    document.body.append(box)
    const inner = document.createElement('div')
    inner.style.height = '2000px'
    box.append(inner)
    try {
      await mountRouter(
        [
          { path: `${P}/a`, render: () => html`<p>A</p>` },
          { path: `${P}/b`, render: () => html`<p>B</p>` },
        ],
        (r) => (r.scrollContainer = '#scroller'),
        `${P}/a`,
      )
      box.scrollTop = 500
      await go(() => router.navigate(`${P}/b`))
      expect(box.scrollTop).toBe(0)
      await go(() => router.back())
      await tick(60)
      expect(box.scrollTop).toBe(500)
    } finally {
      box.remove()
    }
  })
})

describe('フォーカスと読み上げ', () => {
  it('遷移のあと、フォーカスがページの先頭へ移り、タイトルが読み上げられる。autofocus があればそちら', async () => {
    await mountRouter([
      { path: `${P}/`, render: () => html`<p>ホーム</p>` },
      { path: `${P}/x`, title: 'X ページ', render: () => html`<input id="af" autofocus />` },
      { path: `${P}/y`, title: 'Y ページ', render: () => html`<p>Y</p>` },
    ])
    await go(() => router.navigate(`${P}/y`))
    expect(document.activeElement).toBe(router.querySelector('[data-jimble-outlet]'))
    expect(router.shadowRoot!.querySelector('[role="status"]')!.textContent).toBe('Y ページ')
    await go(() => router.navigate(`${P}/x`))
    expect(document.activeElement).toBe(router.querySelector('#af'))
  })

  it('axe 違反がない', async () => {
    await mountRouter([{ path: `${P}/`, render: () => html`<main><h1>ホーム</h1></main>` }])
    await expectNoA11yViolations(document.body)
  })
})

describe('エラーと制約', () => {
  it('load が失敗すると jimble-route-error を出し、errorPage があればそれを表示する', async () => {
    const errors: unknown[] = []
    await mountRouter(
      [
        home,
        {
          path: `${P}/boom`,
          load: () => Promise.reject(new Error('boom')),
          render: () => html`<p>出ない</p>`,
        },
      ],
      (r) => (r.errorPage = (_c, e) => html`<p>エラー: ${(e as Error).message}</p>`),
    )
    router.addEventListener('jimble-route-error', (e) =>
      errors.push((e as CustomEvent).detail.error),
    )
    await go(() => router.navigate(`${P}/boom`))
    expect(text()).toBe('エラー: boom')
    expect(errors.length).toBe(1)
    expect(router.busy).toBe(false)
  })

  it('jimble-router は 1 つだけ。2 つ目は動かない', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mountRouter([home])
    const second = document.createElement('jimble-router')
    document.body.append(second)
    second.routes = [{ path: `${P}/`, render: () => html`<p>2 つ目</p>` }]
    await tick(60)
    expect(second.querySelector('[data-jimble-outlet]')).toBeNull()
    expect(JimbleRouter.instance).toBe(router)
    second.remove()
    warn.mockRestore()
  })
})

describe('動的 import（load）と、古くなった画面の復旧', () => {
  const chunkError = () =>
    new TypeError(
      'Failed to fetch dynamically imported module: https://example.com/assets/user-abc.js',
    )
  const original = JimbleRouter.hardNavigate
  const calls: string[] = []
  beforeEach(() => {
    calls.length = 0
    sessionStorage.removeItem('jimble-router.chunk-reload')
    JimbleRouter.hardNavigate = (url) => void calls.push(url.pathname)
  })
  afterEach(() => {
    JimbleRouter.hardNavigate = original
  })

  it('load で部品を import すると、render の時点では要素が定義済み', async () => {
    const tag = `x-page-${Math.random().toString(36).slice(2, 8)}`
    let definedAtRender = false
    await mountRouter([
      home,
      {
        path: `${P}/lazy`,
        load: async () => {
          await tick(30) // 動的 import の代わり
          customElements.define(tag, class extends HTMLElement {})
        },
        render: () => {
          definedAtRender = !!customElements.get(tag)
          return html`<p>読み込み済み</p>`
        },
      },
    ])
    await go(() => router.navigate(`${P}/lazy`))
    expect(definedAtRender).toBe(true)
    expect(text()).toBe('読み込み済み')
  })

  it('動的 import の失敗(ブラウザごとの文言)は、通常のページ遷移に切り替えて復旧する', async () => {
    for (const message of [
      'Failed to fetch dynamically imported module: x',
      'error loading dynamically imported module',
      'Importing a module script failed.',
    ]) {
      calls.length = 0
      sessionStorage.removeItem('jimble-router.chunk-reload')
      await mountRouter([
        home,
        { path: `${P}/lazy`, load: () => Promise.reject(new TypeError(message)) },
      ])
      await go(() => router.navigate(`${P}/lazy`))
      expect(calls).toEqual([`${P}/lazy`])
      router.remove()
    }
  })

  it('同じ URL で続けて失敗しても、繰り返さない(2 回目はエラーとして扱う)。別の失敗は復旧しない', async () => {
    await mountRouter(
      [
        home,
        { path: `${P}/lazy`, load: () => Promise.reject(chunkError()) },
        { path: `${P}/other`, load: () => Promise.reject(new Error('サーバーエラー')) },
      ],
      (r) => (r.errorPage = (_c, e) => html`<p>失敗: ${(e as Error).message.slice(0, 6)}</p>`),
    )
    await go(() => router.navigate(`${P}/lazy`))
    expect(calls).toEqual([`${P}/lazy`])
    await go(() => router.navigate(`${P}/lazy`, { history: 'replace' }))
    expect(calls.length).toBe(1) // 2 回目は復旧しない
    expect(text()).toBe('失敗: Failed')
    await go(() => router.navigate(`${P}/other`))
    expect(calls.length).toBe(1)
    expect(text()).toBe('失敗: サーバーエラ')
  })

  it('jimble-route-error の preventDefault と no-chunk-reload で、復旧を止められる', async () => {
    await mountRouter(
      [home, { path: `${P}/lazy`, load: () => Promise.reject(chunkError()) }],
      (r) => {
        r.errorPage = () => html`<p>止めた</p>`
        r.addEventListener('jimble-route-error', (e) => e.preventDefault())
      },
    )
    await go(() => router.navigate(`${P}/lazy`))
    expect(calls).toEqual([])
    expect(text()).toBe('止めた')
    router.remove()
    sessionStorage.removeItem('jimble-router.chunk-reload')
    await mountRouter(
      [home, { path: `${P}/lazy`, load: () => Promise.reject(chunkError()) }],
      (r) => {
        r.noChunkReload = true
        r.errorPage = () => html`<p>止めた 2</p>`
      },
    )
    await go(() => router.navigate(`${P}/lazy`))
    expect(calls).toEqual([])
    expect(text()).toBe('止めた 2')
  })
})
