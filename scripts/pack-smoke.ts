// 配布物のスモークテスト: `npm pack` で作ったタルボールを空のプロジェクトに入れ、利用者と同じ方法で使えるか確かめる。
//   1. exports の各サブパスを import して Vite でビルドできる（Lit などの依存が解決される）
//   2. 型定義が解決され、型チェックが通る
//   3. ビルドした結果が、実ブラウザ(Chromium)で動く（要素が登録され、Shadow DOM のスタイルが効く）
//   4. CDN バンドルが、<script type="module"> 1 行で動き、グローバルの JimbleUI が使える
// 実行: node scripts/pack-smoke.ts   （事前に npm run build が必要）
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const work = mkdtempSync(join(tmpdir(), 'jimble-smoke-'))
const run = (cmd: string, args: string[], cwd = work) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
const step = (msg: string) => console.log(`  • ${msg}`)

async function main() {
  console.log('pack-smoke: 作業ディレクトリ', work)
  if (!existsSync(join(root, 'dist')))
    throw new Error('dist がありません。先に npm run build を実行してください。')

  step('npm pack')
  const packed = run('npm', ['pack', '--pack-destination', work, '--silent'], root)
    .trim()
    .split('\n')
    .pop()!
  const tarball = join(work, packed)

  step('空のプロジェクトへインストール')
  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({ name: 'smoke', private: true, type: 'module' }),
  )
  run('npm', ['install', '--no-audit', '--no-fund', '--silent', tarball])

  // ---- 1. サブパス import をバンドルできる ----
  step('サブパスの import を Vite でバンドル')
  writeFileSync(
    join(work, 'index.html'),
    `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="@hidemikimura/jimble-ui/cloak.css"><script type="module" src="./main.js"></script>
<jimble-button id="b" variant="primary">保存</jimble-button>
<jimble-table label="t"><jimble-table-header><jimble-table-row><jimble-table-head-cell>a</jimble-table-head-cell></jimble-table-row></jimble-table-header></jimble-table>`,
  )
  writeFileSync(
    join(work, 'main.js'),
    `import '@hidemikimura/jimble-ui/button'
import '@hidemikimura/jimble-ui/table'
import '@hidemikimura/jimble-ui/dialog'
import { setLocale, getLocale } from '@hidemikimura/jimble-ui/i18n'
import en from '@hidemikimura/jimble-ui/locales/en'
import { toast } from '@hidemikimura/jimble-ui/toast'
import * as all from '@hidemikimura/jimble-ui'
import '@hidemikimura/jimble-ui/tokens.css'
window.__smoke = { setLocale, getLocale, en, toast, all }
`,
  )
  const vite = join(root, 'node_modules/vite/bin/vite.js')
  run('node', [vite, 'build', '--outDir', 'out', '--logLevel', 'warn'])

  // ---- 2. 型が解決される ----
  step('型定義の解決（tsc）')
  writeFileSync(
    join(work, 'types.ts'),
    `import { JimbleButton } from '@hidemikimura/jimble-ui/button'
import { toast, type ToastOptions } from '@hidemikimura/jimble-ui/toast'
import { setLocale, type Locale } from '@hidemikimura/jimble-ui/i18n'
import en from '@hidemikimura/jimble-ui/locales/en'
import { JimbleUI } from '@hidemikimura/jimble-ui'

const b: JimbleButton = document.createElement('jimble-button')
b.variant = 'primary'
// @ts-expect-error variant は決まった値だけ
b.variant = 'nope'
const t: HTMLElementTagNameMap['jimble-table'] = document.createElement('jimble-table')
const opts: ToastOptions = { message: 'x', variant: 'success' }
const l: Locale = en
setLocale(l)
toast(opts)
void t
void JimbleUI
`,
  )
  writeFileSync(
    join(work, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2023',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2023', 'DOM'],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: [],
      },
      include: ['types.ts'],
    }),
  )
  try {
    run('node', [join(root, 'node_modules/typescript/bin/tsc'), '-p', '.'])
  } catch (e) {
    throw new Error('型チェックに失敗:\n' + (e as { stdout?: string }).stdout, { cause: e })
  }

  // ---- 3. 4. 実ブラウザ ----
  step('実ブラウザ(Chromium)で動作確認')
  const cdnDir = join(work, 'cdn')
  mkdirSync(cdnDir)
  cpSync(join(work, 'node_modules/@hidemikimura/jimble-ui/dist/cdn'), cdnDir, { recursive: true })
  writeFileSync(
    join(cdnDir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><script type="module" src="./jimble-ui.js"></script>
<jimble-button id="b" variant="primary" onclick="JimbleUI.toast.success('ok')">通知</jimble-button>`,
  )
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
  }
  const serve = (dir: string) =>
    new Promise<{ url: string; close: () => void }>((res) => {
      const s = http
        .createServer((q, r) => {
          const p = join(
            dir,
            q.url === '/' ? 'index.html' : decodeURIComponent(q.url!.split('?')[0]!),
          )
          if (!existsSync(p)) return void ((r.statusCode = 404), r.end())
          r.setHeader('content-type', types[extname(p)] ?? 'application/octet-stream')
          createReadStream(p).pipe(r)
        })
        .listen(0, () =>
          res({
            url: `http://localhost:${(s.address() as { port: number }).port}/`,
            close: () => s.close(),
          }),
        )
    })

  const browser = await chromium.launch()
  try {
    const errors: string[] = []
    const check = async (url: string) => {
      const page = await browser.newPage()
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      await page.goto(url)
      await page.waitForFunction(() => customElements.get('jimble-button'))
      return page
    }
    const app = await serve(join(work, 'out'))
    const p1 = await check(app.url)
    const r1 = await p1.evaluate(() => {
      const b = document.getElementById('b')!.shadowRoot!.querySelector('button')!
      const w = window as unknown as {
        __smoke: { getLocale: () => string; toast: unknown; en: { $locale: string } }
      }
      return {
        shadow: getComputedStyle(b).boxShadow !== 'none',
        table: !!customElements.get('jimble-table'),
        dialog: !!customElements.get('jimble-dialog'),
        locale: w.__smoke.getLocale(),
        toast: typeof w.__smoke.toast,
        en: w.__smoke.en.$locale,
        tokensCss: [...document.styleSheets].length >= 1,
      }
    })
    app.close()
    if (
      !r1.shadow ||
      !r1.table ||
      !r1.dialog ||
      r1.locale !== 'ja' ||
      r1.toast !== 'function' ||
      r1.en !== 'en'
    ) {
      throw new Error('バンドル済みのアプリが期待どおり動きません: ' + JSON.stringify(r1))
    }

    const cdn = await serve(cdnDir)
    const p2 = await check(cdn.url)
    await p2.click('#b')
    await p2.waitForSelector('jimble-toast')
    const r2 = await p2.evaluate(() => ({
      global: typeof (window as unknown as { JimbleUI: { toast: unknown } }).JimbleUI.toast,
      tags: ['jimble-app-shell', 'jimble-table', 'jimble-select', 'jimble-toast-region'].every(
        (t) => customElements.get(t),
      ),
    }))
    cdn.close()
    if (r2.global !== 'function' || !r2.tags)
      throw new Error('CDN バンドルが期待どおり動きません: ' + JSON.stringify(r2))
    if (errors.length) throw new Error('ブラウザのコンソールエラー:\n' + errors.join('\n'))
  } finally {
    await browser.close()
  }

  const files = readdirSync(join(work, 'node_modules/@hidemikimura/jimble-ui'))
  console.log('pack-smoke OK（配布物の直下:', files.join(', '), '）')
}

main()
  .catch((e) => {
    console.error('pack-smoke 失敗:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => rmSync(work, { recursive: true, force: true }))
