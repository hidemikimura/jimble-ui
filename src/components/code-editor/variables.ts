// jimble-code-editor の変数（`{{name}}` など）の書式。CodeMirror に依存しない純粋な関数だけを置く
import { matches } from '../../base/text-match.js'

/** 挿入・補完できる変数 */
export interface CodeEditorVariable {
  /** 文書に書く名前（英数字・`_`・`.`・`-`） */
  name: string
  /** チップと候補に出す名前（省略すると `name`） */
  label?: string
  /** 候補に添える説明 */
  description?: string
}

/** 文書の中の変数の位置 */
export interface VariableMatch {
  from: number
  to: number
  name: string
}

const NAME = '[A-Za-z0-9_.-]+'
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function variableToken(name: string, prefix: string, suffix: string): string {
  return `${prefix}${name}${suffix}`
}

/** 変数を探す正規表現（区切りの内側の空白は許す）。`g` 付きなので、使うたびに作る */
export function variableRegExp(prefix: string, suffix: string): RegExp {
  return new RegExp(`${escape(prefix)}\\s*(${NAME})\\s*${escape(suffix)}`, 'g')
}

export function findVariables(text: string, prefix: string, suffix: string): VariableMatch[] {
  return [...text.matchAll(variableRegExp(prefix, suffix))].map((m) => ({
    from: m.index,
    to: m.index + m[0].length,
    name: m[1]!,
  }))
}

/**
 * カーソルの前の文字（`before`）が、閉じていない変数の入力中なら、開きの区切りの位置と、入力中の文字を返す。
 * 入力中の文字は、ラベル（日本語）で探せるように、空白と閉じの区切り以外なら何でもよい
 */
export function variableQuery(
  before: string,
  prefix: string,
  suffix: string,
): { from: number; query: string } | null {
  const from = before.lastIndexOf(prefix)
  if (from < 0) return null
  const query = before.slice(from + prefix.length)
  if (/\s/.test(query) || query.includes(suffix)) return null
  return { from, query }
}

/** 名前・ラベルのどちらかに、入力中の文字を含む変数（全角半角・かなの違いは無視） */
export function filterVariables(
  variables: readonly CodeEditorVariable[],
  query: string,
): CodeEditorVariable[] {
  return variables.filter((v) => matches(query, v.label ?? v.name, v.name))
}
