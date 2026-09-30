import { html } from 'lit'
import { ORDERS, STATUS, yen, type OrderStatus } from '../data.ts'
import { statefulPage } from './util.ts'

const PAGE_SIZE = 10
const TABS: { value: string; label: string; filter: (s: OrderStatus) => boolean }[] = [
  { value: 'all', label: 'すべて', filter: () => true },
  { value: 'open', label: '未処理', filter: (s) => s === 'pending' || s === 'preparing' },
  { value: 'shipped', label: '発送済み', filter: (s) => s === 'shipped' },
  { value: 'cancelled', label: 'キャンセル', filter: (s) => s === 'cancelled' },
]

export function orders() {
  const state = {
    tab: 'all',
    page: 1,
    sort: 'id',
    dir: 'descending' as 'ascending' | 'descending',
    keyword: '',
    status: '',
  }
  const { root, draw } = statefulPage(() => {
    const tab = TABS.find((t) => t.value === state.tab)!
    const rows = ORDERS.filter((o) => tab.filter(o.status))
      .filter((o) => !state.status || o.status === state.status)
      .filter((o) => !state.keyword || `${o.customer}${o.id}`.includes(state.keyword))
      .sort((a, b) => {
        const sign = state.dir === 'ascending' ? 1 : -1
        return sign * (state.sort === 'amount' ? a.amount - b.amount : a.id - b.id)
      })
    const pageRows = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)
    return html`
      <jimble-page-header heading="注文" description="受け付けた注文の一覧です。">
        <jimble-breadcrumb slot="breadcrumb">
          <jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item>
          <jimble-breadcrumb-item>注文</jimble-breadcrumb-item>
        </jimble-breadcrumb>
        <jimble-button slot="actions" variant="primary">新規注文</jimble-button>
        <jimble-button slot="actions">CSV を出力</jimble-button>
      </jimble-page-header>

      <div class="filters">
        <jimble-field label="キーワード">
          <jimble-input
            placeholder="顧客名・注文番号"
            .value=${state.keyword}
            @input=${(e: Event) => {
              state.keyword = (e.target as HTMLInputElement).value
              state.page = 1
              draw()
            }}
          ></jimble-input>
        </jimble-field>
        <jimble-field label="状態">
          <jimble-select
            placeholder="すべて"
            @change=${(e: Event) => {
              state.status = (e.target as HTMLInputElement).value
              state.page = 1
              draw()
            }}
          >
            ${Object.entries(STATUS).map(([v, s]) => html`<jimble-option value=${v}>${s.label}</jimble-option>`)}
          </jimble-select>
        </jimble-field>
        <jimble-field label="注文日">
          <jimble-date-input range></jimble-date-input>
        </jimble-field>
      </div>

      <jimble-tabs
        label="注文の絞り込み"
        .value=${state.tab}
        @jimble-tab-change=${(e: CustomEvent<{ value: string }>) => {
          state.tab = e.detail.value
          state.page = 1
          draw()
        }}
      >
        ${TABS.map((t) => html`<jimble-tab value=${t.value}>${t.label}</jimble-tab>`)}
        ${TABS.map(
          (t) =>
            html`<jimble-tab-panel value=${t.value}>
              <jimble-card>
                <jimble-table
                  label="注文一覧"
                  @jimble-sort=${(e: CustomEvent<{ direction: 'ascending' | 'descending' }>) => {
                    const head = (e.target as HTMLElement).closest('jimble-table-head-cell')!
                    state.sort = head.dataset.key ?? 'id'
                    state.dir = e.detail.direction
                    draw()
                  }}
                >
                  <jimble-table-header>
                    <jimble-table-row>
                      <jimble-table-head-cell
                        sortable
                        data-key="id"
                        .sort=${state.sort === 'id' ? state.dir : undefined}
                        >注文番号</jimble-table-head-cell
                      >
                      <jimble-table-head-cell>顧客</jimble-table-head-cell>
                      <jimble-table-head-cell>状態</jimble-table-head-cell>
                      <jimble-table-head-cell>注文日</jimble-table-head-cell>
                      <jimble-table-head-cell
                        sortable
                        align="end"
                        data-key="amount"
                        .sort=${state.sort === 'amount' ? state.dir : undefined}
                        >金額</jimble-table-head-cell
                      >
                      <jimble-table-head-cell align="end">操作</jimble-table-head-cell>
                    </jimble-table-row>
                  </jimble-table-header>
                  <jimble-table-body>
                    ${pageRows.map(
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
                          <jimble-table-cell>${o.date}</jimble-table-cell>
                          <jimble-table-cell align="end">${yen(o.amount)}</jimble-table-cell>
                          <jimble-table-cell align="end">
                            <jimble-dropdown-menu>
                              <jimble-button
                                slot="trigger"
                                size="sm"
                                variant="ghost"
                                icon-only
                                aria-label="#${o.id} の操作"
                              >
                                <jimble-icon name="ellipsis-horizontal"></jimble-icon>
                              </jimble-button>
                              <jimble-menu-item value="open" href="/orders/${o.id}"
                                >詳細を開く</jimble-menu-item
                              >
                              <jimble-menu-item value="ship">発送済みにする</jimble-menu-item>
                              <jimble-menu-item value="cancel" variant="danger"
                                >キャンセル</jimble-menu-item
                              >
                            </jimble-dropdown-menu>
                          </jimble-table-cell>
                        </jimble-table-row>`,
                    )}
                  </jimble-table-body>
                </jimble-table>
                <div slot="footer">
                  <jimble-pagination
                    page=${state.page}
                    total=${rows.length}
                    page-size=${PAGE_SIZE}
                    size="sm"
                    @jimble-page-change=${(e: CustomEvent<{ page: number }>) => {
                      state.page = e.detail.page
                      draw()
                    }}
                  ></jimble-pagination>
                </div>
              </jimble-card>
            </jimble-tab-panel>`,
        )}
      </jimble-tabs>
    `
  })
  return root
}
