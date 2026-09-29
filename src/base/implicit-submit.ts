// Enter による暗黙の送信(ネイティブの <input> と同じ規則)。
// Shadow 内の <input> は外側の <form> に属さないので、ブラウザは送信してくれない。自前で行う(設計書 §5.4)。
import type { ImeController } from './ime-controller.js'

// ネイティブで Enter による暗黙の送信を「ブロックする」フィールドの type
const NATIVE_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
  'number',
])

/** テキストを入力するタイプの jimble 部品は、クラスに `static implicitSubmitBlocker = true` を持つ */
function isBlocker(e: Element): boolean {
  if (e instanceof HTMLInputElement) return NATIVE_TYPES.has(e.type)
  return (e.constructor as { implicitSubmitBlocker?: boolean }).implicitSubmitBlocker === true
}

function submit(form: HTMLFormElement) {
  const button = form.querySelector<HTMLElement>(
    'button:not([type="button"]):not([type="reset"]), input[type="submit"], input[type="image"], jimble-button[type="submit"]',
  )
  if (button) {
    if (button.localName === 'jimble-button') {
      const b = button as HTMLElement & { disabled: boolean; loading: boolean }
      if (b.disabled || b.loading || button.matches(':state(disabled)')) return
      form.requestSubmit()
    } else if (!(button as HTMLButtonElement).disabled) {
      form.requestSubmit(button as HTMLButtonElement)
    }
    return
  }
  // 送信ボタンが無いときは、送信をブロックするフィールドが 1 つだけの場合に限って送信する
  if ([...form.elements].filter(isBlocker).length <= 1) form.requestSubmit()
}

/**
 * keydown を受けて、Enter なら暗黙の送信を予約する。
 * IME の変換中・修飾キー付き・preventDefault 済みでは送信しない。送信は「既定動作」なので、
 * イベント配信が終わってから defaultPrevented を見て行う(祖先の keydown で止められる)。
 */
export function handleImplicitSubmit(
  event: KeyboardEvent,
  form: HTMLFormElement | null,
  disabled: boolean,
  ime: ImeController,
): void {
  if (event.key !== 'Enter' || event.defaultPrevented || ime.isComposing(event)) return
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
  if (!form || disabled) return
  setTimeout(() => {
    if (!event.defaultPrevented) submit(form)
  })
}
