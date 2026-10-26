// theme.css の、重複した変数を整理する。同じ変数は 1 回だけにして、値は「いちばん下の行」の値を採り、
// 位置と説明のコメントは「いちばん上の行」(ひな形)に残す。
// 実行: npm run tidy            … 整理して上書き
//       npm run tidy -- --check … 重複があれば、一覧を出して、失敗する(書き換えない)
//       npm run tidy -- ほかの.css … ほかのファイルを整理する
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dedupe } from '../src/merge.ts'

const args = process.argv.slice(2)
const check = args.includes('--check')
const file = resolve(
  args.find((a) => !a.startsWith('--')) ?? resolve(import.meta.dirname, '../src/theme.css'),
)

const before = readFileSync(file, 'utf8')
const { css, duplicates } = dedupe(before)

if (duplicates.length === 0) {
  console.log(`重複はありません: ${file}`)
  process.exit(0)
}
console.log(`同じ変数が複数回書かれている: ${duplicates.length} 種類（${file}）`)
for (const d of duplicates) {
  const trail = d.values.map((v, i) => `${d.lines[i]}行: ${v.replace(/\s+/g, ' ')}`).join(' → ')
  console.log(`  ${d.name}  ${trail}`)
}
if (check) {
  console.error('\n`npm run tidy` で整理できます（いちばん下の値を残します）。')
  process.exit(1)
}
writeFileSync(file, css)
console.log(`\n整理しました。いちばん下の値を残し、位置と説明は、いちばん上の行に残しました。`)
