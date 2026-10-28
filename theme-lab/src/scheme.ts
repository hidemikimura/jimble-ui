// 表示のモード(ライト・ダーク・OS に従う)。ページの color-scheme を切り替える(jimble-ui 0.12.0 以降)。
// 部品も、theme.css の light-dark(ライト, ダーク) も、この指定に従う。選んだモードはブラウザに覚えておく。

export type Scheme = 'light' | 'dark'
export type SchemeSetting = Scheme | 'light dark'

export const SCHEME_SETTINGS: [label: string, value: SchemeSetting][] = [
  ['OS に従う', 'light dark'],
  ['ライト', 'light'],
  ['ダーク', 'dark'],
]
/** モードが変わったら、window に出す */
export const SCHEME_EVENT = 'lab-scheme-change'

const KEY = 'lab-color-scheme'
const osDark = window.matchMedia('(prefers-color-scheme: dark)')

const isSetting = (v: unknown): v is SchemeSetting => SCHEME_SETTINGS.some(([, s]) => s === v)

export function schemeSetting(): SchemeSetting {
  try {
    const saved = localStorage.getItem(KEY)
    if (isSetting(saved)) return saved
  } catch {
    /* 保存できない環境では、OS に従う */
  }
  return 'light dark'
}

/** いま表示しているモード(「OS に従う」なら、OS の設定) */
export function activeScheme(): Scheme {
  const s = schemeSetting()
  if (s !== 'light dark') return s
  return osDark.matches ? 'dark' : 'light'
}

export function setScheme(s: SchemeSetting) {
  try {
    localStorage.setItem(KEY, s)
  } catch {
    /* 保存できなくても、切り替えは動く */
  }
  apply()
}

function apply() {
  document.documentElement.style.colorScheme = schemeSetting()
  window.dispatchEvent(new Event(SCHEME_EVENT))
}

apply()
osDark.addEventListener('change', () => {
  if (schemeSetting() === 'light dark') apply()
})
