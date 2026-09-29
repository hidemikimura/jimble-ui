import { ContextProvider } from '@lit/context'
import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { fieldContext, type FieldInfo } from '../../base/field-controller.js'
import { JimbleElement } from '../../base/jimble-element.js'

/** 検証に渡される、同じ field の中の部品の一覧（姓と名のように、複数あるとき） */
export interface FieldValidationContext {
  /** field の中の部品（並び順） */
  controls: HTMLElement[]
  /** `name` で部品の値を引く（無ければ undefined） */
  get(name: string): FieldValue | undefined
}

/** 検証に渡される値。テキスト・選択は文字列、チェックボックス・スイッチは真偽値、複数選択は文字列の配列、ファイルは File の配列 */
export type FieldValue = string | boolean | string[] | File[]
/** 検証の結果。空でない文字列ならエラーメッセージ。`null`・`undefined`・空文字・`false` は「問題なし」 */
export type FieldValidationResult = string | null | undefined | false | void
/**
 * フィールド単位の独自の検証。値と、その部品を受け取り、エラーメッセージ(または問題なし)を返す。
 * サーバーに問い合わせるときは Promise を返してもよい。
 */
export type FieldValidator = (
  value: FieldValue,
  control: HTMLElement,
  context: FieldValidationContext,
) => FieldValidationResult | Promise<FieldValidationResult>

/** 検証の結果を受け取れる部品(JimbleFormElement) */
interface ValidatorTarget extends HTMLElement {
  setValidatorMessage(message: string): void
  validity: ValidityState
}

/**
 * ラベル・ヒント・エラーを付けるための入れ物。中に置いた `jimble-input` などのフォーム部品と連携する。
 *
 * ARIA の IDREF は Shadow 境界をまたげないため、ラベル・ヒント・エラーは文字列として部品へ渡され、
 * 部品側の Shadow 内で `aria-label` / `aria-describedby` になる。画面に見えている文言は、
 * 二重に読み上げられないよう支援技術からは隠している。
 *
 * **独自の検証（`validate`）**: `validate` プロパティに関数を渡すと、中の部品の値をその関数で検証する。
 *
 * ```js
 * field.validate = (value) => (value ? null : '必須です。')
 * ```
 *
 * - 関数は、値が変わったとき(`input`・`change`)と、フォーカスが外れたときに呼ばれる。ほかに、最初に 1 回と、`validate` を差し替えたときにも呼ばれる
 *   (**空の値でも呼ばれる**ので、空を許すなら、空のときは `null` を返す)。
 * - 空でない文字列を返すとエラーになる。**エラーの表示は、これまでどおり、部品から一度フォーカスが外れたあと**(または送信を試みたあと)。
 * - エラーの間は、フォームの検証が通らず、送信されない(ネイティブの `required` などと同じ)。
 * - Promise を返すと、サーバーへの問い合わせなどにも使える。結果が出るまでは「確認中です」となり、送信されない。
 *   Promise を返す検証は、入力のたびには呼ばず、値が確定したとき(`change`・フォーカスが外れたとき)に呼ぶ。古い結果は捨てる。
 * - `setCustomValidity` や `error` 属性(サーバーからのエラーなど)とは別に扱うので、互いに上書きしない。
 * - `validateNow()` で、いつでも検証して、結果(`true` = 問題なし)を待てる。
 * - 1 つの field に部品が複数あるとき(姓と名など)は、部品ごとに呼ばれる。3 つ目の引数 `context.get('first')` で、ほかの部品の値を引ける。
 *   どれかの部品の値が変わると、ほかの部品(同期の検証のもの)も再検証する。エラーは、無効な最初の部品のものが表示される。
 *
 * @tag jimble-field
 *
 * @slot - フォーム部品（jimble-input など）
 * @slot label - ラベル（label 属性の代わりに HTML で書くとき。文字列として部品へ渡る）
 * @slot hint - ヒント（同上）
 * @slot error - エラー（同上）
 *
 * @csspart base - ルート要素
 * @csspart label - ラベル
 * @csspart required - 必須の表示
 * @csspart hint - ヒント
 * @csspart error - エラー
 */
export class JimbleField extends JimbleElement {
  static override properties: PropertyDeclarations = {
    label: {},
    hint: {},
    error: {},
    required: { type: Boolean, reflect: true },
    validate: { attribute: false },
  }

  declare label: string
  /** 補足説明 */
  declare hint: string
  /** 明示するエラー（サーバー側の検証結果など）。空なら、部品自身の検証メッセージ（触れた後）を表示する */
  declare error: string
  /** 必須の表示を出し、中の部品を必須にする */
  declare required: boolean
  /** 独自の検証(フィールド単位)。値を受け取り、エラーメッセージを返す。Promise も可 */
  declare validate: FieldValidator | undefined

  #controls = new Set<HTMLElement>()
  /** 部品ごとの、検証メッセージ(触れたあとだけ)。表示するのは、並びで最初の空でないもの */
  #reports = new Map<HTMLElement, string>()
  #provider = new ContextProvider(this, { context: fieldContext })

  constructor() {
    super()
    this.label = ''
    this.hint = ''
    this.error = ''
    this.required = false
    this.validate = undefined
    // 値が変わったとき・フォーカスが外れたときに検証する(子の部品のイベントは、ここまで届く)
    this.addEventListener('input', this.#onValueEvent)
    this.addEventListener('change', this.#onValueEvent)
    this.addEventListener('focusout', this.#onValueEvent)
  }

  #slotText(name: string): string {
    return [...this.querySelectorAll(`:scope > [slot="${name}"]`)]
      .map((e) => e.textContent?.trim() ?? '')
      .join(' ')
      .trim()
  }

  get #labelText() {
    return this.label || this.#slotText('label')
  }
  get #hintText() {
    return this.hint || this.#slotText('hint')
  }
  get #errorText() {
    return this.error || this.#slotText('error') || this.#reported
  }
  get #reported(): string {
    const ordered = [...this.#controls].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    for (const c of ordered) {
      const m = this.#reports.get(c)
      if (m) return m
    }
    return ''
  }

  #info(): FieldInfo {
    return {
      label: this.#labelText,
      hint: this.#hintText,
      error: this.#errorText,
      explicitError: !!(this.error || this.#slotText('error')),
      required: this.required,
      count: this.#controls.size,
      register: (control) => {
        this.#controls.add(control)
        this.#initial = true
        // 部品の登録は、field の更新の途中(コンテキストの提供中)に起きることがあり、その間の requestUpdate は次の更新にならない。
        // 部品の数(count)を部品へ渡し直すため、更新のあとにもう一度更新する
        queueMicrotask(() => this.requestUpdate())
        this.requestUpdate()
        return () => {
          this.#controls.delete(control)
          this.#reports.delete(control)
          queueMicrotask(() => this.requestUpdate())
          this.requestUpdate()
        }
      },
      report: (control, message) => {
        if ((this.#reports.get(control) ?? '') === message) return
        this.#reports.set(control, message)
        this.requestUpdate()
      },
    }
  }

  // ---- 独自の検証 ----------------------------------------------------------------------
  #initial = false
  #seq = new WeakMap<HTMLElement, number>()
  /** 直前の検証が Promise を返したか(返したなら、入力のたびには呼ばない) */
  #async = new WeakMap<HTMLElement, boolean>()

  /** 同じ field の中の部品を、名前で引けるようにする */
  #context(): FieldValidationContext {
    const controls = [...this.#controls].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    return {
      controls,
      get: (name) => {
        const c = controls.find((x) => (x as HTMLElement & { name?: string }).name === name)
        return c ? this.#valueOf(c) : undefined
      },
    }
  }

  #valueOf(control: HTMLElement): FieldValue {
    const c = control as HTMLElement & Record<string, unknown>
    if (Array.isArray(c.values) && (c.multiple || c.localName === 'jimble-dual-listbox'))
      return c.values as string[]
    if (Array.isArray(c.files)) return c.files as File[]
    if (typeof c.checked === 'boolean') return c.checked
    return String(c.value ?? '')
  }

  #apply(control: HTMLElement, result: FieldValidationResult) {
    ;(control as Partial<ValidatorTarget>).setValidatorMessage?.(
      typeof result === 'string' ? result : '',
    )
  }

  /** 1 つの部品を検証する。Promise を返す検証は、その完了を待つ Promise を返す */
  #runOne(control: HTMLElement, fromInput: boolean): Promise<void> | void {
    const validate = this.validate
    if (!validate) {
      this.#apply(control, '')
      return
    }
    if (fromInput && this.#async.get(control)) return
    const id = (this.#seq.get(control) ?? 0) + 1
    this.#seq.set(control, id)
    let result: ReturnType<FieldValidator>
    try {
      result = validate(this.#valueOf(control), control, this.#context())
    } catch (error) {
      if (__DEV__)
        console.warn('[jimble-ui] <jimble-field> の validate が例外を投げました。', error)
      this.#apply(control, this.t('field.validateFailed'))
      return
    }
    if (result instanceof Promise) {
      this.#async.set(control, true)
      // 結果が出るまでは、送信させない
      this.#apply(control, this.t('field.validating'))
      return result.then(
        (r) => {
          if (this.#seq.get(control) === id) this.#apply(control, r)
        },
        (error: unknown) => {
          if (__DEV__)
            console.warn('[jimble-ui] <jimble-field> の validate が失敗しました。', error)
          if (this.#seq.get(control) === id) this.#apply(control, this.t('field.validateFailed'))
        },
      )
    }
    this.#async.set(control, false)
    this.#apply(control, result)
  }

  #onValueEvent = (event: Event) => {
    if (!this.validate) return
    const path = event.composedPath()
    const control = [...this.#controls].find((c) => path.includes(c))
    if (!control) return
    void this.#runOne(control, event.type === 'input')
    // ほかの部品の検証が、この値に依存しているかもしれない(合計の文字数など)ので、同期のものは再検証する
    for (const other of this.#controls) {
      if (other !== control && this.#async.get(other) !== true) void this.#runOne(other, false)
    }
  }

  /**
   * 中のすべての部品を今すぐ検証し、終わるまで待つ。すべて問題なければ `true`。
   * 送信の直前に、非同期の検証も確定させたいときに使う。
   */
  async validateNow(): Promise<boolean> {
    await Promise.all([...this.#controls].map((c) => this.#runOne(c, false)))
    return [...this.#controls].every(
      (c) => (c as Partial<ValidatorTarget>).validity?.valid !== false,
    )
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // 最初(部品が登録されたとき)と、validate が差し替わったときに、1 回検証する
    if (this.#initial || changed.has('validate')) {
      this.#initial = false
      for (const c of this.#controls) void this.#runOne(c, false)
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.#provider.setValue(this.#info())
  }

  #focusControl = () => {
    ;(this.#controls.values().next().value as HTMLElement | undefined)?.focus()
  }

  protected override render() {
    // 部品が登録されているときだけ、見えている文言を支援技術から隠す（部品側が同じ文言を持つため）
    const hide = this.#controls.size > 0 ? 'true' : undefined
    const label = this.#labelText
    const hint = this.#hintText
    const error = this.#errorText
    const slot = (name: string) =>
      html`<slot name=${name} @slotchange=${() => this.requestUpdate()}></slot>`
    return html`<div part="base" class="flex flex-col gap-1.5">
      <div class=${label ? 'flex items-baseline gap-2' : 'hidden'}>
        <span
          part="label"
          class="text-sm font-medium text-fg"
          aria-hidden=${hide ?? nothing}
          @click=${this.#focusControl}
          >${this.label}${slot('label')}</span
        >
        ${
          this.required
            ? html`<span part="required" class="text-xs text-danger-700" aria-hidden="true"
                >${this.t('field.required')}</span
              >`
            : nothing
        }
      </div>
      <slot></slot>
      <p
        part="hint"
        class=${hint ? 'text-sm text-fg-muted' : 'hidden'}
        aria-hidden=${hide ?? nothing}
      >
        ${this.hint}${slot('hint')}
      </p>
      <p
        part="error"
        class=${error ? 'text-sm text-danger-700' : 'hidden'}
        aria-hidden=${hide ?? nothing}
      >
        ${this.error}${slot('error')}${this.error || this.#slotText('error') ? nothing : this.#reported}
      </p>
    </div>`
  }
}

JimbleField.define('jimble-field')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-field': JimbleField
  }
}
