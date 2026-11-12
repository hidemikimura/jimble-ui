// 部品ごとの Do / Don't（設計書 §20）。情報源は site/dos/<ページの名前>.md で、
// 「## Do」と「## Don't」の下に箇条書きを書く。ドキュメントサイト・skill の生成・試験が共有する。
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const DOS_DIR = resolve(import.meta.dirname, '../../site/dos')

export interface Dos {
  doItems: string[]
  dontItems: string[]
}

/** 見出しの下の箇条書き（`- ` で始まる行。続きの行は前の項目につなぐ） */
function items(section: string): string[] {
  const out: string[] = []
  for (const line of section.split('\n')) {
    if (line.startsWith('- ')) out.push(line.slice(2).trim())
    else if (line.trim() && out.length) out[out.length - 1] += ' ' + line.trim()
  }
  return out
}

export function parseDos(text: string, where = ''): Dos {
  const doMatch = /^## Do\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)
  const dontMatch = /^## Don't\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)
  if (!doMatch || !dontMatch) throw new Error(`${where}: 「## Do」と「## Don't」の両方が要ります`)
  return { doItems: items(doMatch[1]!), dontItems: items(dontMatch[1]!) }
}

export function readDos(path: string): Dos {
  return parseDos(readFileSync(path, 'utf8'), path)
}

/** Do / Don't を書いたページの名前（ファイル名） */
export function dosNames(): string[] {
  return readdirSync(DOS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}
