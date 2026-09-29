---
title: Tabs
order: 18
description: タブ
---

`<jimble-tabs>` は、`jimble-tab` と `jimble-tab-panel` を `value` で対応させます（WAI-ARIA の tabs パターン）。`jimble-tab` の `slot` 属性は自動で付きます。

## 使い方

::example tabs/basic

::example tabs/manual

## 注意

- 既定（`activation="auto"`）では、矢印キーで移動すると同時に切り替わります。パネルの中身が重い場合は `manual` にすると、フォーカスを動かしてから Enter / Space で切り替えられます。
- 選択が変わると `jimble-tab-change`（`detail.value`）が発火します。
- 無効なタブ（`disabled`）は、矢印キーでも選べません。
- 全体の名前は `label` で付けます。

## キーボード操作

| キー                     | 動作                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| Tab                      | タブの一覧に入る（選択中のタブ）。もう一度でパネルへ                        |
| → / ← （縦向きは ↓ / ↑） | 次 / 前のタブへ（無効は飛ばす。端は循環）。自動切り替えなら同時に切り替わる |
| Home / End               | 最初 / 最後のタブへ                                                         |
| Enter / Space            | （`manual` のとき）フォーカス中のタブに切り替える                           |

## API

::api jimble-tabs

### jimble-tab

::api jimble-tab

### jimble-tab-panel

::api jimble-tab-panel
