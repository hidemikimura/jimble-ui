<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# フォームの独自検証（jimble-field の validate）

`jimble-field` で、フィールド単位の独自検証を書くときの詳細。基本のフォームの規則は SKILL.md の「2. フォームの値」。

- **独自の検証（フィールド単位）は `jimble-field` の `validate` プロパティ**（属性ではなく JS のプロパティ。Lit なら `.validate=${fn}`）: `(value, control) => エラーメッセージ | null`（Promise も可。サーバーへの確認など）。値が変わったとき・フォーカスが外れたとき・最初に 1 回、**空の値でも**呼ばれる。空でない文字列を返すとエラー（表示は一度フォーカスが外れたあと）で、フォームは送信されない。値は文字列（チェックボックスは真偽値、複数選択は配列、ファイルは File の配列）。`await field.validateNow()` で送信前に確定できる（表示は変えない）。`await field.showErrors()` は検証してエラーを**表示**、`field.hideErrors()` は表示を**隠す**。部品の `value` をプログラムから書き換える（Autokana.js など）と、`validate` は自動でやり直される。1 つの field に部品が複数（姓と名）あるときは部品ごとに呼ばれ、3 つ目の引数 `context.get('name')` でほかの部品の値を引ける（部品には区別できる `aria-label` を付ける）。

### 例

```html
<form
  class="stack"
  onsubmit="
    event.preventDefault()
    this.querySelector('output').textContent =
      '送信しました: ' + JSON.stringify(Object.fromEntries(new FormData(this)))
  "
>
  <jimble-field
    id="fld-email"
    label="メールアドレス"
    hint="社用アドレス（@example.com）を入力してください"
  >
    <jimble-input type="email" name="email" autocomplete="email"></jimble-input>
  </jimble-field>
  <jimble-field
    id="fld-user"
    label="アカウント名"
    hint="名前が使われていないか、入力後にサーバーで確認します（「admin」は使用済みの例）"
  >
    <jimble-input name="user" autocomplete="off"></jimble-input>
  </jimble-field>
  <div><jimble-button type="submit" variant="primary">登録</jimble-button></div>
  <output aria-live="polite"></output>
</form>
<script>
  // 同期の検証: 値を受け取り、エラーメッセージ(文字列)を返す。問題なければ null
  document.getElementById('fld-email').validate = (value) => {
    if (!value) return '必須です。'
    if (!value.endsWith('@example.com')) return '社用アドレス（@example.com）を入力してください。'
    return null
  }
  // 非同期の検証: Promise を返す(サーバーへの問い合わせなど)。確定したとき(フォーカスが外れたとき)に呼ばれる
  document.getElementById('fld-user').validate = async (value) => {
    if (!value) return '必須です。'
    await new Promise((resolve) => setTimeout(resolve, 400)) // 通信の代わり
    return value === 'admin' ? 'このユーザー名は使われています。' : null
  }
</script>
```

### サーバー側のエラー

```html
<jimble-field label="ユーザー名" error="このユーザー名はすでに使われています">
  <jimble-input name="username" value="taro"></jimble-input>
</jimble-field>
```
