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
      container = document.createElement('main')
      container.innerHTML = raw.replace(/^<!--.*?-->\s*/, '')
      document.body.append(container)
      const jimble = [...container.querySelectorAll('*')].filter((e) =>
        e.localName.startsWith('jimble-'),
      )
      expect(jimble.length).toBeGreaterThan(0)
      await Promise.all(
        jimble.map((e) => (e as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete),
      )
      await expectNoA11yViolations(container)
    })
  }
})
