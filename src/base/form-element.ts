import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import type { MessageKey, MessageParams } from '../i18n/index.js'
// jimble-field を先に登録しておく。後から登録すると、先に生まれたフォーム部品へ field の情報が届かない
import '../components/field/jimble-field.js'
import { FieldControlController } from './field-controller.js'
import { ImeController } from './ime-controller.js'
import { JimbleElement } from './jimble-element.js'
import { toFlags, validationMessage, type ValidationContext } from './validation.js'

export type ControlSize = 'sm' | 'md' | 'lg'

/** 検証の結果（computeValidity の戻り値） */
export interface ValidityResult {
  flags: ValidityStateFlags
  message: string
  /** reportValidity() でフォーカスされる先。host の shadow-including 子孫であること */
  anchor?: HTMLElement
}

/**
 * フォーム関連カスタム要素（FACE）の基底（設計書 §5）。
 * 値・検証・リセット・disabled・状態復元と、jimble-field との連携を提供する。
 * 継承先は `nativeControl`・`formValue`・`resetValue`・`restoreValue` を実装する。
 */
export abstract class JimbleFormElement extends JimbleElement {
  static formAssociated = true
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }
  static override properties: PropertyDeclarations = {
    name: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    size: { reflect: true },
    accessibleLabel: { attribute: 'aria-label' },
  }

  /** フォーム送信名。無い場合は送信されない */
  declare name: string
  /** 操作不可（送信対象外・フォーカス不可）。祖先の fieldset[disabled] でも無効になる */
  declare disabled: boolean
  declare required: boolean
  /** 高さ 32 / 36 / 40px */
  declare size: ControlSize
  /** host の aria-label を内部のコントロールへ渡す */
  declare accessibleLabel: string | null

  protected field = new FieldControlController(this)
  protected ime = new ImeController(this)

  #fieldsetDisabled = false
  #touched = false
  #customMessage = ''
  #validatorMessage = ''
  #lastFormState: string | null | undefined = undefined
  #hintId = this.uid('hint')
  #errorId = this.uid('error')

  constructor() {
    super()
    this.name = ''
    this.disabled = false
    this.required = false
    this.size = 'md'
    this.accessibleLabel = null
    // フォームの送信試行で検証に失敗したら、その項目は「触れた」扱いにしてエラーを見せる
    this.addEventListener('invalid', () => this.#markTouched())
    this.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!this.matches(':focus-within')) this.#markTouched()
      })
    })
  }

  // ---- サブクラスが実装するもの ---------------------------------------------------------
  /** 検証・フォーカスの実体になるネイティブのコントロール（無ければ null） */
  protected get nativeControl(): HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null {
    return null
  }
  /** フォームに送信する値（送信しないなら null）。同じ name で複数送るときは FormData */
  protected abstract get formValue(): string | FormData | null
  /** 状態復元（bfcache・オートフィル）用の文字列 */
  protected get formState(): string | null {
    if (typeof this.formValue !== 'string') return null
    return this.formValue
  }
  /** デフォルト値へ戻す（formResetCallback から呼ばれる） */
  protected abstract resetValue(): void
  protected restoreValue(_state: string): void {}
  protected get validationContext(): ValidationContext {
    return {}
  }

  // ---- 状態 ----------------------------------------------------------------------------
  /** 有効な disabled（属性 ∥ 祖先 fieldset[disabled]） */
  get isDisabled(): boolean {
    return this.disabled || this.#fieldsetDisabled
  }
  /** 一度 blur した、または送信を試みた */
  get touched(): boolean {
    return this.#touched
  }
  /** エラー表示にするか（field の error 属性 ∥ touched 後の検証失敗） */
  protected get showInvalid(): boolean {
    return this.field.explicitError || (this.#touched && !this.internals.validity.valid)
  }

  /**
   * 「触れた」状態にする(エラーを表示する)/ 戻す(エラーの表示を隠す。値と検証の結果は変えない)。
   * 送信を試みたり、フォーカスが外れたりしたときと同じ状態を、プログラムから作る。
   */
  setTouched(touched: boolean): void {
    if (this.#touched === touched) return
    this.#touched = touched
    this.requestUpdate()
  }

  #markTouched() {
    if (this.#touched) return
    this.#touched = true
    this.requestUpdate()
  }

  // ---- フォーム連携のコールバック --------------------------------------------------------
  formResetCallback(): void {
    this.#touched = false
    this.resetValue()
    this.requestUpdate()
  }
  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled = disabled
    this.requestUpdate()
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') {
      this.restoreValue(state)
      this.requestUpdate()
    }
  }

  // ---- 公開 API（ネイティブのフォーム部品に揃える） ---------------------------------------
  get form(): HTMLFormElement | null {
    return this.internals.form
  }
  get labels(): NodeListOf<HTMLLabelElement> {
    return this.internals.labels as NodeListOf<HTMLLabelElement>
  }
  get validity(): ValidityState {
    return this.internals.validity
  }
  get validationMessage(): string {
    return this.internals.validationMessage
  }
  get willValidate(): boolean {
    return this.internals.willValidate
  }
  checkValidity(): boolean {
    return this.internals.checkValidity()
  }
  reportValidity(): boolean {
    return this.internals.reportValidity()
  }
  /**
   * `jimble-field` の `validate` が結果を渡すための口。空文字で解除する。
   * `setCustomValidity` とは別に持つので、アプリが `setCustomValidity` で付けたエラー(サーバー側の検証など)を上書きしない。
   * @internal
   */
  setValidatorMessage(message: string): void {
    if (message === this.#validatorMessage) return
    this.#validatorMessage = message
    this.commit()
  }
  /** サーバー側のエラーなど。空文字で解除する */
  setCustomValidity(message: string): void {
    this.#customMessage = message
    this.nativeControl?.setCustomValidity(message)
    this.commit()
  }

  // ---- 検証と値の反映 --------------------------------------------------------------------
  /** 値・検証を internals に反映する。値が変わったら呼ぶ（updated でも呼ばれる） */
  protected commit(): void {
    this.internals.setFormValue(this.isDisabled ? null : this.formValue, this.formState)
    const result = this.computeValidity()
    const { anchor } = result
    let { flags, message } = result
    // computeValidity を上書きする部品(radio-group / select / date-input など)では、setCustomValidity をここで反映する
    const custom = this.#customMessage || this.#validatorMessage
    if (custom && !flags.customError) {
      flags = { ...flags, customError: true }
      message = custom
    }
    if (Object.values(flags).some(Boolean)) {
      this.internals.setValidity(flags, message || ' ', anchor ?? this.nativeControl ?? undefined)
    } else {
      this.internals.setValidity({})
    }
    this.field.report(this.touched ? this.internals.validationMessage : '')
    // 値が(プログラムからも)変わったら、field の validate に知らせる。最初の 1 回は知らせない(field が最初に検証する)
    const state = this.formState
    if (this.#lastFormState !== undefined && state !== this.#lastFormState)
      this.field.valueChanged()
    this.#lastFormState = state
  }

  /** 既定の検証: ネイティブのコントロールの validity を写し、メッセージは辞書から引く */
  protected computeValidity(): ValidityResult {
    const c = this.nativeControl
    if (!c) return { flags: {}, message: '' }
    c.setCustomValidity(this.#customMessage)
    const flags = toFlags(c.validity)
    if (flags.customError && !flags.valueMissing) return { flags, message: this.#customMessage }
    const m = validationMessage(flags, {
      ...this.validationContext,
      type: (c as HTMLInputElement).type,
    })
    return { flags, message: m ? this.t(m.key, m.params) : c.validationMessage }
  }

  protected tKey(key: MessageKey, params?: MessageParams): string {
    return this.t(key, params)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.commit()
    this.setState('invalid', this.showInvalid)
    this.setState('touched', this.#touched)
    this.setState('disabled', this.isDisabled)
  }

  // ---- 名前・説明（jimble-field / 外側の label との連携） ----------------------------------
  /** 内部コントロールに付けるアクセシブルネーム。field のラベル ＞ aria-label ＞ 外側の label */
  protected accessibleName(): string | undefined {
    if (this.field.label) {
      // 1 つの field に部品が複数あるとき(姓と名など)は、部品ごとの名前を足して、区別できるようにする
      return this.field.count > 1 && this.accessibleLabel
        ? `${this.field.label} ${this.accessibleLabel}`
        : this.field.label
    }
    if (this.accessibleLabel) return this.accessibleLabel
    const text = [...this.labels]
      .map((l) => l.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
    return text || undefined
  }

  /** ヒント・エラーの文字列を同一 root に写した、視覚的に隠した要素 */
  protected renderDescriptions() {
    return html`${
      this.field.hint
        ? html`<span id=${this.#hintId} class="sr-only">${this.field.hint}</span>`
        : nothing
    }${
      this.field.error
        ? html`<span id=${this.#errorId} class="sr-only">${this.field.error}</span>`
        : nothing
    }`
  }
  /** aria-describedby に渡す ID */
  protected get describedBy(): string | undefined {
    const ids = [this.field.hint && this.#hintId, this.field.error && this.#errorId].filter(Boolean)
    return ids.length ? ids.join(' ') : undefined
  }
}
