---
title: Drawer
order: 26
description: サイドモーダル（画面の端から出るドロワー・スライドパネル）
---

`<jimble-drawer>` は、画面の端からスライドして出るモーダルのパネルです（サイドモーダル、ドロワー、スライドパネル、ボトムシート）。`jimble-dialog` と同じ仕組みで、ネイティブの `<dialog>` の `showModal()` を使います。

## 使い方

::example drawer/basic

::example drawer/form

::example drawer/placements

## Dialog との使い分け

| 状況                                                     | 使うもの                                  |
| -------------------------------------------------------- | ----------------------------------------- |
| 確認、短い入力、警告など、画面の真ん中で注意を引きたい   | [Dialog](../dialog/)                      |
| 詳細の表示、絞り込み、編集フォームなど、一覧を残したまま | Drawer（`placement="end"`）               |
| 画面の下から選ぶ（共有、操作の一覧）                     | Drawer（`placement="bottom"`）            |
| 狭い画面のナビゲーション                                 | [App Shell](../app-shell/) が出すドロワー |

## 注意

- **`jimble-dialog` と同じ API と挙動です。** `open` / `show()` / `hide()`、`heading`（または `title` スロット・`aria-label`）、`footer` スロット、`static-backdrop`、`hide-close-button`、`data-dialog-close`、`jimble-close-request`（`preventDefault()` で閉じない）、`jimble-close`（`reason`）、IME 変換中の Esc、閉じたときのフォーカスの復帰が使えます。詳しくは [Dialog](../dialog/) を見てください。
- 出る位置は `placement`（`end` = 右・既定、`start` = 左、`top`、`bottom`）。幅は `size`（`sm` 20rem / `md` 28rem / `lg` 40rem。画面より狭いときは画面に収まる）。`top` / `bottom` は画面の幅いっぱいで、高さは内容に合わせます（最大で画面の 80%）。
- 出入りにスライドの動きが付きます。OS の「視差効果を減らす」設定では動きません。閉じるときの動きは、ブラウザが対応している場合だけです。
- 開いている間は背面が操作できません（モーダル）。背面を操作しながら見せる非モーダルのパネルは未対応です。
- 左から出る `start` は左から右への言語向けです（右から左の言語は未対応）。

## API

::api jimble-drawer
