// 開いているモーダル(<dialog>)の重なり。toast の領域が、いちばん上のモーダルの中へ移動するために使う。
// （モーダルの外は inert になり、外にある toast は操作も読み上げもできなくなるため。設計書 R4）
const KEY = Symbol.for('jimble-ui.modal-stack')
interface Store {
  stack: HTMLElement[]
  events: EventTarget
}
const store = ((globalThis as Record<symbol, unknown>)[KEY] ??= {
  stack: [],
  events: new EventTarget(),
} satisfies Store) as Store

const notify = () => store.events.dispatchEvent(new Event('change'))

export function pushModal(el: HTMLElement): void {
  store.stack.push(el)
  notify()
}
export function popModal(el: HTMLElement): void {
  const i = store.stack.lastIndexOf(el)
  if (i >= 0) store.stack.splice(i, 1)
  notify()
}
export function topModal(): HTMLElement | undefined {
  return store.stack[store.stack.length - 1]
}
export function onModalChange(fn: () => void): () => void {
  store.events.addEventListener('change', fn)
  return () => store.events.removeEventListener('change', fn)
}
