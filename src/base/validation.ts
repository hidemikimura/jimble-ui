import type { MessageKey, MessageParams } from '../i18n/index.js'

export type ValidityFlags = Partial<Record<keyof ValidityState, boolean>>

export interface ValidationContext {
  type?: string
  min?: string | number
  max?: string | number
  minLength?: number
  maxLength?: number
  /** valueMissing の文言の種類 */
  missing?: 'text' | 'check' | 'choice'
}

/** ネイティブの ValidityState を、辞書のキーとパラメーターに変換する（ブラウザ標準の文言は使わない） */
export function validationMessage(
  flags: ValidityFlags,
  ctx: ValidationContext,
): { key: MessageKey; params: MessageParams } | null {
  if (flags.valueMissing) {
    const key =
      ctx.missing === 'check'
        ? 'validation.valueMissing.check'
        : ctx.missing === 'choice'
          ? 'validation.valueMissing.choice'
          : 'validation.valueMissing'
    return { key, params: {} }
  }
  if (flags.typeMismatch) {
    const key =
      ctx.type === 'email'
        ? 'validation.typeMismatch.email'
        : ctx.type === 'url'
          ? 'validation.typeMismatch.url'
          : 'validation.typeMismatch'
    return { key, params: {} }
  }
  if (flags.patternMismatch) return { key: 'validation.patternMismatch', params: {} }
  if (flags.tooShort)
    return { key: 'validation.tooShort', params: { minLength: ctx.minLength ?? '' } }
  if (flags.tooLong)
    return { key: 'validation.tooLong', params: { maxLength: ctx.maxLength ?? '' } }
  if (flags.rangeUnderflow)
    return { key: 'validation.rangeUnderflow', params: { min: ctx.min ?? '' } }
  if (flags.rangeOverflow)
    return { key: 'validation.rangeOverflow', params: { max: ctx.max ?? '' } }
  if (flags.stepMismatch) return { key: 'validation.stepMismatch', params: {} }
  if (flags.badInput) return { key: 'validation.badInput', params: {} }
  return null
}

export const FLAG_NAMES = [
  'badInput',
  'customError',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
] as const

export function toFlags(v: ValidityState): ValidityStateFlags {
  const flags: ValidityStateFlags = {}
  for (const name of FLAG_NAMES) if (v[name]) flags[name] = true
  return flags
}
