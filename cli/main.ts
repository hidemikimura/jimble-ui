// jimble-ui の CLI（設計書 §17）。人と AI エージェントの両方が、同じコマンドで jimble-ui の使い方を引ける。
// `--json` を付けると、決まった形の JSON（{ apiVersion, type, data, meta }、エラーは { apiVersion, error, code }）を出す。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  command,
  listComponents,
  listThemes,
  listTopics,
  search,
  SEARCH_KINDS,
  showComponent,
  showTopic,
  type Result,
  type SearchKind,
} from './commands.ts'
import { loadPackageData, PACKAGE_NAME, type PackageData } from './data.ts'
import { CliError } from './errors.ts'
import { formatText } from './format.ts'
import { init } from './init.ts'
import { listTemplates, showTemplate } from './template.ts'

/** JSON の形の版。互換性を壊す変更をしたときだけ上げる */
export const API_VERSION = 1
const DEFAULT_LIMIT = 10

export const HELP = `使い方: npx ${PACKAGE_NAME} <コマンド> [引数] [--json]

コマンド:
  component [名前]       要素の一覧。名前を渡すと、属性・スロット・イベント・part・CSS 変数
  search <ことば…>        要素・説明・テーマ・テンプレートをまとめて探す（--kind component|doc|theme|template、--limit 件数）
  docs [名前]            説明（skill）の一覧。名前を渡すと本文
  themes                 既製のテーマの一覧と読み込み方
  template [名前]        ページのテンプレート。名前を渡すと、そのまま開ける HTML（--fragment で本文だけ、--theme <名前>）
  init                   .claude/skills/jimble-ui と AGENTS.md を置く（--link、--no-agents-md）

共通のオプション:
  --json                 機械が読む JSON で出す
  --help, --version
`

export interface RunEnv {
  /** このパッケージの場所 */
  root: string
  /** init が書き込む場所（プロジェクトの直下） */
  cwd: string
  out: (text: string) => void
  err: (text: string) => void
}

interface Options {
  json: boolean
  help: boolean
  version: boolean
  limit?: string
  kind?: string
  link: boolean
  'no-agents-md': boolean
  fragment: boolean
  theme?: string
}

function parse(argv: string[]): { positionals: string[]; values: Options } {
  try {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
        limit: { type: 'string' },
        kind: { type: 'string' },
        link: { type: 'boolean', default: false },
        'no-agents-md': { type: 'boolean', default: false },
        fragment: { type: 'boolean', default: false },
        theme: { type: 'string' },
      },
    })
    return { positionals, values }
  } catch (e) {
    throw new CliError('ERR_INVALID_OPTION', e instanceof Error ? e.message : String(e))
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1)
    throw new CliError('ERR_INVALID_OPTION', `--limit は 1 以上の整数です（${value}）`)
  return n
}

function searchKind(value: string | undefined): SearchKind | undefined {
  if (value === undefined) return undefined
  if ((SEARCH_KINDS as readonly string[]).includes(value)) return value as SearchKind
  throw new CliError(
    'ERR_INVALID_OPTION',
    `--kind は ${SEARCH_KINDS.join(' / ')} のどれかです（${value}）`,
  )
}

function dispatch(
  name: string,
  args: string[],
  opts: Options,
  env: RunEnv,
  data: () => PackageData,
): Result {
  switch (name) {
    case 'component':
      return args[0] ? showComponent(data(), args[0]) : listComponents(data())
    case 'search':
      if (!args.length)
        throw new CliError(
          'ERR_MISSING_ARGUMENT',
          `探すことばを渡してください（${command('search ボタン')}）`,
        )
      return search(data(), args.join(' '), {
        kind: searchKind(opts.kind),
        limit: positiveInt(opts.limit, DEFAULT_LIMIT),
      })
    case 'docs':
      return args[0] ? showTopic(data(), args[0]) : listTopics(data())
    case 'themes':
      return listThemes(data())
    case 'template':
      return args[0]
        ? showTemplate(data(), args[0], { fragment: opts.fragment, theme: opts.theme })
        : listTemplates(data())
    case 'init':
      return init(env.root, env.cwd, { link: opts.link, agentsMd: !opts['no-agents-md'] })
    default:
      throw new CliError(
        'ERR_UNKNOWN_COMMAND',
        `${name} というコマンドはありません。${command('--help')} で一覧を見られます`,
      )
  }
}

function packageVersion(root: string): string {
  try {
    return (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string })
      .version
  } catch {
    return 'unknown'
  }
}

function reportError(e: unknown, json: boolean, env: RunEnv): void {
  const error =
    e instanceof CliError
      ? e
      : new CliError('ERR_UNKNOWN', e instanceof Error ? e.message : String(e))
  if (json) {
    const body = {
      apiVersion: API_VERSION,
      error: error.message,
      code: error.code,
      ...(error.suggestions.length ? { suggestions: error.suggestions } : {}),
    }
    env.out(JSON.stringify(body, null, 2))
    return
  }
  const hint = error.suggestions.length
    ? `\nもしかして: ${error.suggestions.map((s) => s.name).join('、')}`
    : ''
  env.err(`エラー: ${error.message}（${error.code}）${hint}`)
}

/** CLI を実行して、終了コードを返す */
export function run(argv: string[], env: RunEnv): number {
  const json = argv.includes('--json')
  try {
    const { positionals, values } = parse(argv)
    const version = packageVersion(env.root)
    if (values.version) {
      env.out(
        json
          ? JSON.stringify({ apiVersion: API_VERSION, type: 'version', data: { version } })
          : version,
      )
      return 0
    }
    const [name, ...args] = positionals
    if (!name || name === 'help' || values.help) {
      env.out(HELP.trimEnd())
      return 0
    }
    let cache: PackageData | undefined
    const data = () => (cache ??= loadPackageData(env.root))
    const result = dispatch(name, args, values, env, data)
    env.out(
      json
        ? JSON.stringify(
            { apiVersion: API_VERSION, type: result.type, data: result.data, meta: { version } },
            null,
            2,
          )
        : formatText(result),
    )
    return 0
  } catch (e) {
    reportError(e, json, env)
    return 1
  }
}
