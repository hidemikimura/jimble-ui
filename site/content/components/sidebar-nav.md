---
title: Sidebar Nav
order: 16
description: サイドバーのナビゲーション
---

`<jimble-sidebar-nav>` は、リンクの一覧です。`jimble-nav-item`（リンク）と、折りたためる `jimble-nav-group` を並べます。`nav` ランドマークで、名前は `label`（既定は「メインメニュー」）です。

## 使い方

::example sidebar-nav/basic

## 注意

- 現在のページの項目に `current` を付けます（`aria-current="page"` になります）。現在のページの判定は、アプリ（またはルーター）が行います。
- 現在のページを含むグループは、最初から開きます。
- グループは、見出しのボタンで開閉します（`aria-expanded`）。
- `compact` を付けると、項目がアイコンだけの細い表示になります（項目名は読み上げに残ります。アイコンのない項目は頭文字が出ます）。グループの子項目は隠れます。[App Shell](../app-shell/) の `sidebar-collapsible` が、これを自動で切り替えます。

## キーボード操作

すべてのリンクとグループのボタンが、Tab で順に移動できます（矢印キーでの移動は使いません）。グループのボタンは Enter / Space で開閉します。

## API

::api jimble-sidebar-nav

### jimble-nav-item

::api jimble-nav-item

### jimble-nav-group

::api jimble-nav-group
