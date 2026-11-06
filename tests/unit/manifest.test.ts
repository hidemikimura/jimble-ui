// custom-elements.json（API の表・skill・エディターの補完の元）が、実装の公開 API と食い違っていないことを保証する。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

interface Decl {
  kind: string
  name: string
  tagName?: string
  description?: string
  attributes?: { name: string; fieldName?: string }[]
  cssStates?: { name: string; inheritedFrom?: unknown }[]
}

const manifest = JSON.parse(readFileSync(resolve(root, 'custom-elements.json'), 'utf8')) as {
  modules: { path: string; declarations?: Decl[] }[]
}
// 部品と基底クラス（src/base）の、すべてのクラスの宣言
const classes = manifest.modules.flatMap((m) =>
  (m.declarations ?? [])
    .filter((d) => d.kind === 'class')
    .map((d) => ({ decl: d, source: readFileSync(resolve(root, m.path), 'utf8') })),
)
const elements = classes.filter(({ decl }) => decl.tagName)

/** ソースの中で、そのクラスの本体（次の `export class` まで） */
function classBody(source: string, className: string): string {
  const start = source.search(new RegExp(`class ${className}\\b`))
  const next = source.indexOf('export ', start + 1)
  return source.slice(start, next < 0 ? undefined : next)
}

const label = (d: Decl) => d.tagName ?? d.name

describe('custom-elements.json', () => {
  it('`state: true` の内部の状態を、属性として載せない', () => {
    const leaks = elements.flatMap(({ decl, source }) => {
      const internal = [
        ...classBody(source, decl.name).matchAll(/(\w+):\s*\{\s*state:\s*true\s*\}/g),
      ].map((m) => m[1]!)
      return (decl.attributes ?? [])
        .filter((a) => internal.includes(a.fieldName ?? a.name))
        .map((a) => `${label(decl)} ${a.name}`)
    })
    expect(leaks).toEqual([])
  })

  it('クラスが付ける :state() は、すべて @cssstate で状態の一覧に載せる', () => {
    const missing = classes.flatMap(({ decl, source }) => {
      const own = new Set((decl.cssStates ?? []).filter((s) => !s.inheritedFrom).map((s) => s.name))
      return [...classBody(source, decl.name).matchAll(/setState\('([\w-]+)'/g)]
        .map((m) => m[1]!)
        .filter((name) => !own.has(name))
        .map((name) => `${label(decl)} :state(${name})`)
    })
    expect(missing).toEqual([])
  })

  it('状態の一覧に載せた状態は、そのクラスが実際に付ける', () => {
    const phantom = classes.flatMap(({ decl, source }) =>
      (decl.cssStates ?? [])
        .filter((s) => !s.inheritedFrom)
        .filter((s) => !classBody(source, decl.name).includes(`setState('${s.name}'`))
        .map((s) => `${label(decl)} :state(${s.name})`),
    )
    expect(phantom).toEqual([])
  })

  it('説明に書いた :state() は、状態の一覧にある', () => {
    const missing = elements.flatMap(({ decl }) => {
      const documented = new Set((decl.cssStates ?? []).map((s) => s.name))
      return [...(decl.description ?? '').matchAll(/:state\(([\w-]+)\)/g)]
        .map((m) => m[1]!)
        .filter((name) => !documented.has(name))
        .map((name) => `${label(decl)} :state(${name})`)
    })
    expect(missing).toEqual([])
  })
})
