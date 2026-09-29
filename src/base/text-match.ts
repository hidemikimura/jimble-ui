// 絞り込み用の文字の正規化と一致判定(コンボボックス)。日本語向けに、次を同じ文字として扱う。
//   全角/半角(NFKC)、大文字/小文字、ひらがな/カタカナ、空白の有無
const KATAKANA_TO_HIRAGANA = /[ァ-ヶ]/g

/** 検索用に正規化する */
export function fold(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(KATAKANA_TO_HIRAGANA, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

/** query が text(と、読みなどの keywords)に含まれるか。空の query は常に一致 */
export function matches(
  query: string,
  text: string,
  keywords = '',
  mode: 'contains' | 'starts-with' = 'contains',
): boolean {
  const q = fold(query)
  if (!q) return true
  return [text, ...keywords.split(/[\s,、]+/)].some((t) => {
    const f = fold(t)
    return mode === 'starts-with' ? f.startsWith(q) : f.includes(q)
  })
}
