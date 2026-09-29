// モーダル表示中に背面のスクロールを止める。複数のモーダルが重なっても壊れないよう参照カウントする。
let count = 0
let saved: { overflow: string; gutter: string } | null = null

export function lockScroll(): void {
  if (count++ > 0) return
  const root = document.documentElement
  saved = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter }
  root.style.overflow = 'hidden'
  root.style.scrollbarGutter = 'stable'
}

export function unlockScroll(): void {
  if (count === 0 || --count > 0) return
  const root = document.documentElement
  root.style.overflow = saved?.overflow ?? ''
  root.style.scrollbarGutter = saved?.gutter ?? ''
  saved = null
}
