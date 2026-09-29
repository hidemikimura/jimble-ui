import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../field/jimble-field.js'
import { setLocale } from '../../i18n/index.js'
import en from '../../locales/en.js'
import { expectNoA11yViolations } from '../../test/a11y.js'
import { cleanup, mount } from '../../test/mount.js'
import { formatBytes, matchesAccept, type JimbleFileInput } from './jimble-file-input.js'
import './jimble-file-input.js'

afterEach(() => {
  cleanup()
  setLocale({ $locale: 'ja' })
})
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const file = (name: string, size = 10, type = 'text/plain') =>
  new File([new Uint8Array(size)], name, { type })
const items = (el: JimbleFileInput) => [...el.shadowRoot!.querySelectorAll('[part="item"]')]
const names = (el: JimbleFileInput) =>
  items(el).map((i) => i.querySelector('[part="name"]')!.textContent!.trim())
const zone = (el: JimbleFileInput) =>
  el.shadowRoot!.querySelector<HTMLElement>('[part="dropzone"]')!
const pick = (el: JimbleFileInput, ...files: File[]) => {
  const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!
  const dt = new DataTransfer()
  files.forEach((f) => dt.items.add(f))
  input.files = dt.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
const drop = (el: JimbleFileInput, ...files: File[]) => {
  const dt = new DataTransfer()
  files.forEach((f) => dt.items.add(f))
  zone(el).dispatchEvent(
    new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }),
  )
  zone(el).dispatchEvent(
    new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }),
  )
}
const data = (f: HTMLFormElement) => new FormData(f)

async function make(attrs = '', setup?: (el: JimbleFileInput) => void) {
  const f = await mount<HTMLFormElement>(html`<form></form>`)
  f.innerHTML = `<jimble-file-input name="docs" aria-label="添付ファイル" ${attrs}></jimble-file-input>`
  const el = f.querySelector('jimble-file-input') as JimbleFileInput
  setup?.(el)
  await el.updateComplete
  return { f, el }
}

describe('ユーティリティ', () => {
  it('formatBytes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  })
  it('matchesAccept: 拡張子・MIME・ワイルドカード。空なら何でも', () => {
    expect(matchesAccept(file('a.PDF'), '.pdf')).toBe(true)
    expect(matchesAccept(file('a.png', 1, 'image/png'), 'image/*')).toBe(true)
    expect(matchesAccept(file('a.txt', 1, 'text/plain'), 'image/*, .pdf')).toBe(false)
    expect(matchesAccept(file('a.pdf', 1, 'application/pdf'), 'application/pdf')).toBe(true)
    expect(matchesAccept(file('x'), undefined)).toBe(true)
  })
})

describe('追加と削除', () => {
  it('ボタンで選んだファイルが一覧に出て、フォームに File として送られ、input / change が出る', async () => {
    const { f, el } = await make('multiple')
    const onChange = vi.fn()
    const onInput = vi.fn()
    el.addEventListener('change', onChange)
    el.addEventListener('input', onInput)
    pick(el, file('a.txt', 2048), file('b.txt'))
    await el.updateComplete
    expect(names(el)).toEqual(['a.txt', 'b.txt'])
    expect(items(el)[0]!.textContent).toContain('2 KB')
    expect(
      data(f)
        .getAll('docs')
        .map((v) => (v as File).name),
    ).toEqual(['a.txt', 'b.txt'])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onInput).toHaveBeenCalledTimes(1)
    expect(el.files.length).toBe(2)
  })

  it('ドロップでも追加できる。ドラッグ中は強調され、ファイル以外のドラッグは無視する', async () => {
    const { el } = await make('multiple')
    const dt = new DataTransfer()
    dt.items.add(file('a.txt'))
    zone(el).dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }),
    )
    await el.updateComplete
    expect(zone(el).className).toContain('border-primary-600')
    zone(el).dispatchEvent(new DragEvent('dragleave', { bubbles: true }))
    await el.updateComplete
    expect(zone(el).className).not.toContain('border-primary-600')
    drop(el, file('a.txt'))
    await el.updateComplete
    expect(names(el)).toEqual(['a.txt'])
    const text = new DataTransfer()
    text.setData('text/plain', 'x')
    zone(el).dispatchEvent(
      new DragEvent('drop', { dataTransfer: text, bubbles: true, cancelable: true }),
    )
    expect(names(el)).toEqual(['a.txt'])
  })

  it('multiple でなければ 1 つだけ。新しく選ぶと置き換わる', async () => {
    const { f, el } = await make()
    pick(el, file('a.txt'))
    await el.updateComplete
    pick(el, file('b.txt'))
    await el.updateComplete
    expect(names(el)).toEqual(['b.txt'])
    expect(data(f).getAll('docs').length).toBe(1)
  })

  it('削除ボタンで取り除ける。フォーカスは選ぶボタンに戻る。reset で空になる', async () => {
    const { f, el } = await make('multiple')
    pick(el, file('a.txt'), file('b.txt'))
    await el.updateComplete
    const rm = items(el)[0]!.querySelector<HTMLButtonElement>('[part="remove"]')!
    expect(rm.getAttribute('aria-label')).toBe('a.txt を削除')
    rm.click()
    await el.updateComplete
    expect(names(el)).toEqual(['b.txt'])
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('[part="browse"]'))
    f.reset()
    await el.updateComplete
    expect(names(el)).toEqual([])
    expect(data(f).getAll('docs')).toEqual([])
  })

  it('name が無ければ送信されない。disabled では追加できない', async () => {
    const f = await mount<HTMLFormElement>(html`<form></form>`)
    f.innerHTML = `<jimble-file-input aria-label="x" disabled></jimble-file-input>`
    const el = f.querySelector('jimble-file-input') as JimbleFileInput
    await el.updateComplete
    el.addFiles([file('a.txt')])
    await el.updateComplete
    expect(names(el)).toEqual([])
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="browse"]')!.disabled).toBe(true)
  })
})

describe('制限（accept・max-size・max-files）', () => {
  it('合わないファイルは追加されず、理由つきで一覧に出て、jimble-reject が出る。次の操作で消える', async () => {
    const { f, el } = await make('multiple accept="image/*,.pdf" max-size="1000" max-files="2"')
    const rejects: unknown[] = []
    el.addEventListener('jimble-reject', (e) => rejects.push((e as CustomEvent).detail.reason))
    pick(
      el,
      file('a.txt', 10, 'text/plain'),
      file('big.png', 5000, 'image/png'),
      file('ok1.png', 10, 'image/png'),
      file('ok2.pdf', 10, 'application/pdf'),
      file('ok3.png', 10, 'image/png'),
    )
    await el.updateComplete
    expect(rejects).toEqual(['type', 'size', 'count'])
    expect(
      data(f)
        .getAll('docs')
        .map((v) => (v as File).name),
    ).toEqual(['ok1.png', 'ok2.pdf'])
    const texts = items(el).map((i) => i.textContent!)
    expect(texts.some((t) => t.includes('a.txt') && t.includes('対応していないファイル形式'))).toBe(
      true,
    )
    expect(texts.some((t) => t.includes('big.png') && t.includes('サイズが'))).toBe(true)
    expect(texts.some((t) => t.includes('ok3.png') && t.includes('上限'))).toBe(true)
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('a.txt')
    expect(el.files.length).toBe(2)
    // 拒否の表示は、次の追加で消える
    el.removeFile(el.files[0]!)
    pick(el, file('new.png', 10, 'image/png'))
    await el.updateComplete
    expect(names(el)).not.toContain('a.txt')
  })

  it('制限の説明が表示され、選ぶボタンの説明として読まれる', async () => {
    const { el } = await make('multiple accept=".pdf" max-size="2097152" max-files="3"')
    const hint = el.shadowRoot!.querySelector('[part="hint"]')!
    expect(hint.textContent).toContain('.pdf')
    expect(hint.textContent).toContain('2 MB')
    expect(hint.textContent).toContain('3 ファイル')
    const btn = el.shadowRoot!.querySelector('[part="browse"]')!
    expect(btn.getAttribute('aria-describedby')).toContain(hint.id)
  })
})

describe('アップロード（upload）', () => {
  it('自動で送信し、進捗を表示し、完了するとサーバーが返した値がフォームに送られる', async () => {
    let progress!: (n: number) => void
    let done!: (v: string) => void
    const upload = vi.fn(
      (_f: File, ctx: { onProgress: (n: number) => void }) =>
        new Promise<string>((res) => {
          progress = ctx.onProgress
          done = res
        }),
    )
    const { f, el } = await make('multiple', (e) => (e.upload = upload))
    const onComplete = vi.fn()
    el.addEventListener('jimble-upload-complete', onComplete)
    pick(el, file('a.txt'))
    await tick()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(items(el)[0]!.getAttribute('data-status')).toBe('uploading')
    expect(data(f).getAll('docs')).toEqual([])
    expect(el.validity.customError).toBe(true)
    expect(el.validationMessage).toContain('アップロード')
    progress(0.4)
    await el.updateComplete
    const bar = el.shadowRoot!.querySelector<HTMLProgressElement>('progress')!
    expect(bar.value).toBe(40)
    expect(items(el)[0]!.textContent).toContain('40%')
    done('file-123')
    await tick()
    expect(items(el)[0]!.getAttribute('data-status')).toBe('done')
    expect(data(f).getAll('docs')).toEqual(['file-123'])
    expect(el.validity.valid).toBe(true)
    expect((onComplete.mock.calls[0]![0] as CustomEvent).detail.value).toBe('file-123')
  })

  it('失敗すると再試行できる。成功するとフォームに送られる', async () => {
    let calls = 0
    const upload = async () => {
      calls++
      if (calls === 1) throw new Error('500')
      return { value: 'ok-1' }
    }
    const { f, el } = await make('', (e) => (e.upload = upload))
    const onError = vi.fn()
    el.addEventListener('jimble-upload-error', onError)
    pick(el, file('a.txt'))
    await tick(60)
    expect(items(el)[0]!.getAttribute('data-status')).toBe('error')
    expect(items(el)[0]!.textContent).toContain('失敗')
    expect(onError).toHaveBeenCalledTimes(1)
    expect(el.validity.valid).toBe(false)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="retry"]')!.click()
    await tick(60)
    expect(data(f).getAll('docs')).toEqual(['ok-1'])
    expect(el.validity.valid).toBe(true)
  })

  it('アップロード中に削除すると中止(signal)され、結果は無視される', async () => {
    let signal!: AbortSignal
    let done!: (v: string) => void
    const { f, el } = await make('', (e) => {
      e.upload = (_f, ctx) => {
        signal = ctx.signal
        return new Promise<string>((res) => (done = res))
      }
    })
    pick(el, file('a.txt'))
    await tick()
    const rm = items(el)[0]!.querySelector('[part="remove"]')!
    expect(rm.getAttribute('aria-label')).toBe('a.txt のアップロードを中止')
    ;(rm as HTMLButtonElement).click()
    await el.updateComplete
    expect(signal.aborted).toBe(true)
    done('late')
    await tick()
    expect(names(el)).toEqual([])
    expect(data(f).getAll('docs')).toEqual([])
  })
})

describe('検証とアクセシビリティ', () => {
  it('required で未選択なら valueMissing、選ぶと通る', async () => {
    const { el } = await make('required')
    expect(el.validity.valueMissing).toBe(true)
    pick(el, file('a.txt'))
    await el.updateComplete
    expect(el.validity.valid).toBe(true)
  })

  it('field の中で名前が付き、一覧・拒否・アップロード中の状態でも axe 違反がない。en にも従う', async () => {
    const f = await mount<HTMLElement>(
      html`<jimble-field label="添付ファイル" hint="契約書など"
        ><jimble-file-input
          name="docs"
          multiple
          accept=".pdf"
          max-size="1000"
          preview
        ></jimble-file-input
      ></jimble-field>`,
    )
    const el = f.querySelector('jimble-file-input') as JimbleFileInput
    el.upload = () => new Promise(() => {})
    await el.updateComplete
    expect(el.shadowRoot!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe(
      '添付ファイル',
    )
    await expectNoA11yViolations(f)
    pick(
      el,
      file('a.pdf', 10, 'application/pdf'),
      file('b.txt'),
      file('c.pdf', 5000, 'application/pdf'),
    )
    await tick(60)
    await expectNoA11yViolations(f)
    setLocale(en)
    await el.updateComplete
    expect(el.shadowRoot!.textContent).toContain('Choose files')
  })

  it('画像は preview でサムネイルが出て、削除すると解放される', async () => {
    const { el } = await make('preview multiple')
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    pick(el, file('p.png', 10, 'image/png'), file('t.txt'))
    await el.updateComplete
    expect(el.shadowRoot!.querySelectorAll('[part="preview"]').length).toBe(1)
    el.removeFile(el.files[0]!)
    expect(revoke).toHaveBeenCalled()
    revoke.mockRestore()
  })
})
