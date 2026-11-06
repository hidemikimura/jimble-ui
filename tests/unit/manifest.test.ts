// custom-elements.json（API の表・skill・エディターの補完の元）が、実装の公開 API と食い違っていないことを保証する。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

interface Decl {
  name: string
  tagName?: string
  description?: string
  attributes?: { name: string; fieldName?: string }[]
  cssStates?: { name: string }[]
}

const manifest = JSON.parse(readFileSync(resolve(root, 'custom-elements.json'), 'utf8')) as {
  modules: { path: string; declarations?: Decl[] }[]
}
const elements = manifest.modules.flatMap((m) =>
  (m.declarations ?? [])
    .filter((d) => d.tagName)
    .map((d) => ({ decl: d, source: readFileSync(resolve(root, m.path), 'utf8') })),
)

/** ソースの中で、そのクラスの本体（次の `export class` まで） */
function classBody(source: string, className: string): string {
  const start = source.indexOf(`class ${className} `)
  const next = source.indexOf('export class ', start + 1)
  return source.slice(start, next < 0 ? undefined : next)
}

describe('custom-elements.json', () => {
  it('`state: true` の内部の状態を、属性として載せない', () => {
    const leaks = elements.flatMap(({ decl, source }) => {
      const internal = [
        ...classBody(source, decl.name).matchAll(/(\w+):\s*\{\s*state:\s*true\s*\}/g),
      ].map((m) => m[1]!)
      return (decl.attributes ?? [])
        .filter((a) => internal.includes(a.fieldName ?? a.name))
        .map((a) => `${decl.tagName} ${a.name}`)
    })
    expect(leaks).toEqual([])
  })

  it('説明に書いた :state() は、@cssstate で状態の一覧に載せる', () => {
    const missing = elements.flatMap(({ decl }) => {
      const documented = new Set((decl.cssStates ?? []).map((s) => s.name))
      return [...(decl.description ?? '').matchAll(/:state\(([\w-]+)\)/g)]
        .map((m) => m[1]!)
        .filter((name) => !documented.has(name))
        .map((name) => `${decl.tagName} :state(${name})`)
    })
    expect(missing).toEqual([])
  })

  it('状態の一覧に載せた状態は、部品が実際に付ける', () => {
    const phantom = elements.flatMap(({ decl, source }) =>
      (decl.cssStates ?? [])
        .filter((s) => !classBody(source, decl.name).includes(`setState('${s.name}'`))
        .map((s) => `${decl.tagName} :state(${s.name})`),
    )
    expect(phantom).toEqual([])
  })
})
