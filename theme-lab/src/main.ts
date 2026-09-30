import { html, render } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'
import type { JimbleRouter } from '@hidemikimura/jimble-ui'
import './theme.css'
import './lab.css'
import './tuner.ts'
import { components } from './pages/components.ts'
import { contrastPage } from './pages/contrast.ts'
import { dashboard } from './pages/dashboard.ts'
import { forms } from './pages/forms.ts'
import { login } from './pages/login.ts'
import { notFound } from './pages/not-found.ts'
import { orderDetail } from './pages/order-detail.ts'
import { orders } from './pages/orders.ts'

const app = document.getElementById('app') as JimbleRouter

// 画面の一覧。デザイナーが見る順に並べてある(サイドバーも、ここから作る)
const NAV = [
  {
    group: '画面の例',
    items: [
      { path: '/', label: 'ダッシュボード', icon: 'home' },
      { path: '/orders', label: '注文の一覧', icon: 'table-cells' },
      { path: '/orders/1048', label: '注文の詳細', icon: 'document-text' },
      { path: '/forms', label: '入力フォーム', icon: 'pencil-square' },
      { path: '/login', label: 'ログイン', icon: 'lock-closed' },
    ],
  },
  {
    group: '確認用',
    items: [
      { path: '/components', label: '部品一覧', icon: 'squares-2x2' },
      { path: '/contrast', label: 'コントラスト', icon: 'eye' },
    ],
  },
]

const isCurrent = (path: string) => {
  const here = location.pathname.replace(/\/$/, '') || '/'
  return (
    path === here || (path !== '/' && path.startsWith('/orders/') && here.startsWith('/orders/'))
  )
}

const drawNav = () =>
  render(
    NAV.map(
      (g) =>
        html`<jimble-nav-group label=${g.group} open>
          ${g.items.map(
            (i) =>
              html`<jimble-nav-item href=${i.path} ?current=${isCurrent(i.path)}
                ><jimble-icon slot="icon" name=${i.icon}></jimble-icon>${i.label}</jimble-nav-item
              >`,
          )}
        </jimble-nav-group>`,
    ),
    document.getElementById('nav')!,
  )

app.routes = [
  { path: '/', title: 'ダッシュボード', render: () => dashboard() },
  { path: '/orders', title: '注文の一覧', render: () => orders() },
  { path: '/orders/:id', title: '注文の詳細', render: (ctx) => orderDetail(ctx) },
  { path: '/forms', title: '入力フォーム', render: () => forms() },
  { path: '/components', title: '部品一覧', render: () => components() },
  { path: '/contrast', title: 'コントラスト', render: () => contrastPage() },
  { path: '/login', title: 'ログイン', render: () => login() },
]
app.fallback = { title: 'ページが見つかりません', render: () => notFound() }

// ログイン画面だけは、ヘッダーとサイドバーを隠す
app.addEventListener('jimble-route-change', () => {
  document.documentElement.toggleAttribute('data-bare', location.pathname.startsWith('/login'))
  drawNav()
})
drawNav()

document.getElementById('user-menu')!.addEventListener('jimble-select', (e) => {
  if ((e as CustomEvent<{ value: string }>).detail.value === 'login') void app.navigate('/login')
  else JimbleUI.toast({ message: 'プロフィールは、サンプルでは開けません', variant: 'info' })
})
