// stack と grid が共有する、余白（gap）の扱い。
// gap は、余白の基準（--jimble-spacing。既定 0.25rem = 4px）の何倍か。ページ全体の密度と一緒に変わる。

export const DEFAULT_GAP = 4

/** gap 属性の値を、0 以上の数に正す。数でなければ既定（4 = 16px） */
export function gapUnits(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_GAP
}

/** gap の CSS の値 */
export const gapCss = (units: number): string => `calc(var(--jimble-spacing, 0.25rem) * ${units})`
