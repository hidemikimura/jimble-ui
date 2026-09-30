import { html } from 'lit'
import { ORDERS, STATUS, yen } from '../data.ts'

const STATS = [
  { label: '今日の注文', value: '128', note: '前日比 +12%', variant: 'success' as const },
  { label: '売上（今月）', value: '¥4,820,000', note: '目標の 78%', variant: 'info' as const },
  { label: '未処理', value: '17', note: '対応が必要', variant: 'warning' as const },
  { label: 'キャンセル', value: '3', note: '前日比 -2', variant: 'neutral' as const },
]

export function dashboard() {
  return html`
    <jimble-page-header heading="ダッシュボード" description="今日の状況です。">
      <jimble-button slot="actions" variant="primary" href="/orders">注文を見る</jimble-button>
      <jimble-button slot="actions">レポートを出力</jimble-button>
    </jimble-page-header>

    <jimble-alert variant="info" dismissible style="margin-top: 1rem">
      お知らせ: メンテナンスは 23:00 から 1 時間の予定です。
    </jimble-alert>

    <div class="grid section">
      ${STATS.map(
        (s) =>
          html`<jimble-card>
            <div class="stat">
              <span class="muted">${s.label}</span>
              <span class="value">${s.value}</span>
              <span><jimble-badge variant=${s.variant}>${s.note}</jimble-badge></span>
            </div>
          </jimble-card>`,
      )}
    </div>

    <div class="grid-2 section">
      <jimble-card>
        <h3 slot="header">最近の注文</h3>
        <jimble-table label="最近の注文">
          <jimble-table-header>
            <jimble-table-row>
              <jimble-table-head-cell>注文番号</jimble-table-head-cell>
              <jimble-table-head-cell>顧客</jimble-table-head-cell>
              <jimble-table-head-cell>状態</jimble-table-head-cell>
              <jimble-table-head-cell align="end">金額</jimble-table-head-cell>
            </jimble-table-row>
          </jimble-table-header>
          <jimble-table-body>
            ${ORDERS.slice(0, 5).map(
              (o) =>
                html`<jimble-table-row>
                  <jimble-table-cell header
                    ><a href="/orders/${o.id}">#${o.id}</a></jimble-table-cell
                  >
                  <jimble-table-cell>${o.customer}</jimble-table-cell>
                  <jimble-table-cell
                    ><jimble-badge variant=${STATUS[o.status].variant}
                      >${STATUS[o.status].label}</jimble-badge
                    ></jimble-table-cell
                  >
                  <jimble-table-cell align="end">${yen(o.amount)}</jimble-table-cell>
                </jimble-table-row>`,
            )}
          </jimble-table-body>
        </jimble-table>
      </jimble-card>

      <div class="stack">
        <jimble-alert variant="warning">
          <span slot="title">契約の更新期限が近づいています</span>
          期限は 2026-10-31 です。
          <jimble-button slot="actions" size="sm">手続きを始める</jimble-button>
        </jimble-alert>
        <jimble-alert variant="danger">
          <span slot="title">在庫が不足しています</span>
          3 件の商品が、在庫 0 です。
        </jimble-alert>
        <jimble-alert variant="success">先週分の請求書を、すべて送信しました。</jimble-alert>
        <jimble-card>
          <h3 slot="header">進捗</h3>
          <div class="stack">
            <div class="row">
              <jimble-spinner variant="primary" decorative></jimble-spinner
              ><span>在庫を同期しています…</span>
            </div>
            <span class="muted">最終同期: 2026-09-30 10:24</span>
          </div>
        </jimble-card>
      </div>
    </div>
  `
}
