export type OrderStatus = 'shipped' | 'pending' | 'cancelled' | 'paid' | 'preparing'

export interface Order {
  id: number
  customer: string
  status: OrderStatus
  amount: number
  date: string
}

export const STATUS: Record<
  OrderStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
> = {
  shipped: { label: '発送済み', variant: 'success' },
  pending: { label: '保留', variant: 'warning' },
  cancelled: { label: 'キャンセル', variant: 'danger' },
  paid: { label: '入金済み', variant: 'info' },
  preparing: { label: '準備中', variant: 'neutral' },
}

const names = [
  '山田 太郎',
  '佐藤 花子',
  '鈴木 一郎',
  '高橋 健',
  '田中 美咲',
  '伊藤 誠',
  '渡辺 優',
  '中村 翼',
]
const statuses: OrderStatus[] = [
  'shipped',
  'pending',
  'paid',
  'preparing',
  'cancelled',
  'shipped',
  'paid',
  'shipped',
]

export const ORDERS: Order[] = Array.from({ length: 48 }, (_, i) => ({
  id: 1048 - i,
  customer: names[i % names.length]!,
  status: statuses[(i * 3) % statuses.length]!,
  amount: 3400 + ((i * 7919) % 60000),
  date: `2026-09-${String(30 - (i % 28)).padStart(2, '0')}`,
}))

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
