// CDN バンドルの入口: 全コンポーネントを登録し、グローバルの JimbleUI も置く
import { installGlobal } from './global.js'

export * from './index.js'
installGlobal()
