---
title: Tree
order: 42
description: 開閉できる階層の一覧（カテゴリ・部署・フォルダ）
---

`<jimble-tree>` は、商品カテゴリ・部署・フォルダなど、データの階層を開閉しながら見て、選ぶ部品です（WAI-ARIA の Tree View）。項目は `<jimble-tree-item>` で、子の項目はそのまま入れ子に書きます。名前は `label` 属性に書きます。

- `selection`: `none`（既定。開閉だけ）・`single`（1 つを選ぶ）・`multiple`（チェックボックスで付け外し）。
- `multiple` では、親を付けると子孫がすべて付き、子の一部だけが付いていると、親は「一部」の印になります。`values` は付いている項目すべて（親も含む）。`checked-values="leaves"` で、子の無い項目だけにできます。
- `name` を付けると、フォームに `values` を同じ名前で送ります。名前は `jimble-field` の `label` か `aria-label` で付けます。
- キー操作: ↓↑ で移動、→ で開く・最初の子へ、← で閉じる・親へ、Home / End、Enter / Space で選ぶ（`multiple` は付け外し）、文字で先頭一致の項目へ、`*` で同じ階層をすべて開く。
- ページの移動には使いません（[Sidebar Nav](../sidebar-nav/) の `jimble-nav-group` を使います）。

## 使い方

::example tree/basic

::example tree/single

::example tree/multiple

::example tree/lazy

## Do / Don't

::dos tree

## API

::api jimble-tree

::api jimble-tree-item
