import { html, render } from 'lit'
import { JimbleUI } from '@hidemikimura/jimble-ui'

const PREFS = ['北海道', '東京都', '神奈川県', '愛知県', '大阪府', '京都府', '福岡県', '沖縄県']

/** 「エラー表示を確認」: ページの中のすべての field を検証して、エラーを表示する */
async function showAllErrors(root: HTMLElement) {
  for (const field of root.querySelectorAll<HTMLElement & { showErrors(): Promise<boolean> }>(
    'jimble-field',
  )) {
    await field.showErrors()
  }
}

export function forms() {
  const root = document.createElement('div')
  const view = html`
    <jimble-page-header
      heading="顧客の登録"
      description="入力部品と、エラーの見え方を確認するページです。"
    >
      <jimble-breadcrumb slot="breadcrumb">
        <jimble-breadcrumb-item href="/">ホーム</jimble-breadcrumb-item>
        <jimble-breadcrumb-item>顧客の登録</jimble-breadcrumb-item>
      </jimble-breadcrumb>
      <jimble-button slot="actions" @click=${() => showAllErrors(root)}
        >エラー表示を確認</jimble-button
      >
      <jimble-button
        slot="actions"
        variant="primary"
        @click=${() => JimbleUI.toast.success('登録しました')}
        >登録</jimble-button
      >
    </jimble-page-header>

    <form class="stack section" @submit=${(e: Event) => e.preventDefault()}>
      <jimble-card>
        <h3 slot="header">基本情報</h3>
        <div class="grid-2">
          <jimble-field label="氏名" required hint="姓と名の間は空けなくて構いません">
            <jimble-input name="name" autocomplete="name" placeholder="山田 太郎"></jimble-input>
          </jimble-field>
          <jimble-field label="フリガナ" required>
            <jimble-input name="kana" placeholder="ヤマダ タロウ"></jimble-input>
          </jimble-field>
          <jimble-field
            label="メールアドレス"
            required
            hint="社用アドレスを入力してください"
            .validate=${(v: unknown) => (String(v).endsWith('@example.com') ? null : '社用アドレス（@example.com）を入力してください。')}
          >
            <jimble-input
              type="email"
              name="email"
              autocomplete="email"
              value="taro@gmail.com"
            ></jimble-input>
          </jimble-field>
          <jimble-field label="電話番号" hint="ハイフンなし">
            <jimble-input type="tel" name="tel" autocomplete="tel"
              ><span slot="prefix">☎</span></jimble-input
            >
          </jimble-field>
          <jimble-field label="都道府県" required>
            <jimble-combobox name="pref" placeholder="入力して絞り込み" clearable>
              ${PREFS.map((p) => html`<jimble-option value=${p}>${p}</jimble-option>`)}
            </jimble-combobox>
          </jimble-field>
          <jimble-field label="契約プラン" required>
            <jimble-select name="plan" placeholder="選択してください">
              <jimble-option value="free">無料</jimble-option>
              <jimble-option value="pro">Pro</jimble-option>
              <jimble-option value="ent">Enterprise</jimble-option>
              <jimble-option value="x" disabled>Legacy（提供終了）</jimble-option>
            </jimble-select>
          </jimble-field>
        </div>
        <jimble-field label="備考" hint="社内メモ（顧客には見えません）" style="margin-top: 1rem">
          <jimble-textarea name="note" rows="3" autosize></jimble-textarea>
        </jimble-field>
      </jimble-card>

      <jimble-card>
        <h3 slot="header">設定</h3>
        <div class="grid-2">
          <div class="stack">
            <jimble-switch name="notify" checked>通知メールを受け取る</jimble-switch>
            <jimble-switch name="beta" disabled>ベータ機能（無効）</jimble-switch>
            <jimble-checkbox name="agree" checked>利用規約に同意する</jimble-checkbox>
            <jimble-checkbox name="news">お知らせを受け取る</jimble-checkbox>
            <jimble-checkbox name="disabled" disabled>選べない項目</jimble-checkbox>
          </div>
          <jimble-field label="請求サイクル" required>
            <jimble-radio-group name="cycle" value="monthly">
              <jimble-radio value="monthly">月払い</jimble-radio>
              <jimble-radio value="yearly">年払い</jimble-radio>
              <jimble-radio value="none" disabled>請求なし（無効）</jimble-radio>
            </jimble-radio-group>
          </jimble-field>
        </div>
      </jimble-card>

      <jimble-card>
        <h3 slot="header">日付・色・担当者</h3>
        <div class="grid-2">
          <jimble-field label="契約日" required
            ><jimble-date-input name="start" value="2026-09-30"></jimble-date-input
          ></jimble-field>
          <jimble-field label="キャンペーン期間"
            ><jimble-date-input name="period" range months="2"></jimble-date-input
          ></jimble-field>
          <jimble-field label="開始日時"
            ><jimble-date-input name="startAt" time value="2026-10-01T09:00"></jimble-date-input
          ></jimble-field>
          <jimble-field label="テーマ色"
            ><jimble-color-input name="color" value="#4f46e5"></jimble-color-input
          ></jimble-field>
          <jimble-field label="担当者（複数）" hint="入力して追加もできます">
            <jimble-combobox name="owners" multiple creatable reorderable value="sato,suzuki">
              <jimble-option value="sato">佐藤 花子</jimble-option>
              <jimble-option value="suzuki">鈴木 一郎</jimble-option>
              <jimble-option value="takahashi">高橋 健</jimble-option>
            </jimble-combobox>
          </jimble-field>
          <jimble-field label="添付ファイル"
            ><jimble-file-input
              name="files"
              multiple
              accept=".pdf,image/*"
              max-size="5242880"
            ></jimble-file-input
          ></jimble-field>
        </div>
      </jimble-card>

      <jimble-card>
        <h3 slot="header">権限</h3>
        <jimble-field label="付与する権限">
          <jimble-dual-listbox
            name="roles"
            value="viewer"
            move-all
            reorderable
            style="--jimble-dual-listbox-height: 10rem"
          >
            <jimble-option value="admin">管理者</jimble-option>
            <jimble-option value="editor">編集者</jimble-option>
            <jimble-option value="viewer">閲覧者</jimble-option>
            <jimble-option value="billing">請求担当</jimble-option>
          </jimble-dual-listbox>
        </jimble-field>
        <jimble-field
          label="無効な入力欄"
          error="サーバーのエラー: この値は使われています"
          style="margin-top: 1rem; max-width: 24rem"
        >
          <jimble-input value="admin"></jimble-input>
        </jimble-field>
        <jimble-field label="無効化した入力欄" style="margin-top: 1rem; max-width: 24rem">
          <jimble-input value="編集できません" disabled></jimble-input>
        </jimble-field>
      </jimble-card>
    </form>
  `
  render(view, root)
  return root
}
