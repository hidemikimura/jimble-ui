# 表示まわり（表・アバター・タグ・アイコン・スピナー・進み具合・仮の表示・空の状態・ステッパー・カンバン）

表・アイコン・スピナー・進み具合・仮の表示・空の状態・ステッパー・カンバンの使い方。

- **ステッパー**（`jimble-stepper` > `jimble-step`）: 段階を踏む入力（予約の登録など）の位置と進み具合。`value` に今の段階の `jimble-step` の `value` を渡す（前は済・今は現在・後は未。空なら先頭が現在）。補足（選んだ値の要約）は `slot="description"`。誤りのある段階は `error`。`orientation="vertical"`・`size="sm"`（幅が約 32rem より狭いと、横も縦になる）。`navigable` を付けると済の段階を押して選べて、`jimble-step-change`（`detail.value`）が出る。**部品は `value` を変えない**（アプリが `stepper.value = e.detail.value`）。`label` でナビゲーションの名前を付ける。色は `--jimble-stepper-complete-color` など。
- **アバター**（`jimble-avatar`、重ねるなら `jimble-avatar-group`）: `name`（頭文字と読み上げる名前）・`src`・`size`（sm / md / lg）・`shape`（circle / square。square は組織・プロジェクト）。**隣に名前の文字があるときは `decorative`**。画像が読めないと頭文字に戻る。群は `label`（例: 担当者）と `max`（既定 5）。超えた分は「+N」になり、隠れた人の名前が読み上げられる。押せるようにするなら、包む `button` / `a` に名前を付ける。
- **タグ**（`jimble-tag`、並べるなら `jimble-tag-group`）: 絞り込みの条件・付けたラベルなど、付けたり外したりする名札（状態なら `jimble-badge`）。`removable` で×（Delete・Backspace でも外せる）。外すと `jimble-remove`（`detail.value`、無ければラベル）。取り消されなければタグは自分を外し、フォーカスは隣のタグ→群に移る。サーバーが断ったら `preventDefault()`。**バブルしない**ので、まとめて受けるなら群に `addEventListener('jimble-remove', fn, { capture: true })`。群は `label`。`size`（sm / md）。
- **スピナー**（`jimble-spinner`）: 読み込み中の表示。既定で `role="status"` と「読み込み中」を伝える。隣に同じ意味の文字があるときは `decorative`。ボタンの読み込み中は `jimble-button` の `loading`（スピナーを自分で置かない）。
- **アイコン**（`jimble-icon`）: `<jimble-icon name="check">`。色は文字色に従う。`size`（`sm` `md` `lg` `xl`）。**意味を持つときだけ `label` を付ける**（`role="img"`）。隣に文字があるときは付けない。アイコンだけのボタンは、ボタンに `aria-label`。**`name` は次の一覧にあるものだけ**（推測しない）: {{icons}}。全部品を読み込む入口（CDN も）には全部入っている。個別 import は `@hidemikimura/jimble-ui/icon` + `@hidemikimura/jimble-ui/icons/<name>`。
- **進み具合**（`jimble-progress`）: `value`（0〜`max`、既定 100）の割合の棒。`value` を付けないと不確定（動き続ける）。名前は `label`（表示する）か `aria-label`。`show-value` で割合。`variant`（primary / success / warning / danger）。数秒で終わるなら `jimble-spinner`。
- **仮の表示**（`jimble-skeleton`）: 読み込み中に、あとから出る内容と同じ形で置く。`variant`（text / rect / circle）・`lines`・`--jimble-skeleton-width` / `-height`。**読み上げには出ない**ので、包む要素に `aria-busy="true"` を付け、`jimble-spinner` などで読み込み中を伝える。
- **空の状態**（`jimble-empty-state`）: `heading`（何がないか）・`description`（次にすること）・`slot="icon"`・`slot="actions"`（最初の 1 件を作るボタンなど）。見出しは `level`（既定 2）。表が空のときは `jimble-table` の `slot="empty"` に置く。
- **区切った見た目のラジオ**（`jimble-radio-group appearance="segmented"`）: 表示の切り替え（一覧・カード）など、2〜5 個の短い選択肢。操作・値はふつうのラジオと同じ。
- **カンバンボード**（`jimble-kanban` > `jimble-kanban-column`（`value` `heading`）> `jimble-kanban-card`（`value` `label` `locked`））: 列の間・列の中でカードを動かす。動かすと**カードの要素そのものが入れ替わる**（状態を別に持たない）。ドラッグ（タッチは長押し）・カードの移動ボタン・Alt+矢印キーで動かせる。動かす直前の `jimble-card-move`（`detail`: `value` `from` `to` `index`）を `preventDefault()` するとキャンセル（サーバーが断ったとき）。並びは `board`（`{ 列: [カード, …] }`）で取る。`readonly` で閲覧専用。カードの中身は自由な HTML。

### 並べ替えできる表

{{example:table/basic}}

### 行を選べる表（一括操作）

{{example:table/selectable}}
