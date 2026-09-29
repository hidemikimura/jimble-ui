import { getLocale, setLocale, setMessages } from './i18n/index.js'
import { toast } from './components/toast/toast.js'

/** 素の HTML から `JimbleUI.toast(...)` のように呼ぶための入口（CDN バンドルが `globalThis.JimbleUI` に置く） */
export const JimbleUI = { toast, setLocale, setMessages, getLocale }

export function installGlobal(
  target: Record<string, unknown> = globalThis as Record<string, unknown>,
): void {
  target.JimbleUI = JimbleUI
}
