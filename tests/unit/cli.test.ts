// CLI（設計書 §17）。配布物と同じ並びの仮のパッケージを一時ディレクトリに作り、コマンドの出力と JSON の形を確かめる。
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findPackageRoot, PACKAGE_NAME } from '../../cli/data.ts'
import { CliError, ERROR_CODES, similar } from '../../cli/errors.ts'
import { AGENTS_BLOCK, AGENTS_END, AGENTS_START, mergeAgentsMd } from '../../cli/init.ts'
import { cdnRange } from '../../cli/template.ts'
import { run } from '../../cli/main.ts'
import { loadElements, vscodeData } from '../../scripts/lib/manifest.ts'
import { themes } from '../../scripts/lib/tokens.ts'

const repo = resolve(import.meta.dirname, '../..')
let work: string
/** 仮のプロジェクト（init の書き込み先） */
let project: string
/** 仮のパッケージ（project/node_modules/@hidemikimura/jimble-ui） */
let root: string

/** 配布物と同じ並びで、仮のパッケージを作る */
function makePackage(dir: string): void {
  mkdirSync(join(dir, 'dist/themes'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: '9.9.9' }))
  cpSync(join(repo, 'custom-elements.json'), join(dir, 'custom-elements.json'))
  cpSync(join(repo, 'skills'), join(dir, 'skills'), { recursive: true })
  writeFileSync(join(dir, 'dist/vscode.html-data.json'), JSON.stringify(vscodeData()))
  for (const t of themes)
    cpSync(
      join(repo, `tokens/themes/${t.name}.generated.css`),
      join(dir, `dist/themes/${t.name}.css`),
    )
  cpSync(join(repo, 'site/examples/templates'), join(dir, 'dist/templates'), { recursive: true })
}

beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'jimble-cli-'))
  project = join(work, 'project')
  root = join(project, 'node_modules', PACKAGE_NAME)
  makePackage(root)
})
afterAll(() => rmSync(work, { recursive: true, force: true }))

/** CLI を実行して、終了コードと出力を返す */
function cli(...argv: string[]) {
  let out = ''
  let err = ''
  const code = run(argv, {
    root,
    cwd: project,
    out: (t) => (out += t + '\n'),
    err: (t) => (err += t + '\n'),
  })
  return { code, out, err }
}
/** --json を付けて実行し、JSON を読む */
function cliJson<T = Record<string, unknown>>(...argv: string[]) {
  const r = cli(...argv, '--json')
  return { code: r.code, json: JSON.parse(r.out) as T }
}

interface Envelope<D> {
  apiVersion: number
  type: string
  data: D
  meta: { version: string }
}
interface ErrorEnvelope {
  apiVersion: number
  error: string
  code: string
  suggestions?: { name: string; reason: string }[]
}

describe('component', () => {
  it('一覧は、custom-elements.json のすべての要素を、ページの URL つきで出す', () => {
    const { code, json } =
      cliJson<Envelope<{ components: { tag: string; page: string }[] }>>('component')
    expect(code).toBe(0)
    expect(json).toMatchObject({
      apiVersion: 1,
      type: 'component.list',
      meta: { version: '9.9.9' },
    })
    expect(json.data.components.map((c) => c.tag).sort()).toEqual(
      loadElements()
        .map((e) => e.tagName)
        .sort(),
    )
    const option = json.data.components.find((c) => c.tag === 'jimble-option')!
    expect(option.page).toBe('https://hidemikimura.github.io/jimble-ui/components/select/')
  })

  it('1 つの要素の属性には、型の別名を解決した候補値が付く', () => {
    const { json } = cliJson<
      Envelope<{ tag: string; attributes: { name: string; values?: string[] }[] }>
    >('component', 'button')
    expect(json.type).toBe('component.detail')
    expect(json.data.tag).toBe('jimble-button')
    const variant = json.data.attributes.find((a) => a.name === 'variant')!
    expect(variant.values).toEqual(['primary', 'secondary', 'danger', 'ghost'])
  })

  it("ページの Do / Don't が付く（子の要素は、親のページのもの）", () => {
    type D = Envelope<{ dos: { do: string[]; dont: string[] } | null }>
    const button = cliJson<D>('component', 'button').json.data.dos!
    expect(button.do.length).toBeGreaterThan(0)
    expect(button.dont.length).toBeGreaterThan(0)
    expect(button.do.join()).toContain('primary')
    const option = cliJson<D>('component', 'option').json.data.dos!
    expect(option).toEqual(cliJson<D>('component', 'select').json.data.dos)
    const text = cli('component', 'button').out
    expect(text).toContain('Do（こうする）:')
    expect(text).toContain("Don't（避ける）:")
  })

  it('公開段階（設計書 §24）が、一覧と詳細に出る。安定には印を付けない', () => {
    type L = Envelope<{ components: { tag: string; status: string }[] }>
    const list = cliJson<L>('component').json.data.components
    const status = (tag: string) => list.find((c) => c.tag === tag)?.status
    expect(status('jimble-popover')).toBe('experimental')
    expect(status('jimble-button')).toBe('stable')
    const detail = cliJson<Envelope<{ status: string }>>('component', 'tree').json.data
    expect(detail.status).toBe('experimental')
    expect(cli('component', 'tree').out).toContain('公開段階: 試験的')
    expect(cli('component', 'button').out).not.toContain('公開段階')
    const text = cli('component').out
    expect(text).toMatch(/jimble-popover\s+［試験的］/)
    expect(text).not.toMatch(/jimble-button\s+［/)
  })

  it('エディターの補完の説明にも、試験的であることが出る', () => {
    const tags = vscodeData().tags
    expect(tags.find((t) => t.name === 'jimble-popover')!.description).toMatch(/^【試験的】/)
    expect(tags.find((t) => t.name === 'jimble-button')!.description).not.toMatch(/^【/)
  })

  it('jimble- を付けた名前でも引ける', () => {
    expect(cliJson('component', 'jimble-card').code).toBe(0)
  })

  it('フォーム部品には、ネイティブと同じ input / change のイベントも載る', () => {
    const { json } = cliJson<Envelope<{ events: { name: string }[] }>>('component', 'input')
    expect(json.data.events.map((e) => e.name)).toEqual(expect.arrayContaining(['input', 'change']))
  })

  it('文章の出力に、属性・スロット・ページの URL がある', () => {
    const { out } = cli('component', 'button')
    expect(out).toContain('<jimble-button>')
    expect(out).toContain('variant: primary | secondary | danger | ghost')
    expect(out).toContain('prefix')
    expect(out).toContain('/components/button/')
  })

  it('無い要素は ERR_UNKNOWN_COMPONENT で、近い名前を候補に出す', () => {
    const { code, json } = cliJson<ErrorEnvelope>('component', 'buton')
    expect(code).toBe(1)
    expect(json).toMatchObject({ apiVersion: 1, code: 'ERR_UNKNOWN_COMPONENT' })
    expect(json.suggestions?.[0]?.name).toBe('jimble-button')
    const text = cli('component', 'buton')
    expect(text.err).toContain('もしかして: jimble-button')
  })
})

describe('search', () => {
  it('日本語のことばで、要素を見つける', () => {
    const { json } = cliJson<Envelope<{ results: { kind: string; name: string; next: string }[] }>>(
      'search',
      'ボタン',
    )
    expect(json.data.results[0]).toMatchObject({
      kind: 'component',
      name: 'jimble-button',
      next: `npx ${PACKAGE_NAME} component button`,
    })
  })

  it('説明の見出しも探し、docs のコマンドを案内する', () => {
    const { json } = cliJson<Envelope<{ results: { kind: string; next: string }[] }>>(
      'search',
      'ダイアログ',
      '--kind',
      'doc',
    )
    expect(json.data.results.length).toBeGreaterThan(0)
    expect(json.data.results.every((r) => r.kind === 'doc')).toBe(true)
    expect(json.data.results[0]!.next).toMatch(/ docs [\w-]+$/)
  })

  it('テーマも探せる', () => {
    const { json } = cliJson<Envelope<{ results: { kind: string; name: string }[] }>>(
      'search',
      'ocean',
    )
    expect(json.data.results[0]).toMatchObject({ kind: 'theme', name: 'ocean' })
  })

  it('語は AND で絞り込む。--limit で件数を抑え、合計の件数は matchCount に出す', () => {
    const { json } = cliJson<Envelope<{ matchCount: number; results: unknown[] }>>(
      'search',
      'ボタン',
      '--limit',
      '2',
    )
    expect(json.data.results).toHaveLength(2)
    expect(json.data.matchCount).toBeGreaterThan(2)
    const none = cliJson<Envelope<{ matchCount: number }>>(
      'search',
      'ボタン',
      'ぜったいにないことば',
    )
    expect(none.json.data.matchCount).toBe(0)
  })

  it('ことばが無い・オプションの値が誤りのときは、決まったコードのエラー', () => {
    expect(cliJson<ErrorEnvelope>('search').json.code).toBe('ERR_MISSING_ARGUMENT')
    expect(cliJson<ErrorEnvelope>('search', 'a', '--limit', '0').json.code).toBe(
      'ERR_INVALID_OPTION',
    )
    expect(cliJson<ErrorEnvelope>('search', 'a', '--kind', 'hook').json.code).toBe(
      'ERR_INVALID_OPTION',
    )
  })
})

describe('docs と themes', () => {
  it('docs の一覧は、SKILL.md（skill）と references の全ファイル', () => {
    const { json } = cliJson<Envelope<{ topics: { id: string }[] }>>('docs')
    const refs = [
      'display',
      'dos',
      'form-validation',
      'inputs',
      'layout-theme',
      'overlays',
      'router',
      'testing',
    ]
    expect(json.data.topics.map((t) => t.id)).toEqual(['skill', ...refs])
  })

  it('docs <名前> は本文をそのまま出す', () => {
    const { out } = cli('docs', 'layout-theme')
    expect(out).toBe(
      readFileSync(join(root, 'skills/jimble-ui/references/layout-theme.md'), 'utf8').trimEnd() +
        '\n',
    )
  })

  it('無い説明は ERR_UNKNOWN_TOPIC で、近い名前を候補に出す', () => {
    const { json } = cliJson<ErrorEnvelope>('docs', 'overlay')
    expect(json.code).toBe('ERR_UNKNOWN_TOPIC')
    expect(json.suggestions?.[0]?.name).toBe('overlays')
  })

  it('themes は、配布しているテーマを、読み込み方つきで出す', () => {
    const { json } =
      cliJson<Envelope<{ themes: { name: string; import: string; cdn: string }[] }>>('themes')
    expect(json.data.themes.map((t) => t.name)).toEqual(themes.map((t) => t.name))
    expect(json.data.themes[0]).toMatchObject({
      import: `${PACKAGE_NAME}/themes/forest.css`,
      cdn: expect.stringContaining('@9/dist/themes/forest.css'),
      description: expect.stringContaining('緑'),
    })
  })
})

describe('template', () => {
  const NAMES = readdirSync(join(repo, 'site/examples/templates'))
    .map((f) => f.replace(/\.html$/, ''))
    .sort()

  it('一覧は、site/examples/templates のすべてを、題名つきで出す', () => {
    const { json } = cliJson<Envelope<{ templates: { name: string; title: string }[] }>>('template')
    expect(json.type).toBe('template.list')
    expect(json.data.templates.map((t) => t.name)).toEqual(NAMES)
    expect(json.data.templates.find((t) => t.name === 'list')!.title).toMatch(/^一覧/)
  })

  it('既定では、CDN で読み込む、そのまま開ける HTML 文書を出す（版の範囲を固定）', () => {
    const { out } = cli('template', 'list')
    expect(out).toMatch(/^<!doctype html>\n<html lang="ja">/)
    expect(out).toContain('<title>一覧</title>')
    expect(out).toContain(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@9/dist/cdn/jimble-ui.js"></script>`,
    )
    expect(out).toContain('/dist/cloak.css')
    expect(out).toContain('<jimble-app-shell')
    expect(out).not.toContain('<!-- title:')
    expect(out).not.toContain('<!-- frame:')
    expect(out).not.toContain('/themes/')
  })

  it('--theme でテーマの <link> を足し、--fragment で本文だけを出す', () => {
    expect(cli('template', 'login', '--theme', 'ocean').out).toContain(
      `@9/dist/themes/ocean.css" />`,
    )
    const frag = cli('template', 'login', '--fragment').out
    expect(frag.startsWith('<main')).toBe(true)
    expect(frag).not.toContain('<!doctype')
  })

  it('無いテンプレート・テーマは、決まったコードと候補', () => {
    const t = cliJson<ErrorEnvelope>('template', 'logn')
    expect(t.json).toMatchObject({ code: 'ERR_UNKNOWN_TEMPLATE', suggestions: [{ name: 'login' }] })
    const th = cliJson<ErrorEnvelope>('template', 'list', '--theme', 'oceam')
    expect(th.json).toMatchObject({ code: 'ERR_UNKNOWN_THEME', suggestions: [{ name: 'ocean' }] })
  })

  it('search でテンプレートも見つかる', () => {
    const { json } = cliJson<Envelope<{ results: { kind: string; name: string; next: string }[] }>>(
      'search',
      'ログイン',
    )
    expect(json.data.results[0]).toMatchObject({
      kind: 'template',
      name: 'login',
      next: `npx ${PACKAGE_NAME} template login`,
    })
  })

  it('CDN の版の範囲は、0.x ならマイナーまで、1 以上ならメジャーだけ', () => {
    expect(cdnRange('0.18.2')).toBe('0.18')
    expect(cdnRange('1.4.0')).toBe('1')
  })
})

describe('共通', () => {
  it('知らないコマンド・オプションは、決まったコードのエラー（終了コード 1）', () => {
    expect(cliJson<ErrorEnvelope>('compnent')).toMatchObject({
      code: 1,
      json: { code: 'ERR_UNKNOWN_COMMAND' },
    })
    expect(cliJson<ErrorEnvelope>('component', '--nope').json.code).toBe('ERR_INVALID_OPTION')
    expect(cli('compnent').err).toContain('ERR_UNKNOWN_COMMAND')
  })

  it('--help とコマンドなしは使い方を、--version は版を出す', () => {
    expect(cli().out).toContain('使い方:')
    expect(cli('--help').out).toContain('search <ことば…>')
    expect(cli('--version').out.trim()).toBe('9.9.9')
    expect(cliJson('--version').json).toMatchObject({ type: 'version', data: { version: '9.9.9' } })
  })

  it('資料が欠けたパッケージでは ERR_DATA_NOT_FOUND', () => {
    const broken = join(work, 'broken')
    mkdirSync(broken, { recursive: true })
    writeFileSync(
      join(broken, 'package.json'),
      JSON.stringify({ name: PACKAGE_NAME, version: '1.0.0' }),
    )
    let out = ''
    const code = run(['component', '--json'], {
      root: broken,
      cwd: broken,
      out: (t) => (out += t),
      err: () => {},
    })
    expect(code).toBe(1)
    expect((JSON.parse(out) as ErrorEnvelope).code).toBe('ERR_DATA_NOT_FOUND')
  })

  it('パッケージの場所は、入口のファイルから上に向かって探す', () => {
    mkdirSync(join(root, 'dist/cli'), { recursive: true })
    expect(findPackageRoot(join(root, 'dist/cli'))).toBe(root)
    expect(() => findPackageRoot(work)).toThrow(CliError)
  })

  it('ガイドの code の表は、すべてのエラーコードを載せている（増やしたら書き足す）', () => {
    const guide = readFileSync(join(repo, 'site/content/guide/ai.md'), 'utf8')
    const listed = [...guide.matchAll(/^\| `(ERR_\w+)`/gm)].map((m) => m[1])
    expect(listed).toEqual(Object.keys(ERROR_CODES))
  })

  it('打ち間違いの候補は、遠すぎる名前を出さない', () => {
    expect(similar('zzzzzz', ['button', 'card'])).toEqual([])
  })
})

describe('init', () => {
  const agents = () => join(project, 'AGENTS.md')
  const skill = () => join(project, '.claude/skills/jimble-ui')

  it('skill を写し、AGENTS.md を作る。もう一度実行すると、skill は更新、AGENTS.md は変更なし', () => {
    rmSync(skill(), { recursive: true, force: true })
    rmSync(agents(), { force: true })
    const first = cliJson<Envelope<{ files: { path: string; action: string }[] }>>('init')
    expect(first.json.data.files).toEqual([
      { path: '.claude/skills/jimble-ui', action: 'created' },
      { path: 'AGENTS.md', action: 'created' },
    ])
    expect(existsSync(join(skill(), 'SKILL.md'))).toBe(true)
    expect(existsSync(join(skill(), 'references/overlays.md'))).toBe(true)
    expect(readFileSync(agents(), 'utf8')).toBe(AGENTS_BLOCK)

    const second = cliJson<Envelope<{ files: { action: string }[] }>>('init')
    expect(second.json.data.files.map((f) => f.action)).toEqual(['updated', 'unchanged'])
  })

  it('--no-agents-md なら AGENTS.md に触れない', () => {
    rmSync(agents(), { force: true })
    const { json } = cliJson<Envelope<{ files: { path: string }[] }>>('init', '--no-agents-md')
    expect(json.data.files.map((f) => f.path)).toEqual(['.claude/skills/jimble-ui'])
    expect(existsSync(agents())).toBe(false)
  })

  it('--link は、node_modules の中の skill へのシンボリックリンクにする', () => {
    const { json } = cliJson<Envelope<{ files: { action: string }[] }>>(
      'init',
      '--link',
      '--no-agents-md',
    )
    expect(json.data.files[0]!.action).toBe('linked')
    expect(lstatSync(skill()).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(skill(), 'SKILL.md'), 'utf8')).toBe(
      readFileSync(join(root, 'skills/jimble-ui/SKILL.md'), 'utf8'),
    )
  })

  it('--link は、プロジェクトの外（npx の一時的な置き場）にあるパッケージでは断る', () => {
    const outside = join(work, 'outside')
    makePackage(outside)
    let out = ''
    const code = run(['init', '--link', '--json'], {
      root: outside,
      cwd: project,
      out: (t) => (out += t),
      err: () => {},
    })
    expect(code).toBe(1)
    expect((JSON.parse(out) as ErrorEnvelope).code).toBe('ERR_INVALID_OPTION')
  })
})

describe('AGENTS.md の書き換え', () => {
  it('ほかの内容は残し、末尾に足す', () => {
    const merged = mergeAgentsMd('# プロジェクトの決まり\n\n- テストを書く\n')
    expect(merged).toBe('# プロジェクトの決まり\n\n- テストを書く\n\n' + AGENTS_BLOCK)
  })

  it('印の間だけを置き換える（前後は残す）', () => {
    const old = `# 前\n\n${AGENTS_START}\n古い案内\n${AGENTS_END}\n\n# 後\n`
    const merged = mergeAgentsMd(old)
    expect(merged).toBe(`# 前\n\n${AGENTS_BLOCK.trimEnd()}\n\n# 後\n`)
    expect(mergeAgentsMd(merged)).toBe(merged)
  })
})
