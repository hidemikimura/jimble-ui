import { html } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'

type El = HTMLElement & { show(): void; hide(): void }
const $ = (id: string) => document.getElementById(id) as El

export function components() {
  return html`
    <jimble-page-header
      heading="部品一覧"
      description="色を変えたときに、見た目をまとめて確認するページです。マウスを重ねる・フォーカスする・操作するで、状態の色も確かめてください。"
    ></jimble-page-header>

    <jimble-card class="section">
      <h3 slot="header">ボタン</h3>
      <div class="stack">
        ${(['primary', 'secondary', 'danger', 'ghost'] as const).map(
          (variant) =>
            html`<div class="row">
              <span class="muted" style="width: 5rem">${variant}</span>
              <jimble-button variant=${variant} size="sm">小</jimble-button>
              <jimble-button variant=${variant}>中</jimble-button>
              <jimble-button variant=${variant} size="lg">大</jimble-button>
              <jimble-button variant=${variant} disabled>無効</jimble-button>
              <jimble-button variant=${variant} loading>読み込み中</jimble-button>
              <jimble-button variant=${variant}
                ><jimble-icon slot="prefix" name="plus" size="sm"></jimble-icon
                >アイコン付き</jimble-button
              >
            </div>`,
        )}
      </div>
    </jimble-card>

    <div class="grid-2 section">
      <jimble-card>
        <h3 slot="header">バッジ</h3>
        <div class="row">
          ${(['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map(
            (v) => html`<jimble-badge variant=${v}>${v}</jimble-badge>`,
          )}
        </div>
        <div class="row" style="margin-top: 0.75rem">
          ${(['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map(
            (v) => html`<jimble-badge variant=${v} size="sm">${v}</jimble-badge>`,
          )}
        </div>
      </jimble-card>
      <jimble-card>
        <h3 slot="header">スピナー・アイコン・ツールチップ</h3>
        <div class="row">
          <jimble-spinner size="sm"></jimble-spinner>
          <jimble-spinner></jimble-spinner>
          <jimble-spinner size="lg" variant="primary"></jimble-spinner>
          ${[
            'check-circle',
            'exclamation-triangle',
            'information-circle',
            'x-circle',
            'bell',
            'cog-6-tooth',
            'trash',
          ].map((n) => html`<jimble-icon name=${n} size="lg"></jimble-icon>`)}
          <jimble-tooltip text="ツールチップの見え方です"
            ><jimble-button>マウスを重ねる</jimble-button></jimble-tooltip
          >
        </div>
      </jimble-card>
    </div>

    <jimble-card class="section">
      <h3 slot="header">アラート</h3>
      <div class="stack">
        ${(['info', 'success', 'warning', 'danger'] as const).map(
          (v) =>
            html`<jimble-alert variant=${v} dismissible>
              <span slot="title">${v} の見出し</span>
              本文のテキストです。リンクは <a href="/">このように</a> 見えます。
              <jimble-button slot="actions" size="sm">操作</jimble-button>
            </jimble-alert>`,
        )}
      </div>
    </jimble-card>

    <jimble-card class="section">
      <h3 slot="header">オーバーレイ・通知</h3>
      <div class="row">
        <jimble-button @click=${() => $('lab-dialog').show()}>ダイアログ</jimble-button>
        <jimble-button @click=${() => $('lab-alertdialog').show()}>確認ダイアログ</jimble-button>
        <jimble-button @click=${() => $('lab-drawer').show()}>ドロワー（右）</jimble-button>
        <jimble-dropdown-menu>
          <jimble-button slot="trigger"
            >メニュー<jimble-icon slot="suffix" name="chevron-down" size="sm"></jimble-icon
          ></jimble-button>
          <jimble-menu-item value="a">編集</jimble-menu-item>
          <jimble-menu-item value="b">複製</jimble-menu-item>
          <jimble-menu-item value="c" disabled>無効な項目</jimble-menu-item>
          <jimble-menu-item value="d" variant="danger">削除</jimble-menu-item>
        </jimble-dropdown-menu>
        ${(['info', 'success', 'warning', 'danger'] as const).map(
          (v) =>
            html`<jimble-button
              size="sm"
              @click=${() => JimbleUI.toast({ message: `${v} の通知です`, variant: v, heading: v })}
              >通知: ${v}</jimble-button
            >`,
        )}
      </div>
      <jimble-dialog id="lab-dialog" heading="ダイアログ">
        ダイアログの面・見出し・フッターの見え方です。
        <jimble-button slot="footer" data-dialog-close>閉じる</jimble-button>
        <jimble-button slot="footer" variant="primary" data-dialog-close>OK</jimble-button>
      </jimble-dialog>
      <jimble-dialog id="lab-alertdialog" heading="削除しますか？" alert>
        この操作は取り消せません。
        <jimble-button slot="footer" data-dialog-close autofocus>戻る</jimble-button>
        <jimble-button slot="footer" variant="danger" data-dialog-close>削除する</jimble-button>
      </jimble-dialog>
      <jimble-drawer id="lab-drawer" heading="ドロワー">
        右から出るパネルです。フォームや詳細に使います。
        <jimble-field label="メモ"><jimble-input></jimble-input></jimble-field>
        <jimble-button slot="footer" data-dialog-close>閉じる</jimble-button>
        <jimble-button slot="footer" variant="primary" data-dialog-close>保存</jimble-button>
      </jimble-drawer>
    </jimble-card>

    <div class="grid-2 section">
      <jimble-card>
        <h3 slot="header">タブ・ページネーション・パンくず</h3>
        <div class="stack">
          <jimble-breadcrumb>
            <jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item>
            <jimble-breadcrumb-item href="/orders">注文</jimble-breadcrumb-item>
            <jimble-breadcrumb-item>詳細</jimble-breadcrumb-item>
          </jimble-breadcrumb>
          <jimble-tabs label="タブの見本">
            <jimble-tab value="a">すべて</jimble-tab>
            <jimble-tab value="b">未処理</jimble-tab>
            <jimble-tab value="c" disabled>無効</jimble-tab>
            <jimble-tab-panel value="a">タブの内容です。</jimble-tab-panel>
            <jimble-tab-panel value="b">未処理の内容です。</jimble-tab-panel>
          </jimble-tabs>
          <jimble-pagination page="7" total="243" page-size="20" size="sm"></jimble-pagination>
        </div>
      </jimble-card>
      <jimble-card>
        <h3 slot="header">説明リスト・表</h3>
        <div class="stack">
          <jimble-description-list>
            <jimble-description-item label="氏名">山田 太郎</jimble-description-item>
            <jimble-description-item label="状態"
              ><jimble-badge variant="success">有効</jimble-badge></jimble-description-item
            >
          </jimble-description-list>
          <jimble-table label="表の見本">
            <jimble-table-header>
              <jimble-table-row>
                <jimble-table-head-cell sortable>名前</jimble-table-head-cell>
                <jimble-table-head-cell align="end">数量</jimble-table-head-cell>
              </jimble-table-row>
            </jimble-table-header>
            <jimble-table-body>
              <jimble-table-row
                ><jimble-table-cell header>りんご</jimble-table-cell
                ><jimble-table-cell align="end">12</jimble-table-cell></jimble-table-row
              >
              <jimble-table-row
                ><jimble-table-cell header>みかん</jimble-table-cell
                ><jimble-table-cell align="end">8</jimble-table-cell></jimble-table-row
              >
            </jimble-table-body>
          </jimble-table>
        </div>
      </jimble-card>
    </div>
  `
}
