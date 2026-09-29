import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { JimbleFormElement, type ValidityResult } from '../../base/form-element.js'
import { check } from '../../icons/check.js'
import { renderIcon } from '../../icons/render.js'
import { xMark } from '../../icons/xMark.js'
import { arrowPath } from '../../icons/arrowPath.js'
import { arrowUpTray } from '../../icons/arrowUpTray.js'
import { document as documentIcon } from '../../icons/document.js'

export type FileStatus = 'ready' | 'uploading' | 'done' | 'error' | 'rejected'
export type FileRejectReason = 'type' | 'size' | 'count'

/** `upload` に渡す補助 */
export interface FileUploadContext {
  /** 進捗を 0〜1 で伝える */
  onProgress: (fraction: number) => void
  /** 中止されたときに abort される(fetch に渡す) */
  signal: AbortSignal
}
/**
 * ファイルをサーバーへ送る関数。成功したら、フォームに送る値(サーバーが返した ID など)を返す。
 * 返さなければ(`undefined`)、フォームにはファイル名が送られる。失敗するときは例外を投げる。
 */
export type FileUploader = (
  file: File,
  context: FileUploadContext,
) => Promise<string | { value: string } | void>

/** 追加されたファイル(一覧の 1 行) */
export interface FileEntry {
  id: string
  file: File
  status: FileStatus
  /** 進捗 0〜1(アップロード中) */
  progress: number
  /** エラー・拒否の理由 */
  message?: string
  /** `upload` が返した値 */
  result?: string
}

let entryCounter = 0

const ZONE =
  'flex w-full flex-col items-center gap-2 border-2 border-dashed bg-surface-muted px-4 py-6 text-center text-sm ' +
  '[border-radius:var(--jimble-file-input-radius,var(--radius-control))]'
const BROWSE =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium bg-surface text-fg ' +
  'ring-1 ring-inset ring-line-control hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 ' +
  'outline outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
const ICON_BTN =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer text-fg-muted ' +
  'hover:bg-surface-sunken hover:text-fg outline outline-1 outline-transparent ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'

/** バイト数を読みやすく(1.5 MB など) */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let n = bytes / 1024
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n >= 10 || Number.isInteger(n) ? Math.round(n) : n.toFixed(1)} ${units[i]}`
}

/** `accept`（`.pdf,image/*` など）にファイルが合うか。`accept` が空なら常に合う */
export function matchesAccept(file: File, accept: string | undefined): boolean {
  const tokens = (accept ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((t) =>
    t.startsWith('.')
      ? name.endsWith(t)
      : t.endsWith('/*')
        ? type.startsWith(t.slice(0, -1))
        : type === t,
  )
}

/**
 * ファイルの添付。ドロップエリアにファイルをドラッグ＆ドロップするか、ボタンからファイルを選ぶ。
 * 選んだファイルは一覧に出て、個別に削除できる。フォーム関連カスタム要素で、ファイルはそのままフォームに送られる。
 *
 * - `accept`・`max-size`・`max-files` に合わないファイルは追加されず、理由つきで一覧に出る(`jimble-reject`)。
 * - `upload` に関数を渡すと、追加されたファイルを自動でサーバーへ送る(進捗表示・中止・再試行つき)。
 *   その場合、フォームには**サーバーが返した値**(ID など)が送られ、ファイルそのものは送られない。
 *   アップロード中・失敗のファイルがあるとフォームの検証が通らない。
 * - 画像は `preview` でサムネイルを出せる(`blob:` の画像を許可する CSP が必要)。
 * - ドラッグ＆ドロップができない利用者のために、ボタンからも選べる(ボタンがキーボードの操作先)。
 * - フォルダーのドロップは未対応。
 *
 * @tag jimble-file-input
 *
 * @csspart dropzone - ドロップエリア
 * @csspart browse - ファイルを選ぶボタン
 * @csspart hint - 形式・サイズ・数の制限の説明
 * @csspart list - ファイルの一覧
 * @csspart item - ファイル 1 件
 * @csspart preview - サムネイル
 * @csspart name - ファイル名
 * @csspart status - 状態の表示
 * @csspart progress - 進捗バー
 * @csspart remove - 削除(アップロード中は中止)ボタン
 * @csspart retry - 再試行ボタン
 *
 * @cssprop [--jimble-file-input-radius=var(--jimble-radius-control)] - ドロップエリアの角丸
 *
 * @fires input - ファイルが追加・削除された
 * @fires change - ファイルが追加・削除された
 * @fires jimble-reject - 制限に合わず追加されなかった。`detail` は `{ file, reason: 'type' | 'size' | 'count' }`
 * @fires jimble-upload-start - アップロードを始めた。`detail.file`
 * @fires jimble-upload-complete - アップロードが完了した。`detail` は `{ file, value }`
 * @fires jimble-upload-error - アップロードが失敗した。`detail` は `{ file, error }`
 */
export class JimbleFileInput extends JimbleFormElement {
  static override properties: PropertyDeclarations = {
    accept: {},
    multiple: { type: Boolean, reflect: true },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    preview: { type: Boolean, reflect: true },
    upload: { attribute: false },
    entries: { state: true },
    dragging: { state: true },
  }

  /** 受け付けるファイル。`<input accept>` と同じ書き方（`.pdf,image/*`） */
  declare accept: string | undefined
  /** 複数のファイルを選べる。付けなければ 1 つだけ(新しく選ぶと置き換わる) */
  declare multiple: boolean
  /** 1 ファイルの最大サイズ（バイト） */
  declare maxSize: number | undefined
  /** ファイルの最大数（`multiple` のとき） */
  declare maxFiles: number | undefined
  /** 画像のサムネイルを出す */
  declare preview: boolean
  /** ファイルをサーバーへ送る関数。指定すると、追加されたファイルを自動で送る */
  declare upload: FileUploader | undefined
  declare entries: FileEntry[]
  declare dragging: boolean

  #announcement = ''
  #announceTimer: ReturnType<typeof setTimeout> | undefined
  #aborts = new Map<string, AbortController>()
  #previews = new Map<string, string>()
  #hintId = this.uid('file-hint')
  #dragDepth = 0

  constructor() {
    super()
    this.accept = undefined
    this.multiple = false
    this.maxSize = undefined
    this.maxFiles = undefined
    this.preview = false
    this.upload = undefined
    this.entries = []
    this.dragging = false
  }

  /** 追加済みのファイル(拒否されたものを除く) */
  get files(): File[] {
    return this.#accepted.map((e) => e.file)
  }
  get #accepted(): FileEntry[] {
    return this.entries.filter((e) => e.status !== 'rejected')
  }

  protected override get nativeControl(): HTMLButtonElement | null {
    return this.renderRoot?.querySelector<HTMLButtonElement>('[part="browse"]') ?? null
  }
  get #input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('input[type="file"]') ?? null
  }

  // ---- フォーム ------------------------------------------------------------------------
  protected get formValue(): FormData | null {
    if (!this.name) return null
    const data = new FormData()
    let any = false
    for (const e of this.#accepted) {
      if (this.upload) {
        if (e.status !== 'done') continue
        data.append(this.name, e.result ?? e.file.name)
      } else {
        data.append(this.name, e.file)
      }
      any = true
    }
    return any ? data : null
  }
  protected override get formState(): string | null {
    return null // ファイルは復元できない
  }
  protected resetValue(): void {
    this.#clearAll()
  }
  protected override computeValidity(): ValidityResult {
    const anchor = this.nativeControl ?? undefined
    const accepted = this.#accepted
    if (accepted.some((e) => e.status === 'uploading' || e.status === 'error')) {
      return { flags: { customError: true }, message: this.t('file.uploadPending'), anchor }
    }
    if ((this.required || this.field.required) && accepted.length === 0) {
      return { flags: { valueMissing: true }, message: this.t('validation.valueMissing'), anchor }
    }
    return { flags: {}, message: '' }
  }

  // ---- 追加・削除 ----------------------------------------------------------------------
  #announce(text: string) {
    this.#announcement = text
    clearTimeout(this.#announceTimer)
    this.#announceTimer = setTimeout(() => {
      this.#announcement = ''
      this.requestUpdate()
    }, 3000)
    this.requestUpdate()
  }

  #reasonText(reason: FileRejectReason): string {
    return reason === 'type'
      ? this.t('file.rejectType')
      : reason === 'size'
        ? this.t('file.rejectSize', { size: formatBytes(this.maxSize ?? 0) })
        : this.t('file.rejectCount', { count: this.maxFiles ?? 0 })
  }

  /** ファイルを追加する(ドロップ・選択・プログラムから)。合わないファイルは、理由つきで一覧に出て、追加されない */
  addFiles(files: Iterable<File>): void {
    if (this.isDisabled || this.readonlyLike) return
    const incoming = [...files]
    if (!incoming.length) return
    let next = [...this.entries]
    const added: FileEntry[] = []
    const rejects: FileEntry[] = []
    // 1 つだけ選べるときは、新しいファイルで置き換える
    const targets = this.multiple ? incoming : incoming.slice(-1)
    if (!this.multiple) {
      for (const e of next.filter((e) => e.status !== 'rejected')) this.#dispose(e)
      next = []
    }
    next = next.filter((e) => e.status !== 'rejected') // 前回の拒否表示は、新しい操作で消す
    for (const file of targets) {
      let reason: FileRejectReason | undefined
      if (!matchesAccept(file, this.accept)) reason = 'type'
      else if (this.maxSize != null && file.size > this.maxSize) reason = 'size'
      else if (
        this.multiple &&
        this.maxFiles != null &&
        next.filter((e) => e.status !== 'rejected').length + added.length >= this.maxFiles
      ) {
        reason = 'count'
      }
      const entry: FileEntry = {
        id: `f${++entryCounter}`,
        file,
        status: reason ? 'rejected' : 'ready',
        progress: 0,
        message: reason ? this.#reasonText(reason) : undefined,
      }
      if (reason) {
        rejects.push(entry)
        this.emit('reject', { detail: { file, reason } })
      } else {
        added.push(entry)
        if (this.preview && file.type.startsWith('image/')) {
          this.#previews.set(entry.id, URL.createObjectURL(file))
        }
      }
    }
    this.entries = [...next, ...added, ...rejects]
    if (added.length) {
      this.commit()
      this.#announce(this.t('file.added', { name: added.map((e) => e.file.name).join('、') }))
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      for (const e of added) if (this.upload) void this.#startUpload(e)
    }
    if (rejects.length) {
      this.#announce(
        rejects
          .map((e) => this.t('file.rejected', { name: e.file.name, reason: e.message! }))
          .join('。'),
      )
    }
  }

  // readonly はこの部品に無いので、常に false(将来の拡張用に分けている)
  get readonlyLike(): boolean {
    return false
  }

  #dispose(e: FileEntry) {
    this.#aborts.get(e.id)?.abort()
    this.#aborts.delete(e.id)
    const url = this.#previews.get(e.id)
    if (url) URL.revokeObjectURL(url)
    this.#previews.delete(e.id)
  }

  /** ファイルを 1 つ取り除く(アップロード中なら中止する) */
  removeFile(file: File | string): void {
    const e = this.entries.find((x) => x.id === file || x.file === file)
    if (!e) return
    this.#dispose(e)
    this.entries = this.entries.filter((x) => x !== e)
    if (e.status !== 'rejected') {
      this.commit()
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
    this.#announce(this.t('file.removed', { name: e.file.name }))
  }

  /** すべて取り除く */
  clear(): void {
    const had = this.#accepted.length > 0
    this.#clearAll()
    if (had) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }
  #clearAll() {
    for (const e of this.entries) this.#dispose(e)
    this.entries = []
    this.commit()
  }

  #patch(id: string, patch: Partial<FileEntry>) {
    this.entries = this.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
  }

  async #startUpload(entry: FileEntry) {
    const upload = this.upload
    if (!upload) return
    const abort = new AbortController()
    this.#aborts.set(entry.id, abort)
    this.#patch(entry.id, { status: 'uploading', progress: 0, message: undefined })
    this.commit()
    this.emit('upload-start', { detail: { file: entry.file } })
    try {
      const result = await upload(entry.file, {
        onProgress: (n) => {
          if (!abort.signal.aborted)
            this.#patch(entry.id, { progress: Math.min(Math.max(n, 0), 1) })
        },
        signal: abort.signal,
      })
      if (abort.signal.aborted) return
      const value = typeof result === 'string' ? result : result?.value
      this.#patch(entry.id, { status: 'done', progress: 1, result: value })
      this.commit()
      this.#announce(this.t('file.uploaded', { name: entry.file.name }))
      this.emit('upload-complete', { detail: { file: entry.file, value } })
    } catch (error) {
      if (abort.signal.aborted) return
      this.#patch(entry.id, { status: 'error', message: this.t('file.error') })
      this.commit()
      this.#announce(this.t('file.uploadFailed', { name: entry.file.name }))
      this.emit('upload-error', { detail: { file: entry.file, error } })
    } finally {
      this.#aborts.delete(entry.id)
    }
  }

  // ---- 入力・ドロップ ------------------------------------------------------------------
  #openPicker = () => {
    if (!this.isDisabled) this.#input?.click()
  }
  #onPick = (event: Event) => {
    event.stopPropagation() // ネイティブの change は出さず、追加後に host から出す
    const input = event.target as HTMLInputElement
    const files = [...(input.files ?? [])]
    input.value = '' // 同じファイルをもう一度選べるようにする
    this.addFiles(files)
  }

  #hasFiles(e: DragEvent): boolean {
    return [...(e.dataTransfer?.types ?? [])].includes('Files')
  }
  #onDragEnter = (e: DragEvent) => {
    if (!this.#hasFiles(e) || this.isDisabled) return
    e.preventDefault()
    this.#dragDepth++
    this.dragging = true
  }
  #onDragOver = (e: DragEvent) => {
    if (!this.#hasFiles(e) || this.isDisabled) return
    e.preventDefault() // これが無いと drop が起きない
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
  #onDragLeave = () => {
    this.#dragDepth = Math.max(0, this.#dragDepth - 1)
    if (this.#dragDepth === 0) this.dragging = false
  }
  #onDrop = (e: DragEvent) => {
    if (!this.#hasFiles(e)) return
    e.preventDefault()
    this.#dragDepth = 0
    this.dragging = false
    if (this.isDisabled) return
    this.addFiles(e.dataTransfer?.files ?? [])
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    for (const e of this.entries) this.#dispose(e)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('entries')) this.setState('has-files', this.#accepted.length > 0)
    this.setState('dragging', this.dragging)
  }

  // ---- 描画 ----------------------------------------------------------------------------
  #hint(): string {
    const parts: string[] = []
    if (this.accept)
      parts.push(
        this.t('file.accept', {
          types: this.accept
            .split(',')
            .map((s) => s.trim())
            .join('、'),
        }),
      )
    if (this.maxSize != null)
      parts.push(this.t('file.maxSize', { size: formatBytes(this.maxSize) }))
    if (this.multiple && this.maxFiles != null)
      parts.push(this.t('file.maxFiles', { count: this.maxFiles }))
    return parts.join(' / ')
  }

  #renderEntry(e: FileEntry) {
    const name = e.file.name
    const disabled = this.isDisabled
    const status =
      e.status === 'uploading'
        ? this.t('file.uploading', { percent: Math.round(e.progress * 100) })
        : e.status === 'done'
          ? this.t('file.done')
          : e.status === 'error' || e.status === 'rejected'
            ? (e.message ?? '')
            : this.upload
              ? this.t('file.waiting')
              : ''
    const url = this.#previews.get(e.id)
    const bad = e.status === 'error' || e.status === 'rejected'
    return html`<li
      part="item"
      data-status=${e.status}
      class="flex items-center gap-3 rounded-md px-3 py-2 ring-1 ring-inset ${bad ? 'ring-invalid bg-danger-50' : 'ring-line bg-surface'}"
    >
      ${
        url
          ? html`<img
              part="preview"
              class="size-10 shrink-0 rounded object-cover"
              alt=""
              src=${url}
            />`
          : html`<span
              class="inline-flex size-10 shrink-0 items-center justify-center rounded bg-surface-sunken text-fg-muted"
              >${renderIcon(documentIcon, 'size-5')}</span
            >`
      }
      <span class="min-w-0 flex-1">
        <span part="name" class="block truncate text-sm font-medium">${name}</span>
        <span part="status" class="block text-xs ${bad ? 'text-danger-700' : 'text-fg-muted'}"
          >${formatBytes(e.file.size)}${status ? html` · ${status}` : nothing}${
            e.status === 'done'
              ? renderIcon(check, 'ml-1 inline size-3.5 text-success-700')
              : nothing
          }</span
        >
        ${
          e.status === 'uploading'
            ? html`<progress
                part="progress"
                class="mt-1 block h-1.5 w-full accent-primary-600"
                max="100"
                value=${Math.round(e.progress * 100)}
                aria-label=${name}
              ></progress>`
            : nothing
        }
      </span>
      ${
        e.status === 'error' && !disabled
          ? html`<button
              part="retry"
              type="button"
              class=${ICON_BTN}
              aria-label=${this.t('file.retry', { name })}
              @click=${() => void this.#startUpload(e)}
            >
              ${renderIcon(arrowPath, 'size-4')}
            </button>`
          : nothing
      }
      ${
        disabled
          ? nothing
          : html`<button
              part="remove"
              type="button"
              class=${ICON_BTN}
              aria-label=${e.status === 'uploading' ? this.t('file.cancel', { name }) : this.t('file.remove', { name })}
              @click=${() => {
                this.removeFile(e.id)
                this.nativeControl?.focus()
              }}
            >
              ${renderIcon(xMark, 'size-4')}
            </button>`
      }
    </li>`
  }

  protected override render() {
    const invalid = this.showInvalid
    const disabled = this.isDisabled
    const name = this.accessibleName()
    const hint = this.#hint()
    const zoneState = this.dragging
      ? 'border-primary-600 bg-primary-50'
      : invalid
        ? 'border-invalid'
        : 'border-line-control'
    return html`<div
        part="dropzone"
        role="group"
        aria-label=${ifDefined(name)}
        class="${ZONE} ${zoneState} ${disabled ? 'cursor-not-allowed opacity-50' : ''}"
        @dragenter=${this.#onDragEnter}
        @dragover=${this.#onDragOver}
        @dragleave=${this.#onDragLeave}
        @drop=${this.#onDrop}
      >
        <span class="text-fg-muted"
          >${this.dragging ? this.t('file.dropActive') : this.t('file.drop')}</span
        >
        <button
          part="browse"
          type="button"
          class=${BROWSE}
          ?disabled=${disabled}
          aria-describedby=${ifDefined([hint ? this.#hintId : '', this.describedBy ?? ''].filter(Boolean).join(' ') || undefined)}
          aria-invalid=${invalid ? 'true' : nothing}
          @click=${this.#openPicker}
        >
          ${renderIcon(arrowUpTray, 'size-4')}${this.t('file.browse')}
        </button>
        ${hint ? html`<span part="hint" id=${this.#hintId} class="text-xs text-fg-muted">${hint}</span>` : nothing}
        <input
          type="file"
          class="hidden"
          tabindex="-1"
          aria-hidden="true"
          ?multiple=${this.multiple}
          accept=${ifDefined(this.accept)}
          @change=${this.#onPick}
        />
      </div>
      ${
        this.entries.length
          ? html`<ul
              part="list"
              class="m-0 mt-2 flex list-none flex-col gap-2 p-0"
              aria-label=${this.t('file.list')}
            >
              ${this.entries.map((e) => this.#renderEntry(e))}
            </ul>`
          : nothing
      }
      <div role="status" class="sr-only">${this.#announcement}</div>
      ${this.renderDescriptions()}`
  }
}

JimbleFileInput.define('jimble-file-input')

declare global {
  interface HTMLElementTagNameMap {
    'jimble-file-input': JimbleFileInput
  }
}
