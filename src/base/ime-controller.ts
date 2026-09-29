import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * IME の変換中を判定する（設計書 §8.3）。
 * `event.isComposing` に加え、Safari が compositionend の直後の Enter に付ける keyCode 229 と、
 * compositionend から次のタスクまでの間も「変換中」として扱う。
 */
export class ImeController implements ReactiveController {
  #host: ReactiveControllerHost & EventTarget
  #composing = false

  constructor(host: ReactiveControllerHost & EventTarget) {
    this.#host = host
    host.addController(this)
  }

  hostConnected(): void {
    this.#host.addEventListener('compositionstart', this.#onStart)
    this.#host.addEventListener('compositionend', this.#onEnd)
  }

  hostDisconnected(): void {
    this.#host.removeEventListener('compositionstart', this.#onStart)
    this.#host.removeEventListener('compositionend', this.#onEnd)
  }

  #onStart = () => {
    this.#composing = true
  }
  #onEnd = () => {
    setTimeout(() => (this.#composing = false), 0)
  }

  /** 変換中に発生した（と見なすべき）キーイベントか。Enter・Esc・矢印などの処理前に確認する */
  isComposing(event?: KeyboardEvent): boolean {
    return this.#composing || !!event?.isComposing || event?.keyCode === 229
  }
}
