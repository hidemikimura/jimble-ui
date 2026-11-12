---
title: Skeleton
order: 39
description: 読み込み中に、あとから出る内容と同じ形の仮の面を出す
---

`<jimble-skeleton>` は、読み込み中に、あとから出る内容と同じ形の面を出し、内容が出たときに画面がずれないようにします。

- `variant`: `text`（文字の行。`lines` で行の数、最後の行は短い）・`rect`（四角）・`circle`（丸）。
- 大きさは `--jimble-skeleton-width` / `--jimble-skeleton-height` で変えます。
- **読み上げには出ません**（飾り）。読み込み中であることは、包む要素に `aria-busy="true"` を付け、[Spinner](../spinner/) などで伝えます。
- 「視差効果を減らす」設定では、点滅しません。

## 使い方

::example skeleton/basic

::example skeleton/table

## Do / Don't

::dos skeleton

## API

::api jimble-skeleton
