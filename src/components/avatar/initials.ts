// アバターの頭文字（設計書 §26）。

const SEPARATOR = /[\s\u30fb]+/u
const LATIN = /^\p{Script=Latin}/u

/** 書記素（見た目の 1 文字）で数えた、最初の 1 文字 */
function firstGrapheme(word: string): string {
  const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)
  return segments[Symbol.iterator]().next().value?.segment ?? ''
}

/**
 * 名前から頭文字を作る。ラテン文字で始まる名前は、最初と最後の語の頭文字を大文字で 2 つ（Hanako Sato → HS）。
 * それ以外（日本語など）は、最初の語の最初の 1 文字（佐藤 花子 → 佐）。名前が空なら空文字。
 */
export function initials(name: string): string {
  const words = name.trim().split(SEPARATOR).filter(Boolean)
  const first = words[0]
  if (!first) return ''
  if (!LATIN.test(first)) return firstGrapheme(first)
  const last = words.length > 1 ? words[words.length - 1]! : ''
  return (firstGrapheme(first) + (last ? firstGrapheme(last) : '')).toUpperCase()
}
