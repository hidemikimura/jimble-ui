---
title: Page Header
order: 17
description: ページの見出し領域
---

`<jimble-page-header>` は、ページの先頭に置く見出し領域です。パンくず、見出し、説明、操作ボタンを並べます。

## 使い方

::example page-header/basic

## 注意

- 見出しは `heading` 属性または `title` スロットで書きます。見出しのレベルは `level` で指定します（既定は 1）。ページ全体の見出し階層に合わせてください。
- パンくずは `slot="breadcrumb"`、右側の操作は `slot="actions"` です。狭い画面では操作が折り返します。

## API

::api jimble-page-header
