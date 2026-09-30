import { html } from 'lit'

export function notFound() {
  return html`<jimble-page-header
    heading="ページが見つかりません"
    description="URL が間違っているか、ページが移動した可能性があります。"
  >
    <jimble-button slot="actions" variant="primary" href="/">ダッシュボードへ</jimble-button>
  </jimble-page-header>`
}
