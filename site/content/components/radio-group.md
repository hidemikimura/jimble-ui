---
title: Radio Group
order: 9
description: ラジオボタンのグループ
---

`<jimble-radio-group>` の中に `<jimble-radio>` を直接の子として並べます。

## 使い方

::example radio-group/basic

::example radio-group/horizontal

## キーボード操作

WAI-ARIA の radio group パターンに従います。

| キー  | 動作                                                                                   |
| ----- | -------------------------------------------------------------------------------------- |
| Tab   | グループに入る（選択中のラジオ、なければ最初の有効なラジオ）。もう一度でグループを出る |
| ↓ / → | 次の有効なラジオへ移動して選択（末尾は先頭へ循環）                                     |
| ↑ / ← | 前の有効なラジオへ移動して選択                                                         |
| Space | フォーカス中のラジオを選択                                                             |

グループにはラベルが必要です。`jimble-field` の `label` か、`aria-label` を付けてください。

::example field/group

## API

::api jimble-radio-group

### jimble-radio

::api jimble-radio
