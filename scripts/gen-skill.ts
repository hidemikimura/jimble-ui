// skill(AI 向けの使い方)を生成する。手書きのテンプレート(scripts/skill-template.md)に、
//   {{components}}      … custom-elements.json から作る「コンポーネント早見」
//   {{example:<id>}}    … site/examples/<id>.html(axe で検査済みのドキュメントの例)
// を埋め込む。出力先:
//   skills/jimble-ui/SKILL.md          … パッケージに同梱する(利用者が .claude/skills/ にコピーして使う)
//   .claude/skills/jimble-ui/SKILL.md  … このリポジトリで開発するときに使う
// 実行: node scripts/gen-skill.ts [--check]   （事前に custom-elements.json が必要: npm run gen:manifest）
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { enumValues, loadElements, type ElementDecl } from './lib/manifest.ts'

const root = resolve(import.meta.dirname, '..')
const SITE = 'https://hidemikimura.github.io/jimble-ui'
const OUTPUTS = ['skills/jimble-ui/SKILL.md', '.claude/skills/jimble-ui/SKILL.md']

const GROUPS: [string, string[]][] = [
  [
    '枠組み',
    [
      'app-shell',
      'sidebar-nav',
      'nav-item',
      'nav-group',
      'page-header',
      'breadcrumb',
      'breadcrumb-item',
      'tabs',
      'tab',
      'tab-panel',
      'router',
    ],
  ],
  [
    '表示',
    [
      'card',
      'badge',
      'alert',
      'spinner',
      'icon',
      'table',
      'table-header',
      'table-body',
      'table-row',
      'table-head-cell',
      'table-cell',
      'description-list',
      'description-item',
      'pagination',
    ],
  ],
  [
    '入力',
    [
      'button',
      'field',
      'input',
      'textarea',
      'select',
      'option',
      'combobox',
      'dual-listbox',
      'date-input',
      'color-input',
      'file-input',
      'checkbox',
      'radio-group',
      'radio',
      'switch',
    ],
  ],
  [
    'オーバーレイ',
    [
      'dialog',
      'drawer',
      'dropdown-menu',
      'menu-item',
      'menu-separator',
      'toast',
      'toast-region',
      'tooltip',
    ],
  ],
]
// 子要素は、親のコンポーネントのページで説明している
const PAGE: Record<string, string> = {
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
}
// input / change をネイティブと同じく出すフォーム部品
const FORM = new Set([
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

/** 説明の最初の一文(最初の「。」まで) */
const firstSentence = (text = '') => {
  const para = text
    .trim()
    .split(/\n\s*\n|\n- /)[0]!
    .replace(/\s*\n\s*/g, '')
  const i = para.indexOf('。')
  return i >= 0 ? para.slice(0, i + 1) : para
}

function attrLabel(a: NonNullable<ElementDecl['attributes']>[number]): string {
  const type = a.type?.text
  const values = enumValues(type)
  if (values) return `\`${a.name}=${values.join('|')}\``
  if (type === 'boolean') return `\`${a.name}\``
  if (type === 'number') return `\`${a.name}=数値\``
  return `\`${a.name}=値\``
}

function components(): string {
  const byName = new Map(loadElements().map((e) => [e.tagName.replace(/^jimble-/, ''), e]))
  const seen = new Set<string>()
  const out: string[] = []
  for (const [group, names] of GROUPS) {
    out.push(`### ${group}\n`)
    for (const name of names) {
      const e = byName.get(name)
      if (!e) throw new Error(`GROUPS に書いた要素がありません: jimble-${name}`)
      seen.add(name)
      const attrs = [...new Map((e.attributes ?? []).map((a) => [a.name, a])).values()].map(
        attrLabel,
      )
      const slots = (e.slots ?? []).map((s) => (s.name ? `\`${s.name}\`` : '(既定)'))
      const events = [
        ...(e.events ?? []).map((v) => `\`${v.name}\``),
        ...(FORM.has(name) ? ['`input`', '`change`'] : []),
      ]
      const page = `${SITE}/components/${PAGE[name] ?? name}/`
      out.push(`- **\`jimble-${name}\`** — ${firstSentence(e.description)}`)
      if (attrs.length) out.push(`  - 属性: ${attrs.join(', ')}`)
      if (slots.length) out.push(`  - スロット: ${slots.join(', ')}`)
      if (events.length) out.push(`  - イベント: ${events.join(', ')}`)
      out.push(`  - 詳細: ${page}`)
    }
    out.push('')
  }
  const missing = [...byName.keys()].filter((n) => !seen.has(n))
  if (missing.length)
    throw new Error(`GROUPS に無い要素があります: ${missing.map((n) => `jimble-${n}`).join(', ')}`)
  return out.join('\n').trimEnd()
}

function example(id: string): string {
  let html = readFileSync(resolve(root, 'site/examples', `${id}.html`), 'utf8')
  html = html.replace(/^<!--\s*title:.*?-->\s*\n/, '').replace(/^<!--\s*frame:.*?-->\s*\n/, '')
  return '```html\n' + html.trim() + '\n```'
}

/** 使えるアイコンの名前(icons/svg のファイル名) */
function iconNames(): string {
  return readdirSync(resolve(root, 'icons/svg'))
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''))
    .sort()
    .map((n) => `\`${n}\``)
    .join('、')
}

const template = readFileSync(resolve(import.meta.dirname, 'skill-template.md'), 'utf8')
const [, frontmatter = '', body = ''] = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/.exec(template) ?? []
if (!frontmatter) throw new Error('テンプレートの先頭に frontmatter がありません')
const generated =
  frontmatter +
  '\n<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・custom-elements.json・site/examples から作る。直接編集しない。 -->\n' +
  body
    .replace('{{components}}', components())
    .replace('{{icons}}', iconNames())
    .replace(/\{\{example:([\w/-]+)\}\}/g, (_, id: string) => example(id))

if (/\{\{/.test(generated)) throw new Error('展開されていないプレースホルダーが残っています')

const check = process.argv.includes('--check')
let stale = false
for (const rel of OUTPUTS) {
  const path = resolve(root, rel)
  if (check) {
    let cur = ''
    try {
      cur = readFileSync(path, 'utf8')
    } catch {
      /* 無ければ古い扱い */
    }
    if (cur !== generated) {
      stale = true
      console.error(`古い生成物: ${rel}（npm run gen:skill を実行してください）`)
    }
  } else {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, generated)
    console.log(`生成: ${rel} (${(generated.length / 1024).toFixed(1)} KB)`)
  }
}
if (stale) process.exit(1)
