import type { ReactiveController, ReactiveControllerHost } from 'lit'

const DEFAULT = '[default]'

/** スロットに中身があるかを判定し、変化したら再描画する（ラベル・ヘッダーの有無で描画を変える用途） */
export class SlotController implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.#host = host
    host.addController(this)
  }

  hostConnected(): void {
    this.#host.shadowRoot?.addEventListener('slotchange', this.#onSlotChange)
  }

  hostDisconnected(): void {
    this.#host.shadowRoot?.removeEventListener('slotchange', this.#onSlotChange)
  }

  #onSlotChange = () => this.#host.requestUpdate()

  /** 名前付きスロット、または既定スロット（引数なし）に中身があるか */
  hasSlot(name: string = DEFAULT): boolean {
    return [...this.#host.childNodes].some((node) => {
      if (name === DEFAULT) {
        if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
        return node.nodeType === Node.ELEMENT_NODE && !(node as Element).hasAttribute('slot')
      }
      return node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('slot') === name
    })
  }
}
