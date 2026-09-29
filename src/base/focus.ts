/** Shadow DOM を再帰的にたどった、本当のアクティブ要素 */
export function getDeepActiveElement(root: Document | ShadowRoot = document): Element | null {
  let active = root.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/** 前の要素にフォーカスを戻す。消えていたら戻さない */
export function restoreFocus(el: Element | null | undefined): void {
  if (el instanceof HTMLElement && el.isConnected) el.focus()
}
