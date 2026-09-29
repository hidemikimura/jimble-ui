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

// Safari 系は、ボタンをクリックしてもそのボタンにフォーカスしない（document.activeElement が body のまま）。
// ダイアログやドロワーを開いたボタンへ、閉じたあとにフォーカスを戻せるよう、直近のポインター操作の対象を覚えておく。
const KEY = Symbol.for('jimble-ui.last-pointer')
const CLICKABLE = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]'
const store = globalThis as Record<symbol, Element | undefined>

function track() {
  const flag = Symbol.for('jimble-ui.last-pointer-installed')
  const g = globalThis as Record<symbol, boolean | undefined>
  if (g[flag]) return
  g[flag] = true
  document.addEventListener(
    'pointerdown',
    (e) => {
      // 最初に見つかった「押せる要素」(Shadow の内側のボタンを含む)を覚える
      store[KEY] = e
        .composedPath()
        .find((n): n is Element => n instanceof Element && n.matches(CLICKABLE))
    },
    true,
  )
}
if (typeof document !== 'undefined') track()

/**
 * モーダルなどを開くときに、閉じたあとフォーカスを戻す先を返す。
 * 通常はいまフォーカスしている要素。Safari 系でボタンにフォーカスが無いときは、直近に押した要素。
 */
export function getReturnFocusTarget(): Element | null {
  const active = getDeepActiveElement()
  if (active && active !== document.body) return active
  const pressed = store[KEY]
  return pressed?.isConnected ? pressed : active
}
