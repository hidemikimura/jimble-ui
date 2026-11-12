// custom-elements.json の読み取りと、属性の候補値の解決。postbuild(VS Code 補完)・gen-skill・CLI の試験が共有する。
import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PHASES, releasePhase } from '../../cli/catalog.ts'

const root = resolve(import.meta.dirname, '../..')

export interface ElementDecl {
  tagName: string
  description?: string
  /** `@status experimental`（設計書 §24） */
  status?: string
  /** `@deprecated` の案内（解析ツールが標準で写す） */
  deprecated?: string | boolean
  attributes?: { name: string; description?: string; type?: { text: string } }[]
  slots?: { name: string; description?: string }[]
  events?: { name: string; description?: string }[]
  cssProperties?: { name: string }[]
  cssParts?: { name: string }[]
  cssStates?: { name: string; description?: string; inheritedFrom?: { name: string } }[]
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

/** VS Code の HTML カスタムデータ（dist/vscode.html-data.json）。CLI も、属性の候補値をここから読む */
export interface HtmlData {
  version: number
  tags: {
    name: string
    description: string
    attributes: {
      name: string
      description: string
      values?: { name: string }[]
      valueSet?: string
    }[]
  }[]
  valueSets: { name: string; values: { name: string }[] }[]
}

/** エディターの説明の先頭に付ける、公開段階の注意（安定なら空） */
function phaseNote(d: ElementDecl): string {
  const phase = releasePhase(d)
  if (phase === 'stable') return ''
  const instead = typeof d.deprecated === 'string' ? `代わり: ${d.deprecated}。` : ''
  return `【${PHASES[phase].label}】${PHASES[phase].meaning}。${instead}\n\n`
}

export function vscodeData(elements: ElementDecl[] = loadElements()): HtmlData {
  const values = (type?: string): { name: string }[] | undefined =>
    enumValues(type)?.map((name) => ({ name }))
  return {
    version: 1.1,
    tags: elements.map((d) => ({
      name: d.tagName,
      description: phaseNote(d) + (d.description ?? ''),
      attributes: (d.attributes ?? []).map((a) => ({
        name: a.name,
        description: a.description ?? '',
        ...(a.type?.text === 'boolean' ? { valueSet: 'v' } : { values: values(a.type?.text) }),
      })),
    })),
    valueSets: [{ name: 'v', values: [] }],
  }
}
