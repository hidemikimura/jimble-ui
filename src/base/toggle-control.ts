import type { PropertyDeclarations } from 'lit'
import { JimbleFormElement } from './form-element.js'
import type { ValidationContext } from './validation.js'

/**
 * checkbox / switch 共通の基底。`checked`（属性=デフォルト、プロパティ=現在）と、
 * 送信値（チェック時は value、既定 "on"。未チェックは送信しない）を持つ。
 */
export abstract class JimbleToggleControl extends JimbleFormElement {
  static override properties: PropertyDeclarations = {
    checked: { noAccessor: true },
    value: {},
  }

  /** チェック時にフォームへ送る値 */
  declare value: string

  #checked = false
  #dirty = false
  #fromAttribute = false

  /** 現在の状態。`checked` 属性はデフォルト（リセット先）で、ユーザーが触った後は属性の変更で上書きしない */
  get checked(): boolean {
    return this.#checked
  }
  set checked(next: boolean) {
    const old = this.#checked
    this.#checked = !!next
    if (!this.#fromAttribute) this.#dirty = true
    this.requestUpdate('checked', old)
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'checked') {
      if (this.#dirty) return
      this.#fromAttribute = true
      this.checked = value !== null
      this.#fromAttribute = false
      return
    }
    super.attributeChangedCallback(name, old, value)
  }

  constructor() {
    super()
    this.value = 'on'
    // 外側の <label for> のクリックは host に届くので、内部の input に転送する
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] !== this) return
      event.stopImmediatePropagation()
      if (!this.isDisabled) this.nativeControl?.click()
    })
  }

  protected get formValue(): string | null {
    return this.#checked ? this.value || 'on' : null
  }
  protected override get formState(): string {
    return this.#checked ? 'checked' : 'unchecked'
  }
  protected resetValue(): void {
    this.#dirty = false
    this.#checked = this.hasAttribute('checked')
  }
  protected override restoreValue(state: string): void {
    this.#checked = state === 'checked'
    this.#dirty = true
  }
  protected override get validationContext(): ValidationContext {
    return { missing: 'check' }
  }
  protected override get nativeControl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input') ?? null
  }

  /** 内部 input の change を取り込み、host から change を再発火する（input は composed で届く） */
  protected onToggle = (event: Event) => {
    event.stopPropagation()
    this.checked = (event.target as HTMLInputElement).checked
    this.afterToggle()
    this.commit()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }
  protected afterToggle(): void {}

  override focus(options?: FocusOptions): void {
    this.nativeControl?.focus(options)
  }
}
