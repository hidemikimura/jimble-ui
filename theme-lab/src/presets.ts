// 既製のテーマ（dist/themes/<名前>.css）と、余白の段階（dist/density.css）を読む。
// テーマ調整パネルの「出発点」で、選んだものの値を、試しの値として当てる（theme.css をコピーすると、その値も入る）。
// DOM に依存しない（試験からも読む）。

export interface Decl {
  name: string
  value: string
}
export interface Preset {
  name: string
  description: string
  decls: Decl[]
}

/** `{ … }` の中の `--名前: 値;` を、順に取り出す（値の中の `;` は無い前提） */
function decls(block: string): Decl[] {
  return [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => ({
    name: m[1]!,
    value: m[2]!.trim().replace(/\s+/g, ' '),
  }))
}

/** テーマの CSS（`/* jimble-ui テーマ「名前」: 説明` と、宣言のかたまり 1 つ） */
export function parseThemeCss(css: string): Preset {
  const head = /jimble-ui テーマ「([\w-]+)」:\s*([^\n]*)/.exec(css)
  const body = /\{([\s\S]*?)\}/.exec(css)
  if (!head || !body) throw new Error('テーマの CSS の形が想定と違います')
  return { name: head[1]!, description: head[2]!.trim(), decls: decls(body[1]!) }
}

/** 余白の段階の CSS（`/* 名前: 説明 *\/` と `:where([data-jimble-density='名前']) { … }` の組み） */
export function parseDensityCss(css: string): Preset[] {
  const levels = [
    ...css.matchAll(
      /\/\*\s*([\w-]+):\s*([^*]*?)\s*\*\/\s*:where\(\[data-jimble-density='([\w-]+)'\]\)\s*\{([\s\S]*?)\}/g,
    ),
  ]
  if (!levels.length) throw new Error('余白の段階の CSS の形が想定と違います')
  return levels.map((m) => ({ name: m[3]!, description: m[2]!.trim(), decls: decls(m[4]!) }))
}
