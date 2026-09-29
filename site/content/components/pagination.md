---
title: Pagination
order: 20
description: ページネーション
---

`<jimble-pagination>` は、ページ移動の部品です。現在のページは `aria-current="page"` で伝わります。

## 使い方

ページ数は `total-pages`、または `total`（全件数）と `page-size` から決まります。`total` を指定すると「243 件中 1〜20 件」の表示も出ます。

::example pagination/basic

## ボタンとリンク

既定は**ボタン**で、押すと `page` が更新され、`jimble-page-change`（`detail.page`）が発火します。`preventDefault()` すると移動しません。

サーバーがページを描画する場合は、**`href-template`**（`{page}` がページ番号に置き換わります）を指定すると、通常のリンクで描画されます。この場合もイベントは発火しますが、遷移は止めません。

::example pagination/links

## 注意

- 番号が多いときは、先頭・末尾・現在の前後だけを表示し、間を省略します（表示する項目数は一定）。`sibling-count` で前後の数を変えられます。
- 1 ページに複数のページネーションを置くときは、`label` で名前を変えてください（同じ名前の `nav` が並ぶと、支援技術で区別できません）。
- 最初/最後のページでは、「前へ」/「次へ」は無効になります。
- ボタンの名前は「N ページ目」「前のページ」「次のページ」で、辞書で切り替えられます。

## API

::api jimble-pagination
