---
title: Input
order: 5
description: 1 行のテキスト入力
---

`<jimble-input>` は 1 行のテキスト入力です。ラベル・ヒント（`hint`）・エラー（`error`）は [Field](../field/) の属性で付けます（`<jimble-field label="…" hint="…">` で包みます）。フォームへの参加、検証、Enter による送信は [フォームとの連携](../../guide/forms/) を参照してください。

## 使い方

::example input/basic

::example input/types

::example input/affix

::example input/sizes

::example input/states

## 注意

- `size` は**ネイティブの `size`（文字数の幅）ではなく** sm / md / lg の大きさです。幅は `--jimble-input-width` で指定します。
- 枠の色は、入力欄の識別に必要な 3:1 のコントラスト（WCAG 1.4.11）を確保するため、ボタンやカードより濃くしています。
- プレースホルダーは説明の代わりにしないでください。ラベルは必ず付けてください（`jimble-field`、`<label for>`、`aria-label`）。

## キーボード操作

ネイティブの `<input>` に従います。Enter は[フォームの暗黙の送信](../../guide/forms/)になります（IME の変換中を除く）。

## カスタマイズ

::example input/customize

## API

::api jimble-input
