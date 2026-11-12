---
title: Tag
order: 2.7
description: もの・条件に付ける、外せる名札。並べる群も
---

`<jimble-tag>` は、絞り込みの条件・付けたラベル・選んだ宛先など、利用者が付けたり外したりするものを、小さな名札で示します。`<jimble-tag-group>` は、タグを折り返して並べます。状態（公開中・期限切れ）を示すなら [Badge](../badge/) を使います。

- `removable` を付けると、×のボタンが出ます。名前は「ラベル を外す」です。×にフォーカスがある間は、Delete・Backspace でも外せます。
- 外すと `jimble-remove`（`detail.value`。`value` が無ければラベルの文字）が出て、取り消されなければ、タグは自分をページから外します。サーバーが断ったときは `preventDefault()` で残せます。
- 外したあとのフォーカスは、次のタグの×、無ければ前のタグの×、どちらも無ければ群に移ります。
- `jimble-remove` はバブルしません。まとめて受けるときは、群に `{ capture: true }` で付けます（下の例）。

## 使い方

::example tag/basic

::example tag/filters

## Do / Don't

::dos tag

## API

::api jimble-tag

::api jimble-tag-group
