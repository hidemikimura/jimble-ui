---
title: Popover
order: 41
description: ボタンの近くに開く、操作できる小さなパネル
---

`<jimble-popover>` は、ボタンの近くに、操作できる小さなパネルを開きます。絞り込みの条件・その場での確認・表示の設定など、1 つの作業で完結する中身に使います。モーダルではないので、開いている間も背面を操作できます。

- トリガーは `slot="trigger"` に置きます（`jimble-button` など）。押すと開閉します。
- パネルには、見出し（`heading`）か名前（`label`）を付けます。支援技術には、モーダルでないダイアログとして伝わります。
- 開くと、`autofocus` の付いた要素、なければ中の最初のフォーカスできる要素にフォーカスが移ります。
- 閉じ方: Esc・外側のクリック・Tab でパネルの外へ出る・`data-popover-close` を付けた要素・見出しの横の × ボタン。中のセレクトやコンボボックスを開いても閉じません。

| 似た部品                           | 使い分け                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| [Dropdown Menu](../dropdown-menu/) | 操作の一覧から 1 つを選んで実行する                      |
| [Tooltip](../tooltip/)             | 短い補足の文字だけ（操作できる中身は置けない）           |
| [Dialog](../dialog/)               | ほかの操作を止めて答えてほしい（モーダル）。長いフォーム |

## 使い方

::example popover/filter

::example popover/confirm

::example popover/info

## Do / Don't

::dos popover

## API

::api jimble-popover
