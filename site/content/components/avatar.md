---
title: Avatar
order: 2.5
description: 人を、画像か頭文字の小さな丸で示す。重ねて並べる群も
---

`<jimble-avatar>` は、担当者・作成者・ユーザーを、画像か頭文字の小さな丸で示します。`<jimble-avatar-group>` は、何人かを重ねて並べ、多いときは「+N」にまとめます。

- `name` が頭文字と、読み上げる名前になります。頭文字は、ラテン文字の名前なら最初と最後の語から 2 文字（Hanako Sato → HS）、日本語などは最初の 1 文字（佐藤 花子 → 佐）です。
- `src` の画像が読めないとき（上の例の右端）は、頭文字に戻ります。名前も無いときは、人の形のアイコンです。
- 大きさは `size`（`sm` 24px・`md` 32px・`lg` 40px）。[余白の段階](../../guide/theming/)に合わせて変わります。決まった大きさにするときは `--jimble-avatar-size`。
- **隣に名前の文字があるとき**は `decorative` を付けて、読み上げから外します。
- 群の `max`（既定 5）を超えた分は、描画にも読み上げにも出ません。「+N」は「ほか N 人（隠れた人の名前）」と読み上げられます。

## 使い方

::example avatar/basic

::example avatar/with-name

::example avatar/group

## Do / Don't

::dos avatar

## API

::api jimble-avatar

::api jimble-avatar-group
