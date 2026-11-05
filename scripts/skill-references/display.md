# 表示まわり（表・アイコン・スピナー・ステッパー・カンバン）

表・アイコン・スピナー・ステッパー・カンバンの使い方。

- **ステッパー**（`jimble-stepper` > `jimble-step`）: 段階を踏む入力（予約の登録など）の位置と進み具合。`value` に今の段階の `jimble-step` の `value` を渡す（前は済・今は現在・後は未。空なら先頭が現在）。補足（選んだ値の要約）は `slot="description"`。誤りのある段階は `error`。`orientation="vertical"`・`size="sm"`（幅が約 32rem より狭いと、横も縦になる）。`navigable` を付けると済の段階を押して選べて、`jimble-step-change`（`detail.value`）が出る。**部品は `value` を変えない**（アプリが `stepper.value = e.detail.value`）。`label` でナビゲーションの名前を付ける。色は `--jimble-stepper-complete-color` など。
- **スピナー**（`jimble-spinner`）: 読み込み中の表示。既定で `role="status"` と「読み込み中」を伝える。隣に同じ意味の文字があるときは `decorative`。ボタンの読み込み中は `jimble-button` の `loading`（スピナーを自分で置かない）。
- **アイコン**（`jimble-icon`）: `<jimble-icon name="check">`。色は文字色に従う。`size`（`sm` `md` `lg` `xl`）。**意味を持つときだけ `label` を付ける**（`role="img"`）。隣に文字があるときは付けない。アイコンだけのボタンは、ボタンに `aria-label`。**`name` は次の一覧にあるものだけ**（推測しない）: {{icons}}。全部品を読み込む入口（CDN も）には全部入っている。個別 import は `@hidemikimura/jimble-ui/icon` + `@hidemikimura/jimble-ui/icons/<name>`。
- **カンバンボード**（`jimble-kanban` > `jimble-kanban-column`（`value` `heading`）> `jimble-kanban-card`（`value` `label` `locked`））: 列の間・列の中でカードを動かす。動かすと**カードの要素そのものが入れ替わる**（状態を別に持たない）。ドラッグ（タッチは長押し）・カードの移動ボタン・Alt+矢印キーで動かせる。動かす直前の `jimble-card-move`（`detail`: `value` `from` `to` `index`）を `preventDefault()` するとキャンセル（サーバーが断ったとき）。並びは `board`（`{ 列: [カード, …] }`）で取る。`readonly` で閲覧専用。カードの中身は自由な HTML。

### 並べ替えできる表

{{example:table/basic}}

### 行を選べる表（一括操作）

{{example:table/selectable}}
