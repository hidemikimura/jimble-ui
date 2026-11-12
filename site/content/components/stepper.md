---
title: Stepper
order: 34
description: 段階を踏む入力の、今の位置と進み具合
---

`<jimble-stepper>` は、段階を踏む入力（予約の登録の「店舗 → プラン → 日時 → 確認」など）の、今の位置と進み具合を見せます。`jimble-step` を並べます。

## 使い方

::example stepper/basic

`value` に、今の段階の `jimble-step` の `value` を渡します。それより前の段階は「済」（チェック）、今の段階は「現在」、後ろは「未」です。`value` を空にすると先頭が現在です。`value` を省いた `jimble-step` の値は、並び順の番号（`"1"`、`"2"`…）になります。補足（選んだ値の要約など）は、`slot="description"` に置きます。

## 縦・エラー

::example stepper/vertical

- `orientation="vertical"` で縦に並びます。**横の並びも、幅が約 32rem より狭いと縦になります。**
- `size="sm"` で小さくできます。
- その段階に誤りがあるときは、`jimble-step` に `error` を付けます（警告のアイコンと危険色。読み上げにも「エラーあり」と伝わります）。

## 済の段階を選ぶ（navigable）

::example stepper/navigable

`navigable` を付けると、**済の段階**をクリック・Enter / Space で選べて、`jimble-step-change`（`detail.value`）が出ます。**部品は `value` を変えません**。アプリが検証して（必要なら、離れてよいかを確かめて）、`stepper.value` を変えます。現在・未の段階と、`disabled` を付けた段階は、選べません。エラーのある済の段階は、直しに戻れるように、選べます。

## アクセシビリティ

- 全体は `nav`（`label` で名前を付ける。既定は「進行状況」）の中の順序付きリストです。各段階は、「3/8 プラン：済」のように、番号・総数・名前・状態を読み上げ、現在の段階は `aria-current="step"` です。文言は辞書（`stepper.*`）で変えられます。
- 色だけで状態を伝えません。済はチェック、エラーは警告のアイコンです。
- 押せる段階は、本物の `<button>` で、Tab で移動できます。

## 見た目

済・現在・未の色と、つなぎ線の色は、CSS 変数で変えられます（`--jimble-stepper-complete-color`・`-current-color`・`-upcoming-color`・`-connector-color`）。丸・名前・補足・つなぎ線は、`::part()` でも指定できます。

## Do / Don't

::dos stepper

## API

::api jimble-stepper

::api jimble-step
