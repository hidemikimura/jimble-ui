import { afterEach, describe, expect, it } from 'vitest'

/** 開いた部品の、ホスト（CSS 変数を指定する要素）と、角丸を持つ要素 */
export interface RadiusSubject {
  host: HTMLElement
  target: HTMLElement
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
const radius = (el: Element) => getComputedStyle(el).borderTopLeftRadius

/**
 * オーバーレイ系の部品の、角丸の CSS 変数が効くことを確かめる（3 つの観点）。
 *
 * 同じ要素に `rounded-*` と `[border-radius:var(--jimble-…-radius,…)]` を両方付けると、
 * 生成される CSS で後に出る `rounded-*` が勝ち、部品固有の変数が効かなくなる
 * （`tests/unit/no-conflicting-radius.test.ts` が、ソースでも検出する）。
 *
 * @param variable 部品固有の変数（例: `--jimble-dialog-radius`）
 * @param open 部品を置いて開き、ホストと角丸を持つ要素を返す
 */
export function radiusTests(variable: string, open: () => Promise<RadiusSubject>): void {
  describe(`角丸の CSS 変数（${variable}）`, () => {
    afterEach(() => document.documentElement.style.removeProperty('--jimble-radius-overlay'))

    it('ホストに指定すると、その部品の角丸が変わる', async () => {
      const { host, target } = await open()
      host.style.setProperty(variable, '28px')
      await tick()
      expect(radius(target)).toBe('28px')
    })

    it('指定しなければ、これまでどおり、共通の角丸（--jimble-radius-overlay の既定）になる', async () => {
      const { target } = await open()
      expect(radius(target)).toBe('12px')
    })

    it('共通のトークン --jimble-radius-overlay だけを変えても、反映される', async () => {
      const { target } = await open()
      document.documentElement.style.setProperty('--jimble-radius-overlay', '4px')
      await tick()
      expect(radius(target)).toBe('4px')
    })
  })
}
