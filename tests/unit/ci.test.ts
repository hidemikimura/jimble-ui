// CI(.github/workflows/ci.yml)は、ブラウザと OS の依存が入った Playwright のコンテナで動かす。
// コンテナの版は、package-lock.json の Playwright と同じにする(違うと、ブラウザが見つからずに失敗する)。
// Dependabot が Playwright を上げたら、この試験が落ちるので、ci.yml のコンテナの版も上げる。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
// コメント(理由の説明)を除いた設定
const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8').replace(/^\s*#.*$/gm, '')
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string }>
}
const playwright = lock.packages['node_modules/playwright']?.version

describe('CI のコンテナ', () => {
  const images = [...ci.matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)-noble/g)].map(
    (m) => m[1],
  )

  it('ブラウザを使うジョブ(check・browser・e2e)は、Playwright のコンテナで動く', () => {
    expect(images).toHaveLength(3)
  })

  it('コンテナの版は、package-lock.json の Playwright の版と同じ', () => {
    expect(playwright).toMatch(/^\d+\.\d+\.\d+$/)
    for (const v of images)
      expect(
        v,
        `ci.yml のコンテナを mcr.microsoft.com/playwright:v${playwright}-noble にする`,
      ).toBe(playwright)
  })

  it('ブラウザと OS の依存を、ジョブの中で取得しない(Ubuntu のミラーが遅いと、数十分止まる)', () => {
    expect(ci).not.toMatch(/playwright install/)
  })

  it('すべてのジョブに、制限時間がある(止まっても、何時間も枠を占めない)', () => {
    const jobs = ci
      .slice(ci.indexOf('\njobs:\n'))
      .split(/\n {2}(?=[a-z][\w-]*:\n)/)
      .slice(1)
    expect(jobs.length).toBeGreaterThanOrEqual(3)
    for (const job of jobs) expect(job, job.split('\n')[0]).toMatch(/\n {4}timeout-minutes: \d+/)
  })
})
