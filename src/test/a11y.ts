import axe from 'axe-core'
import { expect } from 'vitest'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/** axe を要素に対して実行し、違反があれば内容つきで失敗させる（設計書 §11.3） */
export async function expectNoA11yViolations(el: Element): Promise<void> {
  const result = await axe.run(el, { runOnly: { type: 'tag', values: TAGS } })
  const summary = result.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')}: ${n.failureSummary}`).join('\n')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}
