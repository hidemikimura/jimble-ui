/* custom-elements.json は外部の JSON データで型が無いため、この読み取り部分に限って any を許す */
/* eslint-disable @typescript-eslint/no-explicit-any */
// content/**/*.md と examples/**/*.html から静的な HTML ページを生成する（設計書 §10）。
// 生成先は site/ 直下（index.html, guide/*/index.html, components/*/index.html）。git 管理外。
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { createHighlighter, type Highlighter } from 'shiki'
import { all, resolveRef } from '../../scripts/lib/tokens.ts'

const siteRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(siteRoot, '..')
const LANGS = ['html', 'css', 'ts', 'bash', 'json']
// コントラスト比が高いテーマ（WCAG AA を満たすため）
const THEME = 'github-light-high-contrast'
const GENERATED = ['index.html', 'guide', 'components']

interface Page {
  src: string
  out: string // site からの相対パス
  title: string
  section: 'top' | 'guide' | 'components'
  order: number
  description: string
  body: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

let highlighter: Highlighter
const highlight = (code: string, lang: string) =>
  highlighter.codeToHtml(code.replace(/\n$/, ''), {
    lang: LANGS.includes(lang) ? lang : 'text',
    theme: THEME,
  })

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// ---- API 表（custom-elements.json から） -------------------------------------------------
type Manifest = { modules: { declarations?: Record<string, any>[] }[] }
function loadManifest(): Manifest | null {
  const p = resolve(repoRoot, 'custom-elements.json')
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Manifest) : null
}
const code = (s: string) => `<code>${esc(s)}</code>`
const table = (label: string, head: string[], rows: string[][]) =>
  `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(label)}（横スクロール可）"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`,
    )
    .join('')}</tbody></table></div>`

function apiHtml(manifest: Manifest | null, tag: string): string {
  const decl = manifest?.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName === tag)
  if (!decl)
    return `<p class="warn">API 情報がありません（<code>npm run gen:manifest</code> を実行してください）。</p>`
  const out: string[] = []
  const attrs = (decl.attributes ?? []) as Record<string, any>[]
  if (attrs.length)
    out.push(
      '<h3 id="api-attributes">属性 / プロパティ</h3>',
      table(
        '属性の表',
        ['属性', '型', '既定値', '説明'],
        attrs.map((a) => {
          const field = (decl.members ?? []).find((m: any) => m.name === a.fieldName)
          const prop =
            a.fieldName && a.fieldName !== a.name
              ? ` <small>(プロパティ: ${code(a.fieldName)})</small>`
              : ''
          return [
            code(a.name) + prop,
            code(a.type?.text ?? field?.type?.text ?? 'string'),
            a.default ? code(a.default) : '—',
            esc(a.description ?? ''),
          ]
        }),
      ),
    )
  const slots = (decl.slots ?? []) as Record<string, any>[]
  if (slots.length)
    out.push(
      '<h3 id="api-slots">スロット</h3>',
      table(
        'スロットの表',
        ['名前', '説明'],
        slots.map((s) => [code(s.name || '(既定)'), esc(s.description ?? '')]),
      ),
    )
  const events = (decl.events ?? []) as Record<string, any>[]
  if (events.length)
    out.push(
      '<h3 id="api-events">イベント</h3>',
      table(
        'イベントの表',
        ['名前', '説明'],
        events.map((e) => [code(e.name), esc(e.description ?? '')]),
      ),
    )
  const methods = ((decl.members ?? []) as Record<string, any>[]).filter(
    (m) =>
      m.kind === 'method' &&
      !m.static &&
      !m.name.startsWith('#') &&
      m.privacy !== 'private' &&
      !/Callback$/.test(m.name),
  )
  if (methods.length)
    out.push(
      '<h3 id="api-methods">メソッド</h3>',
      table(
        'メソッドの表',
        ['名前', '説明'],
        methods.map((m) => [code(`${m.name}()`), esc(m.description ?? '')]),
      ),
    )
  const parts = (decl.cssParts ?? []) as Record<string, any>[]
  if (parts.length)
    out.push(
      '<h3 id="api-parts">CSS パーツ（::part）</h3>',
      table(
        'CSS パーツの表',
        ['名前', '説明'],
        parts.map((p) => [code(p.name), esc(p.description ?? '')]),
      ),
    )
  const props = (decl.cssProperties ?? []) as Record<string, any>[]
  if (props.length)
    out.push(
      '<h3 id="api-cssprops">CSS 変数</h3>',
      table(
        'CSS 変数の表',
        ['名前', '既定値', '説明'],
        props.map((p) => [
          code(p.name),
          p.default ? code(p.default) : '—',
          esc(p.description ?? ''),
        ]),
      ),
    )
  return out.join('\n')
}

// ---- トークン表 --------------------------------------------------------------------------
function tokensHtml(): string {
  const scaleRe = /^color-(primary|neutral|success|warning|danger|info)-(\d+)$/
  const scales = new Map<string, string[]>()
  const rest: string[][] = []
  for (const t of all) {
    const m = scaleRe.exec(t.name)
    if (m) scales.set(m[1]!, [...(scales.get(m[1]!) ?? []), m[2]!])
    else rest.push([code(`--jimble-${t.name}`), code(resolveRef(t.value))])
  }
  const scaleRows = [...scales].map(([n, steps]) => [
    code(`--jimble-color-${n}-{step}`),
    esc(steps.join(', ')),
  ])
  return (
    '<h3 id="tokens-scales">カラースケール</h3>' +
    table('カラースケールの表', ['トークン', '段階 {step}'], scaleRows) +
    '<h3 id="tokens-others">その他のトークン</h3>' +
    table('その他のトークンの表', ['トークン', '既定値'], rest)
  )
}

// ---- 例 ----------------------------------------------------------------------------------
function exampleHtml(id: string): string {
  const file = resolve(siteRoot, 'examples', `${id}.html`)
  if (!existsSync(file)) throw new Error(`例が見つかりません: examples/${id}.html`)
  const raw = readFileSync(file, 'utf8')
  const m = /^<!--\s*title:\s*(.+?)\s*-->\s*\n/.exec(raw)
  const title = m?.[1] ?? id
  const source = raw.slice(m?.[0].length ?? 0).trim()
  return (
    `<docs-example heading="${esc(title)}" source="${esc(source)}">` +
    `<div slot="preview">\n${source}\n</div>` +
    `<div slot="source">${highlight(source, 'html')}</div>` +
    `</docs-example>`
  )
}

// ---- ページ ------------------------------------------------------------------------------
function loadPages(): Page[] {
  const dir = resolve(siteRoot, 'content')
  return walk(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const rel = relative(dir, f).replace(/\\/g, '/')
      const { data, content } = matter(readFileSync(f, 'utf8'))
      const isTop = rel === 'index.md'
      return {
        src: rel,
        out: isTop ? 'index.html' : `${rel.replace(/\.md$/, '')}/index.html`,
        title: String(data.title ?? rel),
        section: isTop ? 'top' : rel.startsWith('components/') ? 'components' : 'guide',
        order: Number(data.order ?? 100),
        description: String(data.description ?? ''),
        body: content,
      } satisfies Page
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ja'))
}

function render(page: Page, pages: Page[], md: MarkdownIt, manifest: Manifest | null): string {
  const here = dirname(page.out)
  const href = (out: string) => {
    const r = relative(here, dirname(out)) || '.'
    return (r === '.' ? './' : `${r}/`).replace(/^(?!\.)/, './')
  }
  const source = page.body.replace(
    /^::(example|api|tokens)(?:[ \t]+(\S+))?[ \t]*$/gm,
    (_, kind: string, arg?: string) =>
      `\n<div data-directive="${kind}" data-arg="${arg ?? ''}"></div>\n`,
  )
  const body = md
    .render(source)
    .replace(
      /<div data-directive="(example|api|tokens)" data-arg="([^"]*)"><\/div>/g,
      (_, kind: string, arg: string) =>
        kind === 'example'
          ? exampleHtml(arg)
          : kind === 'api'
            ? apiHtml(manifest, arg)
            : tokensHtml(),
    )
  const nav = (section: Page['section'], label: string) =>
    `<p class="nav-heading">${label}</p><ul>${pages
      .filter((p) => p.section === section)
      .map(
        (p) =>
          `<li><a href="${href(p.out)}"${p.out === page.out ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`,
      )
      .join('')}</ul>`
  const home = href('index.html')
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}${page.section === 'top' ? '' : ' - jimble-ui'}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}">` : ''}
<script type="module" src="/src/main.ts"></script>
</head>
<body>
<a class="skip" href="#main">本文へ移動</a>
<header class="site-header">
  <a class="brand" href="${home}">jimble-ui</a>
  <a class="gh" href="https://github.com/hidemikimura/jimble-ui">GitHub</a>
</header>
<div class="layout">
  <details class="nav-toggle" open>
    <summary>メニュー</summary>
    <nav aria-label="ドキュメント">${nav('guide', 'ガイド')}${nav('components', 'コンポーネント')}</nav>
  </details>
  <main id="main">
    <h1>${esc(page.title)}</h1>
    ${body}
  </main>
</div>
</body>
</html>
`
}

/** すべてのページを生成して、生成した HTML の絶対パス一覧を返す */
export async function generatePages(): Promise<string[]> {
  highlighter ??= await createHighlighter({ themes: [THEME], langs: LANGS })
  const md = new MarkdownIt({ html: true, highlight: (c, l) => highlight(c, l) })
  const pages = loadPages()
  const manifest = loadManifest()
  for (const g of GENERATED) rmSync(resolve(siteRoot, g), { recursive: true, force: true })
  return pages.map((p) => {
    const out = resolve(siteRoot, p.out)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, render(p, pages, md, manifest))
    return out
  })
}
