import { installGlobal } from '@hidemikimura/jimble-ui'
import './docs-example.js'
import './site.css'

// 例の中の onclick="JimbleUI.toast(...)" で使う（CDN バンドルは自動で置く）
installGlobal()

// 狭い画面ではメニューを畳んだ状態で開始する
const toggle = document.querySelector<HTMLDetailsElement>('.nav-toggle')
if (toggle && matchMedia('(max-width: 767px)').matches) toggle.open = false
