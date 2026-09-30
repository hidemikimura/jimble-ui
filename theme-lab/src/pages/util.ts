import { render, type TemplateResult } from 'lit'

/** 状態を持つページの入れ物。`draw()` で描き直す(ルーターは、ページを再描画しないので、ページの側で行う) */
export function statefulPage(view: () => TemplateResult): { root: HTMLElement; draw: () => void } {
  const root = document.createElement('div')
  const draw = () => render(view(), root)
  draw()
  return { root, draw }
}
