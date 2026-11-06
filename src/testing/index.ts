// Playwright で、jimble-ui で作った画面を操作する関数(@hidemikimura/jimble-ui/testing)。
// Playwright は型だけを使う(実行時に読み込まない)。getByRole だけでは書きにくい操作を吸収する。
// 何を吸収しているかは skills/jimble-ui/references/testing.md を参照。
import type { Locator, Page } from '@playwright/test'

/** 時間の指定(ミリ秒)。省略すると Playwright の既定 */
export interface TimeoutOptions {
  timeout?: number
}

/** `jimble-select` を操作する */
export interface SelectHandle {
  /** 部品の要素(`value` などのプロパティを見るとき) */
  readonly host: Locator
  /** 一覧を開くボタン */
  readonly trigger: Locator
  /** 選択肢 */
  option(name: string | RegExp): Locator
  /** 一覧を開いて、選択肢を選ぶ */
  choose(name: string | RegExp): Promise<void>
}

/** `jimble-combobox` を操作する */
export interface ComboboxHandle {
  readonly host: Locator
  /** 入力欄 */
  readonly input: Locator
  /** 候補 */
  option(name: string | RegExp): Locator
  /** 入力して、候補を選ぶ。`search` を省略すると、候補の名前で絞り込む */
  choose(name: string, options?: { search?: string }): Promise<void>
}

/** `jimble-date-input` を操作する */
export interface DateInputHandle {
  readonly host: Locator
  readonly input: Locator
  /** 入力して、Tab で確定する(`2026-09-12` など) */
  fill(value: string): Promise<void>
}

/** `jimble-code-editor` を操作する */
export interface CodeEditorHandle {
  readonly host: Locator
  /** 編集領域(role=textbox) */
  readonly editor: Locator
  /** 文書の末尾に入力する(`fill` は WebKit で入らないので、キーで入力する) */
  type(text: string): Promise<void>
  /** 文書の末尾で、変数の候補を開き、ラベルで選ぶ(Enter ではなくクリックで選ぶ) */
  chooseVariable(label: string): Promise<void>
  /** 中身をまとめて差し替える(`value` プロパティ。`input` は発火しない) */
  setValue(value: string): Promise<void>
}

/** `jimble-dropdown-menu` を操作する */
export interface MenuHandle {
  readonly host: Locator
  readonly trigger: Locator
  /** メニューの項目 */
  item(name: string | RegExp): Locator
  /** メニューを開いて、項目を選ぶ。サブメニューは道順で渡す(`choose('共有', 'メールで送る')`) */
  choose(...path: (string | RegExp)[]): Promise<void>
}

export interface Jimble {
  /** ページの `jimble-*` がすべて登録されるまで待つ。登録されない部品があれば、その名前を出して失敗する */
  ready(options?: TimeoutOptions): Promise<void>
  /** ラベル(`jimble-field` の label・`aria-label`)で探したセレクト */
  select(label: string): SelectHandle
  combobox(label: string): ComboboxHandle
  dateInput(label: string): DateInputHandle
  codeEditor(label: string): CodeEditorHandle
  /** トリガーのボタンの名前で探したメニュー */
  menu(trigger: string): MenuHandle
  /**
   * 見出しで探したダイアログ・ドロワーの部品の要素。中身(スロット)は、これで絞って探す
   * (`getByRole('dialog')` で絞ると、スロットの中身は見つからない)
   */
  dialog(heading: string | RegExp): Locator
  /** 名前(`label`)で探した表の部品の要素。行・セルは、これで絞って探す */
  table(label: string | RegExp): Locator
  /** 文で探した通知 */
  toast(text: string | RegExp): Locator
  /**
   * `action` の間に `target` で起きたイベントの `detail` を返す。`jimble-*` イベントはバブルしないので、
   * 部品の要素で受ける
   */
  waitForEvent<T = unknown>(
    target: Locator,
    name: string,
    action: () => Promise<unknown>,
    options?: TimeoutOptions,
  ): Promise<T>
}

let waitSeq = 0

export function jimble(page: Page): Jimble {
  const byLabel = (tag: string, role: string, label: string) =>
    page.locator(tag).filter({ has: page.getByRole(role as 'textbox', { name: label }) })

  return {
    async ready(options = {}) {
      try {
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('*')].every(
              (e) => !e.localName.startsWith('jimble-') || customElements.get(e.localName),
            ),
          undefined,
          options,
        )
      } catch (error) {
        const missing = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('*')]
              .map((e) => e.localName)
              .filter((n) => n.startsWith('jimble-') && !customElements.get(n)),
          ),
        ])
        throw new Error(
          `jimble-ui の部品が登録されていません: ${missing.join(', ')}` +
            '(読み込み忘れ。jimble-code-editor は全部入りに含まれないので、別に読み込む)',
          { cause: error },
        )
      }
    },

    select(label) {
      const host = byLabel('jimble-select', 'button', label)
      const trigger = host.getByRole('button', { name: label })
      const option = (name: string | RegExp) => host.getByRole('option', { name })
      return {
        host,
        trigger,
        option,
        async choose(name) {
          await trigger.click()
          await option(name).click()
        },
      }
    },

    combobox(label) {
      const host = byLabel('jimble-combobox', 'combobox', label)
      const input = host.getByRole('combobox', { name: label })
      const option = (name: string | RegExp) => host.getByRole('option', { name })
      return {
        host,
        input,
        option,
        async choose(name, options = {}) {
          await input.fill(options.search ?? name)
          await option(name).click()
        },
      }
    },

    dateInput(label) {
      const host = byLabel('jimble-date-input', 'textbox', label)
      const input = host.getByRole('textbox', { name: label })
      return {
        host,
        input,
        async fill(value) {
          await input.fill(value)
          await input.press('Tab')
        },
      }
    },

    codeEditor(label) {
      const host = byLabel('jimble-code-editor', 'textbox', label)
      const editor = host.getByRole('textbox', { name: label })
      const toEnd = async () => {
        await editor.click()
        await page.keyboard.press('ControlOrMeta+End')
      }
      return {
        host,
        editor,
        async type(text) {
          await toEnd()
          await page.keyboard.type(text)
        },
        async chooseVariable(name) {
          const prefix = (await host.getAttribute('variable-prefix')) ?? '{{'
          await toEnd()
          await page.keyboard.type(prefix)
          await host.getByRole('option', { name }).click()
        },
        async setValue(value) {
          await host.evaluate((el, v) => {
            ;(el as HTMLElement & { value: string }).value = v
          }, value)
        },
      }
    },

    menu(triggerName) {
      const host = page
        .locator('jimble-dropdown-menu')
        .filter({ has: page.getByRole('button', { name: triggerName }) })
      const trigger = host.getByRole('button', { name: triggerName })
      const item = (name: string | RegExp) => host.getByRole('menuitem', { name, exact: true })
      return {
        host,
        trigger,
        item,
        async choose(...path) {
          await trigger.click()
          for (const name of path) await item(name).click()
        },
      }
    },

    dialog(heading) {
      return page.locator('jimble-dialog, jimble-drawer').filter({
        has: page
          .getByRole('dialog', { name: heading })
          .or(page.getByRole('alertdialog', { name: heading })),
      })
    },

    table(label) {
      return page.locator('jimble-table').filter({ has: page.getByRole('table', { name: label }) })
    },

    toast(text) {
      return page.locator('jimble-toast').filter({ hasText: text })
    },

    async waitForEvent<T>(
      target: Locator,
      name: string,
      action: () => Promise<unknown>,
      options: TimeoutOptions = {},
    ): Promise<T> {
      // 先にリスナーを付けてから操作する(操作の途中で起きたイベントを逃さない)
      const key = `__jimbleWait${++waitSeq}`
      await target.evaluate(
        (el, [k, n]) => {
          const store = el as unknown as Record<string, Promise<unknown>>
          store[k!] = new Promise((resolve) =>
            el.addEventListener(n!, (e) => resolve((e as CustomEvent).detail ?? null), {
              once: true,
            }),
          )
        },
        [key, name],
      )
      await action()
      const timeout = options.timeout ?? 5000
      return target.evaluate(
        (el, [k, n, ms]) =>
          Promise.race([
            (el as unknown as Record<string, Promise<unknown>>)[k as string],
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${String(n)} が起きませんでした`)), Number(ms)),
            ),
          ]),
        [key, name, timeout] as const,
      ) as Promise<T>
    },
  }
}
