---
title: Spinner
order: 27
description: 読み込み中を示すスピナー
---

`<jimble-spinner>` は、読み込み中を示す回転するアイコンです。

## 使い方

::example spinner/basic

::example spinner/inline

## 注意

- 既定では `role="status"` で、「読み込み中」を読み上げます。文字は `label` で変えられ、辞書（`common.loading`）でも変えられます。
- **すぐ隣に「保存しています…」などの文字があるときは `decorative` を付けます**（読み上げから外れ、二重に読まれません）。読み込み中の領域をまとめて伝えるときは、領域の側に `role="status"` を付けます（上の 2 つ目の例）。
- 色は文字色に従います（`currentColor`）。`variant="primary"` で主色。背景とのコントラストは、使う側で 3:1 以上を確かめてください。
- 大きさは `size`（1 / 1.5 / 2.5rem）か、`--jimble-spinner-size` で指定します。
- 「視差効果を減らす」設定では回転せず、点滅します。
- ボタンの読み込み中は、スピナーを自分で置かず `jimble-button` の `loading` を使います。

## API

::api jimble-spinner
