import { ContextConsumer, createContext } from '@lit/context'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** jimble-field が子のコントロールへ渡す情報（設計書 §5.5） */
export interface FieldInfo {
  label: string
  hint: string
  /** 表示するエラー（明示された error 属性 ＞ コントロールの検証メッセージ） */
  error: string
  /** error 属性で明示されたエラーか（コントロールを invalid 表示にする） */
  explicitError: boolean
  required: boolean
  /** コントロールが自分を登録する（ラベルのクリックで focus するため）。戻り値で解除 */
  register(control: HTMLElement): () => void
  /** 中に登録されているコントロールの数(複数あるときは、部品ごとの名前を組み合わせる) */
  count: number
  /** コントロールの値が変わった(プログラムからの変更も含む)ことを知らせる。field の validate が、必要なら再検証する */
  valueChanged(control: HTMLElement): void
  /** コントロールが検証メッセージ（touched 後のみ）を報告する。複数あるときは、無効な最初のものを表示する */
  report(control: HTMLElement, message: string): void
}

export const fieldContext = createContext<FieldInfo>(Symbol.for('jimble-ui.field'))

type Host = ReactiveControllerHost & HTMLElement

/**
 * フォーム部品側: 最寄りの jimble-field に自分を登録し、ラベル・ヒント・エラーの文字列を受け取る。
 * ARIA の IDREF は Shadow 境界をまたげないため、文字列を受けて自分の Shadow 内に写す（ミラーリング）。
 */
export class FieldControlController implements ReactiveController {
  #info?: FieldInfo
  #unregister?: () => void
  #reported = ''

  #host: Host

  constructor(host: Host) {
    this.#host = host
    host.addController(this)
    new ContextConsumer(host, {
      context: fieldContext,
      subscribe: true,
      callback: (info) => {
        if (!info) return // field がまだ値を提供していない
        this.#info = info
        this.#unregister ??= info.register(host)
        host.requestUpdate()
      },
    })
  }

  hostDisconnected(): void {
    this.#unregister?.()
    this.#unregister = undefined
  }

  get inField(): boolean {
    return this.#info !== undefined
  }
  get label(): string {
    return this.#info?.label ?? ''
  }
  get hint(): string {
    return this.#info?.hint ?? ''
  }
  get error(): string {
    return this.#info?.error ?? ''
  }
  get explicitError(): boolean {
    return this.#info?.explicitError ?? false
  }
  /** 同じ field の中の部品の数 */
  get count(): number {
    return this.#info?.count ?? 0
  }
  get required(): boolean {
    return this.#info?.required ?? false
  }

  /** 値が変わったことを field に伝える */
  valueChanged(): void {
    this.#info?.valueChanged(this.#host)
  }

  /** 検証メッセージを field に伝える（変化したときだけ） */
  report(message: string): void {
    if (message === this.#reported) return
    this.#reported = message
    this.#info?.report(this.#host, message)
  }
}
