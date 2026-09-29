import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { onLocaleChange } from '../i18n/index.js'

/** ロケールが変わったらホストを再描画する */
export class LocalizeController implements ReactiveController {
  #host: ReactiveControllerHost
  #off?: () => void

  constructor(host: ReactiveControllerHost) {
    this.#host = host
    host.addController(this)
  }

  hostConnected(): void {
    this.#off = onLocaleChange(() => this.#host.requestUpdate())
  }

  hostDisconnected(): void {
    this.#off?.()
    this.#off = undefined
  }
}
