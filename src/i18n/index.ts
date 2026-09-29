import ja, {
  type Locale,
  type MessageKey,
  type MessageParams,
  type MessageValue,
} from './messages.js'

export type { Locale, MessageKey, MessageParams, MessageValue }

interface I18nState {
  locale: string
  messages: Record<string, MessageValue>
  events: EventTarget
}

// CDN バンドルと個別 import を併用しても状態を共有できるよう、グローバルに 1 つだけ持つ
const KEY = Symbol.for('jimble-ui.i18n')
const state = ((globalThis as Record<symbol, unknown>)[KEY] ??= {
  locale: ja.$locale,
  messages: { ...ja } as Record<string, MessageValue>,
  events: new EventTarget(),
} satisfies I18nState) as I18nState

const notify = () => state.events.dispatchEvent(new Event('change'))

/** 言語を切り替える。足りないキーは日本語のまま。以降、全コンポーネントが再描画される */
export function setLocale(dict: Locale): void {
  state.locale = dict.$locale
  state.messages = { ...ja, ...dict } as Record<string, MessageValue>
  notify()
}

/** 一部の文言だけ上書きする（現在の言語に対してマージ） */
export function setMessages(partial: Partial<Record<MessageKey, MessageValue>>): void {
  state.messages = { ...state.messages, ...partial } as Record<string, MessageValue>
  notify()
}

/** 現在の言語タグ（BCP 47）。Intl の書式にも使う */
export function getLocale(): string {
  return state.locale
}

export function translate(key: MessageKey, params: MessageParams = {}): string {
  const value = state.messages[key]
  if (value === undefined) {
    if (__DEV__) console.warn(`[jimble-ui] 未定義の文言キー: ${key}`)
    return key
  }
  if (typeof value === 'function') return value(params)
  return value.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m))
}

/** ロケール変更の購読。戻り値で解除する */
export function onLocaleChange(listener: () => void): () => void {
  state.events.addEventListener('change', listener)
  return () => state.events.removeEventListener('change', listener)
}
