// skill(AI 向けの使い方)を生成する。手書きのテンプレート(scripts/skill-template.md)に、
//   {{components}}      … custom-elements.json から作る「コンポーネント早見」
//   {{example:<id>}}    … site/examples/<id>.html(axe で検査済みのドキュメントの例)
// を埋め込む。出力先:
//   skills/jimble-ui/SKILL.md          … パッケージに同梱する(利用者が .claude/skills/ にコピーして使う)
//   .claude/skills/jimble-ui/SKILL.md  … このリポジトリで開発するときに使う
// 部品ごとの注意書きと例は scripts/skill-references/<名前>.md に置き、<出力先>/references/<名前>.md に生成する。
// SKILL.md は呼び出すたびに全部読み込まれるので短く保ち、詳細は必要なときだけ読ませる。
// 実行: node scripts/gen-skill.ts [--check]   （事前に custom-elements.json が必要: npm run gen:manifest）
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { FORM, PHASES, firstSentence, pageName, releasePhase } from '../cli/catalog.ts'
import { dosNames, readDos, DOS_DIR } from './lib/dos.ts'
import { enumValues, loadElements, type ElementDecl } from './lib/manifest.ts'

const root = resolve(import.meta.dirname, '..')
const OUTPUT_DIRS = ['skills/jimble-ui', '.claude/skills/jimble-ui']

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
      'stack',
      'grid',
    ],
  ],
  [
    '表示',
    [
      'card',
      'badge',
      'alert',
      'spinner',
      'progress',
      'skeleton',
      'empty-state',
      'stepper',
      'step',
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
      'kanban',
      'kanban-column',
      'kanban-card',
    ],
  ],
  [
    '入力',
    [
      'button',
      'field',
      'input',
      'textarea',
      'code-editor',
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
      'tree',
      'tree-item',
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
      'popover',
      'command-palette',
      'command',
      'toast',
      'toast-region',
      'tooltip',
    ],
  ],
]
// 子要素は、親のコンポーネントのページで説明している
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
      // フォーム部品に共通の状態（invalid など）は、本文の「見た目のカスタマイズ」に 1 度だけ書く
      const states = (e.cssStates ?? [])
        .filter((s) => s.inheritedFrom?.name !== 'JimbleFormElement')
        .map((s) => `\`:state(${s.name})\``)
      // ページの URL は早見の冒頭に形だけ書く（行数を抑える）。子の要素だけ、説明のあるページ（親）を書く
      const page = pageName(name)
      const phase = releasePhase(e)
      const mark = phase === 'stable' ? '' : `（${PHASES[phase].label}）`
      out.push(`- **\`jimble-${name}\`**${mark} — ${firstSentence(e.description)}`)
      if (attrs.length) out.push(`  - 属性: ${attrs.join(', ')}`)
      if (slots.length) out.push(`  - スロット: ${slots.join(', ')}`)
      if (events.length) out.push(`  - イベント: ${events.join(', ')}`)
      if (states.length) out.push(`  - 状態: ${states.join(', ')}`)
      if (page !== name) out.push(`  - 説明: \`${page}\` のページ`)
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

const expand = (text: string) =>
  text
    .replace('{{components}}', components())
    .replace('{{icons}}', iconNames())
    .replace(/\{\{example:([\w/-]+)\}\}/g, (_, id: string) => example(id))

/** 部品のページの題名と並び順（site/content/components/<名前>.md の frontmatter） */
function pageMeta(name: string): { title: string; order: number } {
  const text = readFileSync(resolve(root, 'site/content/components', `${name}.md`), 'utf8')
  return {
    title: /^title:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? name,
    order: Number(/^order:\s*([\d.]+)$/m.exec(text)?.[1] ?? 999),
  }
}

/** references/dos.md: 部品ごとの Do / Don't（site/dos/*.md を、ドキュメントの並び順でまとめる。設計書 §20） */
function dosReference(): string {
  const sections = dosNames()
    .map((name) => ({ name, ...pageMeta(name), ...readDos(resolve(DOS_DIR, `${name}.md`)) }))
    .sort((a, b) => a.order - b.order)
    .map((d) =>
      [
        `## ${d.title}（\`jimble-${d.name}\`）`,
        '',
        '**Do**',
        '',
        ...d.doItems.map((i) => `- ${i}`),
        '',
        "**Don't**",
        '',
        ...d.dontItems.map((i) => `- ${i}`),
      ].join('\n'),
    )
  return [
    "# 部品ごとの Do / Don't",
    '',
    "部品ごとの、こうする（Do）と、避ける（Don't）。ドキュメントの各部品のページの「Do / Don't」と同じ内容（`site/dos/` から生成）。",
    '',
    ...sections.flatMap((s) => [s, '']),
  ].join('\n')
}

const NOTICE =
  '<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->\n'

/** 出力先からの相対パス → 中身 */
function generate(): Map<string, string> {
  const template = readFileSync(resolve(import.meta.dirname, 'skill-template.md'), 'utf8')
  const [, frontmatter = '', body = ''] = /^(---\n[\s\S]*?\n---\n)([\s\S]*)$/.exec(template) ?? []
  if (!frontmatter) throw new Error('テンプレートの先頭に frontmatter がありません')
  const files = new Map([['SKILL.md', frontmatter + '\n' + NOTICE + expand(body)]])
  const refDir = resolve(import.meta.dirname, 'skill-references')
  for (const f of readdirSync(refDir)
    .filter((n) => n.endsWith('.md'))
    .sort())
    files.set(`references/${f}`, NOTICE + '\n' + expand(readFileSync(resolve(refDir, f), 'utf8')))
  files.set('references/dos.md', NOTICE + '\n' + dosReference())
  // 目印の形だけを見る(コードエディタの例などの {{customer_name}} は、ふつうの文字)
  for (const [name, text] of files)
    if (/\{\{(?:components|icons)\}\}|\{\{[a-z]+:/.test(text))
      throw new Error(`展開されていないプレースホルダーが残っています: ${name}`)
  return files
}

const generated = generate()
const check = process.argv.includes('--check')
let stale = false
for (const dir of OUTPUT_DIRS) {
  if (!check) rmSync(resolve(root, dir, 'references'), { recursive: true, force: true })
  for (const [name, text] of generated) {
    const rel = `${dir}/${name}`
    const path = resolve(root, rel)
    if (check) {
      let cur = ''
      try {
        cur = readFileSync(path, 'utf8')
      } catch {
        /* 無ければ古い扱い */
      }
      if (cur !== text) {
        stale = true
        console.error(`古い生成物: ${rel}（npm run gen:skill を実行してください）`)
      }
    } else {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, text)
      console.log(`生成: ${rel} (${(text.length / 1024).toFixed(1)} KB)`)
    }
  }
}
if (stale) process.exit(1)
