---
title: Empty State
order: 40
description: 表示するものがないことを伝え、次の一歩を示す
---

`<jimble-empty-state>` は、空の一覧・検索の結果なし・まだ作っていないものなど、表示するものがないときに置きます。何がないか（`heading`）、理由や次にすること（`description`）、操作（`actions` スロット）を並べます。

- 見出しのレベルは `level`（既定 2）で、置いた場所の見出しの構造に合わせます。
- アイコン（`icon` スロット）は飾りで、読み上げません。
- 検索の結果として出すときは、件数の変化を `role="status"` の要素などで伝えます（アプリの役目）。

## 使い方

::example empty-state/basic

::example empty-state/search

## Do / Don't

::dos empty-state

## API

::api jimble-empty-state
