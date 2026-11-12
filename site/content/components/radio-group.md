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

## 区切った見た目（segmented）

`appearance="segmented"` で、ボタンを横につなげた見た目（セグメンテッドコントロール）になります。表示の切り替え（一覧・カード）や、集計の単位（日・週・月）など、2〜5 個ほどの短い選択肢から 1 つを選ぶときに使います。キーボード操作・値・フォームへの参加は、ふつうのラジオと同じです。選ばれたものは、面・枠・影・太字で示します（色だけに頼りません）。

::example radio-group/segmented

## Do / Don't

::dos radio-group

## API

::api jimble-radio-group

### jimble-radio

::api jimble-radio
