import { LitElement, css, html, nothing } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'
import { CATALOG, SHADOW_PRESETS, WEIGHTS, type Entry, type Group } from './catalog.ts'
import { isTransparentVar, varHex } from './color.ts'

/** 段階の割合(基準色 600 を、白・黒と混ぜて作る)。あくまで出発点で、あとで一つずつ直してよい */
const MIX: Record<number, [number, 'white' | 'black']> = {
  50: [8, 'white'],
  100: [16, 'white'],
  200: [32, 'white'],
  300: [52, 'white'],
  400: [76, 'white'],
  500: [90, 'white'],
  700: [82, 'black'],
  800: [64, 'black'],
  900: [48, 'black'],
  950: [34, 'black'],
}

export const THEME_EVENT = 'lab-theme-change'

const root = () => document.documentElement
/** いまの値(var() は、解決された値になる)。宣言されていなければ、空 */
const current = (name: string) => getComputedStyle(root()).getPropertyValue(name).trim()

/** テーマ調整パネル。値をその場で試す(ブラウザの中だけ。決めた値は theme.css に書く) */
export class LabTuner extends LitElement {
  static override properties = {
    open: { state: true },
    tick: { state: true },
    query: { state: true },
  }
  declare open: boolean
  declare tick: number
  declare query: string
  #overrides = new Map<string, string>()

  constructor() {
    super()
    this.open = false
    this.tick = 0
    this.query = ''
    // theme.css を保存して(HMR で)読み込み直されたら、試し中の変更は、theme.css の値と食い違うので、捨てる
    import.meta.hot?.on('vite:afterUpdate', () => {
      if (this.#overrides.size) this.#reset(false)
      this.#changed()
    })
  }

  static override styles = css`
    :host {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 50;
      font: 14px/1.5 var(--jimble-font-sans);
      color: var(--jimble-color-text);
    }
    .fab {
      cursor: pointer;
    }
    .panel {
      position: absolute;
      right: 0;
      bottom: 3rem;
      display: flex;
      flex-direction: column;
      width: min(28rem, calc(100vw - 2rem));
      max-height: min(44rem, calc(100vh - 6rem));
      background: var(--jimble-color-surface-overlay);
      border-radius: var(--jimble-radius-overlay);
      box-shadow:
        var(--jimble-shadow-lg),
        0 0 0 1px var(--jimble-color-ring);
    }
    header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--jimble-color-ring);
      font-weight: 600;
    }
    .search {
      padding: 0.5rem 1rem 0;
    }
    .body {
      overflow: auto;
      padding: 0.5rem 1rem 1rem;
    }
    footer {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--jimble-color-ring);
    }
    details {
      border-bottom: 1px solid var(--jimble-color-ring);
      padding: 0.5rem 0;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .count {
      font-weight: 400;
      font-size: 12px;
      color: var(--jimble-color-text-muted);
    }
    .note,
    .warn {
      margin: 0.25rem 0 0.5rem;
      font-size: 12px;
      color: var(--jimble-color-text-muted);
    }
    .warn {
      color: var(--jimble-color-warning-800);
      background: var(--jimble-color-warning-50);
      padding: 0.5rem;
      border-radius: var(--jimble-radius-md);
    }
    .row {
      display: grid;
      grid-template-columns: 5rem 1fr;
      align-items: center;
      gap: 0.5rem;
      margin: 0.25rem 0;
    }
    .row.wide {
      grid-template-columns: 11rem 1fr;
    }
    .row.stack {
      grid-template-columns: 11rem 1fr;
      align-items: start;
    }
    .stacked {
      display: grid;
      gap: 0.25rem;
    }
    .with-clear {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
    }
    .with-clear > :first-child {
      flex: 1 1 7rem;
      min-width: 0;
    }
    label {
      font-size: 12px;
    }
    label code {
      display: block;
      color: var(--jimble-color-text-muted);
      font-size: 10px;
      word-break: break-all;
    }
  `

  #apply(name: string, value: string) {
    this.#overrides.set(name, value)
    root().style.setProperty(name, value)
    this.#changed()
  }

  /** 空にしたら、試した変更を取り消す(theme.css の値に戻る) */
  #set(name: string, value: string) {
    if (value.trim() === '') {
      this.#overrides.delete(name)
      root().style.removeProperty(name)
      this.#changed()
    } else this.#apply(name, value.trim())
  }

  #changed() {
    this.tick++
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  #reset(notify = true) {
    for (const name of this.#overrides.keys()) root().style.removeProperty(name)
    this.#overrides.clear()
    if (notify) this.#changed()
  }

  #generate(g: Group) {
    const scale = g.scale!
    const base = varHex(`--jimble-color-${scale}-600`)
    for (const { name } of g.entries) {
      const step = Number(name.split('-').pop())
      const mix = MIX[step]
      if (mix) this.#apply(name, `color-mix(in oklab, ${base} ${mix[0]}%, ${mix[1]})`)
    }
    this.#apply(`--jimble-color-${scale}-600`, base)
    JimbleUI.toast({
      message: `${scale} の段階を、600 の色から作りました。一つずつ直せます。`,
      variant: 'info',
    })
  }

  async #copy() {
    const lines = [...this.#overrides].map(([n, v]) => `  ${n}: ${v};`)
    const css = `:root {\n${lines.join('\n')}\n}\n`
    try {
      await navigator.clipboard.writeText(css)
      JimbleUI.toast({
        message: `${this.#overrides.size} 件の変更を、CSS としてコピーしました。theme.css に貼り付けてください。`,
        variant: 'success',
      })
    } catch {
      JimbleUI.toast({ message: 'コピーできませんでした。', variant: 'danger' })
    }
  }

  /** 検索語に合うか(名前・ラベル) */
  #matches(e: Entry) {
    const q = this.query.trim().toLowerCase()
    return !q || e.label.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
  }

  /** 値の種類ごとの入力欄 */
  #editor(g: Group, e: Entry) {
    const now = current(e.name)
    const aria = `${g.title} ${e.label}`
    const onText = (ev: Event) => this.#set(e.name, (ev.target as HTMLInputElement).value)
    switch (e.kind) {
      case 'color': {
        const clear = !!now && isTransparentVar(e.name)
        const picker = html`<jimble-color-input
          size="sm"
          aria-label=${aria}
          .value=${now && !clear ? varHex(e.name) : ''}
          data-tick=${this.tick}
          @change=${onText}
        ></jimble-color-input>`
        if (!e.transparent) return picker
        // 色選択は透明度を持たないので、透明にするボタンを添える（すでに透明のときは押せない）
        return html`<div class="with-clear">
          ${picker}
          <jimble-button
            size="sm"
            aria-label=${`${aria}を透明にする`}
            ?disabled=${clear}
            @click=${() => this.#set(e.name, 'transparent')}
            >透明</jimble-button
          >
        </div>`
      }
      case 'weight':
        return html`<jimble-select
          size="sm"
          aria-label=${aria}
          placeholder="（既定）"
          .value=${WEIGHTS.includes(now) ? now : ''}
          data-tick=${this.tick}
          @change=${onText}
        >
          ${WEIGHTS.map((w) => html`<jimble-option value=${w}>${w}</jimble-option>`)}
        </jimble-select>`
      case 'select':
        return html`<jimble-select
          size="sm"
          aria-label=${aria}
          placeholder="（既定）"
          .value=${e.options!.includes(now) ? now : ''}
          data-tick=${this.tick}
          @change=${onText}
        >
          ${e.options!.map((o) => html`<jimble-option value=${o}>${o}</jimble-option>`)}
        </jimble-select>`
      case 'shadow':
        return html`<div class="stacked">
          <jimble-select
            size="sm"
            aria-label=${`${aria}（プリセット）`}
            placeholder="プリセットから選ぶ"
            .value=${''}
            data-tick=${this.tick}
            @change=${(ev: Event) => {
              const v = (ev.target as HTMLInputElement).value
              if (v) this.#set(e.name, v)
              ;(ev.target as HTMLInputElement).value = ''
            }}
          >
            ${SHADOW_PRESETS.map(([l, v]) => html`<jimble-option value=${v}>${l}</jimble-option>`)}
          </jimble-select>
          <jimble-input
            size="sm"
            aria-label=${aria}
            .value=${now}
            placeholder="例: 0 4px 12px rgb(0 0 0 / 0.15)"
            data-tick=${this.tick}
            @change=${onText}
          ></jimble-input>
        </div>`
      default:
        return html`<jimble-input
          size="sm"
          aria-label=${aria}
          .value=${now}
          placeholder=${e.hint ?? '（既定）'}
          data-tick=${this.tick}
          @change=${onText}
        ></jimble-input>`
    }
  }

  #group(g: Group, i: number) {
    const entries = g.entries.filter((e) => this.#matches(e))
    if (entries.length === 0) return nothing
    const searching = this.query.trim() !== ''
    return html`<details ?open=${searching || i === 0}>
      <summary>${g.title} <span class="count">${entries.length} 件</span></summary>
      ${g.note ? html`<p class="note">${g.note}</p>` : nothing}
      ${
        g.scale
          ? html`<jimble-button size="sm" @click=${() => this.#generate(g)}
              >600 の色から段階を作る</jimble-button
            >`
          : nothing
      }
      ${entries.map((e) => {
        const compact = g.scale || e.name.includes('neutral')
        const kind = e.kind === 'shadow' ? 'stack' : compact ? '' : 'wide'
        return html`<div class="row ${kind}">
          <label
            >${e.label}${e.opt ? '（上級）' : ''}${
              compact ? nothing : html`<code>${e.name.replace('--jimble-', '')}</code>`
            }</label
          >
          ${this.#editor(g, e)}
        </div>`
      })}
    </details>`
  }

  protected override render() {
    const total = CATALOG.reduce((n, g) => n + g.entries.length, 0)
    return html`
      <jimble-button
        class="fab"
        variant="primary"
        @click=${() => (this.open = !this.open)}
        aria-expanded=${this.open ? 'true' : 'false'}
      >
        <jimble-icon slot="prefix" name="swatch" size="sm"></jimble-icon>テーマ調整
      </jimble-button>
      ${
        this.open
          ? html`<section class="panel" aria-label="テーマ調整">
              <header>テーマ調整（試し用・${total} 項目）</header>
              <div class="search">
                <jimble-input
                  size="sm"
                  type="search"
                  aria-label="変数を探す"
                  placeholder="変数を探す（例: shadow・角丸・ボタン）"
                  .value=${this.query}
                  @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)}
                ></jimble-input>
              </div>
              <div class="body">
                <p class="warn">
                  ここで変えた値は、<strong>このブラウザの中だけ</strong>で、theme.css
                  を保存すると破棄されます。決めた値は「CSS をコピー」で、<code>theme.css</code>
                  に貼り付けてください。入力欄を空にすると、その変更を取り消します。
                </p>
                ${CATALOG.map((g, i) => this.#group(g, i))}
              </div>
              <footer>
                <jimble-button
                  size="sm"
                  variant="primary"
                  ?disabled=${this.#overrides.size === 0}
                  @click=${() => this.#copy()}
                  >CSS をコピー</jimble-button
                >
                <jimble-button
                  size="sm"
                  ?disabled=${this.#overrides.size === 0}
                  @click=${() => this.#reset()}
                  >試した変更を破棄</jimble-button
                >
                <span class="note" style="align-self: center">${this.#overrides.size} 件</span>
              </footer>
            </section>`
          : nothing
      }
    `
  }
}
customElements.define('lab-tuner', LabTuner)
