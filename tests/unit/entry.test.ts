import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

// 全部入りに含めない部品(大きな依存を持つ。個別の入口だけで読み込む)
const SEPARATE = ['code-editor']

describe('入口 src/index.ts', () => {
  it('src/components の全部品を再エクスポートしている(CDN バンドル・ドキュメントサイトに載る)', () => {
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8')
    const dirs = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    const missing = dirs
      .filter((d) => !SEPARATE.includes(d))
      .filter((d) => !index.includes(`'./components/${d}/index.js'`))
    expect(missing).toEqual([])
  })

  it('hosts.css が全部品のホスト用 CSS を読み込んでいる', () => {
    const hosts = readFileSync(resolve(root, 'src/styles/hosts.css'), 'utf8')
    const dirs = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    const missing = dirs
      .filter((d) => !SEPARATE.includes(d))
      .filter((d) => !hosts.includes(`'../components/${d}/${d}.host.css'`))
    expect(missing).toEqual([])
  })

  it('別の入口の部品は、全部入りにも共有シートにも入れない(CDN は dist/cdn/<名前>.js)', () => {
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8')
    const hosts = readFileSync(resolve(root, 'src/styles/hosts.css'), 'utf8')
    for (const d of SEPARATE) {
      expect(index).not.toContain(`/${d}/`)
      expect(hosts).not.toContain(`/${d}/`)
    }
  })
})
