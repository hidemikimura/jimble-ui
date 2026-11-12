<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# 選択・木・日付・色・ファイル・コードエディタ

セレクト・コンボボックス・左右分割の選択・木・日付・色・ファイル添付・コードエディタの使い方。

- **セレクト**: 選択肢は `jimble-option`（`value`）。未選択はプレースホルダー（ネイティブと違い、最初の選択肢が自動で選ばれない）。
- **コンボボックス**（`jimble-combobox`）: 選択肢が多く、探して選ぶときに使う。選択肢は `jimble-select` と同じ `jimble-option`（読みは `keywords="とうきょう tokyo"`）。既定では**自由入力は値にならない**。文字入力では `input` / `change` は出ず、`jimble-search`（`detail.query`）が出る。
  - `load`（JS プロパティ、`(query, signal) => 項目[] | Promise`）: 入力から候補を取得する（サーバーへの問い合わせも同じ。`fetch` に `signal` を渡す）。項目は `{ value, label }`。返した項目がそのまま表示される。`load-delay`・`load-min-length`。初期値の表示は `items` プロパティで補う。
  - `multiple`: 複数選択（チップ表示、同じ `name` で複数送信、初期値は `value="a,b"`、現在値は `values` 配列）。
  - `max-items`: 選べる数の上限。`reorderable`: チップの並べ替え（Alt+左右の矢印、ドラッグ。`jimble-reorder`）。`jimble-option` の `group="関東"`: 見出し付きでまとまる。
  - `creatable`: 一覧にない文字を追加できる（`jimble-create`。`create` プロパティで作り方を決める）。
- **ファイル添付**（`jimble-file-input`）: ドロップエリア + 「ファイルを選択」ボタン + 一覧。`multiple`・`accept=".pdf,image/*"`・`max-size`（バイト）・`max-files`。合わないファイルは追加されず理由が出る（`jimble-reject`）。ファイルはそのままフォームに送られる。`multiple` ならフォルダーのドロップで中のファイルを追加し、ファイル名は相対パス（`docs/a.pdf`）になる（`upload` には `path` で渡る）。**`upload` プロパティ**（`(file, { onProgress, signal }) => Promise<id>`）を渡すと自動でサーバーへ送り（進捗・中止・再試行つき）、フォームには返した ID が送られる（アップロード中・失敗があると検証が通らない）。サーバー側の検証は必須。
- **左右分割の選択**（`jimble-dual-listbox`）: 左に未選択、右に選択済みを並べて「追加」「削除」で移す。項目は `jimble-option`、初期値は `value="a,b"`（カンマ区切り）、現在値は `values` 配列、同じ `name` で複数送信。`available-label` / `selected-label`・`move-all`・`max-items`。`reorderable` で右の一覧を並べ替え（ドラッグ・Alt+↑↓・「上へ」「下へ」。`jimble-reorder`）。`jimble-option` の `group` で見出し付きにまとめる（`search-group` でグループ名でも絞り込み）。項目が少なければ `jimble-select` や `jimble-combobox multiple`。
- **木**（`jimble-tree` > `jimble-tree-item`）: カテゴリ・部署・フォルダなど、データの階層を開閉して見て選ぶ（ページの移動には使わない）。項目は `label`（名前）と `value` で、子の項目はそのまま入れ子に書く（`expanded` で開いておく）。`selection`: `none`（既定。開閉だけ）・`single`・`multiple`（チェックボックス。親を付けると子孫がすべて付き、一部だけなら親は「一部」）。現在値は `values`（`single` は `value` も）、初期値は `value` 属性（`multiple` はカンマ区切り）。`checked-values="leaves"` で子の無い項目だけを値にする。`name` でフォームに送る（同じ名前で複数）。名前は `jimble-field` の `label` か `aria-label`。変わると `jimble-selection-change`（`detail.values`）。子を後から読み込む項目は `lazy`（開くと木から `jimble-expand`、`detail.item` に子を足し、無ければ `lazy` を外す）。アイコンは `slot="icon"`、件数などは `slot="end"`。
- **日付入力**（`jimble-date-input`）: 日付・日時・期間の選択（`<input type="date">` の代わり。`jimble-input` に `type="date"` はない）。値は文字列で、`Date` を渡さない。既定 `YYYY-MM-DD`、`time` で `YYYY-MM-DDTHH:mm`、`range` で `開始/終了`（`2026-09-01/2026-09-10`。`start` / `end` プロパティ）、`range time` で両方。`min` / `max`、`first-day-of-week`、`months="2"`、`minute-step`。期間は 2 回クリック（開始→終了）。カレンダーの見出しで月・年を直接選べる。`picker-only` で手入力不可（カレンダーだけで選ばせる。このときだけ入力欄のクリックで開く）。時刻ありはカレンダーが開いたままで「完了」で閉じる。秒・タイムゾーン・12 時間表記は未対応。
- **コードエディタ**（`jimble-code-editor`）: メールの文面・HTML・JSON のテンプレートの編集（CodeMirror 6）。**全部入りに含まれない**ので、別に読み込む（`import '@hidemikimura/jimble-ui/code-editor'`、CDN は `jimble-ui.js` に加えて `dist/cdn/code-editor.js`）。`language="text|html|json"`・`rows`・`line-numbers`・`placeholder`・`readonly`。変数は **`variables` プロパティ**（`[{ name, label, description }]`）で渡し、文書の `{{name}}` をラベルのチップで見せる。`{{` の入力か Ctrl+Space で候補が出る。ボタン・メニューから入れるときは `insertVariable(name)`（メニューの `jimble-select` から呼んでよい）。区切りは `variable-prefix` / `variable-suffix`。値は `{{name}}` を含む文字列のまま送信される。`input` は利用者の編集と `insertVariable()` で出る。Tab はインデントに使わない（次の項目へ移る）。
- **色選択**（`jimble-color-input`）: 値は小文字の `#rrggbb`。候補の色は `presets`。透明度も選ぶなら `alpha`（透けた色は `#rrggbbaa`、不透明は `#rrggbb`。候補にも `#rrggbbaa` を書ける）。

### セレクト

```html
<div class="stack">
  <jimble-field label="プラン" hint="あとから変更できます">
    <jimble-select name="plan" placeholder="プランを選択">
      <jimble-option value="free">無料</jimble-option>
      <jimble-option value="pro">Pro</jimble-option>
      <jimble-option value="biz" disabled>Business（準備中）</jimble-option>
      <jimble-option value="ent">Enterprise</jimble-option>
    </jimble-select>
  </jimble-field>
  <jimble-field label="都道府県" required>
    <jimble-select name="pref" value="tokyo">
      <jimble-option value="hokkaido">北海道</jimble-option>
      <jimble-option value="tokyo">東京都</jimble-option>
      <jimble-option value="osaka">大阪府</jimble-option>
      <jimble-option value="fukuoka">福岡県</jimble-option>
    </jimble-select>
  </jimble-field>
</div>
```

### コンボボックス（複数選択）

```html
<form
  class="stack"
  onsubmit="
    event.preventDefault()
    this.querySelector('output').textContent = JSON.stringify(new FormData(this).getAll('pref'))
  "
>
  <jimble-field
    label="対応エリア"
    hint="選ぶと × 付きで並びます。空の入力で Backspace を押すと最後の項目を外せます"
    required
  >
    <jimble-combobox name="pref" multiple value="tokyo,osaka" placeholder="都道府県を選択">
      <jimble-option value="hokkaido" keywords="ほっかいどう">北海道</jimble-option>
      <jimble-option value="tokyo" keywords="とうきょう tokyo">東京都</jimble-option>
      <jimble-option value="kyoto" keywords="きょうと kyoto">京都府</jimble-option>
      <jimble-option value="osaka" keywords="おおさか osaka">大阪府</jimble-option>
      <jimble-option value="fukuoka" keywords="ふくおか fukuoka">福岡県</jimble-option>
    </jimble-combobox>
  </jimble-field>
  <div class="row">
    <jimble-button type="submit" variant="primary">送信</jimble-button>
    <jimble-button type="reset">リセット</jimble-button>
  </div>
  <output aria-live="polite"></output>
</form>
```

### 木（チェックボックスで複数を選び、フォームで送る）

```html
<form
  onsubmit="
    event.preventDefault()
    this.querySelector('output').textContent = JSON.stringify(new FormData(this).getAll('category'))
  "
>
  <jimble-stack gap="3">
    <jimble-field
      label="表示するカテゴリ"
      hint="親を付けると、中のカテゴリがすべて付きます"
      required
    >
      <jimble-tree name="category" selection="multiple" checked-values="leaves" value="veg">
        <jimble-tree-item label="食品" value="food" expanded>
          <jimble-tree-item label="野菜" value="veg"></jimble-tree-item>
          <jimble-tree-item label="果物" value="fruit">
            <jimble-tree-item label="りんご" value="apple"></jimble-tree-item>
            <jimble-tree-item label="みかん" value="orange"></jimble-tree-item>
          </jimble-tree-item>
        </jimble-tree-item>
        <jimble-tree-item label="家電" value="appliance"></jimble-tree-item>
      </jimble-tree>
    </jimble-field>
    <jimble-stack direction="horizontal" gap="2">
      <jimble-button type="submit" variant="primary">送信</jimble-button>
      <jimble-button type="reset">リセット</jimble-button>
    </jimble-stack>
    <output aria-live="polite"></output>
  </jimble-stack>
</form>
```

### 日付入力（期間）

```html
<jimble-field label="期間" hint="1 回目のクリックで開始日、2 回目で終了日を選びます">
  <jimble-date-input name="period" range months="2" first-day-of-week="1"></jimble-date-input>
</jimble-field>
```

### ファイル添付（形式とサイズの制限）

```html
<jimble-field label="添付ファイル" hint="契約書や見積書を添付してください">
  <jimble-file-input
    name="attachments"
    multiple
    accept=".pdf,image/*"
    max-size="5242880"
    max-files="3"
  ></jimble-file-input>
</jimble-field>
```

### コードエディタ（変数の挿入と補完）

```html
<div class="stack">
  <jimble-field label="通知メールの本文" hint="{{ を入力するか Ctrl+Space で、変数を補完できます">
    <jimble-code-editor
      id="mail-body"
      name="body"
      rows="5"
      value="{{customer_name}} 様&#10;&#10;ご注文（{{order_id}}）を承りました。&#10;お届け予定日: {{delivery_date}}"
    ></jimble-code-editor>
  </jimble-field>
  <jimble-dropdown-menu id="mail-insert">
    <jimble-button slot="trigger" size="sm">変数を挿入</jimble-button>
    <jimble-menu-item value="customer_name">顧客名</jimble-menu-item>
    <jimble-menu-item value="order_id">注文番号</jimble-menu-item>
    <jimble-menu-item value="delivery_date">お届け予定日</jimble-menu-item>
    <jimble-menu-item value="shop_url">ショップの URL</jimble-menu-item>
  </jimble-dropdown-menu>
</div>
<script>
  {
    const editor = document.getElementById('mail-body')
    // 変数はプロパティで渡す(name は文書に書く名前、label はチップと候補に出す名前)
    editor.variables = [
      { name: 'customer_name', label: '顧客名' },
      { name: 'order_id', label: '注文番号', description: '#10001 の形式' },
      { name: 'delivery_date', label: 'お届け予定日' },
      { name: 'shop_url', label: 'ショップの URL' },
    ]
    // メニューで選んだ変数を、カーソルの位置に挿入する
    document.getElementById('mail-insert').addEventListener('jimble-select', (e) => {
      editor.insertVariable(e.detail.value)
    })
  }
</script>
```
