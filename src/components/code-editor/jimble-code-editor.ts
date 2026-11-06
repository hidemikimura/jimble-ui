import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as placeholderText,
  type ViewUpdate,
} from '@codemirror/view'
import { css, html, type PropertyDeclarations, type PropertyValues } from 'lit'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { textWrapClasses } from '../../base/text-control.js'
import { sharedSheet } from '../../styles/shared-sheet.js'
import { highlight, theme, variableChips, variableCompletion } from './extensions.js'
import { isCode, loadLanguage, type CodeEditorLanguage } from './languages.js'
import { variableToken, type CodeEditorVariable } from './variables.js'

export type { CodeEditorLanguage } from './languages.js'
export type { CodeEditorVariable } from './variables.js'

/** value プロパティから文書を差し替えた変更(input を発火しない) */
const external = Annotation.define<boolean>()

/** CodeMirror の設定のうち、属性に合わせて差し替える部分。key が変わったときだけ差し替える */
interface Part {
  compartment: Compartment
  key: () => unknown[]
  extension: () => Extension
  last?: unknown[]
}

/**
 * コード・テンプレートの編集欄(CodeMirror 6)。`{{name}}` の変数をチップで見せ、`{{` の入力か
 * Ctrl+Space で変数の候補を出す。`language` で HTML・JSON を色分けする。フォーム関連カスタム要素。
 *
 * CodeMirror を含むので大きい(gzip で約 100 KB。HTML の色分けは、使うときにさらに約 65 KB)。
 * 全部入りの `@hidemikimura/jimble-ui` には含まれない。`@hidemikimura/jimble-ui/code-editor` を
 * import する(CDN は `dist/cdn/code-editor.js`)。
 *
 * @tag jimble-code-editor
 *
 * @csspart base - 枠(ring)を持つラッパー
 * @csspart variable - 変数のチップ
 * @csspart unknown - 未定義の変数のチップ(`variable` と同じ要素)
 *
 * @cssprop [--jimble-code-editor-max-height=20rem] - 高さの上限(超えるとスクロールする)
 * @cssprop [--jimble-code-editor-font-family=var(--jimble-font-mono)] - 字体(`language` が html・json のとき。text は本文の字体)
 * @cssprop [--jimble-code-editor-variable-bg=var(--jimble-color-surface-accent)] - 変数のチップの背景色
 * @cssprop [--jimble-code-editor-variable-fg=var(--jimble-color-text-accent)] - 変数のチップの文字色
 * @cssprop [--jimble-code-editor-variable-radius=var(--jimble-radius-sm)] - 変数のチップの角丸
 * @cssprop [--jimble-input-radius=var(--jimble-radius-control)] - 角丸
 * @cssprop [--jimble-input-width=100%] - 幅
 * @cssprop [--jimble-input-bg=var(--jimble-color-surface)] - 背景色
 * @cssprop [--jimble-input-fg=var(--jimble-color-text)] - 文字色
 * @cssprop [--jimble-input-ring=var(--jimble-color-ring-control)] - 枠の色
 * @cssprop [--jimble-input-ring-focus=var(--jimble-color-ring-focus)] - フォーカス時の枠の色
 * @cssprop [--jimble-input-ring-invalid=var(--jimble-color-ring-invalid)] - エラー時の枠の色
 * @cssprop [--jimble-input-placeholder=var(--jimble-color-text-placeholder)] - プレースホルダーの色
 *
 * @fires input - 利用者の編集・変数の挿入で、値が変わった
 * @fires change - 値を変えて、フォーカスが外れた
 *
 * @cssstate readonly - `readonly`(読み取り専用)
 */
export class JimbleCodeEditor extends JimbleFormElement {
  static override styles = [
    sharedSheet,
    css`
      :host {
        display: block;
        width: var(--jimble-input-width, auto);
      }
    `,
  ]
  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
    placeholder: {},
    readonly: { type: Boolean, reflect: true },
    language: { reflect: true },
    rows: { type: Number },
    lineNumbers: { type: Boolean, attribute: 'line-numbers', reflect: true },
    variables: { attribute: false },
    variablePrefix: { attribute: 'variable-prefix' },
    variableSuffix: { attribute: 'variable-suffix' },
  }

  declare placeholder: string | undefined
  /** 読み取り専用。送信対象・フォーカス可・変更不可 */
  declare readonly: boolean
  /** 色分けする言語(`text`・`html`・`json`) */
  declare language: CodeEditorLanguage
  /** 最小の行数(高さ) */
  declare rows: number
  /** 行番号を出す */
  declare lineNumbers: boolean
  /** 挿入・補完できる変数(`{ name, label?, description? }` の配列。プロパティだけ) */
  declare variables: readonly CodeEditorVariable[]
  /** 変数の開きの区切り */
  declare variablePrefix: string
  /** 変数の閉じの区切り */
  declare variableSuffix: string

  // value: 属性はデフォルト値(リセット先)、プロパティは現在値(jimble-textarea と同じ)
  #value = ''
  #dirty = false
  #fromAttribute = false
  #valueAtFocus: string | null = null
  #view: EditorView | null = null
  #language = new Compartment()
  #languageRequest = 0

  constructor() {
    super()
    this.placeholder = undefined
    this.readonly = false
    this.language = 'text'
    this.rows = 6
    this.lineNumbers = false
    this.variables = []
    this.variablePrefix = '{{'
    this.variableSuffix = '}}'
    this.addEventListener('focusin', () => {
      this.#valueAtFocus ??= this.#value
    })
    this.addEventListener('focusout', () => {
      setTimeout(() => {
        if (this.matches(':focus-within') || this.#valueAtFocus === null) return
        const changed = this.#valueAtFocus !== this.#value
        this.#valueAtFocus = null
        if (changed) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      })
    })
  }

  get value(): string {
    return this.#value
  }
  set value(next: string) {
    const old = this.#value
    this.#value = String(next ?? '')
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('value', old)
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'value') {
      if (this.#dirty) return // 利用者が触った後は、属性の変更で上書きしない(ネイティブ準拠)
      this.#fromAttribute = true
      super.attributeChangedCallback(name, old, value)
      this.#fromAttribute = false
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  /** カーソルの位置(選択中なら、その範囲を置き換えて)に変数を挿入し、エディタにフォーカスを戻す */
  insertVariable(name: string): void {
    const view = this.#view
    if (!view || this.isDisabled || this.readonly) return
    const token = variableToken(name, this.variablePrefix, this.variableSuffix)
    const { from, to } = view.state.selection.main
    // エディタの外(メニュー)から呼ばれたときも、挿入の前の値を「フォーカスしたときの値」にする(change のため)
    this.#valueAtFocus ??= this.#value
    view.dispatch({
      changes: { from, to, insert: token },
      selection: { anchor: from + token.length },
      userEvent: 'input.variable',
      scrollIntoView: true,
    })
    // メニューの jimble-select から呼ばれると、メニューはこの後で、トリガーにフォーカスを戻す。
    // 呼び出し元の処理が終わってから(マイクロタスクで)フォーカスを戻す
    queueMicrotask(() => this.#view?.focus())
  }

  override focus(options?: FocusOptions): void {
    if (this.#view) this.#view.focus()
    else super.focus(options)
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): string {
    return this.#value
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#value = this.getAttribute('value') ?? ''
  }
  protected override restoreValue(state: string): void {
    this.#value = state
    this.#dirty = true
  }
  protected override computeValidity(): ValidityResult {
    // readonly・disabled はネイティブと同じく、必須の検証の対象外
    const required = (this.required || this.field.required) && !this.readonly && !this.isDisabled
    if (!required || this.#value !== '') return { flags: {}, message: '' }
    return {
      flags: { valueMissing: true },
      message: this.t('validation.valueMissing'),
      anchor: this.#view?.contentDOM,
    }
  }

  // ---- CodeMirror ----------------------------------------------------------------------
  // 属性に合わせて差し替える設定
  #parts: Part[] = [
    {
      compartment: new Compartment(),
      key: () => [this.isDisabled, this.readonly],
      extension: () => [
        EditorView.editable.of(!this.isDisabled),
        EditorState.readOnly.of(this.readonly || this.isDisabled),
      ],
    },
    {
      compartment: new Compartment(),
      key: () => [
        this.variables,
        this.variablePrefix,
        this.variableSuffix,
        this.t('codeEditor.unknownVariable', { name: '' }),
      ],
      extension: () => {
        const prefix = this.variablePrefix
        const suffix = this.variableSuffix
        // 開きと閉じが同じ・空だと、閉じた変数の後ろを新しい変数の入力と見分けられず、補完が文書を壊す
        if (!prefix || !suffix || prefix === suffix) {
          this.warn(`variable-prefix と variable-suffix は、空でない、違う文字にしてください`)
          return []
        }
        const options = {
          variables: this.variables,
          prefix,
          suffix,
          unknownTitle: (name: string) => this.t('codeEditor.unknownVariable', { name }),
        }
        return [variableChips(options), variableCompletion(options)]
      },
    },
    {
      // 文言は言語だけで決まる。変数と同じ区画にすると、phrases が変わるたびに、全体を描き直す
      compartment: new Compartment(),
      key: () => [this.t('codeEditor.completions')],
      extension: () => EditorState.phrases.of({ Completions: this.t('codeEditor.completions') }),
    },
    {
      compartment: new Compartment(),
      key: () => [this.lineNumbers],
      extension: () => (this.lineNumbers ? lineNumbers() : []),
    },
    {
      compartment: new Compartment(),
      key: () => [this.placeholder ?? ''],
      extension: () => (this.placeholder ? placeholderText(this.placeholder) : []),
    },
    {
      compartment: new Compartment(),
      key: () => [JSON.stringify(this.#contentAttributes())],
      extension: () => EditorView.contentAttributes.of(this.#contentAttributes()),
    },
  ]

  /** 編集領域(role=textbox)の名前・説明・状態。説明の要素は、同じ Shadow ツリーにある */
  #contentAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {}
    const name = this.accessibleName()
    if (name) attrs['aria-label'] = name
    if (this.describedBy) attrs['aria-describedby'] = this.describedBy
    if (this.showInvalid) attrs['aria-invalid'] = 'true'
    if (this.required || this.field.required) attrs['aria-required'] = 'true'
    if (this.readonly) attrs['aria-readonly'] = 'true'
    if (this.isDisabled) attrs['aria-disabled'] = 'true'
    return attrs
  }

  #create() {
    const parent = this.renderRoot.querySelector<HTMLElement>('[part="editor"]')
    if (!parent || this.#view) return
    const parts = this.#parts.map((p) => {
      p.last = p.key()
      return p.compartment.of(p.extension())
    })
    this.#view = new EditorView({
      parent,
      root: this.shadowRoot!,
      state: EditorState.create({
        doc: this.#value,
        extensions: [
          history(),
          // Tab は割り当てない(フォーカスを閉じ込めない。Tab で次の項目へ移る)
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          theme,
          highlight,
          this.#language.of([]),
          ...parts,
          EditorView.updateListener.of((u) => this.#onUpdate(u)),
        ],
      }),
    })
    void this.#loadLanguage()
  }

  #onUpdate(update: ViewUpdate) {
    if (!update.docChanged || update.transactions.some((t) => t.annotation(external))) return
    this.#value = update.state.doc.toString()
    this.#dirty = true
    this.commit()
    this.requestUpdate()
    // CodeMirror の更新の途中なので、リスナーが insertVariable() などを呼べるよう、更新の後で発火する
    queueMicrotask(() => this.dispatchEvent(new Event('input', { bubbles: true, composed: true })))
  }

  async #loadLanguage() {
    const request = ++this.#languageRequest
    const language = this.language
    try {
      const extension = await loadLanguage(language)
      if (request !== this.#languageRequest || !this.#view) return
      this.#view.dispatch({ effects: this.#language.reconfigure(extension) })
    } catch (error) {
      // 読み込めなくても(CDN の通信の失敗など)、色分けなしで編集できる
      this.warn(`language="${language}" の色分けを読み込めませんでした: ${String(error)}`)
    }
  }

  #sync() {
    const view = this.#view
    if (!view) return
    const effects = this.#parts.flatMap((p) => {
      const key = p.key()
      if (p.last && key.length === p.last.length && key.every((k, i) => Object.is(k, p.last![i])))
        return []
      p.last = key
      return [p.compartment.reconfigure(p.extension())]
    })
    const doc = view.state.doc.toString()
    const replace = doc !== this.#value
    // 何も変わらないときは送らない(空の更新でも、入力中の DOM の変更・選択の検出が捨てられる)
    if (!effects.length && !replace) return
    if (replace && this.matches(':focus-within')) this.#valueAtFocus = this.#value
    view.dispatch({
      effects,
      ...(replace
        ? {
            changes: { from: 0, to: doc.length, insert: this.#value },
            // プログラムからの変更(value・reset)は、元に戻す(Ctrl+Z)の履歴に入れない
            annotations: [external.of(true), Transaction.addToHistory.of(false)],
          }
        : {}),
    })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasUpdated) return
    this.#create()
    // 新しいエディタで、検証のフォーカス先(anchor)と、属性に合わせた設定を作り直す
    this.requestUpdate()
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#view?.destroy()
    this.#view = null
  }

  protected override firstUpdated(): void {
    this.#create()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.setState('readonly', this.readonly)
    // 最初の描画では #create が読み込む(古い値が undefined のときは最初の描画)
    if (changed.get('language') !== undefined && this.#view) void this.#loadLanguage()
    this.#sync()
  }

  protected override render() {
    const font = isCode(this.language)
      ? '[--_font:var(--jimble-code-editor-font-family,var(--font-mono))]'
      : '[--_font:var(--font-sans)]'
    return html`<div
        part="base"
        class="${textWrapClasses(this.size, this.showInvalid, this.isDisabled)} px-0! ${font}"
        style="--_rows: ${Math.max(1, this.rows)}"
        @input=${this.#stopNativeInput}
      >
        <div part="editor" class="flex min-w-0 flex-1"></div>
      </div>
      ${this.renderDescriptions()}`
  }

  // 編集領域(contenteditable)のネイティブの input は止め、値が変わったときに host から発火する
  #stopNativeInput = (event: Event) => {
    event.stopPropagation()
  }
}

JimbleCodeEditor.define('jimble-code-editor')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-code-editor': JimbleCodeEditor
  }
}
