---
title: Textarea
order: 6
description: 複数行のテキスト入力
---

`<jimble-textarea>` は複数行のテキスト入力です。Enter は改行で、フォームは送信されません。`label`・`hint`（補足の説明）・`error`（エラー）は、部品ではなく [Field](../field/) の属性です。`<jimble-field label="…" hint="…">` で包んでください（下の例）。

## 使い方

::example textarea/basic

`autosize` は、ブラウザが `field-sizing: content` に対応していればそれを使い、非対応の場合は JavaScript で高さを合わせます。

## API

::api jimble-textarea
