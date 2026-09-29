/** 日本語の辞書（既定・同梱）。キーの集合はここから型として導出される（設計書 §8）。 */
const ja = {
  $locale: 'ja',
  'common.loading': '読み込み中',
  'alert.dismiss': '閉じる',
  'alert.info': '情報',
  'alert.success': '成功',
  'alert.warning': '警告',
  'alert.danger': 'エラー',
} as const

export type MessageKey = Exclude<keyof typeof ja, '$locale'>
export type MessageParams = Record<string, string | number>
/** 値は `{name}` プレースホルダー入りの文字列、または（複数形など文法が複雑な言語向けの）関数 */
export type MessageValue = string | ((params: MessageParams) => string)
/** 追加言語の辞書。足りないキーは日本語にフォールバックする */
export type Locale = { $locale: string } & Partial<Record<MessageKey, MessageValue>>

export default ja as unknown as Locale & Record<MessageKey, string>
