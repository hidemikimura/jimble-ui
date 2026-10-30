// jimble-file-input のフォルダーのドロップ(src/components/file-input/folder.ts)
import { describe, expect, it } from 'vitest'
import { dropItems, readFolder } from '../../src/components/file-input/folder.ts'

// FileSystemEntry の偽物。children は、readEntries が返す束(既定は 1 束)
interface FakeEntry {
  isFile: boolean
  isDirectory: boolean
  name: string
  fullPath: string
  file?: (ok: (f: File) => void, ng: (e: unknown) => void) => void
  createReader?: () => {
    readEntries: (ok: (e: FakeEntry[]) => void, ng: (e: unknown) => void) => void
  }
}
const fileEntry = (path: string, content = 'x'): FakeEntry => {
  const name = path.split('/').at(-1)!
  return {
    isFile: true,
    isDirectory: false,
    name,
    fullPath: `/${path}`,
    file: (ok) => ok(new File([content], name)),
  }
}
const dirEntry = (path: string, batches: FakeEntry[][], fail = false): FakeEntry => ({
  isFile: false,
  isDirectory: true,
  name: path.split('/').at(-1)!,
  fullPath: `/${path}`,
  createReader: () => {
    let i = 0
    return {
      readEntries: (ok, ng) => (fail ? ng(new Error('読めない')) : ok(batches[i++] ?? [])),
    }
  },
})
const asDir = (e: FakeEntry) => e as unknown as FileSystemDirectoryEntry

describe('フォルダーの中身を読む', () => {
  it('サブフォルダーまでたどり、相対パスつきで、名前の順に返す', async () => {
    const root = dirEntry('docs', [
      [
        fileEntry('docs/b.txt'),
        dirEntry('docs/sub', [[fileEntry('docs/sub/c.txt')]]),
        fileEntry('docs/a10.txt'),
        fileEntry('docs/a2.txt'),
      ],
    ])
    const files = await readFolder(asDir(root))
    expect(files.map((f) => f.path)).toEqual([
      'docs/a2.txt',
      'docs/a10.txt',
      'docs/b.txt',
      'docs/sub/c.txt',
    ])
    expect(files[0]!.file.name).toBe('a2.txt')
  })

  it('readEntries が何回かに分けて返しても、すべて読む', async () => {
    const root = dirEntry('many', [[fileEntry('many/1.txt')], [fileEntry('many/2.txt')]])
    expect((await readFolder(asDir(root))).map((f) => f.path)).toEqual(['many/1.txt', 'many/2.txt'])
  })

  it('隠しファイル・隠しフォルダー（. で始まる）は除く', async () => {
    const root = dirEntry('p', [
      [
        fileEntry('p/.DS_Store'),
        dirEntry('p/.git', [[fileEntry('p/.git/HEAD')]]),
        fileEntry('p/a.txt'),
      ],
    ])
    expect((await readFolder(asDir(root))).map((f) => f.path)).toEqual(['p/a.txt'])
  })

  it('読めなければ、例外を投げる', async () => {
    await expect(readFolder(asDir(dirEntry('x', [], true)))).rejects.toThrow('読めない')
  })
})

describe('ドロップされたものを、ファイルとフォルダーに分ける', () => {
  const item = (entry: FakeEntry | null, file: File | null) =>
    ({
      kind: 'file',
      webkitGetAsEntry: () => entry,
      getAsFile: () => file,
    }) as unknown as DataTransferItem
  const transfer = (items: DataTransferItem[], files: File[] = []) =>
    ({ items, files }) as unknown as DataTransfer

  it('ファイルはそのまま、フォルダーは中を読むための entry にする', () => {
    const a = new File(['a'], 'a.txt')
    const dir = dirEntry('docs', [])
    const out = dropItems(transfer([item(fileEntry('a.txt'), a), item(dir, new File([], 'docs'))]))
    expect(out).toEqual([
      { kind: 'file', file: a },
      { kind: 'folder', entry: dir },
    ])
  })

  it('文字列など、ファイルでない項目は無視する', () => {
    const text = { kind: 'string' } as unknown as DataTransferItem
    expect(dropItems(transfer([text]))).toEqual([])
  })

  it('webkitGetAsEntry が無いブラウザでは、files をそのまま使う', () => {
    const a = new File(['a'], 'a.txt')
    const plain = { kind: 'file', getAsFile: () => a } as unknown as DataTransferItem
    expect(dropItems(transfer([plain], [a]))).toEqual([{ kind: 'file', file: a }])
  })
})
