// ドキュメントの「例」を全部描画して axe にかける（設計書 §11.3）。例を足せば自動でテストが付く。
import { afterEach, describe, expect, it } from 'vitest'
import '../../src/index.js'
import { expectNoA11yViolations } from '../../src/test/a11y.js'

const examples = import.meta.glob<string>('../../site/examples/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})

let container: HTMLElement | undefined
afterEach(() => container?.remove())

describe('ドキュメントの例', () => {
  it('例が 1 つ以上ある', () => {
    expect(Object.keys(examples).length).toBeGreaterThan(0)
  })

  for (const [path, raw] of Object.entries(examples)) {
    const name = path.replace('../../site/examples/', '').replace('.html', '')
    it(`${name}: 描画でき、axe 違反なし`, async () => {
      // app-shell の例は自分で main ランドマークを持つので、外側は main にしない
      container = document.createElement(raw.includes('<jimble-app-shell') ? 'div' : 'main')
      container.innerHTML = raw.replace(/^<!--.*?-->\s*/, '')
      document.body.append(container)
      const jimble = [...container.querySelectorAll('*')].filter((e) =>
        e.localName.startsWith('jimble-'),
      )
      expect(jimble.length).toBeGreaterThan(0)
      await Promise.all(
        jimble.map((e) => (e as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete),
      )
      // レイアウトが落ち着く(ResizeObserver で tabindex が付くなど)のを待つ
      await new Promise((r) => setTimeout(r, 80))
      await expectNoA11yViolations(container)
    })
  }
})
