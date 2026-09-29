// モーダル表示中に背面のスクロールを止める。複数のモーダルが重なっても壊れないよう参照カウントする。
//
// スクロールバーが幅を取る環境(Windows・Linux の既定)では、`overflow: hidden` にするとスクロールバーが消えて
// 背面のページが横にずれる。これを防ぐために、消えた幅の分だけ <html> の右の余白を足す。
// (`scrollbar-gutter: stable` で幅を残す方法は、画面の右端に付くドロワーの右に隙間が空くので使わない。
//  余白で補うと、固定配置の基準は画面の全幅になり、ドロワーやバックドロップが端まで届く。)
let count = 0
let saved: { overflow: string; paddingRight: string } | null = null

export function lockScroll(): void {
  if (count++ > 0) return
  const root = document.documentElement
  saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight }
  // スクロールバーが取っている幅(オーバーレイ式のスクロールバーなら 0)
  const bar = Math.max(window.innerWidth - root.clientWidth, 0)
  if (bar > 0) {
    const current = Number.parseFloat(getComputedStyle(root).paddingRight) || 0
    root.style.paddingRight = `${current + bar}px`
  }
  root.style.overflow = 'hidden'
}

export function unlockScroll(): void {
  if (count === 0 || --count > 0) return
  const root = document.documentElement
  root.style.overflow = saved?.overflow ?? ''
  root.style.paddingRight = saved?.paddingRight ?? ''
  saved = null
}
