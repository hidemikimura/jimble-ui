import { render, type TemplateResult } from 'lit'

const mounted: HTMLElement[] = []

/** テンプレートを描画し、更新完了まで待って最初の要素を返す。テスト後は cleanup() で片付ける。 */
export async function mount<T extends HTMLElement>(template: TemplateResult): Promise<T> {
  const container = document.createElement('div')
  document.body.append(container)
  mounted.push(container)
  render(template, container)
  const el = container.firstElementChild as T & { updateComplete?: Promise<unknown> }
  await el.updateComplete
  return el
}

export function cleanup(): void {
  for (const c of mounted.splice(0)) c.remove()
}
