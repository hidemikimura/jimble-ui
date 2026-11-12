// template: ページのテンプレート（設計書 §18）。既定では、CDN で読み込む、そのまま開ける HTML 文書を出す。
import type { Result } from './commands.ts'
import { PACKAGE_NAME, type PackageData, type TemplateInfo } from './data.ts'
import { CliError, similar } from './errors.ts'

export interface TemplateOptions {
  /** <body> の中身だけを出す（自分のページやフレームワークに貼る） */
  fragment: boolean
  /** 既製のテーマを読み込む <link> を足す */
  theme?: string
}

/** CDN の版の範囲。0.x はマイナーで互換性が壊れることがあるので、マイナーまで固定する */
export const cdnRange = (version: string): string => {
  const [major, minor] = version.split('.')
  return major === '0' ? `${major}.${minor}` : (major ?? version)
}

function findTemplate(pkg: PackageData, name: string): TemplateInfo {
  const found = pkg.templates.find((t) => t.name === name)
  if (found) return found
  throw new CliError(
    'ERR_UNKNOWN_TEMPLATE',
    `${name} というテンプレートはありません`,
    similar(
      name,
      pkg.templates.map((t) => t.name),
    ),
  )
}

function checkTheme(pkg: PackageData, theme: string | undefined): void {
  if (theme === undefined || pkg.themes.some((t) => t.name === theme)) return
  throw new CliError(
    'ERR_UNKNOWN_THEME',
    `${theme} というテーマはありません`,
    similar(
      theme,
      pkg.themes.map((t) => t.name),
    ),
  )
}

/** 題名の、括弧の前（「一覧（検索・…）」→「一覧」） */
const shortTitle = (title: string): string => title.replace(/[（(].*$/, '').trim()

/** テンプレートを、CDN で読み込む HTML 文書にする */
export function toDocument(t: TemplateInfo, version: string, theme?: string): string {
  const base = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${cdnRange(version)}/dist`
  const themeLink = theme
    ? `\n    <link rel="stylesheet" href="${base}/themes/${theme}.css" />`
    : ''
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${shortTitle(t.title)}</title>
    <link rel="stylesheet" href="${base}/cloak.css" />${themeLink}
    <script type="module" src="${base}/cdn/jimble-ui.js"></script>
    <style>
      /* OS の設定に従って、ライトとダークを切り替える（部品も、ブラウザが描く背景も） */
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
${t.fragment.replace(/^/gm, '    ').replace(/^\s+$/gm, '')}
  </body>
</html>
`
}

export function listTemplates(pkg: PackageData): Result {
  return {
    type: 'template.list',
    data: { templates: pkg.templates.map(({ name, title }) => ({ name, title })) },
  }
}

export function showTemplate(pkg: PackageData, name: string, opts: TemplateOptions): Result {
  const t = findTemplate(pkg, name)
  checkTheme(pkg, opts.theme)
  const html = opts.fragment ? t.fragment + '\n' : toDocument(t, pkg.version, opts.theme)
  return {
    type: 'template.detail',
    data: {
      name: t.name,
      title: t.title,
      fragment: opts.fragment,
      theme: opts.theme ?? null,
      html,
    },
  }
}
