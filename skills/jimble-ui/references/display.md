<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# 表示まわり（表・アバター・アイコン・スピナー・進み具合・仮の表示・空の状態・ステッパー・カンバン）

表・アイコン・スピナー・進み具合・仮の表示・空の状態・ステッパー・カンバンの使い方。

- **ステッパー**（`jimble-stepper` > `jimble-step`）: 段階を踏む入力（予約の登録など）の位置と進み具合。`value` に今の段階の `jimble-step` の `value` を渡す（前は済・今は現在・後は未。空なら先頭が現在）。補足（選んだ値の要約）は `slot="description"`。誤りのある段階は `error`。`orientation="vertical"`・`size="sm"`（幅が約 32rem より狭いと、横も縦になる）。`navigable` を付けると済の段階を押して選べて、`jimble-step-change`（`detail.value`）が出る。**部品は `value` を変えない**（アプリが `stepper.value = e.detail.value`）。`label` でナビゲーションの名前を付ける。色は `--jimble-stepper-complete-color` など。
- **アバター**（`jimble-avatar`、重ねるなら `jimble-avatar-group`）: `name`（頭文字と読み上げる名前）・`src`・`size`（sm / md / lg）・`shape`（circle / square。square は組織・プロジェクト）。**隣に名前の文字があるときは `decorative`**。画像が読めないと頭文字に戻る。群は `label`（例: 担当者）と `max`（既定 5）。超えた分は「+N」になり、隠れた人の名前が読み上げられる。押せるようにするなら、包む `button` / `a` に名前を付ける。
- **スピナー**（`jimble-spinner`）: 読み込み中の表示。既定で `role="status"` と「読み込み中」を伝える。隣に同じ意味の文字があるときは `decorative`。ボタンの読み込み中は `jimble-button` の `loading`（スピナーを自分で置かない）。
- **アイコン**（`jimble-icon`）: `<jimble-icon name="check">`。色は文字色に従う。`size`（`sm` `md` `lg` `xl`）。**意味を持つときだけ `label` を付ける**（`role="img"`）。隣に文字があるときは付けない。アイコンだけのボタンは、ボタンに `aria-label`。**`name` は次の一覧にあるものだけ**（推測しない）: `adjustments-horizontal`、`archive-box`、`arrow-down`、`arrow-down-tray`、`arrow-left`、`arrow-path`、`arrow-right`、`arrow-top-right-on-square`、`arrow-up`、`arrow-up-tray`、`banknotes`、`bars-3`、`bell`、`bolt`、`bookmark`、`building-office`、`calendar`、`calendar-days`、`chart-bar`、`chat-bubble-left`、`check`、`check-circle`、`chevron-down`、`chevron-left`、`chevron-right`、`chevron-up-down`、`clipboard`、`clipboard-document`、`clock`、`cloud`、`code-bracket`、`cog-6-tooth`、`command-line`、`computer-desktop`、`cpu-chip`、`credit-card`、`cube`、`currency-yen`、`device-phone-mobile`、`document`、`document-text`、`ellipsis-horizontal`、`ellipsis-vertical`、`envelope`、`exclamation-circle`、`exclamation-triangle`、`eye`、`eye-slash`、`face-smile`、`flag`、`folder`、`funnel`、`globe-alt`、`hand-thumb-down`、`hand-thumb-up`、`heart`、`home`、`identification`、`inbox`、`information-circle`、`key`、`language`、`link`、`list-bullet`、`lock-closed`、`lock-open`、`magnifying-glass`、`map-pin`、`minus`、`minus-circle`、`no-symbol`、`paper-clip`、`pencil`、`pencil-square`、`phone`、`photo`、`plus`、`plus-circle`、`power`、`printer`、`puzzle-piece`、`question-mark-circle`、`queue-list`、`rectangle-stack`、`server`、`share`、`shield-check`、`shopping-cart`、`spinner`、`squares-2x2`、`star`、`swatch`、`table-cells`、`tag`、`trash`、`truck`、`tv`、`user`、`user-circle`、`user-group`、`user-plus`、`users`、`wrench-screwdriver`、`x-circle`、`x-mark`。全部品を読み込む入口（CDN も）には全部入っている。個別 import は `@hidemikimura/jimble-ui/icon` + `@hidemikimura/jimble-ui/icons/<name>`。
- **進み具合**（`jimble-progress`）: `value`（0〜`max`、既定 100）の割合の棒。`value` を付けないと不確定（動き続ける）。名前は `label`（表示する）か `aria-label`。`show-value` で割合。`variant`（primary / success / warning / danger）。数秒で終わるなら `jimble-spinner`。
- **仮の表示**（`jimble-skeleton`）: 読み込み中に、あとから出る内容と同じ形で置く。`variant`（text / rect / circle）・`lines`・`--jimble-skeleton-width` / `-height`。**読み上げには出ない**ので、包む要素に `aria-busy="true"` を付け、`jimble-spinner` などで読み込み中を伝える。
- **空の状態**（`jimble-empty-state`）: `heading`（何がないか）・`description`（次にすること）・`slot="icon"`・`slot="actions"`（最初の 1 件を作るボタンなど）。見出しは `level`（既定 2）。表が空のときは `jimble-table` の `slot="empty"` に置く。
- **区切った見た目のラジオ**（`jimble-radio-group appearance="segmented"`）: 表示の切り替え（一覧・カード）など、2〜5 個の短い選択肢。操作・値はふつうのラジオと同じ。
- **カンバンボード**（`jimble-kanban` > `jimble-kanban-column`（`value` `heading`）> `jimble-kanban-card`（`value` `label` `locked`））: 列の間・列の中でカードを動かす。動かすと**カードの要素そのものが入れ替わる**（状態を別に持たない）。ドラッグ（タッチは長押し）・カードの移動ボタン・Alt+矢印キーで動かせる。動かす直前の `jimble-card-move`（`detail`: `value` `from` `to` `index`）を `preventDefault()` するとキャンセル（サーバーが断ったとき）。並びは `board`（`{ 列: [カード, …] }`）で取る。`readonly` で閲覧専用。カードの中身は自由な HTML。

### 並べ替えできる表

```html
<jimble-table id="tbl-basic" label="注文一覧">
  <jimble-table-header>
    <jimble-table-row>
      <jimble-table-head-cell sortable>注文番号</jimble-table-head-cell>
      <jimble-table-head-cell>顧客</jimble-table-head-cell>
      <jimble-table-head-cell>状態</jimble-table-head-cell>
      <jimble-table-head-cell sortable align="end">金額</jimble-table-head-cell>
    </jimble-table-row>
  </jimble-table-header>
  <jimble-table-body>
    <jimble-table-row>
      <jimble-table-cell header>#1024</jimble-table-cell>
      <jimble-table-cell>山田 太郎</jimble-table-cell>
      <jimble-table-cell><jimble-badge variant="success">発送済み</jimble-badge></jimble-table-cell>
      <jimble-table-cell align="end">¥12,800</jimble-table-cell>
    </jimble-table-row>
    <jimble-table-row>
      <jimble-table-cell header>#1023</jimble-table-cell>
      <jimble-table-cell>佐藤 花子</jimble-table-cell>
      <jimble-table-cell><jimble-badge variant="warning">保留</jimble-badge></jimble-table-cell>
      <jimble-table-cell align="end">¥3,400</jimble-table-cell>
    </jimble-table-row>
    <jimble-table-row>
      <jimble-table-cell header>#1022</jimble-table-cell>
      <jimble-table-cell>鈴木 一郎</jimble-table-cell>
      <jimble-table-cell
        ><jimble-badge variant="danger">キャンセル</jimble-badge></jimble-table-cell
      >
      <jimble-table-cell align="end">¥58,000</jimble-table-cell>
    </jimble-table-row>
  </jimble-table-body>
</jimble-table>
<script>
  // 並べ替え自体はアプリの仕事。jimble-sort を受けて行を並べ替える
  document.getElementById('tbl-basic').addEventListener('jimble-sort', (e) => {
    const head = e.target.closest('jimble-table-head-cell')
    const index = [...head.parentElement.children].indexOf(head)
    const body = head.closest('jimble-table').querySelector('jimble-table-body')
    const value = (row) =>
      row.children[index].textContent.replace(/[^\d]/g, '') || row.children[index].textContent
    const sign = e.detail.direction === 'ascending' ? 1 : -1
    ;[...body.children]
      .sort((a, b) => sign * value(a).localeCompare(value(b), 'ja', { numeric: true }))
      .forEach((row) => body.append(row))
  })
</script>
```

### 行を選べる表（一括操作）

```html
<div class="stack">
  <div class="row">
    <span id="selection-count" aria-live="polite">0 件を選択中</span>
    <jimble-button id="selection-delete" size="sm" variant="danger" disabled
      >選んだ行を削除</jimble-button
    >
  </div>
  <jimble-table id="selectable-table" label="ユーザー" selectable>
    <jimble-table-header>
      <jimble-table-row>
        <jimble-table-head-cell>氏名</jimble-table-head-cell>
        <jimble-table-head-cell>権限</jimble-table-head-cell>
        <jimble-table-head-cell>最終ログイン</jimble-table-head-cell>
      </jimble-table-row>
    </jimble-table-header>
    <jimble-table-body>
      <jimble-table-row value="u1">
        <jimble-table-cell header>山田 太郎</jimble-table-cell>
        <jimble-table-cell>管理者</jimble-table-cell>
        <jimble-table-cell>2026/10/30</jimble-table-cell>
      </jimble-table-row>
      <jimble-table-row value="u2">
        <jimble-table-cell header>佐藤 花子</jimble-table-cell>
        <jimble-table-cell>編集者</jimble-table-cell>
        <jimble-table-cell>2026/10/28</jimble-table-cell>
      </jimble-table-row>
      <jimble-table-row value="u3">
        <jimble-table-cell header>鈴木 一郎</jimble-table-cell>
        <jimble-table-cell>閲覧者</jimble-table-cell>
        <jimble-table-cell>2026/09/12</jimble-table-cell>
      </jimble-table-row>
      <jimble-table-row value="u4">
        <jimble-table-cell header>高橋 美咲</jimble-table-cell>
        <jimble-table-cell>編集者</jimble-table-cell>
        <jimble-table-cell>2026/10/01</jimble-table-cell>
      </jimble-table-row>
    </jimble-table-body>
  </jimble-table>
</div>
<script>
  {
    const table = document.getElementById('selectable-table')
    const count = document.getElementById('selection-count')
    const remove = document.getElementById('selection-delete')
    table.addEventListener('jimble-selection-change', (e) => {
      count.textContent = `${e.detail.values.length} 件を選択中`
      remove.disabled = e.detail.values.length === 0
    })
    remove.addEventListener('click', () => {
      for (const row of table.selectedRows) row.remove()
      count.textContent = '0 件を選択中'
      remove.disabled = true
      JimbleUI.toast('選んだ行を削除しました')
    })
  }
</script>
```
