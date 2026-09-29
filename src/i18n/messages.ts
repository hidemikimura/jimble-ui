/** 日本語の辞書（既定・同梱）。キーの集合はここから型として導出される（設計書 §8）。 */
const ja = {
  $locale: 'ja',
  'common.loading': '読み込み中',
  'alert.dismiss': '閉じる',
  'alert.info': '情報',
  'alert.success': '成功',
  'alert.warning': '警告',
  'alert.danger': 'エラー',
  'dialog.close': '閉じる',
  'toast.dismiss': '通知を閉じる',
  'select.placeholder': '選択してください',
  'select.noOptions': '選択肢がありません',
  'shell.openMenu': 'メニューを開く',
  'shell.closeMenu': 'メニューを閉じる',
  'shell.skipToContent': '本文へ移動',
  'nav.label': 'メインメニュー',
  'breadcrumb.label': 'パンくずリスト',
  'pagination.label': 'ページネーション',
  'pagination.previous': '前のページ',
  'pagination.next': '次のページ',
  'pagination.page': '{page} ページ目',
  'pagination.summary': '{total} 件中 {from}〜{to} 件',
  'field.required': '必須',
  'validation.valueMissing': 'この項目は必須です',
  'validation.valueMissing.check': 'チェックしてください',
  'validation.valueMissing.choice': 'いずれかを選択してください',
  'validation.typeMismatch': '入力の形式が正しくありません',
  'validation.typeMismatch.email': 'メールアドレスの形式で入力してください',
  'validation.typeMismatch.url': 'URL の形式で入力してください',
  'validation.patternMismatch': '指定の形式で入力してください',
  'validation.tooShort': '{minLength} 文字以上で入力してください',
  'validation.tooLong': '{maxLength} 文字以内で入力してください',
  'validation.rangeUnderflow': '{min} 以上の値を入力してください',
  'validation.rangeOverflow': '{max} 以下の値を入力してください',
  'validation.stepMismatch': '有効な値を入力してください',
  'validation.badInput': '有効な値を入力してください',
} as const

export type MessageKey = Exclude<keyof typeof ja, '$locale'>
export type MessageParams = Record<string, string | number>
/** 値は `{name}` プレースホルダー入りの文字列、または（複数形など文法が複雑な言語向けの）関数 */
export type MessageValue = string | ((params: MessageParams) => string)
/** 追加言語の辞書。足りないキーは日本語にフォールバックする */
export type Locale = { $locale: string } & Partial<Record<MessageKey, MessageValue>>

export default ja as unknown as Locale & Record<MessageKey, string>
