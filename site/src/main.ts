import { installGlobal } from '@hidemikimura/jimble-ui'
import './docs-example.js'
import './site.css'

// 例の中の onclick="JimbleUI.toast(...)" で使う（CDN バンドルは自動で置く）
installGlobal()

// コードエディタは全部入りに含まれない(別の入口)。置いてあるページだけで読み込む
if (document.querySelector('jimble-code-editor'))
  void import('../../src/components/code-editor/index.js')

// 狭い画面ではメニューを畳んだ状態で開始する
const toggle = document.querySelector<HTMLDetailsElement>('.nav-toggle')
if (toggle && matchMedia('(max-width: 767px)').matches) toggle.open = false
