// CLI が読む、パッケージに同梱された資料（設計書 §17）。どれも npm の配布物に入っているもの:
//   custom-elements.json             … 要素・属性・スロット・イベント・part・CSS 変数
//   dist/vscode.html-data.json       … 属性の候補値（型の別名を解決済み）
//   skills/jimble-ui/                … 使い方の説明（SKILL.md と references/*.md）
//   dist/themes/<名前>.css            … 既製のテーマ（先頭のコメントに説明がある）
//   dist/templates/<名前>.html        … ページのテンプレート（site/examples/templates の写し。先頭のコメントに題名）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { releasePhase, type ReleasePhase } from './catalog.ts'
import { CliError } from './errors.ts'

export const PACKAGE_NAME = '@hidemikimura/jimble-ui'

export interface Attribute {
  name: string
  type?: string
  default?: string
  description?: string
  /** 列挙の候補値（真偽値・自由な文字列なら無い） */
  values?: string[]
}
export interface Named {
  name: string
  description?: string
}
export interface Component {
  tag: string
  description: string
  /** 公開段階（設計書 §24） */
  status: ReleasePhase
  /** 非推奨のとき、代わりの案内 */
  deprecated?: string
  attributes: Attribute[]
  slots: Named[]
  events: Named[]
  parts: Named[]
  cssProperties: (Named & { default?: string })[]
  states: Named[]
}
export interface Topic {
  /** `docs <id>` で指す名前（`skill` は SKILL.md 本体） */
  id: string
  title: string
  body: string
}
export interface ThemeInfo {
  name: string
  description: string
}
export interface TemplateInfo {
  name: string
  title: string
  /** <body> の中身（app-shell、または main から始まる） */
  fragment: string
}
export interface PackageData {
  root: string
  version: string
  components: Component[]
  topics: Topic[]
  themes: ThemeInfo[]
  templates: TemplateInfo[]
}

/** dir から上に向かって、このパッケージの package.json がある場所を探す */
export function findPackageRoot(dir: string): string {
  let cur = resolve(dir)
  for (;;) {
    const pkg = join(cur, 'package.json')
    if (existsSync(pkg) && readJson<{ name?: string }>(pkg).name === PACKAGE_NAME) return cur
    const up = dirname(cur)
    if (up === cur) throw new CliError('ERR_DATA_NOT_FOUND', `${PACKAGE_NAME} の場所が分かりません`)
    cur = up
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function readRequired(root: string, rel: string): string {
  const path = join(root, rel)
  if (!existsSync(path))
    throw new CliError('ERR_DATA_NOT_FOUND', `${rel} がありません（パッケージが壊れています）`)
  return readFileSync(path, 'utf8')
}

interface ManifestDecl {
  tagName?: string
  description?: string
  status?: string
  deprecated?: string | boolean
  attributes?: { name: string; type?: { text: string }; default?: string; description?: string }[]
  slots?: Named[]
  events?: Named[]
  cssParts?: Named[]
  cssProperties?: (Named & { default?: string })[]
  cssStates?: (Named & { inheritedFrom?: { name: string } })[]
}
interface HtmlData {
  tags: { name: string; attributes: { name: string; values?: { name: string }[] }[] }[]
}

function loadComponents(root: string): Component[] {
  const manifest = JSON.parse(readRequired(root, 'custom-elements.json')) as {
    modules: { declarations?: ManifestDecl[] }[]
  }
  const html = JSON.parse(readRequired(root, 'dist/vscode.html-data.json')) as HtmlData
  const valuesOf = new Map(
    html.tags.flatMap((t) =>
      t.attributes
        .filter((a) => a.values?.length)
        .map((a) => [`${t.name} ${a.name}`, a.values!.map((v) => v.name)] as const),
    ),
  )
  return manifest.modules
    .flatMap((m) => m.declarations ?? [])
    .filter((d): d is ManifestDecl & { tagName: string } => !!d.tagName)
    .map((d) => ({
      tag: d.tagName,
      description: d.description ?? '',
      status: releasePhase(d),
      ...(typeof d.deprecated === 'string' ? { deprecated: d.deprecated } : {}),
      // 同じ名前の属性が継承で重なることがある。最初のものを残す
      attributes: [...new Map((d.attributes ?? []).map((a) => [a.name, a])).values()].map((a) => ({
        name: a.name,
        type: a.type?.text,
        default: a.default,
        description: a.description,
        values: valuesOf.get(`${d.tagName} ${a.name}`),
      })),
      slots: d.slots ?? [],
      events: d.events ?? [],
      parts: d.cssParts ?? [],
      cssProperties: d.cssProperties ?? [],
      states: d.cssStates ?? [],
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

const titleOf = (md: string, fallback: string): string =>
  /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? fallback

function loadTopics(root: string): Topic[] {
  const skill = readRequired(root, 'skills/jimble-ui/SKILL.md')
  const dir = join(root, 'skills/jimble-ui/references')
  const refs = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => {
          const body = readFileSync(join(dir, f), 'utf8')
          const id = f.replace(/\.md$/, '')
          return { id, title: titleOf(body, id), body }
        })
    : []
  return [{ id: 'skill', title: titleOf(skill, 'jimble-ui の使い方'), body: skill }, ...refs]
}

const THEME_HEADER = /jimble-ui テーマ「([\w-]+)」:\s*([^\n]+)/

function loadThemes(root: string): ThemeInfo[] {
  const dir = join(root, 'dist/themes')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => {
      const m = THEME_HEADER.exec(readFileSync(join(dir, f), 'utf8'))
      return { name: f.replace(/\.css$/, ''), description: m?.[2]?.trim() ?? '' }
    })
}

const TITLE_COMMENT = /^<!--\s*title:\s*(.+?)\s*-->\s*\n/
const FRAME_COMMENT = /^<!--\s*frame:.*?-->\s*\n/

function loadTemplates(root: string): TemplateInfo[] {
  const dir = join(root, 'dist/templates')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf8')
      const name = f.replace(/\.html$/, '')
      const title = TITLE_COMMENT.exec(raw)?.[1] ?? name
      const fragment = raw.replace(TITLE_COMMENT, '').replace(FRAME_COMMENT, '').trim()
      return { name, title, fragment }
    })
}

export function loadPackageData(root: string): PackageData {
  return {
    root,
    version: readJson<{ version: string }>(join(root, 'package.json')).version,
    components: loadComponents(root),
    topics: loadTopics(root),
    themes: loadThemes(root),
    templates: loadTemplates(root),
  }
}
