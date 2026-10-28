// theme.css の :root の中の宣言(`--名前: 値;`)を読み、重複を整理したり、調整した値を書き込んだりする。
// DOM に依存しない(調整パネルと、`npm run tidy` と、試験が使う)。
//
// 方針: 同じ変数は 1 回だけ書く。値は「いちばん下の行」の値(CSS で効いている値)を採り、
// 位置と説明のコメントは「いちばん上の行」(ひな形)に残す。コメントの中の宣言は数えない。

export interface Decl {
  name: string
  value: string
  /** `--name: value;` の範囲（`;` を含む） */
  start: number
  end: number
}

export interface Duplicate {
  name: string
  /** 書かれた順の値 */
  values: string[]
  /** 書かれた順の行番号(1 始まり) */
  lines: number[]
}

/** コメントを飛ばして、`:root { … }` の直下の宣言を、書かれた順に集める */
export function scanDecls(css: string): Decl[] {
  const decls: Decl[] = []
  let depth = 0
  let atStart = false
  let i = 0
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const close = css.indexOf('*/', i + 2)
      i = close < 0 ? css.length : close + 2
      continue
    }
    const ch = css[i]!
    if (ch === '{') {
      depth++
      atStart = true
      i++
    } else if (ch === '}') {
      depth--
      atStart = true
      i++
    } else if (depth === 1 && atStart && css.startsWith('--', i)) {
      const m = /^(--[\w-]+)\s*:/.exec(css.slice(i))
      if (!m) {
        i++
        continue
      }
      const valueStart = i + m[0].length
      const end = declEnd(css, valueStart)
      decls.push({
        name: m[1]!,
        value: css.slice(valueStart, end).trim(),
        start: i,
        end: end + 1,
      })
      i = end + 1
      atStart = true
    } else {
      if (ch === ';') atStart = true
      else if (!/\s/.test(ch)) atStart = false
      i++
    }
  }
  return decls
}

/** 値の終わり(`;` の位置)。かっこ・引用符・コメントの中の `;` は数えない */
function declEnd(css: string, from: number): number {
  let paren = 0
  let quote = ''
  for (let i = from; i < css.length; i++) {
    const ch = css[i]!
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = ''
    } else if (css.startsWith('/*', i)) {
      const close = css.indexOf('*/', i + 2)
      i = close < 0 ? css.length : close + 1
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '(') paren++
    else if (ch === ')') paren--
    else if (ch === ';' && paren <= 0) return i
    else if (ch === '}' && paren <= 0) return i - 1 // `;` を忘れた最後の宣言
  }
  return css.length - 1
}

const lineOf = (css: string, pos: number) => css.slice(0, pos).split('\n').length

/** 同じ変数が 2 回以上書かれているものを、書かれた順に返す */
export function findDuplicates(css: string): Duplicate[] {
  const groups = new Map<string, Decl[]>()
  for (const d of scanDecls(css)) groups.set(d.name, [...(groups.get(d.name) ?? []), d])
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      name: g[0]!.name,
      values: g.map((d) => d.value),
      lines: g.map((d) => lineOf(css, d.start)),
    }))
}

interface Edit {
  start: number
  end: number
  text: string
}

/** 後ろから順に、範囲を置き換える(位置がずれない) */
function applyEdits(css: string, edits: Edit[]): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((s, e) => s.slice(0, e.start) + e.text + s.slice(e.end), css)
}

/** 宣言を消す。その行に、ほかに何もなければ、行ごと消す */
function removeEdit(css: string, d: Decl): Edit {
  let start = d.start
  let end = d.end
  const lineStart = css.lastIndexOf('\n', start - 1) + 1
  const lineEnd = css.indexOf('\n', end)
  const before = css.slice(lineStart, start)
  const after = css.slice(end, lineEnd < 0 ? css.length : lineEnd)
  if (before.trim() === '' && after.trim() === '') {
    start = lineStart
    end = lineEnd < 0 ? css.length : lineEnd + 1
  }
  return { start, end, text: '' }
}

/** 消したあとにできた、空行の連続を詰める */
const tidyBlankLines = (css: string) =>
  css
    .replace(/\n[ \t]+(?=\n)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(?=\s*})/g, '\n')

/**
 * 同じ変数を、1 回だけにする。値は、いちばん下の行の値。位置と説明は、いちばん上の行に残す。
 * コメントの中の宣言(コメントアウトした「上級」など)は、触らない。
 */
export function dedupe(css: string): { css: string; duplicates: Duplicate[] } {
  const duplicates = findDuplicates(css)
  if (duplicates.length === 0) return { css, duplicates }
  const groups = new Map<string, Decl[]>()
  for (const d of scanDecls(css)) groups.set(d.name, [...(groups.get(d.name) ?? []), d])
  const edits: Edit[] = []
  for (const g of groups.values()) {
    if (g.length < 2) continue
    const [first, ...rest] = g
    const last = g[g.length - 1]!
    if (first!.value !== last.value)
      edits.push({ start: first!.start, end: first!.end, text: `${first!.name}: ${last.value};` })
    for (const d of rest) edits.push(removeEdit(css, d))
  }
  return { css: tidyBlankLines(applyEdits(css, edits)), duplicates }
}

const APPENDED_HEADING = '  /* ---- 調整した値（上の、ひな形にない変数） ---- */'

/**
 * 調整した値を、theme.css に書き込む。
 * - すでに書いてある変数は、その行の値を置き換える(説明のコメントは残る)。同じ変数の重複も整理する。
 * - ひな形にない変数(コメントアウトした「上級」など)は、:root の最後に足す。
 */
export function applyOverrides(css: string, overrides: ReadonlyMap<string, string>): string {
  const base = dedupe(css).css
  const decls = new Map(scanDecls(base).map((d) => [d.name, d]))
  const edits: Edit[] = []
  const added: string[] = []
  for (const [name, value] of overrides) {
    const d = decls.get(name)
    if (d) edits.push({ start: d.start, end: d.end, text: `${name}: ${value};` })
    else added.push(`  ${name}: ${value};`)
  }
  let out = applyEdits(base, edits)
  if (added.length) {
    const close = out.lastIndexOf('}')
    if (close < 0) return `${out}\n:root {\n${added.join('\n')}\n}\n`
    const block = `\n${APPENDED_HEADING}\n${added.join('\n')}\n`
    out = out.slice(0, close).replace(/\s*$/, '\n') + block + out.slice(close)
  }
  return out
}

/** `light-dark(ライト, ダーク)` を、2 つの値に分ける。そうでなければ null */
export function splitLightDark(value: string): [light: string, dark: string] | null {
  const v = value.trim()
  if (!v.startsWith('light-dark(') || !v.endsWith(')')) return null
  const inner = v.slice('light-dark('.length, -1)
  let depth = 0
  const commas: number[] = [] // かっこの外のカンマ
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '(') depth++
    else if (ch === ')' && --depth < 0)
      return null // light-dark(a, b) c(d) のように、途中で閉じている
    else if (ch === ',' && depth === 0) commas.push(i)
  }
  if (depth !== 0 || commas.length !== 1) return null
  const light = inner.slice(0, commas[0]).trim()
  const dark = inner.slice(commas[0]! + 1).trim()
  return light && dark ? [light, dark] : null
}

/**
 * 表示中のモードの色だけを、`value` に変えた値を返す。
 * - いまの値が light-dark(ライト, ダーク) なら、そのモードの側だけを置き換える
 * - 1 つの値で、ダークを表示中なら、light-dark(いまの値, value) にする（ライトの色は変えない）
 * - 1 つの値で、ライトを表示中なら（または、いまの値がなければ）、value そのもの（両方のモードで同じ）
 */
export function setForScheme(
  current: string | undefined,
  scheme: 'light' | 'dark',
  value: string,
): string {
  const now = current?.trim() ?? ''
  const pair = splitLightDark(now)
  if (pair)
    return scheme === 'dark'
      ? `light-dark(${pair[0]}, ${value})`
      : `light-dark(${value}, ${pair[1]})`
  if (scheme === 'dark' && now) return `light-dark(${now}, ${value})`
  return value
}
