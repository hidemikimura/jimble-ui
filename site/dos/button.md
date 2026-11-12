## Do

- 1 つの画面で、主な操作 1 つだけを `variant="primary"` にする。ほかは secondary（既定）か ghost。
- 削除など取り消せない操作は `variant="danger"` にし、確認のダイアログを挟む。
- 処理中は `loading` を付ける（二度押しを防ぎ、フォーカスを保つ）。
- アイコンだけのボタン（`icon-only`）には `aria-label` を付ける。

## Don't

- ページの移動に `onclick` で `location` を書き換える。`href` を付けてリンクにする。
- 送信ボタンの `name` / `value` を、サーバーで読もうとする（送信されない）。必要ならネイティブの `<button>`。
- `disabled` で押せない理由を伝えないまま置く。押したときに、足りない項目を示すほうが分かりやすい。
