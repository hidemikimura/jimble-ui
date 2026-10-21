# 選択・日付・色・ファイル

セレクト・コンボボックス・左右分割の選択・日付・色・ファイル添付の使い方。

- **セレクト**: 選択肢は `jimble-option`（`value`）。未選択はプレースホルダー（ネイティブと違い、最初の選択肢が自動で選ばれない）。
- **コンボボックス**（`jimble-combobox`）: 選択肢が多く、探して選ぶときに使う。選択肢は `jimble-select` と同じ `jimble-option`（読みは `keywords="とうきょう tokyo"`）。既定では**自由入力は値にならない**。文字入力では `input` / `change` は出ず、`jimble-search`（`detail.query`）が出る。
  - `load`（JS プロパティ、`(query, signal) => 項目[] | Promise`）: 入力から候補を取得する（サーバーへの問い合わせも同じ。`fetch` に `signal` を渡す）。項目は `{ value, label }`。返した項目がそのまま表示される。`load-delay`・`load-min-length`。初期値の表示は `items` プロパティで補う。
  - `multiple`: 複数選択（チップ表示、同じ `name` で複数送信、初期値は `value="a,b"`、現在値は `values` 配列）。
  - `max-items`: 選べる数の上限。`reorderable`: チップの並べ替え（Alt+左右の矢印、ドラッグ。`jimble-reorder`）。`jimble-option` の `group="関東"`: 見出し付きでまとまる。
  - `creatable`: 一覧にない文字を追加できる（`jimble-create`。`create` プロパティで作り方を決める）。
- **ファイル添付**（`jimble-file-input`）: ドロップエリア + 「ファイルを選択」ボタン + 一覧。`multiple`・`accept=".pdf,image/*"`・`max-size`（バイト）・`max-files`。合わないファイルは追加されず理由が出る（`jimble-reject`）。ファイルはそのままフォームに送られる。**`upload` プロパティ**（`(file, { onProgress, signal }) => Promise<id>`）を渡すと自動でサーバーへ送り（進捗・中止・再試行つき）、フォームには返した ID が送られる（アップロード中・失敗があると検証が通らない）。サーバー側の検証は必須。
- **左右分割の選択**（`jimble-dual-listbox`）: 左に未選択、右に選択済みを並べて「追加」「削除」で移す。項目は `jimble-option`、初期値は `value="a,b"`（カンマ区切り）、現在値は `values` 配列、同じ `name` で複数送信。`available-label` / `selected-label`・`move-all`・`max-items`。`reorderable` で右の一覧を並べ替え（ドラッグ・Alt+↑↓・「上へ」「下へ」。`jimble-reorder`）。`jimble-option` の `group` で見出し付きにまとめる（`search-group` でグループ名でも絞り込み）。項目が少なければ `jimble-select` や `jimble-combobox multiple`。
- **日付入力**（`jimble-date-input`）: 日付・日時・期間の選択（`<input type="date">` の代わり。`jimble-input` に `type="date"` はない）。値は文字列で、`Date` を渡さない。既定 `YYYY-MM-DD`、`time` で `YYYY-MM-DDTHH:mm`、`range` で `開始/終了`（`2026-09-01/2026-09-10`。`start` / `end` プロパティ）、`range time` で両方。`min` / `max`、`first-day-of-week`、`months="2"`、`minute-step`。期間は 2 回クリック（開始→終了）。カレンダーの見出しで月・年を直接選べる。`picker-only` で手入力不可（カレンダーだけで選ばせる。このときだけ入力欄のクリックで開く）。時刻ありはカレンダーが開いたままで「完了」で閉じる。秒・タイムゾーン・12 時間表記は未対応。
- **色選択**（`jimble-color-input`）: 値は小文字の `#rrggbb`。候補の色は `presets`。透明度は未対応。

### セレクト

{{example:select/basic}}

### コンボボックス（複数選択）

{{example:combobox/multiple}}

### 日付入力（期間）

{{example:date-input/range}}

### ファイル添付（形式とサイズの制限）

{{example:file-input/basic}}
