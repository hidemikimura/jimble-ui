<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# 部品ごとの Do / Don't

部品ごとの、こうする（Do）と、避ける（Don't）。ドキュメントの各部品のページの「Do / Don't」と同じ内容（`site/dos/` から生成）。

## Button（`jimble-button`）

**Do**

- 1 つの画面で、主な操作 1 つだけを `variant="primary"` にする。ほかは secondary（既定）か ghost。
- 削除など取り消せない操作は `variant="danger"` にし、確認のダイアログを挟む。
- 処理中は `loading` を付ける（二度押しを防ぎ、フォーカスを保つ）。
- アイコンだけのボタン（`icon-only`）には `aria-label` を付ける。

**Don't**

- ページの移動に `onclick` で `location` を書き換える。`href` を付けてリンクにする。
- 送信ボタンの `name` / `value` を、サーバーで読もうとする（送信されない）。必要ならネイティブの `<button>`。
- `disabled` で押せない理由を伝えないまま置く。押したときに、足りない項目を示すほうが分かりやすい。

## Badge（`jimble-badge`）

**Do**

- 状態（新規・発送済み）やカテゴリを、短い言葉で示す。
- 意味に合う `variant` を選ぶ（success = 完了、warning = 注意、danger = 失敗、info = 情報）。
- 表の中では `size="sm"` を使い、行の高さをそろえる。

**Don't**

- 文字のないバッジを置き、色だけで意味を伝える。
- 押せるもの（ボタン・リンク）の代わりに使う。バッジは操作できない。
- `--jimble-badge-bg` などで色を変えたとき、文字とのコントラスト（4.5:1）を確かめない。

## Card（`jimble-card`）

**Do**

- 関連する情報（1 件の詳細、フォームの 1 まとまり）を 1 つの面にまとめる。
- 見出しは `slot="header"`、操作は `slot="footer"` に置く。
- 長いフォームでは `sticky-footer` で、保存のボタンを画面の下に見せ続ける。

**Don't**

- カードの中に、さらにカードを入れ子にする。区切りは見出しや余白で表す。
- カード全体をリンクやボタンにする（中のリンクと操作が押しにくくなる）。
- 余白をそろえるためだけに使う。並べ方は `jimble-stack` / `jimble-grid`。

## Alert（`jimble-alert`）

**Do**

- ページの中で、状況を伝え続ける必要があること（入力の誤りの要約、期限が近い、権限がない）に使う。
- `variant`（info / success / warning / danger）を、内容の重さに合わせて選ぶ。
- 見出しは `slot="title"`、関連する操作は `slot="actions"` に置く。
- 読んだら不要になるものだけ `dismissible` にする。

**Don't**

- 一時的な結果（保存しました）に使う。それは通知（`JimbleUI.toast()`）。
- 色だけで重さを伝える。本文に、何が起きたか・どうすればよいかを書く。
- 1 画面に何個も並べる。まとめて 1 つにする。

## Input（`jimble-input`）

**Do**

- 1 行の文字の入力に使い、`jimble-field` で名前を付ける。
- 内容に合う `type`（email・tel・url・number・password）と `autocomplete` を付ける。
- 単位や記号は `slot="prefix"` / `slot="suffix"` に置く。

**Don't**

- 日付に使う。それは `jimble-date-input`（`type="date"` はない）。
- 複数行の文章に使う。それは `jimble-textarea`。
- `placeholder` をラベルの代わりにする。

## Textarea（`jimble-textarea`）

**Do**

- 複数行の文章（メモ・説明）の入力に使い、`jimble-field` で名前を付ける。
- 書く量に合わせて高さを変えるなら `autosize`、最初の高さは `rows`。
- 上限があるときは `maxlength` を付ける。

**Don't**

- Enter で送信されると考える（Enter は改行）。
- 1 行で足りる入力に使う。それは `jimble-input`。
- コードやテンプレートの編集に使う。それは `jimble-code-editor`。

## Checkbox（`jimble-checkbox`）

**Do**

- 1 つの項目のオン・オフを、送信するときに確定させる（同意する、メールを受け取る）。
- ラベルは既定スロットの文字に書く。
- 複数から選ぶときは、`jimble-field` か `<fieldset>` でまとめ、まとまりに名前を付ける。
- 一部だけ選ばれている状態（すべて選ぶ、の親）は `indeterminate`。

**Don't**

- 押した瞬間に設定が変わるもの（通知を受け取る、などの即時の切り替え）に使う。それは `jimble-switch`。
- 1 つだけ選ばせる選択に使う。それは `jimble-radio-group`。
- `checked` 属性を書き換えて、利用者が変えた値を戻そうとする（属性は初期値。現在値は `checked` プロパティ）。

## Switch（`jimble-switch`）

**Do**

- 押した瞬間に効く、オン・オフの設定（通知を受け取る、など）に使う。
- ラベルは既定スロットの文字に、状態ではなく設定の名前を書く（「通知を受け取る」）。
- 変えたことを `change` で受けて、すぐ保存する（保存したことを伝える）。

**Don't**

- 送信して初めて効く同意・選択に使う。それは `jimble-checkbox`。
- ラベルに「オン」「オフ」の言葉を入れる（状態はスイッチ自身が伝える）。
- 複数の選択肢から 1 つを選ばせる。それは `jimble-radio-group`。

## Radio Group（`jimble-radio-group`）

**Do**

- 2〜6 個ほどの中から 1 つを選ばせる。選択肢は `jimble-radio`。
- グループに名前を付ける（`jimble-field` の `label`、または `aria-label`）。
- 短い選択肢を横に並べるときは `orientation="horizontal"`。表示の切り替えなど 2〜5 個の短い選択肢は `appearance="segmented"`。

**Don't**

- 選択肢が多いときに使う。それは `jimble-select` か `jimble-combobox`。
- 複数を選ばせる。それは `jimble-checkbox`。
- `appearance="segmented"` を、その場の操作（保存・削除）のボタンの並びに使う。それは `jimble-button`。
- 既定の選択がないまま、必須にもしない（送られない値ができる）。

## Field（`jimble-field`）

**Do**

- 入力部品を包み、`label`（名前）・`hint`（補足）・`error`（誤り）を付ける。
- 必須なら `required` を付ける（中の部品にも伝わる）。
- サーバーが返した誤りは `error` 属性に入れる。
- 独自の検証は `validate` プロパティ（関数）で書く。

**Don't**

- ラベルを `placeholder` だけで済ませる（入力すると消える）。
- 1 つの `jimble-field` に、別々の値の入力部品を何個も入れて、まとめて 1 つのラベルにする。
- `validate` を属性に書く（JavaScript のプロパティ）。

## Dialog（`jimble-dialog`）

**Do**

- 確認・短い入力など、ほかの操作を止めて答えてほしいときに使う。
- `heading` を必ず付ける。
- 削除の確認など、答えが必須のものは `alert` にし、安全な側のボタンに `autofocus` を付ける。
- 閉じるボタンには `data-dialog-close` を付ける（JavaScript なしで閉じる）。

**Don't**

- 長いフォームや、一覧を見ながらの編集に使う。それは `jimble-drawer` か、別のページ。
- ダイアログの上に、さらにダイアログを重ねる。
- 閉じる前の確認を、`jimble-close-request` の `preventDefault()` 以外の方法で作る。

## Dropdown Menu（`jimble-dropdown-menu`）

**Do**

- その場の操作（編集・複製・削除）を、ボタン 1 つにまとめる（行ごとの操作など）。
- トリガーは `slot="trigger"` の `jimble-button`。アイコンだけなら `aria-label` を付ける。
- 危険な項目は `variant="danger"` にし、区切り線で離す。
- 選ばれた項目は、メニュー自身の `jimble-select`（`detail.value`）で受ける。

**Don't**

- 値を選ばせる（フォームの入力）のに使う。それは `jimble-select`。
- ページの移動（ナビゲーション）を、メニューの項目に詰め込む。
- よく使う操作 1 つを、メニューの中だけに隠す。

## Select（`jimble-select`）

**Do**

- 10 個ほどまでの選択肢から、1 つを選ばせる。選択肢は `jimble-option`。
- `jimble-field` で名前を付け、未選択を許さないなら `required`。
- 未選択のときの案内は `placeholder` に書く。

**Don't**

- 最初の選択肢が自動で選ばれると考える（未選択から始まる）。
- 選択肢が多いときに使う。それは `jimble-combobox`。
- その場の操作（編集・削除）を選ばせる。それは `jimble-dropdown-menu`。

## Toast（`jimble-toast`）

**Do**

- 保存した・送信したなど、操作の結果を短く知らせる（`JimbleUI.toast()`）。
- 失敗には `variant: 'danger'` を使う（自動では消えない）。
- 取り消しなどの操作を付けるときは `action` を渡す。

**Don't**

- `jimble-toast` の要素を、自分でページに置く。
- 読み終える前に消えては困る、大事な情報を通知だけで伝える（画面内の `jimble-alert` にも出す）。
- 1 回の操作で、通知を何個も続けて出す。

## App Shell（`jimble-app-shell`）

**Do**

- 管理画面の外枠（ヘッダー・サイドバー・本文）として、ページに 1 つだけ置く。
- サイドバーには `jimble-sidebar-nav` を、ヘッダーにはサービス名とユーザーの操作を置く。
- 項目が多いときは `sidebar-collapsible` で、アイコンだけの細い表示に切り替えられるようにする（項目には `slot="icon"` のアイコン）。

**Don't**

- 本文の中に `<main>` を自分で書く。app-shell が main ランドマークを持つ。
- ログイン画面など、ナビゲーションのないページに使う（テンプレートの `login` を参照）。
- ヘッダーの色を暗くするとき、文字・アイコン・hover・フォーカスの色を変え忘れる（文字 4.5:1、アイコン 3:1）。

## Sidebar Nav（`jimble-sidebar-nav`）

**Do**

- `jimble-app-shell` の `slot="sidebar"` に置き、画面の主な行き先を並べる。
- 今のページの項目に `current` を付ける（どれが今かは、アプリが決める）。
- 項目には `slot="icon"` のアイコンを付ける（細い表示でもわかる）。関連する項目は `jimble-nav-group` でまとめる。

**Don't**

- その場の操作（保存・削除）を項目にする。それはボタン。
- 階層を 3 段以上に深くする。
- 2 つ以上置くとき、`label` で名前を変えない。

## Page Header（`jimble-page-header`）

**Do**

- ページの先頭に置き、見出し（`heading`）・説明（`description`）・パンくず・操作をまとめる。
- そのページの主な操作（新規作成・編集）を `slot="actions"` に置く。
- 見出しの段階がページの構成と合わないときは `level` で変える。

**Don't**

- 1 ページに何個も置く。中の区切りは、カードの見出しなどで表す。
- 操作のボタンを 3 つ以上並べる。残りはメニュー（`jimble-dropdown-menu`）にまとめる。
- `heading` を空のままにする。

## Tabs（`jimble-tabs`）

**Do**

- 同じ対象の情報を、見る観点で分ける（注文の商品・履歴）。
- `jimble-tab` と `jimble-tab-panel` を、同じ `value` で対応させる。タブのまとまりに `label` を付ける。
- 切り替えを URL に残したいときは、`jimble-tab-change` を受けて URL を変える。

**Don't**

- 段階を踏む入力に使う。それは `jimble-stepper`。
- ページの移動（別の画面へのリンク）をタブにする。それは `jimble-sidebar-nav` などのナビゲーション。
- タブを 7 つ以上並べる。

## Breadcrumb（`jimble-breadcrumb`）

**Do**

- 階層のあるページで、上の階層へ戻る道筋を示す（`jimble-page-header` の `slot="breadcrumb"`）。
- 最後の項目（今のページ）には `href` を付けず、`current` を付ける。
- 1 ページに複数のナビゲーションがあるときは、`label` で名前を変える。

**Don't**

- 階層の浅いページ（ダッシュボードだけ）に置く。
- 画面の履歴（直前に見たページ）を並べる。パンくずは場所の階層。
- 今のページの項目をリンクにする。

## Pagination（`jimble-pagination`）

**Do**

- 一覧の下に置き、ページを移動させる。全件数は `total` と `page-size` で渡す。
- サーバーで描くページでは `href-template`（`?page={page}`）でリンクにする。
- JavaScript で描き直すときは `jimble-page-change` を受け、`page` を変える。

**Don't**

- 数件しかない一覧に置く（1 ページで足りるなら出さない）。
- 1 ページに複数置くとき、`label` で名前を変えない。
- ページを変えたあと、一覧の先頭へフォーカスやスクロールを戻さない。

## Table（`jimble-table`）

**Do**

- 行と列に意味のあるデータ（注文の一覧など）に使い、表に `label` を付ける。
- 数値の列は `align="end"`。並べ替えは見出しに `sortable` を付け、`jimble-sort` を受けて、アプリが並べ替える。
- 行を選ばせるときは `selectable`（行に `value`）。数千行を超えるときは `columns` / `rows` プロパティで渡す。

**Don't**

- `<table>` を書いて、見た目を jimble-table に似せる。
- チェックボックスの列を自分で作る（`selectable` を使う）。
- セルの `width` で列の幅を決めようとする（`--jimble-table-columns`）。

## Description List（`jimble-description-list`）

**Do**

- 詳細画面で、項目名と値の組を並べる（氏名・メールアドレス・状態）。
- 項目名は `label` 属性、値は中身に書く。値にはリンクやバッジを置ける。
- 関連する組ごとに、カードなどでまとめる。

**Don't**

- 行と列の両方に意味があるデータ（一覧）に使う。それは `jimble-table`。
- 入力欄を並べてフォームにする。それは `jimble-field`。
- 値が空の項目を、何も書かずに置く。「未設定」などと書く。

## Date Input（`jimble-date-input`）

**Do**

- 日付・日時・期間（`range`）を選ばせる。
- 値は文字列（`YYYY-MM-DD`、期間は `開始/終了`）で扱う。
- 選べる範囲が決まっているときは `min` / `max` を付ける。

**Don't**

- `jimble-input` に `type="date"` を付ける（ない）。
- `Date` オブジェクトを `value` に渡す。
- 秒やタイムゾーンを扱う画面に使う（未対応）。

## Color Input（`jimble-color-input`）

**Do**

- ラベルの色・テーマの色など、利用者に色を選ばせる。
- よく使う色は `presets` で候補に出す。
- 透けた色も選ばせるときだけ `alpha` を付ける。

**Don't**

- 決まった色の中から選ばせるのに使う。それは選択肢（`jimble-radio-group` や `jimble-select`）。
- 選ばれた色の上に文字を載せるとき、コントラストを確かめない。
- 値を `#rrggbb` 以外の形（`rgb()`・色の名前）で渡す。

## Combobox（`jimble-combobox`）

**Do**

- 選択肢が多く（都道府県・顧客）、文字を打って探して選ぶときに使う。
- サーバーから候補を取るときは `load` プロパティで渡し、`signal` を `fetch` に渡す。
- 複数を選ぶなら `multiple`、一覧にない値も受け付けるなら `creatable`。

**Don't**

- 選択肢が 10 個ほどまでのときに使う。それは `jimble-select`。
- 打った文字がそのまま値になると思い込む（選んだ候補だけが値になる。打った文字は `jimble-search`）。
- 候補の取得で、前の問い合わせを止めない（`signal` を無視する）。

## Drawer（`jimble-drawer`）

**Do**

- 絞り込みの条件・1 件の詳細・編集など、一覧を離れずに開く大きめのパネルに使う。
- `heading` を必ず付ける。位置は `placement`、幅は `size`。
- 操作のボタンは `slot="footer"` に置く（スクロールしても見える）。

**Don't**

- 確認など短い問いに使う。それは `jimble-dialog`。
- 開いたまま背面を操作させる前提にする（モーダル。非モーダルは未対応）。
- ページの主な内容を、ドロワーの中だけに置く。

## Spinner（`jimble-spinner`）

**Do**

- 読み込みに時間がかかる場所に置く（`role="status"` で「読み込み中」を伝える）。
- すぐ隣に「読み込み中…」の文字があるときは `decorative` にする。
- 形が決まっている内容なら、読み込み後と同じ大きさの場所を空けておく。

**Don't**

- ボタンの処理中に使う。それは `jimble-button` の `loading`。
- 1 画面に何個も同時に回す。
- 終わったあとも置いたままにする。

## Icon（`jimble-icon`）

**Do**

- ボタンやナビゲーションの項目に、文字と一緒に添える。
- 意味を持つアイコン（文字のない状態の印）だけ `label` を付ける。
- `name` は、ドキュメントのアイコンの一覧にあるものだけを使う。

**Don't**

- 文字の隣のアイコンに `label` を付ける（読み上げが二重になる）。
- アイコンだけのボタンで、名前（`aria-label`）をボタンに付け忘れる。
- 一覧にない名前を推測で書く（何も表示されない）。

## Tooltip（`jimble-tooltip`）

**Do**

- アイコンだけのボタンなどに、短い補足を添える。
- フォーカスできる要素（`jimble-button`、ネイティブの `button`・`a`）を 1 つだけ囲む。
- 補足が長いときは `multiline`。

**Don't**

- 入力欄の説明に使う。それは `jimble-field` の `hint`。
- ボタンの名前の代わりにする（アイコンだけのボタンの名前は `aria-label`）。
- 操作や重要な情報を、ツールチップの中だけに置く（マウスを重ねないと見えない）。

## File Input（`jimble-file-input`）

**Do**

- ファイルの添付に使う。受け付ける形式は `accept`、大きさは `max-size`、数は `max-files` で制限する。
- 送る前にサーバーへ上げるなら `upload` プロパティを渡す（進捗・中止・再試行がつく）。
- サーバー側でも、形式と大きさを必ず検証する。

**Don't**

- `accept` だけで、安全なファイルしか来ないと考える。
- アップロード中に、送信できるようにする（検証が通らない）。
- 1 つの画面に、同じ目的の添付欄を何個も並べる（`multiple` を使う）。

## Dual Listbox（`jimble-dual-listbox`）

**Do**

- 多くの候補から、いくつかを選んで並べる（表示する列・権限）に使う。
- 左右の一覧の名前を `available-label` / `selected-label` で付ける。
- 選んだ順に意味があるときは `reorderable`。

**Don't**

- 選択肢が少ないときに使う。それは `jimble-checkbox` の並び、または `jimble-combobox multiple`。
- 値を `values` 以外（右の一覧の DOM）から読む。
- 上限があるのに `max-items` を付けず、送信してから断る。

## Router（`jimble-router`）

**Do**

- 1 つの HTML で画面を切り替える管理画面（SPA）に使う。`routes` プロパティで道筋を渡す。
- 道筋ごとに `title` を付ける（読み上げとブラウザの履歴に使われる）。
- 画面に要るデータは `load` で読み、読み込み中・失敗を `jimble-route-loading` / `jimble-route-error` で扱う。

**Don't**

- 1 つのドキュメントに、ルーターを 2 つ置く。
- リンクの代わりに、ボタンの `onclick` で移動させる（ふつうの `<a href>` がそのまま使える）。
- サーバーで描く複数のページ（ふつうの Web サイト）に使う。

## Kanban（`jimble-kanban`）

**Do**

- 状態の列（未着手・進行中・完了）の間でカードを動かす作業の管理に使う。
- カードを動かす直前の `jimble-card-move` を受けて、サーバーが断ったら `preventDefault()` で取り消す。
- 並びは `board` で読む。動かせないカードは `locked`。

**Don't**

- 順番のない一覧の表示に使う。それは `jimble-table` か `jimble-grid`。
- マウスのドラッグだけで動かせると考える（キーボードとボタンでも動く。説明を消さない）。
- カードの状態を、部品の外に二重に持つ（動かすと、要素そのものが入れ替わる）。

## Stepper（`jimble-stepper`）

**Do**

- 段階を踏む入力（登録・予約）で、今どこにいて、あと何段階かを示す。
- 今の段階は `value` で渡し、変えるのはアプリ（`navigable` なら `jimble-step-change` を受けて変える）。
- 誤りのある段階には `error` を付ける。

**Don't**

- ページ内のタブの代わりに使う。それは `jimble-tabs`。
- 部品が `value` を自動で進めると考える。
- 段階を 7 つ以上に増やす。まとめるか、ページを分ける。

## Code Editor（`jimble-code-editor`）

**Do**

- メールの文面・HTML・JSON のテンプレートなど、変数を含むコードの編集に使う。
- 全部入りに含まれないので、別に読み込む（`@hidemikimura/jimble-ui/code-editor`、CDN は `dist/cdn/code-editor.js`）。
- 変数は `variables` プロパティで渡し、ボタンやメニューから入れるときは `insertVariable()` を呼ぶ。

**Don't**

- ふつうの複数行の文章に使う。それは `jimble-textarea`（読み込みが軽い）。
- Tab でインデントできることを前提にする（Tab は次の項目へ移る）。
- 送信された `{{name}}` を、サーバーで検証せずに使う。

## Stack（`jimble-stack`）

**Do**

- フォームの項目・ボタンの並び・カードの中身を、同じ間隔で縦・横に並べる。
- 間隔は `gap`（4px の何倍か）で決める。2 = ボタンの並び、4 = フォームの項目、6 = まとまりの間。
- 見出しと操作を両端に分けるときは `direction="horizontal"` と `justify="between"`。

**Don't**

- `style` の `margin` や `gap` を場所ごとに書いて、間隔をばらばらにする。
- 格子（列のそろった並び）に使う。それは `jimble-grid`。
- リストの意味を期待する（必要なら外側に `<ul>`）。

## Grid（`jimble-grid`）

**Do**

- カードの一覧・数字のカード・2 列のフォームを、同じ間隔の格子に並べる。
- 画面の幅で列の数を変えるときは `min-column-width`（狭い画面では 1 列になる）。
- 間隔は `gap`（4px の何倍か）で、ほかの場所とそろえる。

**Don't**

- 行と列に意味のあるデータ（一覧）に使う。それは `jimble-table`。
- `style` の `display: grid; gap: 12px` を場所ごとに書いて、間隔をばらばらにする。
- 並べるだけの `jimble-grid` に、リストや見出しの意味を期待する（必要なら外側に `<ul>` や `<section>`）。

## Progress（`jimble-progress`）

**Do**

- 取り込み・一括の処理など、数秒以上かかり、進み具合が分かる処理に使う。
- `label` か `aria-label` で、何の進み具合かを伝える。
- 終わりが分からないときは `value` を付けない（不確定）。分かるようになったら `value` を渡す。
- 失敗したら `variant="danger"` にし、理由を `jimble-alert` などで画面に出す。

**Don't**

- 数秒で終わる処理に使う。それは `jimble-spinner`（ボタンなら `loading`）。
- 進み具合と関係のない値（使用量・評価）を、棒で見せるために使う。
- 色だけで成功・失敗を伝える。

## Skeleton（`jimble-skeleton`）

**Do**

- 一覧・カード・文章など、形の決まった内容の読み込み中に、同じ形で置く。
- 包む要素に `aria-busy="true"` を付け、読み込み中であることは `jimble-spinner` や文字で伝える。
- あとから出る内容と、大きさ（行の数・高さ）をそろえる。

**Don't**

- 読み込み中であることを、仮の表示だけで伝えようとする（読み上げには出ない）。
- 長く終わらない処理や、失敗したあとも出し続ける。
- 形の分からない内容に、適当な形で置く。それは `jimble-spinner`。

## Empty State（`jimble-empty-state`）

**Do**

- 空の一覧・検索の結果なしで、何がないか（`heading`）と、次にすること（`description`）を書く。
- 最初の 1 件を作る、条件を外すなど、次の一歩を `slot="actions"` に置く。
- 見出しのレベル（`level`）を、置いた場所の見出しの構造に合わせる。
- 表が空のときは、`jimble-table` の `slot="empty"` に置く（見出しの行は残る）。

**Don't**

- 「データがありません」とだけ書き、理由や次にすることを書かない。
- 読み込み中や、エラーのときに使う。それは `jimble-skeleton` / `jimble-spinner`、`jimble-alert`。
- 表が空のとき、空の行を自分で作って「0 件」と書く（表の `empty` スロットを使う）。

## Popover（`jimble-popover`）

**Do**

- 絞り込みの条件・その場での確認・表示の設定など、1 つの作業で完結する中身を入れる。
- `heading` か `label` で、パネルの名前を付ける。
- 中の操作が終わったら閉じるボタンには `data-popover-close` を付ける（トリガーへフォーカスが戻る）。
- 削除の確認では、安全な側のボタンに `autofocus` を付ける。

**Don't**

- 操作の一覧を並べる。それは `jimble-dropdown-menu`。
- 長いフォームや、ほかの操作を止めて答えてほしい確認に使う。それは `jimble-dialog` / `jimble-drawer`。
- ポップオーバーの中に、さらにポップオーバーを入れる（中のセレクト・コンボボックスはよい）。
- 補足の文字だけを出すのに使う。それは `jimble-tooltip`。

## Tree（`jimble-tree`）

**Do**

- 商品カテゴリ・部署・フォルダなど、データの階層を見て選ぶのに使う。
- 木に名前を付ける（`jimble-field` の `label`、または `aria-label`）。
- 項目には `label` と `value` を付ける。よく見る枝は `expanded` で開いておく。
- 子が多い・遅い枝は `lazy` にし、`jimble-expand` で読み込む（子が無いと分かったら `lazy` を外す）。

**Don't**

- ページの移動（サイドバー）に使う。それは `jimble-sidebar-nav` の `jimble-nav-group`。
- 階層の無い一覧に使う。それは `jimble-table` や `jimble-checkbox` の並び。
- 階層を 5 段より深くする。浅くまとめるか、別の画面に分ける。
- 項目の中に、ボタンやリンクを置く（項目そのものが操作の対象になる）。

## Command Palette（`jimble-command-palette`）

**Do**

- ページの移動と、よく使う操作を、名前で探せるようにする（管理画面に 1 つ）。
- `keywords` に読みや別名を書く（「ちゅうもん」「受注」で「注文の一覧」が見つかる）。
- `group` でページと操作を分ける。開いた直後に出る並びを、よく使う順にする。
- ショートカットで開くなら `hotkey="mod+k"` を付け、画面のどこかに開くボタンも置く。

**Don't**

- 値を選ぶ入力欄として使う。それは `jimble-select` / `jimble-combobox`。
- その場の数個の操作に使う。それは `jimble-dropdown-menu`。
- 1 つの画面に 2 つ以上置く（置くなら `label` で名前を変える）。
- 画面にあるボタンやメニューでしかできない操作を、パレットだけに置く（パレットは近道。元の操作も残す）。
