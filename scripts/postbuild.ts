// ビルド後に、dist へ配布用ファイルを足す。`npm run build` の最後に実行される。
//   dist/tokens.css          … 既定トークンを :root に並べたもの（編集の出発点。読み込みは必須ではない）
//   dist/cloak.css           … 未定義(まだ登録されていない)要素を隠して、ちらつきを防ぐ
//   dist/vscode.html-data.json … VS Code の HTML 補完用データ（custom-elements.json から生成）
import { copyFileSync, globSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')

type Decl = {
  tagName?: string
  description?: string
  attributes?: { name: string; description?: string; type?: { text: string } }[]
  slots?: { name: string; description?: string }[]
}
const manifest = JSON.parse(readFileSync(resolve(root, 'custom-elements.json'), 'utf8')) as {
  modules: { declarations?: Decl[] }[]
}
const elements = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.tagName)

// 1. tokens.css
copyFileSync(resolve(root, 'tokens/tokens.generated.css'), resolve(dist, 'tokens.css'))

// 2. cloak.css
const tags = elements.map((d) => d.tagName!).sort()
writeFileSync(
  resolve(dist, 'cloak.css'),
  `/* jimble-ui: 要素が登録される前の一瞬、中身が崩れて見えるのを防ぐ。\n   <link rel="stylesheet" href="…/cloak.css"> を <head> に置く。 */\n${tags.map((t) => `${t}:not(:defined)`).join(',\n')} {\n  visibility: hidden;\n}\n`,
)

// 3. VS Code の HTML カスタムデータ
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
const values = (type?: string): { name: string }[] | undefined => {
  const literals = type?.match(/'([^']+)'/g)?.map((l) => l.slice(1, -1)) ?? aliases.get(type ?? '')
  return literals ? literals.map((name) => ({ name })) : undefined
}
const data = {
  version: 1.1,
  tags: elements.map((d) => ({
    name: d.tagName,
    description: d.description ?? '',
    attributes: (d.attributes ?? []).map((a) => ({
      name: a.name,
      description: a.description ?? '',
      ...(a.type?.text === 'boolean' ? { valueSet: 'v' } : { values: values(a.type?.text) }),
    })),
  })),
  valueSets: [{ name: 'v', values: [] }],
}
writeFileSync(resolve(dist, 'vscode.html-data.json'), JSON.stringify(data, null, 2) + '\n')

console.log(
  `postbuild: ${elements.length} 要素の tokens.css / cloak.css / vscode.html-data.json を出力`,
)
