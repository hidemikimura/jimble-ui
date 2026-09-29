---
title: Description List
order: 22
description: 項目名と値の一覧
---

`<jimble-description-list>` は、詳細画面などで使う「項目名と値」の一覧です。`jimble-description-item` を並べます。

## 使い方

::example description-list/basic

## 注意

- 項目名は `label` 属性、または `label` スロット（HTML を書きたいとき）で、値は既定スロットで書きます。
- 広い画面（40rem 以上）では項目名を左の列に、狭い画面では値の上に置きます。`layout="vertical"` で常に縦にできます。項目名の列の幅は `--jimble-description-label-width` で変えられます。
- 項目名は `term`、値は `definition` の役割を持ちます。

## API

::api jimble-description-list

### jimble-description-item

::api jimble-description-item
