import { getLocale, setLocale, setMessages } from './i18n/index.js'
import { html, render } from 'lit'
import { toast } from './components/toast/toast.js'

/** 素の HTML から `JimbleUI.toast(...)` のように呼ぶための入口（CDN バンドルが `globalThis.JimbleUI` に置く）。
 * `JimbleUI.html` / `JimbleUI.render` は Lit の `html` / `render`（`jimble-router` でテンプレートを書くとき用） */
export const JimbleUI = { toast, setLocale, setMessages, getLocale, html, render }

export function installGlobal(
  target: Record<string, unknown> = globalThis as Record<string, unknown>,
): void {
  target.JimbleUI = JimbleUI
}
