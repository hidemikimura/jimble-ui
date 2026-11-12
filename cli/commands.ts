// 読み取りのコマンド（component・search・docs・themes）。結果は { type, data } で返し、表示は format.ts が行う。
import { FORM, firstSentence, pageName, pageUrl } from './catalog.ts'
import { PACKAGE_NAME, type Component, type PackageData } from './data.ts'
import { CliError, similar } from './errors.ts'
import { cdnRange } from './template.ts'

export interface Result {
  /** JSON の `type`（`component.list` など）。出力の形を表す */
  type: string
  data: unknown
}

/** 結果に添える、次に実行するコマンド */
export const command = (args: string): string => `npx ${PACKAGE_NAME} ${args}`

const shortName = (tag: string): string => tag.replace(/^jimble-/, '')

// ---- component ----

export interface ComponentSummary {
  tag: string
  summary: string
  page: string
}

export function listComponents(pkg: PackageData): Result {
  const components: ComponentSummary[] = pkg.components.map((c) => ({
    tag: c.tag,
    summary: firstSentence(c.description),
    page: pageUrl(shortName(c.tag)),
  }))
  return { type: 'component.list', data: { components } }
}

export interface DosAdvice {
  /** こうする */
  do: string[]
  /** 避ける */
  dont: string[]
}
export type ComponentDetail = Component & { page: string; dos: DosAdvice | null }

/** references/dos.md から、ページ（`## 題名（\`jimble-名前\`）`）の Do / Don't を取り出す（設計書 §20） */
export function dosFor(pkg: PackageData, page: string): DosAdvice | null {
  const body = pkg.topics.find((t) => t.id === 'dos')?.body
  if (!body) return null
  const start = body.search(new RegExp(`^## .*\`jimble-${page}\``, 'm'))
  if (start < 0) return null
  const rest = body.slice(start)
  const next = rest.slice(3).search(/^## /m)
  const section = next < 0 ? rest : rest.slice(0, next + 3)
  const list = (label: string) =>
    [...(section.split(label)[1]?.split(/^\*\*/m)[0] ?? '').matchAll(/^- (.+)$/gm)].map(
      (m) => m[1]!,
    )
  return { do: list('**Do**'), dont: list("**Don't**") }
}

export function findComponent(pkg: PackageData, name: string): Component {
  const tag = name.startsWith('jimble-') ? name : `jimble-${name}`
  const found = pkg.components.find((c) => c.tag === tag.toLowerCase())
  if (found) return found
  throw new CliError(
    'ERR_UNKNOWN_COMPONENT',
    `${tag} という要素はありません`,
    similar(
      shortName(tag),
      pkg.components.map((c) => shortName(c.tag)),
    ).map((s) => ({
      ...s,
      name: `jimble-${s.name}`,
    })),
  )
}

export function showComponent(pkg: PackageData, name: string): Result {
  const c = findComponent(pkg, name)
  const short = shortName(c.tag)
  // フォーム部品は、ネイティブと同じ input / change も出す（JSDoc の @fires には書いていない）
  const native = [
    { name: 'input', description: '値が変わるたび（ネイティブと同じ）' },
    { name: 'change', description: '値が確定したとき（ネイティブと同じ）' },
  ].filter((n) => !c.events.some((e) => e.name === n.name))
  const events = FORM.has(short) ? [...c.events, ...native] : c.events
  const detail: ComponentDetail = {
    ...c,
    events,
    page: pageUrl(short),
    dos: dosFor(pkg, pageName(short)),
  }
  return { type: 'component.detail', data: detail }
}

// ---- docs ----

export function listTopics(pkg: PackageData): Result {
  return {
    type: 'docs.list',
    data: { topics: pkg.topics.map(({ id, title }) => ({ id, title })) },
  }
}

export function showTopic(pkg: PackageData, id: string): Result {
  const topic = pkg.topics.find((t) => t.id === id)
  if (!topic)
    throw new CliError(
      'ERR_UNKNOWN_TOPIC',
      `${id} という説明はありません`,
      similar(
        id,
        pkg.topics.map((t) => t.id),
      ),
    )
  return { type: 'docs.topic', data: topic }
}

// ---- themes ----

export function listThemes(pkg: PackageData): Result {
  return {
    type: 'theme.list',
    data: {
      themes: pkg.themes.map((t) => ({
        ...t,
        import: `${PACKAGE_NAME}/themes/${t.name}.css`,
        cdn: `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${cdnRange(pkg.version)}/dist/themes/${t.name}.css`,
      })),
    },
  }
}

// ---- search ----

export type SearchKind = 'component' | 'doc' | 'theme' | 'template'
export const SEARCH_KINDS: readonly SearchKind[] = ['component', 'doc', 'theme', 'template']

export interface SearchHit {
  kind: SearchKind
  name: string
  summary: string
  /** 詳しく読むためのコマンド */
  next: string
  score: number
}

interface Candidate {
  kind: SearchKind
  name: string
  summary: string
  next: string
  /** [照合する文字列, 一致したときの点] 。名前ほど点が高い */
  fields: [string, number][]
}

function componentCandidates(c: Component): Candidate {
  const names = [...c.attributes, ...c.events, ...c.slots, ...c.parts].map((x) => x.name)
  return {
    kind: 'component',
    name: c.tag,
    summary: firstSentence(c.description),
    next: command(`component ${shortName(c.tag)}`),
    fields: [
      [c.tag, 60],
      [firstSentence(c.description), 45],
      [names.join(' '), 25],
      [c.description, 15],
    ],
  }
}

/** 説明の本文を見出し（#〜###）ごとに分ける */
function sections(body: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = []
  for (const part of body.split(/^(?=#{1,3}\s)/m)) {
    const m = /^#{1,3}\s+(.+)$/m.exec(part)
    if (m) out.push({ heading: m[1]!.trim(), text: part })
  }
  return out
}

function candidates(pkg: PackageData): Candidate[] {
  const docs = pkg.topics.flatMap((t) =>
    sections(t.body).map((s): Candidate => ({
      kind: 'doc',
      name: `${t.id} › ${s.heading}`,
      summary: t.title,
      next: command(`docs ${t.id}`),
      fields: [
        [s.heading, 40],
        [s.text, 5],
      ],
    })),
  )
  const themes = pkg.themes.map((t): Candidate => ({
    kind: 'theme',
    name: t.name,
    summary: t.description,
    next: command('themes'),
    fields: [
      [`${t.name} テーマ theme`, 50],
      [t.description, 15],
    ],
  }))
  const templates = pkg.templates.map((t): Candidate => ({
    kind: 'template',
    name: t.name,
    summary: t.title,
    next: command(`template ${t.name}`),
    fields: [
      [`${t.name} テンプレート template ページ`, 50],
      [t.title, 45],
    ],
  }))
  return [...pkg.components.map(componentCandidates), ...docs, ...themes, ...templates]
}

/** 語ごとに、最も点の高い欄の点を足す。どれかの語がどの欄にも無ければ対象外（AND 検索） */
function score(c: Candidate, terms: string[]): number {
  let total = 0
  for (const term of terms) {
    const best = Math.max(
      0,
      ...c.fields.map(([text, pts]) => (text.toLowerCase().includes(term) ? pts : 0)),
    )
    if (!best) return 0
    total += best
  }
  // 名前と完全に一致するものを先頭に
  const exact = terms.join(' ')
  if (c.name.toLowerCase() === exact || shortName(c.name).toLowerCase() === exact) total += 100
  return total
}

export function search(
  pkg: PackageData,
  query: string,
  opts: { kind?: SearchKind; limit: number },
): Result {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hits: SearchHit[] = candidates(pkg)
    .filter((c) => !opts.kind || c.kind === opts.kind)
    .map((c) => ({
      kind: c.kind,
      name: c.name,
      summary: c.summary,
      next: c.next,
      score: score(c, terms),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return {
    type: 'search',
    data: { query, matchCount: hits.length, results: hits.slice(0, opts.limit) },
  }
}
