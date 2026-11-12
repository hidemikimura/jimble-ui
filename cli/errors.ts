// CLI のエラー（設計書 §17）。code は機械が分岐に使う安定した名前で、一度出したら意味を変えず、消さない。
// 文言（message）は改善のために変わることがあるので、利用者・エージェントは code で分岐する。

export const ERROR_CODES = {
  ERR_UNKNOWN: '分類されないエラー',
  ERR_UNKNOWN_COMMAND: 'コマンドの名前が分からない',
  ERR_INVALID_OPTION: '知らないオプション、または値の誤り',
  ERR_MISSING_ARGUMENT: '必要な引数がない',
  ERR_UNKNOWN_COMPONENT: 'その名前の要素がない',
  ERR_UNKNOWN_TOPIC: 'その名前の説明（docs のトピック）がない',
  ERR_DATA_NOT_FOUND: 'パッケージの資料が見つからない（インストールが壊れている）',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export interface Suggestion {
  name: string
  reason: string
}

export class CliError extends Error {
  readonly code: ErrorCode
  readonly suggestions: readonly Suggestion[]

  constructor(code: ErrorCode, message: string, suggestions: readonly Suggestion[] = []) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.suggestions = suggestions
  }
}

/** 編集距離（打ち間違いの候補を出すため） */
export function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    prev = cur
  }
  return prev[b.length]!
}

/** names の中から、query に近いものを最大 3 つ */
export function similar(query: string, names: readonly string[]): Suggestion[] {
  const q = query.toLowerCase()
  return names
    .map((name) => {
      const n = name.toLowerCase()
      if (n.includes(q) || q.includes(n)) return { name, score: 0, reason: '名前の一部が一致' }
      return { name, score: distance(q, n), reason: '似た名前' }
    })
    .filter((s) => s.score <= Math.max(2, Math.floor(query.length / 3)))
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map(({ name, reason }) => ({ name, reason }))
}
