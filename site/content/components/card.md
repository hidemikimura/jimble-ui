---
title: Card
order: 3
description: 関連する情報をまとめる面
---

`<jimble-card>` は関連する情報をまとめる面です。ヘッダーとフッターは、スロットに中身があるときだけ表示されます。

## 使い方

::example card/basic

::example card/header-footer

## アクセシビリティ

カードには暗黙のロールを付けていません。見出しを含める場合は、ページの見出し階層に合わせて `h2` などを `slot="header"` に置いてください。

## API

::api jimble-card
