---
title: Banner
order: 4.5
description: 画面のいちばん上に、幅いっぱいで出す知らせ（保守・期限・障害）
---

`<jimble-banner>` は、保守の予定・契約の期限切れ・障害など、アプリ全体に関わる知らせを、画面のいちばん上に、幅いっぱいで出します。ページの一部への知らせは [Alert](../alert/)、操作の結果は [Toast](../toast/) を使います（[知らせ方の選び方](../../guide/messages/)）。

- `variant`: `info`（お知らせ）・`warning`・`danger`。ページの中のアラートと見分けられるよう、塗りつぶした色です。
- `danger` / `warning` は、出たときにすぐ読み上げられます（`role="alert"`）。`info` は控えめです（`role="status"`）。
- [App Shell](../app-shell/) の中では `slot="banner"` に置きます。ヘッダーの上に出て、スクロールすると流れて消えます（ヘッダーは上に残ります）。
- 直下の `<a>` は、文字の色を引き継いで下線が付きます。ボタンは `slot="actions"` に置きます。
- `dismissible` で閉じるボタンが出ます。閉じると `jimble-dismiss` が出て、隠れます（`preventDefault()` で止められます）。閉じたことを次に開いたときも覚えておくのは、アプリの役目です。

## 使い方

::example banner/variants

::example banner/app-shell

## Do / Don't

::dos banner

## API

::api jimble-banner
