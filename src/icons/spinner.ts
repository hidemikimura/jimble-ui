// 生成物: scripts/gen-icons.ts が icons/svg から作る。直接編集しない。
import { svg } from 'lit'
import type { Icon } from './render.js'

export const spinner: Icon = {
  viewBox: '0 0 20 20',
  fill: 'none',
  body: svg`<circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.5"/><path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
}
