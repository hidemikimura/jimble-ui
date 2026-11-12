// init: プロジェクトに、AI エージェント向けの案内を置く（設計書 §17）。
//   .claude/skills/jimble-ui/  … Claude Code の skill（パッケージの skills/jimble-ui の写し、または --link でリンク）
//   AGENTS.md                  … Codex・Cursor など、AGENTS.md を読むエージェント向けの短い案内（印の間だけを書き換える）
// 何度実行しても同じ結果になる。対話はしないので、エージェント・CI からも実行できる。
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import type { Result } from './commands.ts'
import { PACKAGE_NAME } from './data.ts'
import { CliError } from './errors.ts'

export const AGENTS_START = '<!-- jimble-ui:start -->'
export const AGENTS_END = '<!-- jimble-ui:end -->'
const SKILL_DEST = '.claude/skills/jimble-ui'

export const AGENTS_BLOCK = `${AGENTS_START}
<!-- npx ${PACKAGE_NAME} init が書く。この印の間は、次の実行で置き換わる -->

## jimble-ui

画面は jimble-ui（\`jimble-\` で始まる Web Components）で作る。書く前に、使い方を読む。

- 使い方の要約: \`node_modules/${PACKAGE_NAME}/skills/jimble-ui/SKILL.md\`
- 要素の属性・スロット・イベント: \`npx ${PACKAGE_NAME} component <名前>\`（例: \`component button\`）
- 何を使えばよいか分からないとき: \`npx ${PACKAGE_NAME} search <ことば>\`
- 説明の一覧と本文: \`npx ${PACKAGE_NAME} docs\` / \`npx ${PACKAGE_NAME} docs <名前>\`

推測で属性やイベントを作らない。上のコマンドで、あることを確かめてから書く。
${AGENTS_END}
`

export interface InitOptions {
  /** skill を写さず、node_modules の中へのシンボリックリンクにする（npm update で最新になる） */
  link: boolean
  /** AGENTS.md を書く */
  agentsMd: boolean
}

export type FileAction = 'created' | 'updated' | 'linked' | 'unchanged'
export interface InitFile {
  path: string
  action: FileAction
}

function exists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

function installSkill(root: string, cwd: string, link: boolean): InitFile {
  const src = join(root, 'skills/jimble-ui')
  const dest = join(cwd, SKILL_DEST)
  const had = exists(dest)
  if (link) {
    const target = relative(dirname(dest), src)
    // npx の一時的な置き場へのリンクは、すぐ切れる。プロジェクトに入れたパッケージだけを指す
    if (!src.startsWith(join(cwd, 'node_modules') + sep))
      throw new CliError(
        'ERR_INVALID_OPTION',
        `--link は、プロジェクトに ${PACKAGE_NAME} を入れてから使ってください（npm install ${PACKAGE_NAME}）`,
      )
    rmSync(dest, { recursive: true, force: true })
    mkdirSync(dirname(dest), { recursive: true })
    symlinkSync(target, dest, 'dir')
    return { path: SKILL_DEST, action: 'linked' }
  }
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  return { path: SKILL_DEST, action: had ? 'updated' : 'created' }
}

/** AGENTS.md の印の間を置き換える。印が無ければ末尾に足す */
export function mergeAgentsMd(current: string | undefined): string {
  if (current === undefined) return AGENTS_BLOCK
  const start = current.indexOf(AGENTS_START)
  const end = current.indexOf(AGENTS_END)
  if (start >= 0 && end > start)
    return current.slice(0, start) + AGENTS_BLOCK.trimEnd() + current.slice(end + AGENTS_END.length)
  const sepLines = current.endsWith('\n') ? '\n' : '\n\n'
  return current + sepLines + AGENTS_BLOCK
}

function writeAgentsMd(cwd: string): InitFile {
  const path = join(cwd, 'AGENTS.md')
  const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined
  const next = mergeAgentsMd(current)
  if (next === current) return { path: 'AGENTS.md', action: 'unchanged' }
  writeFileSync(path, next)
  return { path: 'AGENTS.md', action: current === undefined ? 'created' : 'updated' }
}

export function init(root: string, cwd: string, opts: InitOptions): Result {
  const files = [installSkill(root, cwd, opts.link)]
  if (opts.agentsMd) files.push(writeAgentsMd(cwd))
  return { type: 'init', data: { files } }
}
