---
title: Icon
order: 28
description: アイコン（名前で選ぶ）
---

`<jimble-icon>` は、名前でアイコンを選んで表示します。色は周りの文字色に従い、大きさは `size` で指定します。

## 使い方

::example icon/basic

::example icon/usage

## 読み込み

アイコンは**使う分だけ読み込めます**。

```ts
import '@hidemikimura/jimble-ui' // すべての部品とアイコン（CDN も同じ）

// 使うものだけ
import '@hidemikimura/jimble-ui/icon'
import '@hidemikimura/jimble-ui/icons/check'
import '@hidemikimura/jimble-ui/icons/trash'
// import '@hidemikimura/jimble-ui/icons'  // アイコンだけ、すべて
```

`name` の候補（型 `IconName` と一覧 `ICON_NAMES`）は `@hidemikimura/jimble-ui/icons/names` から取れます。独自のアイコンは `registerIcon` で登録できます。

```ts
import { svg } from 'lit'
import { registerIcon } from '@hidemikimura/jimble-ui/icon'

registerIcon('my-logo', {
  viewBox: '0 0 20 20',
  fill: 'currentColor',
  body: svg`<circle cx="10" cy="10" r="8" />`,
})
```

## 注意

- **意味を持つアイコンには `label` を付けます**（`role="img"` になり、その文字で読み上げられます）。`label` が無ければ装飾として読み上げから外れます。隣に同じ意味の文字があるとき（「追加」ボタンの `+` など）は付けません。
- **アイコンだけのボタンには、ボタン側に `aria-label` を付けます**（上の例の削除・設定）。アイコンの `label` ではありません。
- 色だけ、アイコンだけで意味を伝えないでください（状態を表すアイコンは、文字も添えます）。アイコンと背景のコントラストは 3:1 以上を確かめてください。
- 登録されていない名前は、何も表示しません（開発ビルドでは警告が出ます）。
- アイコンは 20px の塗りつぶし形式です（[Heroicons](https://github.com/tailwindlabs/heroicons) v2 の一部。MIT）。線画のアイコンや、独自の書体アイコンは対象外です。

## アイコンの一覧

名前は `name` にそのまま使えます。

::icons

## API

::api jimble-icon
