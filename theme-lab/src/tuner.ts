import { LitElement, css, html, nothing } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'
import { varHex } from './color.ts'

interface Group {
  title: string
  note: string
  vars: [name: string, label: string][]
  scale?: string // 段階を自動で作れる色(primary など)
}
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const SHORT = [50, 100, 200, 500, 600, 700, 800]
const scaleVars = (name: string, steps: number[]): [string, string][] =>
  steps.map((s) => [`--jimble-color-${name}-${s}`, String(s)])

const GROUPS: Group[] = [
  {
    title: '主色 primary',
    note: '600 = 主ボタン・リンク・フォーカス',
    scale: 'primary',
    vars: scaleVars('primary', STEPS),
  },
  {
    title: 'ニュートラル neutral',
    note: '900 = 本文 / 500 = 補助の文字・入力欄の枠 / 300 = 区切り線',
    vars: scaleVars('neutral', STEPS),
  },
  {
    title: '成功 success',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'success',
    vars: scaleVars('success', SHORT),
  },
  {
    title: '警告 warning',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'warning',
    vars: scaleVars('warning', SHORT),
  },
  {
    title: 'エラー danger',
    note: '600 = 枠・danger ボタン / 700・800 = 文字',
    scale: 'danger',
    vars: scaleVars('danger', SHORT),
  },
  {
    title: '情報 info',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'info',
    vars: scaleVars('info', SHORT),
  },
  {
    title: '面・文字・枠',
    note: '意味を持つ色(通常は、上の段階を参照しています)',
    vars: [
      ['--jimble-color-surface', '面（カード・入力欄）'],
      ['--jimble-color-surface-muted', 'ページの背景'],
      ['--jimble-color-surface-sunken', '沈んだ背景'],
      ['--jimble-color-text', '本文'],
      ['--jimble-color-text-muted', '補助の文字'],
      ['--jimble-color-text-on-primary', '主ボタンの文字'],
      ['--jimble-color-ring', '区切り線'],
      ['--jimble-color-ring-control', '入力欄の枠'],
      ['--jimble-color-ring-focus', 'フォーカスリング'],
    ],
  },
]
const RADII: [string, string][] = [
  ['--jimble-radius-control', 'ボタン・入力欄の角丸'],
  ['--jimble-radius-card', 'カードの角丸'],
  ['--jimble-radius-overlay', 'ダイアログ・メニューの角丸'],
]
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

/** テーマ調整パネル。色をその場で試す(ブラウザの中だけ。決めた値は theme.css に書く) */
export class LabTuner extends LitElement {
  static override properties = { open: { state: true }, tick: { state: true } }
  declare open: boolean
  declare tick: number
  #overrides = new Map<string, string>()

  constructor() {
    super()
    this.open = false
    this.tick = 0
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
      width: min(24rem, calc(100vw - 2rem));
      max-height: min(40rem, calc(100vh - 6rem));
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
      grid-template-columns: 9rem 1fr;
    }
    label {
      font-size: 12px;
    }
  `

  #apply(name: string, value: string) {
    this.#overrides.set(name, value)
    document.documentElement.style.setProperty(name, value)
    this.#changed()
  }

  #changed() {
    this.tick++
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  #reset(notify = true) {
    for (const name of this.#overrides.keys()) document.documentElement.style.removeProperty(name)
    this.#overrides.clear()
    if (notify) this.#changed()
  }

  #generate(scale: string) {
    const base = varHex(`--jimble-color-${scale}-600`)
    const group = GROUPS.find((g) => g.scale === scale)!
    for (const [name] of group.vars) {
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

  protected override render() {
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
              <header>テーマ調整（試し用）</header>
              <div class="body">
                <p class="warn">
                  ここで変えた色は、<strong>このブラウザの中だけ</strong>で、theme.css
                  を保存すると破棄されます。 決めた値は「CSS をコピー」で、<code>theme.css</code>
                  に貼り付けてください。
                </p>
                ${GROUPS.map(
                  (g, i) =>
                    html`<details ?open=${i === 0}>
                      <summary>${g.title}</summary>
                      <p class="note">${g.note}</p>
                      ${
                        g.scale
                          ? html`<jimble-button size="sm" @click=${() => this.#generate(g.scale!)}
                              >600 の色から段階を作る</jimble-button
                            >`
                          : nothing
                      }
                      ${g.vars.map(
                        ([name, label]) =>
                          html`<div
                            class="row ${g.scale || name.includes('neutral') ? '' : 'wide'}"
                          >
                            <label>${label}</label>
                            <jimble-color-input
                              size="sm"
                              aria-label=${`${g.title} ${label}`}
                              .value=${varHex(name)}
                              data-tick=${this.tick}
                              @change=${(e: Event) => this.#apply(name, (e.target as HTMLInputElement).value)}
                            ></jimble-color-input>
                          </div>`,
                      )}
                    </details>`,
                )}
                <details>
                  <summary>角丸</summary>
                  ${RADII.map(
                    ([name, label]) =>
                      html`<div class="row wide">
                        <label>${label}</label>
                        <jimble-input
                          type="number"
                          size="sm"
                          min="0"
                          max="32"
                          aria-label=${label}
                          .value=${String(Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) * (getComputedStyle(document.documentElement).getPropertyValue(name).includes('rem') ? 16 : 1)) || 0)}
                          @change=${(e: Event) => this.#apply(name, `${(e.target as HTMLInputElement).value}px`)}
                        ></jimble-input>
                      </div>`,
                  )}
                </details>
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
