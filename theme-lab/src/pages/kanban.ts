import { html } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'

interface Task {
  id: string
  title: string
  owner: string
  due: string
  badge?: { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }
  locked?: boolean
}
const COLUMNS: { value: string; heading: string; tasks: Task[] }[] = [
  {
    value: 'todo',
    heading: '未着手',
    tasks: [
      {
        id: 't1',
        title: '請求書の送付',
        owner: '山田 太郎',
        due: '10/12',
        badge: { label: '急ぎ', variant: 'warning' },
      },
      { id: 't2', title: '在庫の棚卸し', owner: '佐藤 花子', due: '10/20' },
      { id: 't3', title: 'クーポンの設定', owner: '鈴木 一郎', due: '10/25' },
    ],
  },
  {
    value: 'doing',
    heading: '進行中',
    tasks: [
      {
        id: 't4',
        title: '配送業者の見直し',
        owner: '高橋 健',
        due: '10/15',
        badge: { label: '確認待ち', variant: 'info' },
      },
      {
        id: 't5',
        title: '返品ポリシーの改定',
        owner: '田中 美咲',
        due: '10/18',
        badge: { label: '遅れ', variant: 'danger' },
      },
    ],
  },
  { value: 'review', heading: '確認中', tasks: [] },
  {
    value: 'done',
    heading: '完了',
    tasks: [
      {
        id: 't6',
        title: '月次レポートの作成',
        owner: '田中 美咲',
        due: '9/30',
        badge: { label: '完了', variant: 'success' },
      },
      { id: 't7', title: '決済の監査（固定）', owner: '伊藤 誠', due: '9/28', locked: true },
    ],
  },
]

const card = (t: Task) =>
  html`<jimble-kanban-card value=${t.id} ?locked=${t.locked}>
    <div class="stack" style="gap: 0.5rem">
      <strong>${t.title}</strong>
      <span class="muted">${t.owner} ・ ${t.due}</span>
      ${t.badge ? html`<div><jimble-badge variant=${t.badge.variant}>${t.badge.label}</jimble-badge></div>` : ''}
    </div>
  </jimble-kanban-card>`

const board = (label: string, readonly = false) =>
  html`<jimble-kanban
    label=${label}
    ?readonly=${readonly}
    @jimble-card-move=${(e: CustomEvent<{ card: { cardTitle: string }; to: string }>) =>
      JimbleUI.toast({
        message: `「${e.detail.card.cardTitle}」を動かしました（${e.detail.to}）`,
        variant: 'info',
      })}
  >
    ${COLUMNS.map(
      (c) =>
        html`<jimble-kanban-column value=${c.value} heading=${c.heading}>
          ${c.tasks.map(card)}
          ${readonly ? '' : html`<jimble-button slot="actions" size="sm" variant="ghost" aria-label=${`${c.heading}にカードを追加`}><jimble-icon name="plus" size="sm"></jimble-icon></jimble-button>`}
        </jimble-kanban-column>`,
    )}
  </jimble-kanban>`

export function kanbanPage() {
  return html`
    <jimble-page-header
      heading="かんばん"
      description="カードをドラッグ（タッチは長押し）、または Alt + 矢印キーで動かせます。列・カード・挿入位置・移動ボタンの色を確認するページです。"
    >
      <jimble-button slot="actions" variant="primary">カードを追加</jimble-button>
    </jimble-page-header>
    <div class="section">${board('作業')}</div>
    <h3 class="section">閲覧専用（readonly）</h3>
    <div class="section">${board('作業（閲覧専用）', true)}</div>
  `
}
