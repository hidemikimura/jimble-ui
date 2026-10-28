import { html } from 'lit'
import { contrastOfVars, type Scheme } from '../color.ts'
import { statefulPage } from './util.ts'

// [前景の変数, 背景の変数, 必要な比, 用途]。tests/unit/contrast.test.ts の、既定トークンの契約と同じ組み合わせ
const PAIRS: [string, string, number, string][] = [
  ['text', 'surface', 4.5, '本文'],
  ['text', 'surface-muted', 4.5, 'ページ背景上の本文'],
  ['text', 'surface-overlay', 4.5, 'メニュー・ダイアログの本文'],
  ['text-muted', 'surface', 4.5, '補助の文字'],
  ['text-muted', 'surface-muted', 4.5, '補助の文字（ページ背景）'],
  ['text-muted', 'surface-overlay', 4.5, 'メニュー・ダイアログの補助の文字'],
  ['text', 'surface-sunken', 4.5, 'かんばんの列の見出し'],
  ['text', 'item-hover', 4.5, 'メニュー・セレクトの項目の hover'],
  ['text-danger', 'item-hover', 4.5, 'メニューの危険な項目の hover'],
  ['text-danger', 'surface', 4.5, 'フィールドのエラー'],
  ['text-accent', 'surface', 4.5, 'タブの選択中・かんばんの「ここに移動」'],
  ['text-accent', 'surface-accent', 4.5, '現在のページ・primary バッジ'],
  ['text', 'surface-accent-strong', 4.5, '日付の範囲'],
  ['text', 'surface-accent-stronger', 4.5, '日付の範囲の hover'],
  ['icon-accent', 'surface', 3, 'チェックの印・並べ替えの印'],
  ['icon-accent', 'surface-overlay', 3, 'セレクトの選択中の印'],
  ['ring-control', 'surface-sunken', 3, 'かんばんの受け口の枠'],
  ['text-on-primary', 'surface-inverse', 4.5, 'ツールチップ（既定）'],
  ['text-placeholder', 'surface', 4.5, 'プレースホルダー'],
  ['text-link', 'surface', 4.5, 'リンク'],
  ['text-on-primary', 'primary-600', 4.5, '主ボタン'],
  ['text-on-primary', 'primary-500', 4.5, '主ボタン（hover）'],
  ['text-on-primary', 'danger-600', 4.5, 'danger ボタン'],
  ['text-on-primary', 'danger-700', 4.5, 'danger ボタン（hover）'],
  ['ring-control', 'surface', 3, '入力欄の枠（非文字 3:1）'],
  ['ring-focus', 'surface', 3, 'フォーカスリング'],
  ['ring-focus', 'surface-muted', 3, 'フォーカスリング（ページ背景）'],
  ['ring-focus', 'surface-overlay', 3, 'フォーカスリング（メニュー・ダイアログ）'],
  ['ring-invalid', 'surface', 3, 'エラーの枠'],
  ['text-secondary', 'surface-sunken', 4.5, 'neutral バッジ'],
  ...(['success', 'warning', 'danger', 'info'] as const).flatMap(
    (t): [string, string, number, string][] => [
      [`text-${t}`, `surface-${t}`, 4.5, `${t} バッジ`],
      [`text-${t}-strong`, `surface-${t}`, 4.5, `${t} アラート`],
      [`icon-${t}`, `surface-${t}`, 3, `${t} アラートのアイコン`],
      [`icon-${t}`, 'surface-overlay', 3, `${t} 通知のアイコン`],
    ],
  ),
  // 部品ごとの色(0.8.0 以降。完全な変数名で書く)
  ['--jimble-tooltip-text', '--jimble-tooltip-bg', 4.5, 'ツールチップ'],
  ['--jimble-table-header-text', '--jimble-table-header-bg', 4.5, '表の見出し'],
  [
    '--jimble-sidebar-nav-current-icon-color',
    '--jimble-sidebar-nav-current-bg',
    3,
    '現在のページのアイコン',
  ],
  // ヘッダー・サイドバー(0.6.0 以降。完全な変数名で書く)
  ['--jimble-app-shell-header-text', '--jimble-app-shell-header-bg', 4.5, 'ヘッダーの文字'],
  [
    '--jimble-app-shell-header-text',
    '--jimble-app-shell-header-hover-bg',
    4.5,
    'ヘッダーのボタン（hover）',
  ],
  ['--jimble-sidebar-nav-text', '--jimble-app-shell-sidebar-bg', 4.5, 'サイドバーの項目の文字'],
  ['--jimble-sidebar-nav-text', '--jimble-sidebar-nav-hover-bg', 4.5, 'サイドバーの項目（hover）'],
  [
    '--jimble-sidebar-nav-current-text',
    '--jimble-sidebar-nav-current-bg',
    4.5,
    '現在のページの項目',
  ],
  ['--jimble-sidebar-nav-icon-color', '--jimble-app-shell-sidebar-bg', 3, 'サイドバーのアイコン'],
  [
    '--jimble-sidebar-nav-ring-focus',
    '--jimble-app-shell-sidebar-bg',
    3,
    'サイドバーのフォーカスの輪郭',
  ],
]
// 「primary-600」のようなトークン名は --jimble-color-… に、「--」で始まるものは、そのまま変数名にする
const v = (t: string) => (t.startsWith('--') ? t : `--jimble-color-${t}`)

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
