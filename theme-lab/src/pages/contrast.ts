import { html } from 'lit'
import { contrastOfVars } from '../color.ts'
import { statefulPage } from './util.ts'

// [前景の変数, 背景の変数, 必要な比, 用途]。tests/unit/contrast.test.ts の、既定トークンの契約と同じ組み合わせ
const PAIRS: [string, string, number, string][] = [
  ['text', 'surface', 4.5, '本文'],
  ['text', 'surface-muted', 4.5, 'ページ背景上の本文'],
  ['text-muted', 'surface', 4.5, '補助の文字'],
  ['text-muted', 'surface-muted', 4.5, '補助の文字（ページ背景）'],
  ['text-placeholder', 'surface', 4.5, 'プレースホルダー'],
  ['text-link', 'surface', 4.5, 'リンク'],
  ['text-on-primary', 'primary-600', 4.5, '主ボタン'],
  ['text-on-primary', 'primary-500', 4.5, '主ボタン（hover）'],
  ['text-on-primary', 'danger-600', 4.5, 'danger ボタン'],
  ['text-on-primary', 'danger-700', 4.5, 'danger ボタン（hover）'],
  ['ring-control', 'surface', 3, '入力欄の枠（非文字 3:1）'],
  ['ring-focus', 'surface', 3, 'フォーカスリング'],
  ['ring-invalid', 'surface', 3, 'エラーの枠'],
  ['neutral-700', 'neutral-100', 4.5, 'neutral バッジ'],
  ['primary-700', 'primary-50', 4.5, 'primary バッジ'],
  ['success-700', 'success-50', 4.5, 'success バッジ'],
  ['warning-700', 'warning-50', 4.5, 'warning バッジ'],
  ['danger-700', 'danger-50', 4.5, 'danger バッジ'],
  ['info-700', 'info-50', 4.5, 'info バッジ'],
  ['success-800', 'success-50', 4.5, 'success アラート'],
  ['warning-800', 'warning-50', 4.5, 'warning アラート'],
  ['danger-800', 'danger-50', 4.5, 'danger アラート'],
  ['info-800', 'info-50', 4.5, 'info アラート'],
  ['success-600', 'success-50', 3, 'success アイコン'],
  ['warning-600', 'warning-50', 3, 'warning アイコン'],
  ['danger-600', 'danger-50', 3, 'danger アイコン'],
  ['info-600', 'info-50', 3, 'info アイコン'],
]
const v = (t: string) => `--jimble-color-${t}`

export function contrastPage() {
  let redraw = () => {}
  const { root, draw } = statefulPage(() => {
    const rows = PAIRS.map(([fg, bg, min, use]) => {
      const ratio = contrastOfVars(v(fg), v(bg))
      return { fg, bg, min, use, ratio, ok: ratio !== null && ratio >= min }
    })
    const ng = rows.filter((r) => !r.ok).length
    return html`
      <jimble-page-header
        heading="コントラスト"
        description="文字と背景の組み合わせが、基準(WCAG 2.2 AA)を満たしているかを、いまの色で計算します。"
      >
        <jimble-button slot="actions" @click=${() => redraw()}>再計算</jimble-button>
      </jimble-page-header>
      <jimble-alert variant=${ng ? 'danger' : 'success'} style="margin-top: 1rem">
        ${ng ? `${ng} 件が、基準を満たしていません。` : `すべて基準を満たしています（${rows.length} 件）。`}
      </jimble-alert>
      <jimble-card style="margin-top: 1rem">
        <table class="contrast">
          <thead>
            <tr>
              <th>用途</th>
              <th>見本</th>
              <th>前景</th>
              <th>背景</th>
              <th>比</th>
              <th>必要</th>
              <th>結果</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) =>
                html`<tr>
                  <td>${r.use}</td>
                  <td>
                    <span class="sample" style="color: var(${v(r.fg)}); background: var(${v(r.bg)})"
                      >あア Aa</span
                    >
                  </td>
                  <td><code>${r.fg}</code></td>
                  <td><code>${r.bg}</code></td>
                  <td>${r.ratio === null ? '—' : `${r.ratio.toFixed(2)}:1`}</td>
                  <td>${r.min}:1</td>
                  <td>
                    <jimble-badge variant=${r.ok ? 'success' : 'danger'}
                      >${r.ok ? '合格' : '不足'}</jimble-badge
                    >
                  </td>
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
