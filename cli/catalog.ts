// 要素とドキュメントのページの対応など、skill の生成（scripts/gen-skill.ts）と CLI が共有する決まり。

export const SITE = 'https://hidemikimura.github.io/jimble-ui'

/** 自分のページを持たない子の要素 → 親のページ（`jimble-` を除いた名前） */
const PAGE: Readonly<Record<string, string>> = {
  'nav-item': 'sidebar-nav',
  'nav-group': 'sidebar-nav',
  'breadcrumb-item': 'breadcrumb',
  tab: 'tabs',
  'tab-panel': 'tabs',
  'table-header': 'table',
  'table-body': 'table',
  'table-row': 'table',
  'table-head-cell': 'table',
  'table-cell': 'table',
  'description-item': 'description-list',
  option: 'select',
  radio: 'radio-group',
  'menu-item': 'dropdown-menu',
  'menu-separator': 'dropdown-menu',
  'toast-region': 'toast',
  'kanban-column': 'kanban',
  'kanban-card': 'kanban',
}

/** input / change をネイティブと同じく出すフォーム部品（`jimble-` を除いた名前） */
export const FORM: ReadonlySet<string> = new Set([
  'input',
  'textarea',
  'select',
  'combobox',
  'dual-listbox',
  'date-input',
  'color-input',
  'file-input',
  'checkbox',
  'radio-group',
  'switch',
])

/** 要素のドキュメントのページの URL。name は `jimble-` を除いた名前 */
export const pageUrl = (name: string): string => `${SITE}/components/${PAGE[name] ?? name}/`

/** 説明の最初の一文(最初の「。」まで) */
export const firstSentence = (text = ''): string => {
  const para = text
    .trim()
    .split(/\n\s*\n|\n- /)[0]!
    .replace(/\s*\n\s*/g, '')
  const i = para.indexOf('。')
  return i >= 0 ? para.slice(0, i + 1) : para
}
