// 全コンポーネントを登録して再エクスポートする（CDN バンドルの入口）
export * from './components/alert/index.js'
export * from './components/badge/index.js'
export * from './components/button/index.js'
export * from './components/card/index.js'
export { getLocale, setLocale, setMessages } from './i18n/index.js'
export type { Locale, MessageKey } from './i18n/index.js'
