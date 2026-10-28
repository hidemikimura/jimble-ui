import { html } from 'lit'
import { contrastOfVars, type Scheme } from '../color.ts'
import { PAIRS, v } from '../pairs.ts'
import { statefulPage } from './util.ts'

const SCHEMES: [Scheme, string][] = [
  ['light', 'ライト'],
  ['dark', 'ダーク'],
]

interface Result {
  ratio: number | null
  ok: boolean
}

/** 見本・比・結果（そのモードで） */
const cell = (fg: string, bg: string, scheme: Scheme, r: Result) =>
  html`<td>
    <span
      class="sample"
      style="color-scheme: ${scheme}; color: var(${v(fg)}); background: var(${v(bg)})"
      >あア Aa</span
    >
    <span class="ratio">${r.ratio === null ? '—' : `${r.ratio.toFixed(2)}:1`}</span>
    <jimble-badge variant=${r.ok ? 'success' : 'danger'}>${r.ok ? '合格' : '不足'}</jimble-badge>
  </td>`

export function contrastPage() {
  let redraw = () => {}
  const { root, draw } = statefulPage(() => {
    const rows = PAIRS.map(([fg, bg, min, use]) => {
      const results = SCHEMES.map(([scheme]): Result => {
        const ratio = contrastOfVars(v(fg), v(bg), scheme)
        return { ratio, ok: ratio !== null && ratio >= min }
      })
      return { fg, bg, min, use, results }
    })
    const ng = SCHEMES.map(([, label], i) => ({
      label,
      count: rows.filter((r) => !r.results[i]!.ok).length,
    })).filter((n) => n.count > 0)
    return html`
      <jimble-page-header
        heading="コントラスト"
        description="文字と背景の組み合わせが、基準(WCAG 2.2 AA)を満たしているかを、いまの色で、ライトとダークの両方について計算します。"
      >
        <jimble-button slot="actions" @click=${() => redraw()}>再計算</jimble-button>
      </jimble-page-header>
      <jimble-alert variant=${ng.length ? 'danger' : 'success'} style="margin-top: 1rem">
        ${
          ng.length
            ? `基準を満たしていない組み合わせがあります（${ng.map((n) => `${n.label} ${n.count} 件`).join('・')}）。`
            : `すべて基準を満たしています（${rows.length} 件 × ライト・ダーク）。`
        }
      </jimble-alert>
      <jimble-card style="margin-top: 1rem">
        <table class="contrast">
          <thead>
            <tr>
              <th>用途</th>
              <th>前景</th>
              <th>背景</th>
              <th>必要</th>
              ${SCHEMES.map(([, label]) => html`<th>${label}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) =>
                html`<tr>
                  <td>${r.use}</td>
                  <td><code>${r.fg}</code></td>
                  <td><code>${r.bg}</code></td>
                  <td>${r.min}:1</td>
                  ${SCHEMES.map(([scheme], i) => cell(r.fg, r.bg, scheme, r.results[i]!))}
                </tr>`,
            )}
          </tbody>
        </table>
      </jimble-card>
      <p class="muted">
        文字は 4.5:1、入力欄の枠・フォーカスリング・アイコンは 3:1
        以上が目安です。色を変えたら、この画面で確認してください。
      </p>
    `
  })
  // 色を変えたら(theme.css の保存、テーマ調整)、自動で計算し直す
  const onTheme = () =>
    root.isConnected ? draw() : window.removeEventListener('lab-theme-change', onTheme)
  redraw = draw
  window.addEventListener('lab-theme-change', onTheme)
  return root
}
