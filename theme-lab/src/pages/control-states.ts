import { html, type TemplateResult } from 'lit'

// 入力部品を、状態ごと(通常・入力済み・無効・読み取り専用・エラー)に並べる。色の確認用。
// 各部品の見出し(id)は、「部品一覧」の目次から飛ぶために使う。

const PREFS = ['北海道', '東京都', '神奈川県', '愛知県', '大阪府', '京都府']
const options = () => PREFS.map((p) => html`<jimble-option value=${p}>${p}</jimble-option>`)

/** 状態ごとの 1 マス。ラベルが状態の名前になる(エラーのときは、メッセージも出る) */
const cell = (state: string, control: TemplateResult, error?: string) =>
  html`<jimble-field label=${state} error=${error ?? ''}>${control}</jimble-field>`
const ERROR = '入力内容を確認してください'

const family = (id: string, title: string, cells: TemplateResult[]) =>
  html`<jimble-card class="section" id=${id}>
    <h3 slot="header">${title}</h3>
    <div class="states">${cells}</div>
  </jimble-card>`

export const CONTROL_SECTIONS: [id: string, title: string][] = [
  ['st-input', 'Input'],
  ['st-textarea', 'Textarea'],
  ['st-select', 'Select'],
  ['st-combobox', 'Combobox'],
  ['st-date', 'Date Input'],
  ['st-color', 'Color Input'],
  ['st-file', 'File Input'],
  ['st-check', 'Checkbox・Switch'],
  ['st-radio', 'Radio Group'],
  ['st-dual', 'Dual Listbox'],
]

export function controlStates() {
  return html`
    ${family('st-input', 'Input（テキスト入力）', [
      cell('通常', html`<jimble-input placeholder="山田 太郎"></jimble-input>`),
      cell('入力済み', html`<jimble-input value="山田 太郎"></jimble-input>`),
      cell('無効', html`<jimble-input value="山田 太郎" disabled></jimble-input>`),
      cell('読み取り専用', html`<jimble-input value="山田 太郎" readonly></jimble-input>`),
      cell('エラー', html`<jimble-input value="山田"></jimble-input>`, ERROR),
      cell(
        '前後の要素',
        html`<jimble-input value="1200"
          ><span slot="prefix">¥</span><span slot="suffix">円</span></jimble-input
        >`,
      ),
      cell('パスワード', html`<jimble-input type="password" value="secret123"></jimble-input>`),
      cell('サイズ（小）', html`<jimble-input size="sm" placeholder="小"></jimble-input>`),
      cell('サイズ（大）', html`<jimble-input size="lg" placeholder="大"></jimble-input>`),
    ])}
    ${family('st-textarea', 'Textarea（複数行）', [
      cell('通常', html`<jimble-textarea rows="2" placeholder="メモ"></jimble-textarea>`),
      cell(
        '入力済み',
        html`<jimble-textarea rows="2" value="1 行目&#10;2 行目"></jimble-textarea>`,
      ),
      cell(
        '無効',
        html`<jimble-textarea rows="2" value="編集できません" disabled></jimble-textarea>`,
      ),
      cell(
        '読み取り専用',
        html`<jimble-textarea rows="2" value="読むだけです" readonly></jimble-textarea>`,
      ),
      cell('エラー', html`<jimble-textarea rows="2" value="短い"></jimble-textarea>`, ERROR),
    ])}
    ${family('st-select', 'Select（選択）', [
      cell(
        '通常',
        html`<jimble-select placeholder="選択してください">${options()}</jimble-select>`,
      ),
      cell('選択済み', html`<jimble-select value="東京都">${options()}</jimble-select>`),
      cell('無効', html`<jimble-select value="東京都" disabled>${options()}</jimble-select>`),
      cell(
        'エラー',
        html`<jimble-select placeholder="選択してください">${options()}</jimble-select>`,
        '選択してください',
      ),
    ])}
    ${family('st-combobox', 'Combobox（検索して選ぶ）', [
      cell(
        '通常',
        html`<jimble-combobox placeholder="入力して絞り込み">${options()}</jimble-combobox>`,
      ),
      cell(
        '選択済み',
        html`<jimble-combobox value="東京都" clearable>${options()}</jimble-combobox>`,
      ),
      cell(
        '複数選択',
        html`<jimble-combobox multiple value="東京都,大阪府">${options()}</jimble-combobox>`,
      ),
      cell('無効', html`<jimble-combobox value="東京都" disabled>${options()}</jimble-combobox>`),
      cell(
        '読み取り専用',
        html`<jimble-combobox value="東京都" readonly>${options()}</jimble-combobox>`,
      ),
      cell(
        'エラー',
        html`<jimble-combobox placeholder="入力して絞り込み">${options()}</jimble-combobox>`,
        '選択してください',
      ),
    ])}
    ${family('st-date', 'Date Input（日付）', [
      cell('通常', html`<jimble-date-input></jimble-date-input>`),
      cell('入力済み', html`<jimble-date-input value="2026-10-08"></jimble-date-input>`),
      cell(
        '期間',
        html`<jimble-date-input range value="2026-10-01/2026-10-15"></jimble-date-input>`,
      ),
      cell('日時', html`<jimble-date-input time value="2026-10-08T14:30"></jimble-date-input>`),
      cell('無効', html`<jimble-date-input value="2026-10-08" disabled></jimble-date-input>`),
      cell(
        '読み取り専用',
        html`<jimble-date-input value="2026-10-08" readonly></jimble-date-input>`,
      ),
      cell(
        'エラー',
        html`<jimble-date-input value="2026-10-08"></jimble-date-input>`,
        '期限を過ぎています',
      ),
    ])}
    ${family('st-color', 'Color Input（色）', [
      cell('通常', html`<jimble-color-input value="#4f46e5"></jimble-color-input>`),
      cell('無効', html`<jimble-color-input value="#4f46e5" disabled></jimble-color-input>`),
      cell(
        '読み取り専用',
        html`<jimble-color-input value="#4f46e5" readonly></jimble-color-input>`,
      ),
      cell(
        'エラー',
        html`<jimble-color-input value="#ffffff"></jimble-color-input>`,
        'コントラストが足りません',
      ),
    ])}
    ${family('st-file', 'File Input（ファイル）', [
      cell('通常', html`<jimble-file-input multiple></jimble-file-input>`),
      cell('無効', html`<jimble-file-input disabled></jimble-file-input>`),
      cell('エラー', html`<jimble-file-input></jimble-file-input>`, 'ファイルを選んでください'),
    ])}
    <jimble-card class="section" id="st-check">
      <h3 slot="header">Checkbox・Switch</h3>
      <div class="states">
        <div class="stack">
          <jimble-checkbox>オフ</jimble-checkbox>
          <jimble-checkbox checked>オン</jimble-checkbox>
          <jimble-checkbox indeterminate>一部</jimble-checkbox>
          <jimble-checkbox disabled>無効</jimble-checkbox>
          <jimble-checkbox disabled checked>無効（オン）</jimble-checkbox>
        </div>
        <div class="stack">
          <jimble-switch>オフ</jimble-switch>
          <jimble-switch checked>オン</jimble-switch>
          <jimble-switch disabled>無効</jimble-switch>
          <jimble-switch disabled checked>無効（オン）</jimble-switch>
        </div>
        ${cell(
          'エラー',
          html`<jimble-checkbox>利用規約に同意する</jimble-checkbox>`,
          '同意が必要です',
        )}
      </div>
    </jimble-card>
    ${family('st-radio', 'Radio Group（ラジオ）', [
      cell(
        '通常',
        html`<jimble-radio-group value="a"
          ><jimble-radio value="a">月払い</jimble-radio
          ><jimble-radio value="b">年払い</jimble-radio></jimble-radio-group
        >`,
      ),
      cell(
        '一部が無効',
        html`<jimble-radio-group value="a"
          ><jimble-radio value="a">月払い</jimble-radio
          ><jimble-radio value="b" disabled>年払い（無効）</jimble-radio></jimble-radio-group
        >`,
      ),
      cell(
        '横並び',
        html`<jimble-radio-group value="a" orientation="horizontal"
          ><jimble-radio value="a">はい</jimble-radio
          ><jimble-radio value="b">いいえ</jimble-radio></jimble-radio-group
        >`,
      ),
      cell(
        'エラー',
        html`<jimble-radio-group
          ><jimble-radio value="a">月払い</jimble-radio
          ><jimble-radio value="b">年払い</jimble-radio></jimble-radio-group
        >`,
        '選択してください',
      ),
    ])}
    ${family('st-dual', 'Dual Listbox（左右の選択）', [
      cell('通常', html`<jimble-dual-listbox value="東京都">${options()}</jimble-dual-listbox>`),
      cell(
        '並べ替え・無効',
        html`<jimble-dual-listbox reorderable disabled value="東京都,大阪府"
          >${options()}</jimble-dual-listbox
        >`,
      ),
    ])}
  `
}
