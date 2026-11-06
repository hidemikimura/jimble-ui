---
title: Code Editor
order: 35
description: コード・テンプレートの編集（変数のチップと補完、HTML・JSON の色分け）
---

`<jimble-code-editor>` は、メールの文面や HTML・JSON のテンプレートを編集する欄です。`{{customer_name}}` のような**変数**を、名前のチップ（例: 「顧客名」）で表示し、`{{` を入力すると変数の候補を出します。フォームに参加し、値は `{{customer_name}} 様` のような文字列のまま送信されます。中身は [CodeMirror 6](https://codemirror.net/) です。

## 読み込み

CodeMirror を含むので大きく（gzip で約 150 KB。HTML の色分けを使うと、さらに約 66 KB）、**全部入りの読み込みには含まれません**。使うページで、別に読み込みます。

```js
import '@hidemikimura/jimble-ui' // ほかの部品
import '@hidemikimura/jimble-ui/code-editor'
```

CDN の場合は、全部入りの `jimble-ui.js` に加えて、`code-editor.js` を読み込みます。HTML・JSON の色分けは、その言語を使うときに自動で読み込まれます。

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/jimble-ui.js"
></script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/code-editor.js"
></script>
```

## 使い方

::example code-editor/variables

::example code-editor/html

::example code-editor/json

## 変数

- 変数は `variables` **プロパティ**に、`{ name, label, description }` の配列で渡します。`name` は文書に書く名前（英数字・`_`・`.`・`-`）、`label` はチップと候補に出す名前、`description` は候補に添える説明です。
- 文書の中の `{{name}}`（区切りの内側の空白も可）を、チップで表示します。チップは 1 文字のように扱われ、カーソルが中に入らず、Backspace 1 回で変数ごと消えます。`variables` に無い名前は、名前のまま、波線付きのチップで表示します（`::part(unknown)`）。
- `{{` を入力すると候補が出ます。続けて入力すると、名前・ラベルのどちらでも絞り込めます（全角・半角、ひらがな・カタカナの違いは無視）。どこでも **Ctrl+Space** で候補を開けます。
- ボタンやメニューから挿入するときは、`insertVariable(name)` を呼びます。カーソルの位置（選択中なら、その範囲を置き換えて）に挿入し、エディタにフォーカスを戻します。
- 区切り記号は `variable-prefix` / `variable-suffix` で変えられます（例: `${` と `}`）。

## 注意

- `language` は `text`（既定。本文の字体）・`html`・`json`（等幅の字体）です。色分けだけで、文法の検査はしません。
- 高さは `rows`（最小の行数、既定 6）で決まり、内容に合わせて `--jimble-code-editor-max-height`（既定 20rem）まで伸び、超えるとスクロールします。長い行は折り返します。
- **Tab はインデントに使いません**（キーボードの利用者が、エディタから抜けられるように）。Tab で次の項目へ移ります。
- `input` は、利用者の編集と `insertVariable()` で発火します。`value` プロパティを変えたときは発火しません。`change` は、値を変えてフォーカスが外れたときに発火します。
- `readonly` はフォーカス・選択・コピーができ、編集はできません（送信はされます）。`disabled` は操作できず、送信されません。
- スクリーンリーダーには、編集領域が「複数行のテキストボックス」として、[Field](../field/) のラベル・ヒント・エラーとともに伝わります。チップはラベルの文字（「顧客名」）で読まれます。

## キーボード操作

| キー                                | 動作                                                   |
| ----------------------------------- | ------------------------------------------------------ |
| `{{`                                | 変数の候補を開く                                       |
| Ctrl+Space                          | 変数の候補を開く（どこでも）                           |
| ↑ / ↓                               | （候補が開いているとき）候補を選ぶ                     |
| Enter                               | （候補が開いているとき）変数を挿入する。それ以外は改行 |
| Esc                                 | 候補を閉じる                                           |
| Tab / Shift+Tab                     | 次・前の項目へ移る                                     |
| Ctrl+Z / Ctrl+Shift+Z（macOS は ⌘） | 元に戻す・やり直す                                     |

## API

::api jimble-code-editor
