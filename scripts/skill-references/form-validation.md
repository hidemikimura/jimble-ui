# フォームの独自検証（jimble-field の validate）

`jimble-field` で、フィールド単位の独自検証を書くときの詳細。基本のフォームの規則は SKILL.md の「2. フォームの値」。

- **独自の検証（フィールド単位）は `jimble-field` の `validate` プロパティ**（属性ではなく JS のプロパティ。Lit なら `.validate=${fn}`）: `(value, control) => エラーメッセージ | null`（Promise も可。サーバーへの確認など）。値が変わったとき・フォーカスが外れたとき・最初に 1 回、**空の値でも**呼ばれる。空でない文字列を返すとエラー（表示は一度フォーカスが外れたあと）で、フォームは送信されない。値は文字列（チェックボックスは真偽値、複数選択は配列、ファイルは File の配列）。`await field.validateNow()` で送信前に確定できる（表示は変えない）。`await field.showErrors()` は検証してエラーを**表示**、`field.hideErrors()` は表示を**隠す**。部品の `value` をプログラムから書き換える（Autokana.js など）と、`validate` は自動でやり直される。1 つの field に部品が複数（姓と名）あるときは部品ごとに呼ばれ、3 つ目の引数 `context.get('name')` でほかの部品の値を引ける（部品には区別できる `aria-label` を付ける）。

### 例

{{example:field/custom-validation}}

### サーバー側のエラー

{{example:field/server-error}}
