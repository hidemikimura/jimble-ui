// 生成物: scripts/gen-icons.ts が icons/svg から作る。直接編集しない。
import { svg } from 'lit'
import type { Icon } from './render.js'

export const clock: Icon = {
  viewBox: '0 0 20 20',
  fill: 'currentColor',
  body: svg`<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd"/>`,
}
