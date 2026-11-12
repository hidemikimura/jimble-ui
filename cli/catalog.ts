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
  'tree-item': 'tree',
  command: 'command-palette',
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
  'tree',
])

/** 要素の説明がある、ドキュメントのページの名前（子の要素は親のページ）。name は `jimble-` を除いた名前 */
export const pageName = (name: string): string => PAGE[name] ?? name

/** 要素のドキュメントのページの URL。name は `jimble-` を除いた名前 */
export const pageUrl = (name: string): string => `${SITE}/components/${pageName(name)}/`

/** 説明の最初の一文(最初の「。」まで) */
export const firstSentence = (text = ''): string => {
  const para = text
    .trim()
    .split(/\n\s*\n|\n- /)[0]!
    .replace(/\s*\n\s*/g, '')
  const i = para.indexOf('。')
  return i >= 0 ? para.slice(0, i + 1) : para
}

/** 公開段階（設計書 §24）。JSDoc の `@status experimental` と `@deprecated` から決まる */
export type ReleasePhase = 'experimental' | 'stable' | 'deprecated'

/** 段階の名前と、利用者への意味（サイト・skill・CLI で同じ文を使う） */
export const PHASES: Readonly<Record<ReleasePhase, { label: string; meaning: string }>> = {
  experimental: {
    label: '試験的',
    meaning:
      '新しく足した部品。使ってよいが、意見を受けて、マイナーバージョンで属性・イベントなどが変わることがある',
  },
  stable: {
    label: '安定',
    meaning:
      '互換性を保つ。変えるときは、先に非推奨にして、少なくとも 1 つのマイナーバージョンのあいだ残す',
  },
  deprecated: {
    label: '非推奨',
    meaning: '今後のバージョンで外す。代わりの部品・書き方に移る',
  },
}

/** マニフェストの宣言から、公開段階を決める（`deprecated` が文字列なら、それが代わりの案内） */
export const releasePhase = (decl: {
  status?: string
  deprecated?: string | boolean
}): ReleasePhase =>
  decl.deprecated ? 'deprecated' : decl.status === 'experimental' ? 'experimental' : 'stable'
