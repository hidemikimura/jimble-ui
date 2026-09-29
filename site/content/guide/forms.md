---
title: フォームとの連携
order: 4
description: フォーム部品の値・検証・リセット・送信
---

`jimble-input` などのフォーム部品は、ネイティブのフォーム部品と同じように `<form>` に参加します（フォーム関連カスタム要素）。

## 使ってみる

::example input/form

## 値

- `name` があれば、`FormData` に含まれます。`name` が無い、`disabled`、祖先の `<fieldset disabled>` の場合は送信されません。
- `value` **属性**はデフォルト値、`value` **プロパティ**は現在値です（ネイティブの `<input>` と同じ）。`reset` は属性の値に戻します。利用者が触った後は、属性を書き換えても現在値は変わりません。
- `checkbox` と `switch` はチェック時だけ `value`（既定は `on`）を送信します。`radio-group` は選ばれた `jimble-radio` の `value` を送信します。

## 検証

ネイティブの制約検証（`required`、`type`、`minlength`、`maxlength`、`min`、`max`、`step`、`pattern`）が使えます。ブラウザ標準の文言ではなく、[辞書](../i18n/)のメッセージが表示されます。

- `form.checkValidity()` / `reportValidity()` / `requestSubmit()` はそのまま使えます。
- サーバー側のエラーは `setCustomValidity('メッセージ')`、または `jimble-field` の `error` 属性で渡します。
- **エラーの見た目は「触れた後」だけ**です。項目を離れた（blur）か、送信を試みて検証に失敗した後に表示されます。入力の途中では赤くなりません。CSS からは `:state(invalid)` で選べます。

::example field/required-error

::example field/server-error

## ラベルとヒント（jimble-field）

`jimble-field` はラベル・ヒント・エラーを付ける入れ物です。ARIA の参照（`aria-labelledby` など）は Shadow DOM の境界をまたげないため、`jimble-field` は文言を**文字列として**中の部品へ渡し、部品が自分の Shadow DOM 内で `aria-label` / `aria-describedby` に変換します。画面に見えているラベル・ヒントは、二重に読み上げられないよう支援技術からは隠されています。

`jimble-field` を使わない場合でも、次の方法で名前を付けられます。

- 外側の `<label for="id">`（`jimble-input` に `id` を付ける）
- `aria-label` 属性

::example field/basic

## Enter による送信

Shadow DOM の中の `<input>` は外側の `<form>` に属さないため、ブラウザは Enter で送信してくれません。`jimble-input` が代わりに、ネイティブと同じ規則で `requestSubmit()` します。

- フォームに送信ボタン（`button`、`input[type=submit]`、`jimble-button type="submit"`）があれば、Enter で送信します。ボタンが無効・処理中なら送信しません。
- 送信ボタンが無いときは、入力欄が 1 つだけの場合に限って送信します。
- `jimble-textarea` の Enter は改行です。
- 祖先の `keydown` で `preventDefault()` すれば止められます。

## IME（日本語入力）

**変換中の Enter は、確定として扱われます**（送信・項目の実行はしません）。Safari が変換確定の直後に出す `keyCode 229` の Enter も同様です。

## 制約

- `jimble-button type="submit"` は `form.requestSubmit()` を呼びます。フォーム関連カスタム要素は送信ボタン（submitter）になれないため、ボタンの `name` / `value` は送信されません。`formaction` などの属性にも対応しません。必要な場合はネイティブの `<button>` を使ってください。
- `jimble-input` は日付系の `type` に対応していません。
