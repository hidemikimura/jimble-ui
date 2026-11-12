// コマンドパレットを開くショートカット（`hotkey="mod+k"`）。`mod` は macOS で ⌘、ほかで Ctrl（設計書 §22.2）。

export interface Hotkey {
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

const MODIFIERS = new Set(['mod', 'ctrl', 'meta', 'alt', 'shift'])

/** `mod+k`・`ctrl+shift+p` などを読む。読めなければ undefined */
export function parseHotkey(text: string | null | undefined): Hotkey | undefined {
  const parts = (text ?? '')
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  const key = parts.pop()
  if (!key || MODIFIERS.has(key) || parts.some((p) => !MODIFIERS.has(p))) return undefined
  const has = (m: string) => parts.includes(m)
  return {
    key,
    mod: has('mod'),
    ctrl: has('ctrl'),
    meta: has('meta'),
    alt: has('alt'),
    shift: has('shift'),
  }
}

/** macOS（iPadOS を含む）か */
export function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(platform)
}

/** キーの操作が、ショートカットと一致するか（余分な修飾キーがあれば一致しない） */
export function matchesHotkey(e: KeyboardEvent, hk: Hotkey, apple = isApplePlatform()): boolean {
  const ctrl = hk.ctrl || (hk.mod && !apple)
  const meta = hk.meta || (hk.mod && apple)
  return (
    e.key.toLowerCase() === hk.key &&
    e.ctrlKey === ctrl &&
    e.metaKey === meta &&
    e.altKey === hk.alt &&
    e.shiftKey === hk.shift
  )
}

/** 入力欄・テキストエリア・contenteditable の中か（ショートカットを奪わない） */
export function isEditableTarget(e: Event): boolean {
  return e
    .composedPath()
    .some(
      (n) =>
        n instanceof HTMLElement &&
        (n.isContentEditable ||
          (n instanceof HTMLInputElement &&
            !['checkbox', 'radio', 'button', 'submit'].includes(n.type)) ||
          n instanceof HTMLTextAreaElement ||
          n instanceof HTMLSelectElement),
    )
}
