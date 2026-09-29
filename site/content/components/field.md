---
title: Field
order: 10
description: ラベル・ヒント・エラーを付ける入れ物
---

`<jimble-field>` は、中に置いたフォーム部品（`jimble-input`、`jimble-textarea`、`jimble-radio-group` など）にラベル・ヒント・エラーを付けます。仕組みは [フォームとの連携](../../guide/forms/) を参照してください。

## 使い方

::example field/basic

::example field/required-error

::example field/server-error

## 注意

- 表示するエラーは、`error` 属性（明示）が優先され、なければ部品自身の検証メッセージ（触れた後）が出ます。
- 見えているラベル・ヒント・エラーは、中に `jimble-*` のフォーム部品があるときだけ支援技術から隠されます（部品側が同じ文言を持つため）。ネイティブの `<input>` を中に置く使い方には対応していません。
- ラベルをクリックすると、中の部品にフォーカスします。

## API

::api jimble-field
