const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase()

/**
 * 先頭文字検索(メニュー・セレクト)。連続で打った文字を短時間だけ覚えて前方一致で探す。
 * IME の変換中は呼び出し側で除外すること（設計書 §8.3）。
 */
export class Typeahead {
  #buffer = ''
  #timer: ReturnType<typeof setTimeout> | undefined
  constructor(private timeout = 600) {}

  /** 印字可能な 1 文字か（修飾キー無し） */
  static isChar(e: KeyboardEvent): boolean {
    return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey
  }

  /** 文字を受け取り、現在位置の次から前方一致する要素を返す（一致しなければ undefined） */
  match<T>(
    key: string,
    items: T[],
    current: T | undefined,
    text: (item: T) => string,
  ): T | undefined {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => (this.#buffer = ''), this.timeout)
    this.#buffer += normalize(key)
    // 同じ文字の連打は、その文字で始まる次の項目へ進む
    const cycle = [...this.#buffer].every((c) => c === this.#buffer[0])
    const needle = cycle ? this.#buffer[0]! : this.#buffer
    // 現在の項目がある場合、同じ文字の入力(1 文字だけも含む)は「現在の次」から探す。複数の異なる文字は現在から
    const start = current ? Math.max(0, items.indexOf(current)) + (cycle ? 1 : 0) : 0
    const ordered = [...items.slice(start), ...items.slice(0, start)]
    return ordered.find((item) => normalize(text(item).trim()).startsWith(needle))
  }
}
