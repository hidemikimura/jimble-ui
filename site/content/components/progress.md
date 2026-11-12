---
title: Progress
order: 38
description: 処理の進み具合を、横の棒で示す
---

`<jimble-progress>` は、ファイルの取り込み・一括の処理・設定の完了の度合いなど、処理の進み具合を示します。

- `value`（0〜`max`。`max` の既定は 100）の割合だけ、棒を満たします。
- `value` を付けないと、終わりの分からない処理（不確定）になり、棒が動き続けます。「視差効果を減らす」設定では、動かずに点滅します。
- 名前が必要です。`label`（棒の上に表示）か `aria-label` を付けます。`show-value` で割合も表示します。
- 数秒で終わる処理には [Spinner](../spinner/) を使います。

## 使い方

::example progress/basic

::example progress/update

## Do / Don't

::dos progress

## API

::api jimble-progress
