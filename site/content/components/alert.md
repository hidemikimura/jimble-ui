---
title: Alert
order: 4
description: ページ内の通知
---

`<jimble-alert>` はページ内の通知に使います。

## 使い方

::example alert/variants

::example alert/title-actions

::example alert/dismissible

## アクセシビリティ

- `danger` / `warning` は `role="alert"`（即時に読み上げ）、`info` / `success` は `role="status"`（丁寧に読み上げ）です。
- 種別名（「エラー」など）を視覚的に隠したテキストで補うので、色が見えなくても種別が伝わります。文言は辞書で切り替えられます。
- 閉じるボタンは `dismissible` で表示します。`jimble-dismiss` を `preventDefault()` すると閉じません。

## API

::api jimble-alert
