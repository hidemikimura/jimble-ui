import { html } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'
import { ORDERS, STATUS, yen } from '../data.ts'

export function orderDetail({ params }: { params: Record<string, string> }) {
  const order = ORDERS.find((o) => String(o.id) === params.id) ?? ORDERS[0]!
  const items = [
    { name: 'ワイヤレスキーボード', qty: 1, price: order.amount * 0.6 },
    { name: 'USB-C ケーブル 2m', qty: 2, price: order.amount * 0.15 },
  ]
  const cancel = () => {
    const dialog = document.createElement('jimble-dialog') as HTMLElement & { show(): void }
    dialog.setAttribute('heading', `注文 #${order.id} をキャンセルしますか？`)
    dialog.setAttribute('alert', '')
    dialog.innerHTML = `この操作は取り消せません。顧客にキャンセルのメールが送られます。
      <jimble-button slot="footer" data-dialog-close autofocus>戻る</jimble-button>
      <jimble-button slot="footer" variant="danger" data-dialog-close id="confirm">キャンセルする</jimble-button>`
    document.body.append(dialog)
    dialog
      .querySelector('#confirm')!
      .addEventListener('click', () => JimbleUI.toast.success('注文をキャンセルしました'))
    dialog.addEventListener('jimble-close', () => dialog.remove())
    dialog.show()
  }
  return html`
    <jimble-page-header
      heading=${`注文 #${order.id}`}
      description=${`${order.customer} さん / ${order.date}`}
    >
      <jimble-breadcrumb slot="breadcrumb">
        <jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item>
        <jimble-breadcrumb-item href="/orders">注文</jimble-breadcrumb-item>
        <jimble-breadcrumb-item>#${order.id}</jimble-breadcrumb-item>
      </jimble-breadcrumb>
      <jimble-button
        slot="actions"
        variant="primary"
        @click=${() => JimbleUI.toast.success('保存しました')}
        >保存</jimble-button
      >
      <jimble-button slot="actions" variant="danger" @click=${cancel}>キャンセル</jimble-button>
    </jimble-page-header>

    <div class="grid-2 section">
      <jimble-card>
        <h3 slot="header">基本情報</h3>
        <jimble-description-list>
          <jimble-description-item label="顧客">${order.customer}</jimble-description-item>
          <jimble-description-item label="状態"
            ><jimble-badge variant=${STATUS[order.status].variant}
              >${STATUS[order.status].label}</jimble-badge
            ></jimble-description-item
          >
          <jimble-description-item label="注文日">${order.date}</jimble-description-item>
          <jimble-description-item label="合計金額">${yen(order.amount)}</jimble-description-item>
          <jimble-description-item label="メール"
            ><a href="mailto:taro@example.com">taro@example.com</a></jimble-description-item
          >
        </jimble-description-list>
      </jimble-card>
      <jimble-card>
        <h3 slot="header">配送</h3>
        <div class="stack">
          <jimble-field label="配送先" hint="変更すると、顧客に通知されます">
            <jimble-textarea rows="3">東京都千代田区1-1-1</jimble-textarea>
          </jimble-field>
          <jimble-field label="配送状況">
            <jimble-select value="preparing">
              <jimble-option value="preparing">準備中</jimble-option>
              <jimble-option value="shipped">発送済み</jimble-option>
              <jimble-option value="delivered">配達完了</jimble-option>
            </jimble-select>
          </jimble-field>
        </div>
      </jimble-card>
    </div>

    <jimble-tabs label="注文の詳細" style="margin-top: 1.5rem">
      <jimble-tab value="items">明細</jimble-tab>
      <jimble-tab value="history">履歴</jimble-tab>
      <jimble-tab-panel value="items">
        <jimble-card>
          <jimble-table label="明細">
            <jimble-table-header>
              <jimble-table-row>
                <jimble-table-head-cell>商品</jimble-table-head-cell>
                <jimble-table-head-cell align="end">数量</jimble-table-head-cell>
                <jimble-table-head-cell align="end">金額</jimble-table-head-cell>
              </jimble-table-row>
            </jimble-table-header>
            <jimble-table-body>
              ${items.map(
                (i) =>
                  html`<jimble-table-row>
                    <jimble-table-cell header>${i.name}</jimble-table-cell>
                    <jimble-table-cell align="end">${i.qty}</jimble-table-cell>
                    <jimble-table-cell align="end">${yen(Math.round(i.price))}</jimble-table-cell>
                  </jimble-table-row>`,
              )}
            </jimble-table-body>
          </jimble-table>
        </jimble-card>
      </jimble-tab-panel>
      <jimble-tab-panel value="history">
        <div class="stack">
          <jimble-alert variant="success">入金を確認しました（${order.date} 10:24）。</jimble-alert>
          <jimble-alert variant="info">注文を受け付けました（${order.date} 09:58）。</jimble-alert>
        </div>
      </jimble-tab-panel>
    </jimble-tabs>
  `
}
