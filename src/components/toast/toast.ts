import './jimble-toast.js'
import './jimble-toast-region.js'
import type { JimbleToast, ToastVariant } from './jimble-toast.js'
import type { JimbleToastRegion } from './jimble-toast-region.js'
import '../button/jimble-button.js'

export interface ToastOptions {
  /** 表示する文言 */
  message: string
  /** 種別（既定 info） */
  variant?: ToastVariant
  /** 見出し */
  heading?: string
  /** 自動で消えるまでの時間(ms)。0 は自動で消えない。省略時は種別ごと（danger と操作付きは消えない） */
  duration?: number
  /** 閉じるボタン（既定 true） */
  dismissible?: boolean
  /** 操作ボタン。押すと onClick を呼んで通知を閉じる */
  action?: { label: string; onClick?: () => void }
}

export interface ToastHandle {
  /** 通知を閉じる */
  dismiss(): void
  /** 通知の要素 */
  readonly element: JimbleToast
}

// リージョンはモーダルの <dialog>（Shadow DOM の内側）へ移動することがあり、document.querySelector では
// 見つからなくなる。重複して作らないよう、参照を共通に保持する（CDN と個別 import の併用でも共有）。
const REGION = Symbol.for('jimble-ui.toast-region')

function ensureRegion(): JimbleToastRegion {
  const store = globalThis as Record<symbol, JimbleToastRegion | undefined>
  let region = store[REGION]
  if (!region?.isConnected) {
    region = document.querySelector<JimbleToastRegion>('jimble-toast-region') ?? undefined
  }
  if (!region) {
    region = document.createElement('jimble-toast-region')
    ;(document.body ?? document.documentElement).append(region)
  }
  store[REGION] = region
  return region
}

/**
 * 通知を表示する。文字列だけを渡すこともできる。
 *
 * ```js
 * toast('保存しました')
 * toast({ message: '削除できません', variant: 'danger' })
 * ```
 */
function show(input: string | ToastOptions): ToastHandle {
  const o: ToastOptions = typeof input === 'string' ? { message: input } : input
  const variant = o.variant ?? 'info'
  const el = document.createElement('jimble-toast')
  el.variant = variant
  if (o.duration !== undefined) el.duration = o.duration
  if (o.dismissible === false) el.dismissible = false
  // 重要度の高いものは assertive(即時に読み上げ)、それ以外は polite
  el.slot = variant === 'danger' || variant === 'warning' ? 'assertive' : 'polite'
  if (o.heading) {
    const h = document.createElement('span')
    h.slot = 'title'
    h.textContent = o.heading
    el.append(h)
  }
  el.append(document.createTextNode(o.message))
  if (o.action) {
    const button = document.createElement('jimble-button')
    button.slot = 'actions'
    button.size = 'sm'
    button.variant = 'ghost'
    button.textContent = o.action.label
    button.addEventListener('click', () => {
      o.action?.onClick?.()
      el.dismiss()
    })
    el.append(button)
  }
  const region = ensureRegion()
  region.append(el)
  region.promote()
  return { dismiss: () => el.dismiss(), element: el }
}

/** toast.success('...') などの近道 */
export interface Toast {
  (input: string | ToastOptions): ToastHandle
  info(message: string, options?: Omit<ToastOptions, 'message' | 'variant'>): ToastHandle
  success(message: string, options?: Omit<ToastOptions, 'message' | 'variant'>): ToastHandle
  warning(message: string, options?: Omit<ToastOptions, 'message' | 'variant'>): ToastHandle
  danger(message: string, options?: Omit<ToastOptions, 'message' | 'variant'>): ToastHandle
}

type Shortcut = (
  message: string,
  options?: Omit<ToastOptions, 'message' | 'variant'>,
) => ToastHandle
const shortcut =
  (variant: ToastVariant): Shortcut =>
  (message, options = {}) =>
    show({ ...options, message, variant })

export const toast: Toast = Object.assign(show, {
  info: shortcut('info'),
  success: shortcut('success'),
  warning: shortcut('warning'),
  danger: shortcut('danger'),
})
