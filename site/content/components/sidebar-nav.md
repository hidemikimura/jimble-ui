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

## テーマ（色・アイコンの大きさ）

項目の色とアイコンの大きさは、CSS 変数で変えられます（`jimble-sidebar-nav` か、その外側に指定します）。既定は意味トークンなので、指定しなければ今までと同じ見た目です。サイドバー自体の背景は、[App Shell](../app-shell/) の `--jimble-app-shell-sidebar-bg` です（`jimble-sidebar-nav` は背景を持ちません）。

| CSS 変数                            | 既定値                          | 説明                                                                    |
| ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `--jimble-sidebar-nav-text`         | `--jimble-color-text`           | 項目の文字色                                                            |
| `--jimble-sidebar-nav-icon-color`   | `--jimble-color-text-muted`     | アイコンと開閉の矢印の色                                                |
| `--jimble-sidebar-nav-icon-size`    | アイコン自身の大きさ（1.25rem） | アイコン（`jimble-icon`）の大きさ。`<svg>` を直接入れた場合は効きません |
| `--jimble-sidebar-nav-hover-bg`     | `--jimble-color-surface-sunken` | マウスを重ねた項目の背景（細い表示の頭文字の背景も同じ）                |
| `--jimble-sidebar-nav-current-bg`   | `--jimble-color-primary-50`     | 現在のページの背景                                                      |
| `--jimble-sidebar-nav-current-text` | `--jimble-color-primary-700`    | 現在のページの文字色                                                    |
| `--jimble-sidebar-nav-ring-focus`   | `--jimble-color-ring-focus`     | フォーカスの輪郭の色                                                    |

暗い背景で使う例は、[App Shell](../app-shell/) の「テーマ」を参照してください。

## キーボード操作

すべてのリンクとグループのボタンが、Tab で順に移動できます（矢印キーでの移動は使いません）。グループのボタンは Enter / Space で開閉します。

## API

::api jimble-sidebar-nav

### jimble-nav-item

::api jimble-nav-item

### jimble-nav-group

::api jimble-nav-group
