// 言語ごとの色分け。使う言語だけを、使うときに読み込む(HTML は CSS・JavaScript を含むので大きい)
import type { Extension } from '@codemirror/state'

export type CodeEditorLanguage = 'text' | 'html' | 'json'

export async function loadLanguage(language: CodeEditorLanguage): Promise<Extension> {
  if (language === 'html') return (await import('@codemirror/lang-html')).html()
  if (language === 'json') return (await import('@codemirror/lang-json')).json()
  return []
}

/** 等幅の字にする言語(プレーンテキストは、本文の字のまま) */
export function isCode(language: CodeEditorLanguage): boolean {
  return language === 'html' || language === 'json'
}
