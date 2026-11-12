// 既製のテーマ（設計書 §4.9）を、data-jimble-theme を付けた所だけに効かせる。
// 配布する CSS は :where(:root) にも効くが、ドキュメントサイトの全体の見た目は変えずに、例の中だけで見比べたい。
// ドキュメントサイトと、例を axe にかける試験（tests/browser/examples.test.ts）が使う。
const sources = import.meta.glob<string>('../../tokens/themes/*.generated.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const ROOT_SELECTOR = ':where(:root),\n'

/** data-jimble-theme の範囲だけに効く、全テーマの CSS */
export const scopedThemeCss: string = Object.values(sources)
  .map((css) => {
    if (!css.includes(ROOT_SELECTOR)) throw new Error('テーマの CSS の形が想定と違います')
    return css.replace(ROOT_SELECTOR, '')
  })
  .join('\n')

/** 文書に、data-jimble-theme の範囲だけに効くテーマを読み込む */
export function installScopedThemes(doc: Document = document): void {
  const style = doc.createElement('style')
  style.dataset.jimbleThemes = ''
  style.textContent = scopedThemeCss
  doc.head.append(style)
}
