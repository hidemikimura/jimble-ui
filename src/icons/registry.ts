import type { Icon } from './render.js'

// jimble-icon が name で引くアイコンの登録簿。アイコンは 1 つずつ登録できる(使う分だけ読み込むため)。
const icons = new Map<string, Icon>()
const listeners = new Set<() => void>()

/** アイコンを登録する。同じ名前は上書きする。`jimble-icon` の `name` で使えるようになる */
export function registerIcon(name: string, icon: Icon): void {
  icons.set(name, icon)
  for (const l of listeners) l()
}

/** 登録済みのアイコンを返す。無ければ undefined */
export function getIcon(name: string): Icon | undefined {
  return icons.get(name)
}

/** 登録済みのアイコンの名前 */
export function listIcons(): string[] {
  return [...icons.keys()]
}

/** 登録が増えたときに呼ばれる。戻り値で解除 */
export function onIconsChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
