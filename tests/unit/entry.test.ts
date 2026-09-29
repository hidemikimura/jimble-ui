import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('入口 src/index.ts', () => {
  it('src/components の全部品を再エクスポートしている(CDN バンドル・ドキュメントサイトに載る)', () => {
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8')
    const dirs = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    const missing = dirs.filter((d) => !index.includes(`'./components/${d}/index.js'`))
    expect(missing).toEqual([])
  })

  it('hosts.css が全部品のホスト用 CSS を読み込んでいる', () => {
    const hosts = readFileSync(resolve(root, 'src/styles/hosts.css'), 'utf8')
    const dirs = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    const missing = dirs.filter((d) => !hosts.includes(`'../components/${d}/${d}.host.css'`))
    expect(missing).toEqual([])
  })
})
