import css from './index.css?inline'

const KEY = Symbol.for('jimble-ui.shared-sheet')

function create(): CSSStyleSheet {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  return sheet
}

/**
 * 全コンポーネントが adoptedStyleSheets で共有する 1 枚のスタイルシート。
 * Symbol.for でグローバルに 1 つだけ持つので、CDN バンドルと個別 import を併用しても共有できる。
 */
export const sharedSheet: CSSStyleSheet = ((globalThis as Record<symbol, unknown>)[KEY] ??=
  create()) as CSSStyleSheet

// 開発時: CSS が変わったら同じシートを差し替える（再描画不要で全コンポーネントが更新される）
if (import.meta.hot) {
  import.meta.hot.accept('./index.css?inline', (mod) => {
    if (mod) sharedSheet.replaceSync((mod as unknown as { default: string }).default)
  })
}
