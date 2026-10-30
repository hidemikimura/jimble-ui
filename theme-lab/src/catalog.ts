// theme-lab で調整できる CSS 変数の一覧(カタログ)。調整パネルと theme.css と試験が、ここを元にそろう。
//
// - ライブラリが公開する変数は、すべてここに載せる(`tests/unit/theme-lab.test.ts` が、部品の @cssprop と
//   トークン(tokens.json)に、載せ忘れがないことを確かめる)。
// - `opt: true` の変数は、theme.css に「コメントアウトして」載せる。大きさ・variant ごとに既定値が違うなど、
//   1 つの値を指定すると、すべてに同じ値が効いてしまうため。使うときは、コメントを外して値を書く。
// - DOM に依存しない(試験からも読む)。

export type Kind =
  | 'color' // 色
  | 'length' // 長さ(0.5rem・8px など)
  | 'number' // 単位のない数(z-index・余白の単位数など)
  | 'shadow' // 影(box-shadow の値。none で影なし)
  | 'weight' // 文字の太さ
  | 'select' // 選択肢(options)から選ぶ
  | 'text' // そのほか(フォント・時間・イージングなど)

export interface Entry {
  name: string
  label: string
  kind: Kind
  /** select の選択肢 */
  options?: string[]
  /** 入力欄に出す、既定値や補足 */
  hint?: string
  /** theme.css ではコメントアウトして載せる(上の説明を参照) */
  opt?: boolean
  /** 「透明」にすることに意味がある色（hover の背景・ボタンの枠など）。調整パネルに「透明」ボタンを出す */
  transparent?: boolean
  /** 色を選ぶと、その色に「透けぐあい」の変数をかけて書く（色選択は透明度を持たず、不透明な色で上書きしてしまうため）。変数名 */
  withOpacity?: string
}
export interface Group {
  title: string
  note: string
  entries: Entry[]
  /** 段階(50〜950)を、600 の色から自動で作れる色の名前 */
  scale?: string
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const scale = (name: string, steps: number[]): Entry[] =>
  steps.map((s) => ({ name: `--jimble-color-${name}-${s}`, label: String(s), kind: 'color' }))
/** 「透明」にして使う色の変数（hover の背景・ボタンの背景と枠・項目の hover） */
const TRANSPARENT_OK = /(hover-bg|bg-hover|button-bg|button-ring|color-item-hover)$/
const c = (name: string, label: string, opt = false): Entry => ({
  name,
  label,
  kind: 'color',
  opt,
  transparent: TRANSPARENT_OK.test(name),
})
const len = (name: string, label: string, hint?: string, opt = false): Entry => ({
  name,
  label,
  kind: 'length',
  hint,
  opt,
})
const shadow = (name: string, label: string): Entry => ({ name, label, kind: 'shadow' })
const num = (name: string, label: string, hint?: string, opt = false): Entry => ({
  name,
  label,
  kind: 'number',
  hint,
  opt,
})
const weight = (name: string, label: string): Entry => ({ name, label, kind: 'weight' })
const radius = (name: string, label: string): Entry => len(name, label, '例: 0.5rem・8px・9999px')

export const WEIGHTS = ['400', '500', '600', '700', '800']
export const SHADOW_PRESETS: [label: string, value: string][] = [
  ['なし', 'none'],
  ['xs', 'var(--jimble-shadow-xs)'],
  ['sm（既定）', 'var(--jimble-shadow-sm)'],
  ['md', 'var(--jimble-shadow-md)'],
  ['lg', 'var(--jimble-shadow-lg)'],
]

export const CATALOG: Group[] = [
  // ---- 色 ----
  {
    title: '主色 primary',
    note: '600 = 主ボタン・リンク・フォーカス',
    scale: 'primary',
    entries: scale('primary', STEPS),
  },
  {
    title: 'ニュートラル neutral',
    note: '900 = 本文 / 500 = 補助の文字・入力欄の枠 / 300 = 区切り線',
    entries: scale('neutral', STEPS),
  },
  {
    title: '成功 success',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'success',
    entries: scale('success', STEPS),
  },
  {
    title: '警告 warning',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'warning',
    entries: scale('warning', STEPS),
  },
  {
    title: 'エラー danger',
    note: '600 = 枠・danger ボタン / 700・800 = 文字',
    scale: 'danger',
    entries: scale('danger', STEPS),
  },
  {
    title: '情報 info',
    note: '50 = 背景 / 600 = アイコン / 700・800 = 文字',
    scale: 'info',
    entries: scale('info', STEPS),
  },
  {
    title: '面・文字',
    note: '意味を持つ色(通常は、上の段階を参照しています)',
    entries: [
      c('--jimble-color-surface', '面（カード・入力欄）'),
      c('--jimble-color-surface-muted', 'ページの背景'),
      c('--jimble-color-surface-sunken', '沈んだ背景'),
      c('--jimble-color-item-hover', 'メニュー・セレクトなどの項目にマウスを重ねた背景'),
      c('--jimble-color-surface-overlay', 'ダイアログ・メニューの背景'),
      {
        ...c('--jimble-color-backdrop', 'ダイアログの背後の暗幕（色を選んでも、濃さは保つ）'),
        withOpacity: '--jimble-backdrop-opacity',
      },
      c('--jimble-color-text', '本文'),
      c('--jimble-color-text-muted', '補助の文字'),
      c('--jimble-color-text-placeholder', 'プレースホルダー'),
      c('--jimble-color-text-disabled', '無効の文字'),
      c('--jimble-color-text-on-primary', '主ボタンの文字'),
      c('--jimble-color-text-link', 'リンク'),
      c('--jimble-color-primary', '主色（単色の参照）'),
    ],
  },
  {
    title: '選択中・状態の色',
    note: '意味を持つ色(通常は、上の段階を参照しています)。ここで 1 つの色を選ぶと、ダークモードでも同じ色になります',
    entries: [
      c('--jimble-color-surface-accent', '選択中の行・現在のページの背景'),
      c('--jimble-color-surface-accent-strong', '日付の範囲の背景'),
      c('--jimble-color-surface-accent-stronger', '日付の範囲の hover'),
      c('--jimble-color-text-accent', '選択中の文字・タブ'),
      c('--jimble-color-icon-accent', 'チェックの印・並べ替えの印'),
      c('--jimble-color-surface-inverse', 'ツールチップの背景'),
      c('--jimble-color-surface-track', 'スイッチ(オフ)の溝'),
      c('--jimble-color-text-secondary', 'neutral バッジの文字'),
      c('--jimble-color-surface-success', '成功: アラート・バッジの背景'),
      c('--jimble-color-text-success', '成功: バッジ・エラーの文字'),
      c('--jimble-color-text-success-strong', '成功: アラートの文字'),
      c('--jimble-color-icon-success', '成功: アイコン'),
      c('--jimble-color-surface-warning', '警告: アラート・バッジの背景'),
      c('--jimble-color-text-warning', '警告: バッジ・エラーの文字'),
      c('--jimble-color-text-warning-strong', '警告: アラートの文字'),
      c('--jimble-color-icon-warning', '警告: アイコン'),
      c('--jimble-color-surface-danger', 'エラー: アラート・バッジの背景'),
      c('--jimble-color-text-danger', 'エラー: バッジ・エラーの文字'),
      c('--jimble-color-text-danger-strong', 'エラー: アラートの文字'),
      c('--jimble-color-icon-danger', 'エラー: アイコン'),
      c('--jimble-color-surface-info', '情報: アラート・バッジの背景'),
      c('--jimble-color-text-info', '情報: バッジ・エラーの文字'),
      c('--jimble-color-text-info-strong', '情報: アラートの文字'),
      c('--jimble-color-icon-info', '情報: アイコン'),
    ],
  },
  {
    title: '枠・区切り線',
    note: 'ring = 既定の線の色。card・divider・button は、既定で ring と同じ（変えると、その用途だけ変わります）',
    entries: [
      c('--jimble-color-ring', '区切り線の既定'),
      c('--jimble-color-ring-card', 'カードの枠'),
      c('--jimble-color-ring-divider', '区切り線（カードの見出しの下・表の行など）'),
      c('--jimble-color-ring-button', 'ボタンの枠'),
      c('--jimble-color-ring-control', '入力欄の枠'),
      c('--jimble-color-ring-focus', 'フォーカスの輪郭'),
      c('--jimble-color-ring-invalid', 'エラーの枠'),
    ],
  },
  // ---- 角丸・大きさ・影・文字・動き ----
  {
    title: '角丸（全体）',
    note: 'control = ボタン・入力欄 / card = カード / overlay = ダイアログ・メニュー',
    entries: [
      radius('--jimble-radius-sm', '小'),
      radius('--jimble-radius-md', '中'),
      radius('--jimble-radius-lg', '大'),
      radius('--jimble-radius-xl', '特大'),
      radius('--jimble-radius-full', '丸（バッジ・スイッチなど）'),
      radius('--jimble-radius-control', 'ボタン・入力欄'),
      radius('--jimble-radius-card', 'カード'),
      radius('--jimble-radius-overlay', 'ダイアログ・メニュー'),
    ],
  },
  {
    title: '高さ・余白',
    note: 'control-height = ボタン・入力欄の高さ(sm / md / lg) / spacing = 余白の基準',
    entries: [
      len('--jimble-control-height-sm', 'コントロールの高さ（小）'),
      len('--jimble-control-height-md', 'コントロールの高さ（中）'),
      len('--jimble-control-height-lg', 'コントロールの高さ（大）'),
      len('--jimble-spacing', '余白の基準（4px）'),
      len('--jimble-focus-ring-width', 'フォーカスの輪郭の太さ'),
    ],
  },
  {
    title: '影（全体）',
    note: 'box-shadow の値(例: 0 1px 3px 0 rgb(0 0 0 / 0.1))',
    entries: [
      shadow('--jimble-shadow-xs', '影 xs'),
      shadow('--jimble-shadow-sm', '影 sm'),
      shadow('--jimble-shadow-md', '影 md'),
      shadow('--jimble-shadow-lg', '影 lg'),
    ],
  },
  {
    title: '文字',
    note: 'フォントと太さと大きさ。太さは、ラベル・見出し・サイドバーの項目などに効きます',
    entries: [
      { name: '--jimble-font-sans', label: '本文のフォント', kind: 'text' },
      { name: '--jimble-font-mono', label: 'コードのフォント', kind: 'text' },
      weight('--jimble-font-weight-normal', '太さ 標準'),
      weight('--jimble-font-weight-medium', '太さ medium（ラベルなど）'),
      weight('--jimble-font-weight-semibold', '太さ semibold（見出しなど）'),
      weight('--jimble-font-weight-bold', '太さ bold'),
      len('--jimble-font-size-xs', '大きさ xs'),
      len('--jimble-font-size-sm', '大きさ sm'),
      len('--jimble-font-size-base', '大きさ base'),
      len('--jimble-font-size-lg', '大きさ lg'),
      len('--jimble-font-size-xl', '大きさ xl'),
    ],
  },
  {
    title: '動き・重なり',
    note: '動きの長さは、視差効果を減らす設定では止まります。z-index は、固定ヘッダーとドロワーの重なり順',
    entries: [
      { name: '--jimble-duration-fast', label: '速い', kind: 'text', hint: '例: 100ms' },
      { name: '--jimble-duration-base', label: '標準', kind: 'text', hint: '例: 150ms' },
      { name: '--jimble-duration-slow', label: '遅い', kind: 'text', hint: '例: 250ms' },
      { name: '--jimble-ease-standard', label: 'イージング', kind: 'text' },
      num('--jimble-z-sticky', '固定ヘッダーの z-index'),
      num('--jimble-z-drawer', 'ドロワー・広がったサイドバーの z-index'),
    ],
  },
  // ---- 部品ごと ----
  {
    title: 'ボタン',
    note: '背景・文字・枠は、種類(primary・secondary など)ごとに違う既定値があるため、指定するとすべての種類に効きます。hover の色だけは、種類ごとの変数があります（共通の hover より優先）',
    entries: [
      radius('--jimble-button-radius', '角丸'),
      weight('--jimble-button-font-weight', '文字の太さ'),
      shadow('--jimble-button-shadow', '影（ghost は既定で影なし）'),
      shadow(
        '--jimble-pagination-shadow',
        'ページネーションのボタンの影（既定はボタンの影と同じ）',
      ),
      len('--jimble-button-height', '高さ（大きさに応じる）', undefined, true),
      len('--jimble-button-padding-x', '左右の余白（大きさに応じる）', undefined, true),
      len('--jimble-button-gap', 'アイコンとの間隔（大きさに応じる）', undefined, true),
      c('--jimble-button-bg', '背景（種類に応じる）', true),
      c('--jimble-button-bg-hover', 'hover の背景（種類に応じる）', true),
      c('--jimble-button-fg', '文字（種類に応じる）', true),
      c('--jimble-button-fg-hover', 'hover の文字（種類に応じる）', true),
      c('--jimble-button-primary-bg-hover', '主ボタンの hover の背景'),
      c('--jimble-button-primary-fg-hover', '主ボタンの hover の文字'),
      c('--jimble-button-secondary-bg-hover', '白ボタンの hover の背景'),
      c('--jimble-button-secondary-fg-hover', '白ボタンの hover の文字'),
      c('--jimble-button-danger-bg-hover', '危険ボタンの hover の背景'),
      c('--jimble-button-danger-fg-hover', '危険ボタンの hover の文字'),
      c('--jimble-button-ghost-bg-hover', 'ghost ボタンの hover の背景'),
      c('--jimble-button-ghost-fg-hover', 'ghost ボタンの hover の文字'),
      c('--jimble-button-ring', '枠（種類に応じる）', true),
    ],
  },
  {
    title: '入力欄（テキスト・セレクトなど）',
    note: 'input・textarea・select・combobox・date-input・color-input に効きます',
    entries: [
      radius('--jimble-input-radius', '角丸'),
      shadow('--jimble-input-shadow', '影'),
      c('--jimble-input-bg', '背景'),
      c('--jimble-input-fg', '文字'),
      c('--jimble-input-ring', '枠'),
      c('--jimble-input-ring-focus', 'フォーカスの枠'),
      c('--jimble-input-ring-invalid', 'エラーの枠'),
      c('--jimble-input-placeholder', 'プレースホルダー'),
      len('--jimble-input-width', '幅', '例: 100%・20rem', true),
      len('--jimble-input-height', '高さ（大きさに応じる）', undefined, true),
      len('--jimble-input-padding-x', '左右の余白（大きさに応じる）', undefined, true),
    ],
  },
  {
    title: 'カード',
    note: '枠の色は「枠・区切り線」の card、見出しの下の線は divider',
    entries: [
      radius('--jimble-card-radius', '角丸'),
      shadow('--jimble-card-shadow', '影'),
      len('--jimble-card-padding', '内側の余白', '例: calc(var(--jimble-spacing) * 4)'),
    ],
  },
  {
    title: 'バッジ・アラート',
    note: '',
    entries: [
      radius('--jimble-badge-radius', 'バッジの角丸'),
      radius('--jimble-alert-radius', 'アラートの角丸'),
      len('--jimble-alert-padding', 'アラートの内側の余白', '例: calc(var(--jimble-spacing) * 4)'),
    ],
  },
  {
    title: 'ダイアログ・ドロワー・通知',
    note: '',
    entries: [
      radius('--jimble-dialog-radius', 'ダイアログの角丸'),
      len(
        '--jimble-backdrop-opacity',
        'ダイアログ・ドロワーの背後の暗幕の濃さ（色は変えない）',
        '例: 40%',
      ),
      len(
        '--jimble-dialog-padding',
        'ダイアログ・ドロワーの余白',
        '例: calc(var(--jimble-spacing) * 4)',
      ),
      radius('--jimble-drawer-radius', 'ドロワーの角丸'),
      radius('--jimble-toast-radius', '通知の角丸'),
    ],
  },
  {
    title: 'メニュー・一覧・ポップアップ',
    note: '',
    entries: [
      radius('--jimble-menu-radius', 'ドロップダウンメニューの角丸'),
      radius('--jimble-select-radius', 'セレクトの一覧の角丸'),
      radius('--jimble-combobox-radius', 'コンボボックスの候補の角丸'),
      radius('--jimble-date-input-popup-radius', 'カレンダーの角丸'),
      radius('--jimble-color-input-popup-radius', '色選択のポップアップの角丸'),
      radius('--jimble-file-input-radius', 'ファイルのドロップエリアの角丸'),
      c('--jimble-file-input-button-hover-bg', '「ファイルを選択」ボタンの hover の背景'),
      c('--jimble-file-input-button-hover-fg', '「ファイルを選択」ボタンの hover の文字'),
      c(
        '--jimble-icon-button-hover-bg',
        '小さなアイコンボタン（コンボボックス・日付・ファイル・カンバン・閉じるボタン）の hover の背景（場所に応じる。transparent で背景なし）',
        true,
      ),
      c(
        '--jimble-icon-button-hover-fg',
        '小さなアイコンボタンの hover のアイコンの色（場所に応じる）',
        true,
      ),
    ],
  },
  {
    title: 'ツールチップ',
    note: '',
    entries: [
      c('--jimble-tooltip-bg', '背景'),
      c('--jimble-tooltip-text', '文字'),
      radius('--jimble-tooltip-radius', '角丸'),
      len('--jimble-tooltip-max-width', '複数行のときの最大の幅'),
    ],
  },
  {
    title: 'スイッチ・アイコン・スピナー',
    note: '',
    entries: [
      c('--jimble-switch-thumb-bg', 'スイッチの丸の塗り'),
      c('--jimble-switch-thumb-ring', 'スイッチの丸の縁'),
      len('--jimble-icon-size', 'アイコンの大きさ（大きさに応じる）', undefined, true),
      len('--jimble-spinner-size', 'スピナーの大きさ（大きさに応じる）', undefined, true),
    ],
  },
  {
    title: '表・説明リスト',
    note: '行の区切り線の色は「枠・区切り線」の divider',
    entries: [
      c('--jimble-table-header-bg', '表の見出しの背景'),
      c('--jimble-table-row-hover-bg', '表の行にマウスを重ねたときの背景'),
      c('--jimble-table-header-text', '表の見出しの文字'),
      num('--jimble-table-cell-padding-x', 'セルの左右の余白（余白の単位の数）', '例: 3'),
      num('--jimble-table-cell-padding-y', 'セルの上下の余白（余白の単位の数）', '例: 2'),
      len('--jimble-table-max-height', '表の最大の高さ（超えるとスクロール）', '例: 24rem'),
      {
        name: '--jimble-table-columns',
        label: '表の列の幅（表ごとに列の数が違う）',
        kind: 'text',
        hint: '例: 12rem 1fr auto',
        opt: true,
      },
      len('--jimble-description-label-width', '説明リストの項目名の幅', '例: 8rem', true),
    ],
  },
  {
    title: 'パンくず・ページ見出し',
    note: '',
    entries: [
      {
        name: '--jimble-breadcrumb-justify',
        label: 'パンくずの横の位置',
        kind: 'select',
        options: ['flex-start', 'center', 'flex-end'],
      },
      weight('--jimble-page-header-heading-weight', 'ページ見出しの太さ'),
    ],
  },
  {
    title: 'ヘッダー・サイドバー',
    note: '暗くするときは、文字・アイコン・hover・現在のページも一緒に変える',
    entries: [
      c('--jimble-app-shell-header-bg', 'ヘッダーの背景'),
      c('--jimble-app-shell-header-text', 'ヘッダーの文字'),
      c('--jimble-app-shell-header-hover-bg', 'ヘッダーのボタンの hover'),
      c('--jimble-app-shell-header-ring', 'ヘッダーの縁'),
      c('--jimble-app-shell-sidebar-bg', 'サイドバーの背景'),
      c('--jimble-app-shell-sidebar-ring', 'サイドバーの縁'),
      len('--jimble-app-shell-header-height', 'ヘッダーの高さ'),
      len('--jimble-app-shell-sidebar-width', 'サイドバーの幅'),
      len('--jimble-app-shell-sidebar-collapsed-width', '細いサイドバーの幅'),
      len('--jimble-app-shell-main-padding', '本文の余白（広い画面は大きい）', '例: 1.5rem', true),
    ],
  },
  {
    title: 'サイドバーの項目',
    note: '',
    entries: [
      c('--jimble-sidebar-nav-text', '項目の文字'),
      c('--jimble-sidebar-nav-icon-color', 'アイコン'),
      c('--jimble-sidebar-nav-current-icon-color', '現在のページのアイコン'),
      c('--jimble-sidebar-nav-hover-bg', 'hover の背景'),
      c('--jimble-sidebar-nav-current-bg', '現在のページの背景'),
      c('--jimble-sidebar-nav-current-text', '現在のページの文字'),
      c('--jimble-sidebar-nav-ring-focus', 'フォーカスの輪郭'),
      len('--jimble-sidebar-nav-icon-size', 'アイコンの大きさ', '例: 1.25rem'),
    ],
  },
  {
    title: 'かんばん・左右の選択',
    note: '',
    entries: [
      len('--jimble-kanban-column-width', 'かんばんの列の幅'),
      len('--jimble-dual-listbox-height', '左右の選択のリストの高さ'),
    ],
  },
]

/** カタログの全エントリー */
export const ALL: Entry[] = CATALOG.flatMap((g) => g.entries)
