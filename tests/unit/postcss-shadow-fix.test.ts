import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import shadowFix from '../../build/postcss-shadow-fix.ts'

// Tailwind v4.3 の出力形式を模した入力
const input = `
@layer properties;
@layer properties {
  @supports ((-webkit-hyphens: none) and (not (margin-trim: inline))) {
    *, ::before, ::after, ::backdrop { --tw-shadow: 0 0 #0000; --tw-ring-inset: initial; }
  }
}
@property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
@property --other { syntax: "*"; inherits: false; }
.shadow-sm { box-shadow: var(--tw-shadow); }
`

describe('jimble-shadow-fix', () => {
  it('@layer properties 内の @supports を外して常に有効にする', async () => {
    const out = (await postcss([shadowFix()]).process(input, { from: undefined })).css
    expect(out).not.toMatch(/@supports/)
    expect(out).toMatch(/@layer properties \{\s*\*, ::before, ::after, ::backdrop \{/)
    expect(out).toContain('--tw-shadow: 0 0 #0000')
  })

  it('@property --tw-* を削除し、他の @property は残す', async () => {
    const out = (await postcss([shadowFix()]).process(input, { from: undefined })).css
    expect(out).not.toContain('@property --tw-shadow')
    expect(out).toContain('@property --other')
  })

  it('ユーティリティ本体は変更しない', async () => {
    const out = (await postcss([shadowFix()]).process(input, { from: undefined })).css
    expect(out).toContain('.shadow-sm { box-shadow: var(--tw-shadow); }')
  })
})
