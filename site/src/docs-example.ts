import { LitElement, css, html } from 'lit'

/**
 * ドキュメント専用: 例の表示ブロック。「プレビュー」「ソース」の 2 タブと「コピー」ボタン。
 * コピーはパネルを持たない操作なので tab にはせず、ボタンにしている（設計書 §10.4）。
 * ※ jimble-tabs の実装後（M4）に、タブ部分を jimble-tabs へ置き換える。
 */
export class DocsExample extends LitElement {
  static override properties = {
    heading: {},
    source: {},
    tab: { state: true },
    copied: { state: true },
  }
  declare heading: string
  declare source: string
  declare tab: 'preview' | 'source'
  declare copied: boolean

  static override styles = css`
    :host {
      display: block;
      margin: 1.5rem 0;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      background: #fff;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 0.5rem 0.5rem 0 0;
    }
    h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      flex: 1 1 8rem;
    }
    [role='tablist'] {
      display: flex;
      gap: 0.25rem;
    }
    button {
      font: inherit;
      font-size: 0.8125rem;
      min-height: 1.75rem;
      padding: 0 0.625rem;
      border: 0;
      border-radius: 0.375rem;
      background: transparent;
      color: #374151;
      cursor: pointer;
    }
    button:hover {
      background: #e5e7eb;
    }
    button[aria-selected='true'] {
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 600;
    }
    button:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 1px;
    }
    .status {
      font-size: 0.75rem;
      color: #166534;
      min-width: 5em;
    }
    [role='tabpanel'] {
      padding: 1rem;
    }
    [role='tabpanel'][hidden] {
      display: none;
    }
    #panel-source {
      padding: 0;
      overflow: auto;
    }
    #panel-source:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: -2px;
    }
    ::slotted([slot='source']) {
      display: block;
    }
  `

  constructor() {
    super()
    this.heading = ''
    this.source = ''
    this.tab = 'preview'
    this.copied = false
  }

  #tabs: ('preview' | 'source')[] = ['preview', 'source']

  #onKeydown(e: KeyboardEvent) {
    const i = this.#tabs.indexOf(this.tab)
    const n = this.#tabs.length
    const moves: Record<string, number> = {
      ArrowRight: (i + 1) % n,
      ArrowLeft: (i - 1 + n) % n,
      Home: 0,
      End: n - 1,
    }
    const next = moves[e.key]
    if (next === undefined) return
    e.preventDefault()
    this.tab = this.#tabs[next]!
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLElement>(`#tab-${this.tab}`)?.focus(),
    )
  }

  async #copy() {
    try {
      await navigator.clipboard.writeText(this.source)
      this.copied = true
      setTimeout(() => (this.copied = false), 2000)
    } catch {
      this.copied = false
    }
  }

  protected override render() {
    const tab = (id: 'preview' | 'source', label: string) =>
      html`<button
        role="tab"
        id="tab-${id}"
        aria-selected=${this.tab === id}
        aria-controls="panel-${id}"
        tabindex=${this.tab === id ? 0 : -1}
        @click=${() => (this.tab = id)}
      >
        ${label}
      </button>`
    return html`<div class="bar">
        <h3>${this.heading}</h3>
        <div role="tablist" aria-label="${this.heading}の表示" @keydown=${this.#onKeydown}>
          ${tab('preview', 'プレビュー')}${tab('source', 'ソース')}
        </div>
        <button type="button" @click=${this.#copy}>コピー</button>
        <span class="status" role="status">${this.copied ? 'コピーしました' : ''}</span>
      </div>
      <div
        role="tabpanel"
        id="panel-preview"
        aria-labelledby="tab-preview"
        ?hidden=${this.tab !== 'preview'}
      >
        <slot name="preview"></slot>
      </div>
      <div
        role="tabpanel"
        id="panel-source"
        aria-labelledby="tab-source"
        tabindex="0"
        ?hidden=${this.tab !== 'source'}
      >
        <slot name="source"></slot>
      </div>`
  }
}
customElements.define('docs-example', DocsExample)
