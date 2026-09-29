// custom-elements.json の読み取りと、属性の候補値の解決。postbuild(VS Code 補完)と gen-skill が共有する。
import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

export interface ElementDecl {
  tagName: string
  description?: string
  attributes?: { name: string; description?: string; type?: { text: string } }[]
  slots?: { name: string; description?: string }[]
  events?: { name: string; description?: string }[]
  cssProperties?: { name: string }[]
  cssParts?: { name: string }[]
}

/** custom-elements.json の全要素（tagName を持つ宣言） */
export function loadElements(): ElementDecl[] {
  const manifest = JSON.parse(readFileSync(resolve(root, 'custom-elements.json'), 'utf8')) as {
    modules: { declarations?: Partial<ElementDecl>[] }[]
  }
  return manifest.modules
    .flatMap((m) => m.declarations ?? [])
    .filter((d): d is ElementDecl => !!d.tagName)
}

// `export type ButtonVariant = 'primary' | 'secondary'` のような文字列リテラルの型別名を集める
const aliases = new Map<string, string[]>()
for (const file of globSync('src/**/*.ts', { cwd: root })) {
  const text = readFileSync(resolve(root, file), 'utf8')
  for (const m of text.matchAll(/export type (\w+)\s*=\s*((?:\s*\|?\s*'[^']+')+)\s*(?:\n|$)/g)) {
    aliases.set(
      m[1]!,
      [...m[2]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!),
    )
  }
}

/** 属性の型（`'a' | 'b'` または型別名）から候補値を返す。列挙でなければ undefined */
export function enumValues(type?: string): string[] | undefined {
  return type?.match(/'([^']+)'/g)?.map((l) => l.slice(1, -1)) ?? aliases.get(type ?? '')
}
