// `npx @hidemikimura/jimble-ui …` の入口。ビルドで dist/cli/jimble-ui.js になる（vite.cli.config.ts）。
import { findPackageRoot } from './data.ts'
import { run } from './main.ts'

const out = (text: string) => process.stdout.write(text + '\n')
const err = (text: string) => process.stderr.write(text + '\n')

try {
  const root = findPackageRoot(import.meta.dirname)
  process.exitCode = run(process.argv.slice(2), { root, cwd: process.cwd(), out, err })
} catch (e) {
  err(`エラー: ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
}
