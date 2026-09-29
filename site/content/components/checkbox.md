---
title: Checkbox
order: 7
description: チェックボックス
---

`<jimble-checkbox>` はチェックボックスです。ラベルは既定スロットに書きます。ラベルのクリックでも切り替わります。

## 使い方

::example checkbox/basic

::example checkbox/indeterminate

## 注意

- `checked` **属性**はデフォルト（`reset` の戻り先）、`checked` **プロパティ**は現在の状態です。
- チェック時だけ `value`（既定は `on`）が送信されます。
- `indeterminate` は表示だけで、ユーザーが操作すると解除されます。
- ラベルを置かない場合は `aria-label` が必要です。

## キーボード操作

| キー  | 動作               |
| ----- | ------------------ |
| Space | チェックの切り替え |

## API

::api jimble-checkbox
