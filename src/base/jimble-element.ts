import { LitElement, type CSSResultGroup } from 'lit'
import type { MessageKey, MessageParams } from '../i18n/index.js'
import { translate } from '../i18n/index.js'
import { sharedSheet } from '../styles/shared-sheet.js'
import { LocalizeController } from './localize-controller.js'

let uidCounter = 0

/** 全コンポーネントの基底クラス（設計書 §3）。 */
export class JimbleElement extends LitElement {
  static override styles: CSSResultGroup = [sharedSheet]

  // ロケール変更で再描画するために接続しておく
  readonly #localize = new LocalizeController(this)
  #internals?: ElementInternals

  /**
   * タグを登録する。CDN と個別 import の二重登録でも例外にならない（先勝ち + 開発時に警告）。
   */
  static define(this: CustomElementConstructor, tag: string): void {
    if (customElements.get(tag)) {
      if (__DEV__ && customElements.get(tag) !== this) {
        console.warn(`[jimble-ui] <${tag}> は既に別の定義で登録されています。`)
      }
      return
    }
    customElements.define(tag, this)
  }

  /** ElementInternals（attachInternals は 1 回しか呼べないので、ここでキャッシュする） */
  protected get internals(): ElementInternals {
    return (this.#internals ??= this.attachInternals())
  }

  /** `:state(name)` を切り替える。CSS からは `jimble-xxx:state(name)` で選べる */
  protected setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name)
    else this.internals.states.delete(name)
  }

  /** 画面に出す文言を現在の言語で返す */
  protected t(key: MessageKey, params?: MessageParams): string {
    void this.#localize
    return translate(key, params)
  }

  /** 同一 root 内で使う ID（aria-describedby など）を作る */
  protected uid(prefix = 'jimble'): string {
    return `${prefix}-${++uidCounter}`
  }

  /**
   * `jimble-` を付けて CustomEvent を発火する。既定では**バブルしない**(composed)。
   *
   * 開閉・選択・並べ替えなど「この部品自身の状態の通知」は、ネイティブの `close` / `toggle` と同じく、
   * バブルさせない。同じ名前(`jimble-open` / `jimble-close` など)を多くの部品が使うので、バブルすると、
   * ドロワーの中の select の `jimble-close` を、ドロワーのリスナーが受け取ってしまう。
   * アプリ全体で受ける通知(ルーターなど)だけ、`bubbles: true` を指定する。
   */
  protected emit<T = undefined>(
    name: string,
    init: { detail?: T; cancelable?: boolean; bubbles?: boolean } = {},
  ): CustomEvent<T> {
    const event = new CustomEvent<T>(`jimble-${name}`, {
      bubbles: init.bubbles ?? false,
      composed: true,
      cancelable: init.cancelable ?? false,
      detail: init.detail as T,
    })
    this.dispatchEvent(event)
    return event
  }

  /** 開発ビルドだけのコンソール警告。本番では呼び出しごと除去される。 */
  protected warn(message: string): void {
    if (__DEV__) console.warn(`[jimble-ui] <${this.localName}> ${message}`)
  }
}
