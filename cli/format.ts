// 結果を、人が読む文章にする。--json のときは使わない（main.ts が JSON をそのまま出す）。
import type { ComponentDetail, ComponentSummary, Result, SearchHit } from './commands.ts'
import { command } from './commands.ts'
import type { Named, ThemeInfo, Topic } from './data.ts'
import type { InitFile } from './init.ts'

const oneLine = (text = ''): string => text.replace(/\s*\n\s*/g, ' ').trim()

function namedList(title: string, items: readonly Named[], label = (n: Named) => n.name): string[] {
  if (!items.length) return []
  return [
    '',
    `${title}:`,
    ...items.map(
      (i) => `  ${label(i) || '(既定)'}${i.description ? ` — ${oneLine(i.description)}` : ''}`,
    ),
  ]
}

function formatComponent(c: ComponentDetail): string {
  const attrs = c.attributes.map((a) => {
    const kind = a.values
      ? a.values.join(' | ')
      : a.type === 'boolean'
        ? '真偽値（属性の有無）'
        : (a.type ?? '')
    const def = a.default ? `、既定 ${a.default}` : ''
    return `  ${a.name}: ${kind}${def}${a.description ? ` — ${oneLine(a.description)}` : ''}`
  })
  return [
    `<${c.tag}>`,
    '',
    c.description.trim(),
    ...(attrs.length ? ['', '属性:', ...attrs] : []),
    ...namedList('スロット', c.slots),
    ...namedList('イベント', c.events),
    ...namedList('part（::part()）', c.parts),
    ...namedList('CSS 変数', c.cssProperties),
    ...namedList('状態（:state()）', c.states),
    '',
    `詳細と例: ${c.page}`,
  ].join('\n')
}

function formatComponentList(list: readonly ComponentSummary[]): string {
  const width = Math.max(...list.map((c) => c.tag.length))
  return [
    `要素（${list.length} 個）:`,
    ...list.map((c) => `  ${c.tag.padEnd(width)}  ${c.summary}`),
    '',
    `1 つの要素の属性・スロット・イベント: ${command('component <名前>')}`,
  ].join('\n')
}

function formatSearch(d: { query: string; matchCount: number; results: SearchHit[] }): string {
  if (!d.results.length)
    return `「${d.query}」に当てはまるものはありません。${command('component')} で要素の一覧を見られます。`
  return [
    `「${d.query}」の検索結果（${d.results.length} / ${d.matchCount} 件）:`,
    ...d.results.flatMap((r) => [
      '',
      `  [${r.kind}] ${r.name}`,
      `      ${r.summary}`,
      `      → ${r.next}`,
    ]),
  ].join('\n')
}

function formatThemes(themes: readonly (ThemeInfo & { import: string; cdn: string })[]): string {
  const width = Math.max(...themes.map((t) => t.name.length))
  return [
    '既製のテーマ:',
    ...themes.map((t) => `  ${t.name.padEnd(width)}  ${t.description}`),
    '',
    "npm:  import '<下のパス>'",
    ...themes.map((t) => `  ${t.import}`),
    '',
    'ページの一部だけ: テーマの CSS を読み込み、要素に data-jimble-theme="名前" を付ける。',
  ].join('\n')
}

const ACTION: Record<InitFile['action'], string> = {
  created: '作成',
  updated: '更新',
  linked: 'リンク',
  unchanged: '変更なし',
}

export function formatText(result: Result): string {
  const d = result.data as Record<string, unknown>
  switch (result.type) {
    case 'component.list':
      return formatComponentList(d.components as ComponentSummary[])
    case 'component.detail':
      return formatComponent(result.data as ComponentDetail)
    case 'search':
      return formatSearch(result.data as Parameters<typeof formatSearch>[0])
    case 'docs.list':
      return [
        '説明の一覧:',
        ...(d.topics as Pick<Topic, 'id' | 'title'>[]).map(
          (t) => `  ${t.id.padEnd(16)} ${t.title}`,
        ),
        '',
        `本文: ${command('docs <名前>')}`,
      ].join('\n')
    case 'docs.topic':
      return (result.data as Topic).body.trimEnd()
    case 'theme.list':
      return formatThemes(d.themes as Parameters<typeof formatThemes>[0])
    case 'template.list':
      return [
        'ページのテンプレート:',
        ...(d.templates as { name: string; title: string }[]).map(
          (t) => `  ${t.name.padEnd(10)} ${t.title}`,
        ),
        '',
        `HTML（CDN で読み込む文書）: ${command('template <名前> > page.html')}`,
        `本文だけ: --fragment、テーマつき: --theme <名前>`,
      ].join('\n')
    case 'template.detail':
      return (d.html as string).trimEnd()
    case 'init':
      return (d.files as InitFile[]).map((f) => `${ACTION[f.action]}: ${f.path}`).join('\n')
    default:
      return JSON.stringify(result.data, null, 2)
  }
}
