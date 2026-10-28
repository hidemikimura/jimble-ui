// コントラストを確かめる組み合わせ(コントラストのページと、テーマ調整の「ライトからダークを作る」が使う)

// [前景の変数, 背景の変数, 必要な比, 用途]。tests/unit/contrast.test.ts の、既定トークンの契約と同じ組み合わせ
export const PAIRS: [string, string, number, string][] = [
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
export const v = (t: string) => (t.startsWith('--') ? t : `--jimble-color-${t}`)
