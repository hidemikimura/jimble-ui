// フォルダーのドロップ。DataTransferItem の webkitGetAsEntry() で、フォルダーの中のファイルを集める
// (Chrome / Edge / Firefox / Safari が対応。名前に webkit が付くが、標準の File and Directory Entries API)

/** ドロップされたファイル。フォルダーから読んだものは、フォルダー名から始まる相対パスを持つ */
export interface DroppedFile {
  file: File
  path?: string
}

export type DropItem =
  { kind: 'file'; file: File } | { kind: 'folder'; entry: FileSystemDirectoryEntry }

/**
 * ドロップされたものを、ファイルとフォルダーに分ける。drop イベントの中で、同期的に呼ぶ
 * (イベントのあとでは、dataTransfer.items が空になる)
 */
export function dropItems(transfer: DataTransfer): DropItem[] {
  const items = [...(transfer.items ?? [])].filter((i) => i.kind === 'file')
  if (!items.length || typeof items[0]!.webkitGetAsEntry !== 'function') {
    return [...(transfer.files ?? [])].map((file) => ({ kind: 'file', file }))
  }
  const out: DropItem[] = []
  for (const item of items) {
    const entry = item.webkitGetAsEntry()
    if (entry?.isDirectory) {
      out.push({ kind: 'folder', entry: entry as FileSystemDirectoryEntry })
      continue
    }
    const file = item.getAsFile()
    if (file) out.push({ kind: 'file', file })
  }
  return out
}

const isHidden = (entry: FileSystemEntry) => entry.name.startsWith('.')
const byName = (a: FileSystemEntry, b: FileSystemEntry) =>
  a.name.localeCompare(b.name, undefined, { numeric: true })

/** フォルダーの直下の項目。readEntries は、空を返すまで何回かに分けて返す(Chrome は 100 件ずつ) */
async function readChildren(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader()
  const all: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((ok, ng) => reader.readEntries(ok, ng))
    if (!batch.length) return all
    all.push(...batch)
  }
}

const readFile = (entry: FileSystemFileEntry) => new Promise<File>((ok, ng) => entry.file(ok, ng))

/**
 * フォルダーの中のファイルを、サブフォルダーまでたどって集める(名前の順)。
 * 隠しファイル・隠しフォルダー(`.` で始まる。`.DS_Store` など)は除く。読めなければ例外を投げる
 */
export async function readFolder(dir: FileSystemDirectoryEntry): Promise<DroppedFile[]> {
  const children = (await readChildren(dir)).filter((e) => !isHidden(e)).sort(byName)
  const out: DroppedFile[] = []
  for (const child of children) {
    if (child.isDirectory) out.push(...(await readFolder(child as FileSystemDirectoryEntry)))
    else if (child.isFile) {
      const file = await readFile(child as FileSystemFileEntry)
      out.push({ file, path: child.fullPath.replace(/^\//, '') })
    }
  }
  return out
}
