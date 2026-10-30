---
title: Dropdown Menu
order: 12
description: ドロップダウンメニュー
---

`<jimble-dropdown-menu>` は、ボタンから開くメニューです（WAI-ARIA の menu button パターン）。トリガーは `trigger` スロットに、項目は `jimble-menu-item` で書きます。

メニューはトップレイヤーに表示され、親の `overflow: hidden` や `z-index` に影響されません。位置は CSS Anchor Positioning で決まり、画面の端では反転します。

## 使い方

::example dropdown-menu/basic

::example dropdown-menu/link

::example dropdown-menu/placement

::example dropdown-menu/submenu

## 注意

- 項目が選ばれると `jimble-select`（`detail.value`、`detail.item`）が発火してメニューが閉じ、フォーカスはトリガーに戻ります。`preventDefault()` すると閉じません。
- `href` を付けた項目は、選ばれると遷移します。
- メニューの名前は `label` 属性、なければトリガーの文字です。
- **サブメニュー**: 項目の中に、`slot="submenu"` を付けた `jimble-menu-item` を置きます。その項目は右に矢印が付き、→ / Enter / Space・クリック・マウスを重ねると、右にサブメニューが開きます（右に収まらなければ左）。サブメニューの中で、さらに入れ子にできます。
- サブメニューの項目を選んでも、`jimble-dropdown-menu` から `jimble-select` が出ます（`detail.item` は選んだ項目）。サブメニューを開く項目そのものでは、`jimble-select` は出ません（`value`・`href` も使いません）。
- チェック付き項目は未対応です。
- トリガーが `jimble-button` のときは、`aria-haspopup` / `aria-expanded` を内部のボタンへ渡します。それ以外の要素の場合は、その要素に属性を付けます。

## キーボード操作

| キー              | 動作                                                                               |
| ----------------- | ---------------------------------------------------------------------------------- |
| Enter / Space / ↓ | （トリガーで）開いて最初の項目へ                                                   |
| ↑                 | （トリガーで）開いて最後の項目へ                                                   |
| ↓ / ↑             | 次 / 前の項目へ（無効な項目は飛ばす。端は循環）                                    |
| Home / End        | 最初 / 最後の項目へ                                                                |
| 文字              | その文字で始まる項目へ（IME の変換中は無効）                                       |
| Enter / Space     | 項目を実行（サブメニューのある項目では、開く）                                     |
| →                 | サブメニューを開いて、最初の項目へ                                                 |
| ←                 | サブメニューを閉じて、親の項目に戻る                                               |
| Esc               | 閉じてトリガーに戻る（サブメニューの中では、そのサブメニューだけを閉じて親に戻る） |
| Tab               | 閉じて、トリガーの次の要素へ進む                                                   |

## API

::api jimble-dropdown-menu

### jimble-menu-item

::api jimble-menu-item
