import {
  html,
  render,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit'
import { keyed } from 'lit/directives/keyed.js'
import { JimbleElement } from '../../base/jimble-element.js'

/** ページの中身。Lit のテンプレート、または DOM の要素 */
export type RouteContent = TemplateResult | Node | null | undefined

/** `load` と `render` に渡される、遷移の情報 */
export interface RouteContext {
  /** パスの `:id` などの値 */
  params: Record<string, string>
  /** URL の検索文字列（`?page=2`） */
  query: URLSearchParams
  url: URL
  /** 遷移するときに `navigate(url, { data })` で渡された値。1 回きりで、戻る・進む・リロードでは `undefined` */
  data: Record<string, unknown> | undefined
  /** `navigate(url, { state })` で渡した値。履歴に保存され、戻る・進む・リロードで復元される */
  state: Record<string, unknown> | undefined
  navigationType: NavigationType
  /** 別の遷移に置き換わったとき、または中止されたときに abort される（`fetch` に渡す） */
  signal: AbortSignal
  route: RouteConfig
  /** ページの中で自前にデータを取得するとき、その Promise を渡すと、完了するまでスクロールの復元を待つ */
  wait(promise: Promise<unknown>): void
}

// load の戻り値の型は、ルートごとに違う。ルートの一覧(RouteConfig[])に、型の違うルートを並べられるよう any にしておく
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RouteConfig<Loaded = any> {
  /** パスのパターン（`/users/:id`）。URLPattern の書き方 */
  path: string
  /** `navigateTo` / `url` で使う名前 */
  name?: string
  /** リダイレクト先。関数なら、ルートの情報から URL を返す */
  redirect?: string | ((context: RouteContext) => string)
  /** ページを表示する前に、データを取得する。終わるまで画面は切り替わらず、`busy` が付く */
  load?: (context: RouteContext) => Loaded | Promise<Loaded>
  /** ページの中身を返す。`load` の結果が第 2 引数 */
  render?: (context: RouteContext, loaded: Loaded) => RouteContent
  /** `document.title`。関数なら、ルートの情報から作る */
  title?: string | ((context: RouteContext) => string)
}

/** `setQuery` に渡す値。`null`・`undefined`・空文字は、そのキーを消す。配列は複数のキーになる */
export type QueryValues = Record<
  string,
  string | number | boolean | null | undefined | (string | number)[]
>

export interface NavigateOptions {
  /** 遷移先に 1 回だけ渡す値（履歴には残らない） */
  data?: Record<string, unknown>
  /** 履歴に保存する値（戻る・進む・リロードで復元される。structured clone できるものだけ） */
  state?: Record<string, unknown>
  /** 履歴の扱い。既定 `push` */
  history?: 'push' | 'replace'
}

interface Compiled {
  route: RouteConfig
  pattern: URLPattern
}

// navigation.navigate() の info に入れる、このルーター用の値(ほかの遷移と区別するため、名前空間を付ける)
interface RouterInfo {
  jimble?: { data?: Record<string, unknown>; queryOnly?: boolean }
}
const SCROLL_PREFIX = 'jimble-router.scroll.'
const CHUNK_RELOAD_KEY = 'jimble-router.chunk-reload'
/** 動的 import の失敗(デプロイで古くなったファイル名など)を見分ける。ブラウザごとに文言が違う */
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i

const compile = (route: RouteConfig): Compiled => {
  const path = route.path.endsWith('/') ? route.path : `${route.path}{/}?`
  return { route, pattern: new URLPattern({ pathname: path }, { ignoreCase: true }) }
}

/**
 * シングルページアプリのルーター（Navigation API を使う）。マッチしたルートの中身を、この要素の中に表示する。
 *
 * ```js
 * router.routes = [
 *   { path: '/', render: () => html`<page-home></page-home>` },
 *   { path: '/users/:id', name: 'user',
 *     load: ({ params, signal }) => fetchUser(params.id, signal),
 *     render: ({ data }, user) => html`<page-user .user=${user} .flash=${data?.flash}></page-user>`,
 *     title: ({ params }) => `ユーザー ${params.id}` },
 * ]
 * router.navigate('/users/1', { data: { flash: '保存しました' } })
 * ```
 *
 * - リンク（`<a href>`）は、同じオリジンなら、そのまま SPA の遷移になる（`target`・`download` 付き、新しいタブ、
 *   修飾キーつきのクリックは、ブラウザ任せ。除外したいリンクには `data-router-ignore`）。
 * - 遷移に `{ key: value }` を渡せる。`data` は 1 回きり、`state` は履歴に保存されて戻る・進む・リロードで復元される。
 * - **スクロール位置は、戻る・進む・リロードで復元される**（ページの中身が入ったあと）。スクロールが window ではなく
 *   内側の要素で起きるレイアウトは、`scroll-container` にその要素のセレクターを指定する。
 * - `setQuery({ page: 2 })` で、ページの再描画なしに URL の検索文字列だけを差し替えられる。
 * - 遷移のたびに、ページタイトルを読み上げ、フォーカスをページの先頭へ移す（ページの中の `autofocus` を優先）。
 * - **ページの部品を動的 `import()` するのは `load` の中で行う**（終わるまで画面が切り替わらないので、`render` の時点で要素は定義済み）。
 *   デプロイで古くなった画面で、その取得に失敗したときは、自動で通常のページ遷移に切り替えて復旧する（`no-chunk-reload` で止められる）。
 * - 1 つのドキュメントに 1 つだけ置ける。Navigation API がないブラウザでは、現在の URL のページを表示するだけで、
 *   リンクは通常のページ遷移になる（サーバーが、すべてのパスでアプリを返す必要がある）。
 *
 * @tag jimble-router
 *
 * @slot - （使わない。ページの中身は、この要素が中に作る）
 *
 * @fires jimble-route-loading - 遷移を始めた（`load` の完了を待つ間）
 * @fires jimble-route-change - ページを表示した。`detail`: `{ url, params, query, route, navigationType, data, state, queryOnly }`。`setQuery` の場合は `queryOnly: true`
 * @fires jimble-route-error - `load` などが失敗した。`detail`: `{ error, url, route }`。動的 import の失敗による自動復旧は、`preventDefault()` で止められる
 */
export class JimbleRouter extends JimbleElement {
  static override properties: PropertyDeclarations = {
    routes: { attribute: false },
    fallback: { attribute: false },
    errorPage: { attribute: false },
    scrollContainer: { attribute: 'scroll-container' },
    noChunkReload: { type: Boolean, attribute: 'no-chunk-reload' },
    busy: { type: Boolean, reflect: true },
    announcement: { state: true },
  }

  /** ルートの一覧。先に書いたものが優先される */
  declare routes: RouteConfig[]
  /** どのルートにもマッチしなかったときのページ（404）。指定しなければ、ブラウザの通常の遷移に任せる */
  declare fallback: Omit<RouteConfig, 'path'> | undefined
  /** `load` や `render` が失敗したときのページ。指定しなければ、`jimble-route-error` を出して、遷移を失敗させる */
  declare errorPage: ((context: RouteContext, error: unknown) => RouteContent) | undefined
  /** スクロールが起きる要素のセレクター。指定すると、その要素のスクロール位置を、履歴ごとに保存・復元する */
  declare scrollContainer: string | undefined
  /** 動的 import の失敗(古くなった画面)で、通常のページ遷移に切り替える自動復旧をしない */
  declare noChunkReload: boolean
  /** ページの表示を待っている間（`load` の実行中） */
  declare busy: boolean
  declare announcement: string

  /** 画面に出ている、いまのルートの情報 */
  current: {
    route: RouteConfig | undefined
    params: Record<string, string>
    url: URL
    data: Record<string, unknown> | undefined
    state: Record<string, unknown> | undefined
  } = {
    route: undefined,
    params: {},
    url: new URL('about:blank'),
    data: undefined,
    state: undefined,
  }

  /**
   * 動的 import の失敗から復旧するときの、通常のページ遷移。テストで差し替えるための入り口
   * @internal
   */
  static hardNavigate: (url: URL) => void = (url) => location.assign(url.href)

  static #active: JimbleRouter | undefined
  /** 使われているルーター(1 つだけ) */
  static get instance(): JimbleRouter | undefined {
    return JimbleRouter.#active
  }

  #compiled: Compiled[] = []
  #outlet = document.createElement('div')
  #abort: AbortController | undefined
  #key = 0
  #started = false
  #announceTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.routes = []
    this.fallback = undefined
    this.errorPage = undefined
    this.scrollContainer = undefined
    this.noChunkReload = false
    this.busy = false
    this.announcement = ''
    this.#outlet.dataset.jimbleOutlet = ''
    this.#outlet.tabIndex = -1
  }

  // ---- 開始・終了 ----------------------------------------------------------------------
  override connectedCallback(): void {
    super.connectedCallback()
    if (JimbleRouter.#active && JimbleRouter.#active !== this) {
      if (__DEV__) this.warn('jimble-router は 1 つのドキュメントに 1 つだけ置けます。')
      return
    }
    JimbleRouter.#active = this
    if (!this.#outlet.isConnected) this.append(this.#outlet)
    if (typeof navigation === 'undefined') return
    navigation.addEventListener('navigate', this.#onNavigate)
    navigation.addEventListener('navigatesuccess', this.#gcScroll)
    window.addEventListener('pagehide', this.#saveScroll)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (JimbleRouter.#active !== this) return
    JimbleRouter.#active = undefined
    this.#abort?.abort()
    if (typeof navigation !== 'undefined') {
      navigation.removeEventListener('navigate', this.#onNavigate)
      navigation.removeEventListener('navigatesuccess', this.#gcScroll)
    }
    window.removeEventListener('pagehide', this.#saveScroll)
    render(null, this.#outlet)
    this.#started = false
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (changed.has('routes')) this.#compiled = (this.routes ?? []).map(compile)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // ルートが渡されたら(あとから差し替えられたときも)、いまの URL のページを表示する
    if ((changed.has('routes') || changed.has('fallback')) && JimbleRouter.#active === this) {
      // updated の中で状態を変えると、Lit が「更新のあとの更新」と警告するので、次のタスクで行う
      if (this.routes.length || this.fallback) queueMicrotask(() => void this.#renderCurrent())
    }
  }

  /** 最初の表示(ページの読み込み直後。ルートが差し替えられたときも) */
  async #renderCurrent() {
    const url = new URL(location.href)
    const reload =
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
        ?.type === 'reload'
    const first = !this.#started
    this.#started = true
    this.#abort?.abort()
    this.#abort = new AbortController()
    await this.#transition({
      url,
      navigationType: first && reload ? 'reload' : 'push',
      data: undefined,
      state: this.#entryState(),
      signal: this.#abort.signal,
      initial: true,
    })
  }

  // ---- Navigation API ------------------------------------------------------------------
  #onNavigate = (e: NavigateEvent) => {
    if (!e.canIntercept || e.hashChange || e.downloadRequest !== null || e.formData) return
    const info = (e.info as RouterInfo | undefined)?.jimble
    const url = new URL(e.destination.url)
    // <a data-router-ignore> は、ブラウザ任せ
    if (e.sourceElement?.closest?.('[data-router-ignore]')) return

    // URL の検索文字列だけを差し替える(再描画しない)
    if (info?.queryOnly) {
      this.#saveScroll()
      e.intercept({
        scroll: 'manual',
        focusReset: 'manual',
        handler: async () => {
          this.current = { ...this.current, url, state: this.#entryState() }
          this.#dispatch('change', { ...this.#detail(), queryOnly: true })
        },
      })
      return
    }

    const matched = this.#match(url.pathname)
    if (!matched) return // どのルートにもマッチしない: ブラウザの通常の遷移に任せる

    // 単純なリダイレクトは、遷移の前に解決する(URL のちらつきを防ぐ)
    if (matched.route.redirect && e.cancelable) {
      e.preventDefault()
      const target = this.#redirectTarget(matched, url)
      void this.#silence(navigation.navigate(target, { history: 'replace', info: e.info }))
      return
    }

    this.#saveScroll()
    this.#abort?.abort()
    const abort = new AbortController()
    this.#abort = abort
    // 中止・置き換えされたときは、この遷移の signal も abort する
    e.signal.addEventListener('abort', () => abort.abort())
    e.intercept({
      // window のスクロールは、ページの中身が入ったあとに、ブラウザが復元する(戻る・進む・リロード)
      scroll: 'after-transition',
      focusReset: 'manual',
      handler: async () => {
        await this.#transition({
          url,
          navigationType: e.navigationType,
          data: info?.data,
          state: this.#entryState(),
          signal: abort.signal,
          initial: false,
        })
      },
    })
  }

  #entryState(): Record<string, unknown> | undefined {
    return (
      (navigation?.currentEntry?.getState() as Record<string, unknown> | undefined) ?? undefined
    )
  }

  // ---- ルートの解決と描画 ----------------------------------------------------------------
  #match(pathname: string): { route: RouteConfig; params: Record<string, string> } | undefined {
    for (const { route, pattern } of this.#compiled) {
      const result = pattern.exec({ pathname })
      if (result)
        return { route, params: { ...(result.pathname.groups as Record<string, string>) } }
    }
    if (this.fallback) return { route: { path: '', ...this.fallback }, params: {} }
    return undefined
  }

  #redirectTarget(
    matched: { route: RouteConfig; params: Record<string, string> },
    url: URL,
  ): string {
    const { redirect } = matched.route
    return typeof redirect === 'function'
      ? redirect(
          this.#context(
            matched,
            url,
            'replace',
            undefined,
            undefined,
            new AbortController().signal,
            [],
          ),
        )
      : (redirect ?? '/')
  }

  #context(
    matched: { route: RouteConfig; params: Record<string, string> },
    url: URL,
    navigationType: NavigationType,
    data: Record<string, unknown> | undefined,
    state: Record<string, unknown> | undefined,
    signal: AbortSignal,
    waits: Promise<unknown>[],
  ): RouteContext {
    return {
      params: matched.params,
      query: url.searchParams,
      url,
      data,
      state,
      navigationType,
      signal,
      route: matched.route,
      wait: (promise) => void waits.push(promise),
    }
  }

  #detail() {
    return {
      url: this.current.url,
      params: this.current.params,
      query: this.current.url.searchParams,
      route: this.current.route,
      data: this.current.data,
      state: this.current.state,
    }
  }

  #dispatch(name: string, detail: unknown) {
    // 画面の遷移は、アプリ全体(計測・エラー表示など)で受けるので、バブルさせる
    this.emit(`route-${name}`, { detail, bubbles: true })
  }

  async #transition(args: {
    url: URL
    navigationType: NavigationType
    data: Record<string, unknown> | undefined
    state: Record<string, unknown> | undefined
    signal: AbortSignal
    initial: boolean
  }) {
    const { url, navigationType, data, state, signal, initial } = args
    const matched = this.#match(url.pathname)
    if (!matched) return
    if (matched.route.redirect) {
      // 遷移の前に解決できなかったもの(最初の表示、戻る・進むなど)
      const target = this.#redirectTarget(matched, url)
      if (typeof navigation !== 'undefined') {
        void this.#silence(navigation.navigate(target, { history: 'replace' }))
      } else location.replace(target)
      return
    }
    const waits: Promise<unknown>[] = []
    const context = this.#context(matched, url, navigationType, data, state, signal, waits)
    this.busy = true
    this.#dispatch('loading', { url, route: matched.route })
    let content: RouteContent
    try {
      const loaded = matched.route.load ? await matched.route.load(context) : undefined
      if (signal.aborted) return
      content = matched.route.render?.(context, loaded as never)
    } catch (error) {
      if (signal.aborted) return
      const event = this.emit('route-error', {
        detail: { error, url, route: matched.route },
        cancelable: true,
        bubbles: true,
      })
      // デプロイで古くなった画面(ハッシュ付きのファイルが無い)は、通常のページ遷移で新しい画面を読み込み直して復旧する
      if (!event.defaultPrevented && this.#recoverFromChunkError(error, url)) return
      if (!this.errorPage) {
        this.busy = false
        throw error
      }
      content = this.errorPage(context, error)
    }
    if (signal.aborted) return

    // ページを入れ替える(遷移のたびに、要素を作り直す)
    this.current = { route: matched.route, params: matched.params, url, data, state }
    render(keyed(++this.#key, content ?? null), this.#outlet)
    await this.updateComplete
    // ページの中で自前に取得しているデータも待つ(スクロールの復元が、内容の確定後になるように)
    await Promise.allSettled(waits)
    if (signal.aborted) return

    const title =
      typeof matched.route.title === 'function' ? matched.route.title(context) : matched.route.title
    if (title) document.title = title
    this.#restoreScroll(navigationType, initial)
    if (!initial) this.#focusOutlet()
    this.#announce(document.title)
    this.busy = false
    this.#dispatch('change', { ...this.#detail(), navigationType, queryOnly: false })
  }

  // ---- スクロール ----------------------------------------------------------------------
  get #container(): HTMLElement | null {
    if (!this.scrollContainer) return null
    const root = this.getRootNode() as Document | ShadowRoot
    return (
      root.querySelector<HTMLElement>(this.scrollContainer) ??
      document.querySelector<HTMLElement>(this.scrollContainer)
    )
  }

  /** 離れるエントリの、スクロール位置を保存する(内側の要素のとき) */
  #saveScroll = () => {
    const el = this.#container
    const key = navigation?.currentEntry?.key
    if (!el || !key) return
    try {
      sessionStorage.setItem(`${SCROLL_PREFIX}${key}`, String(el.scrollTop))
    } catch {
      /* 保存できなくても、復元できないだけ */
    }
  }

  #restoreScroll(navigationType: NavigationType, initial: boolean) {
    const el = this.#container
    if (!el) return
    let top = 0
    if (navigationType === 'traverse' || navigationType === 'reload' || initial) {
      try {
        top =
          Number(sessionStorage.getItem(`${SCROLL_PREFIX}${navigation?.currentEntry?.key}`)) || 0
      } catch {
        top = 0
      }
    }
    el.scrollTop = top
  }

  /** 動的 import の失敗なら、通常のページ遷移に切り替える。切り替えたら true(同じ URL で続けて失敗するときは、無限に繰り返さない) */
  #recoverFromChunkError(error: unknown, url: URL): boolean {
    if (
      this.noChunkReload ||
      !CHUNK_ERROR.test(String((error as Error | undefined)?.message ?? error))
    ) {
      return false
    }
    try {
      const last = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 'null') as {
        href: string
        at: number
      } | null
      if (last && last.href === url.href && Date.now() - last.at < 10_000) return false
      sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ href: url.href, at: Date.now() }))
    } catch {
      /* 保存できないときは、繰り返しの判定ができないので、復旧しない */
      return false
    }
    JimbleRouter.hardNavigate(url)
    return true
  }

  /** 存在しない履歴エントリの保存値を捨てる */
  #gcScroll = () => {
    try {
      const alive = new Set(navigation.entries().map((e) => `${SCROLL_PREFIX}${e.key}`))
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith(SCROLL_PREFIX) && !alive.has(key)) sessionStorage.removeItem(key)
      }
    } catch {
      /* 何もしない */
    }
  }

  // ---- フォーカスと読み上げ ---------------------------------------------------------------
  #focusOutlet() {
    const target = this.#outlet.querySelector<HTMLElement>('[autofocus]') ?? this.#outlet
    target.focus({ preventScroll: true })
  }

  #announce(text: string) {
    this.announcement = text
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => (this.announcement = ''), 3000)
  }

  // ---- 公開 API ------------------------------------------------------------------------
  /**
   * 遷移する。`data` は遷移先に 1 回だけ渡す値、`state` は履歴に保存する値。
   * Navigation API がないブラウザでは、通常のページ遷移になる（`data`・`state` は渡らない）。
   */
  async navigate(url: string | URL, options: NavigateOptions = {}): Promise<void> {
    const target = String(url)
    if (typeof navigation === 'undefined') {
      if (options.history === 'replace') location.replace(target)
      else location.assign(target)
      return
    }
    const info: RouterInfo = { jimble: { data: options.data } }
    await this.#silence(
      navigation.navigate(target, {
        history: options.history ?? 'push',
        info,
        state: options.state,
      }),
    )
  }

  /** ルートの名前から、URL を組み立てる（`:id` などのパスの値と、検索文字列） */
  url(name: string, params: Record<string, string | number> = {}, query: QueryValues = {}): string {
    const route = this.routes.find((r) => r.name === name)
    if (!route) {
      if (__DEV__) this.warn(`名前 "${name}" のルートがありません。`)
      return ''
    }
    const path = route.path
      .replace(/\{\/\}\?$/, '')
      .replace(/:([A-Za-z0-9_]+)/g, (_m, key: string) => {
        const value = params[key]
        if (value === undefined) {
          if (__DEV__) this.warn(`ルート "${name}" のパスの値 "${key}" がありません。`)
          return ''
        }
        return encodeURIComponent(String(value))
      })
    const search = this.#toSearch(new URLSearchParams(), query, false).toString()
    return search ? `${path}?${search}` : path
  }

  /** 名前のルートへ遷移する */
  navigateTo(
    name: string,
    params: Record<string, string | number> = {},
    options: NavigateOptions & { query?: QueryValues } = {},
  ): Promise<void> {
    const { query, ...rest } = options
    const url = this.url(name, params, query)
    return url ? this.navigate(url, rest) : Promise.resolve()
  }

  /**
   * URL の検索文字列だけを差し替える。**ページは再描画されない**（ページングや検索条件の変更に使う）。
   * `null`・`undefined`・空文字は、そのキーを消す。`merge: false` で、ほかのキーも消す。
   * 履歴は、既定で `replace`（入力のたびに履歴が増えないように）。ページの切り替えのように残したいときは `push`。
   * 変更は `jimble-route-change`（`queryOnly: true`）で知らせる。
   */
  async setQuery(
    values: QueryValues,
    options: { history?: 'push' | 'replace'; merge?: boolean } = {},
  ): Promise<void> {
    const url = new URL(location.href)
    const base = options.merge === false ? new URLSearchParams() : url.searchParams
    url.search = this.#toSearch(base, values, true).toString()
    const info: RouterInfo = { jimble: { queryOnly: true } }
    if (typeof navigation === 'undefined') {
      history[options.history === 'push' ? 'pushState' : 'replaceState'](null, '', url)
      this.current = { ...this.current, url }
      this.#dispatch('change', { ...this.#detail(), queryOnly: true })
      return
    }
    await this.#silence(
      navigation.navigate(url.href, {
        history: options.history ?? 'replace',
        info,
        state: this.#entryState(),
      }),
    )
  }

  #toSearch(base: URLSearchParams, values: QueryValues, merge: boolean): URLSearchParams {
    const search = new URLSearchParams(merge ? base : undefined)
    for (const [key, value] of Object.entries(values)) {
      search.delete(key)
      for (const v of [value].flat()) {
        if (v === null || v === undefined || v === '') continue
        search.append(key, String(v))
      }
    }
    return search
  }

  /** 履歴に保存する値を、いまのエントリに書き込む（遷移も再描画もしない） */
  setEntryState(state: Record<string, unknown>): void {
    if (typeof navigation === 'undefined') return
    navigation.updateCurrentEntry({ state })
    this.current = { ...this.current, state }
  }

  /** 戻る。戻る履歴がない（このアプリの最初のページ）ときは、`fallbackUrl` へ移る */
  async back(fallbackUrl = '/'): Promise<void> {
    if (typeof navigation !== 'undefined' && navigation.canGoBack) {
      await this.#silence(navigation.back())
      return
    }
    await this.navigate(fallbackUrl, { history: 'replace' })
  }

  /** 現在のページを、読み込み直す */
  async reload(): Promise<void> {
    if (typeof navigation === 'undefined') return location.reload()
    await this.#silence(navigation.reload())
  }

  /** 遷移の結果の Promise が拒否されても(別の遷移に置き換わったなど)、例外にしない */
  #silence(result: NavigationResult): Promise<void> {
    void result.committed?.catch(() => {})
    return (result.finished ?? Promise.resolve()).then(
      () => undefined,
      () => undefined,
    )
  }

  protected override render() {
    return html`<slot></slot>
      <div role="status" class="sr-only">${this.announcement}</div>`
  }
}

JimbleRouter.define('jimble-router')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-router': JimbleRouter
  }
}
