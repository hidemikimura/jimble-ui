---
title: Dialog
order: 11
description: モーダルダイアログ
---

`<jimble-dialog>` はモーダルダイアログです。ネイティブの `<dialog>` の `showModal()` を使うので、背面の操作不可（inert）・フォーカスの閉じ込め・最前面への表示はブラウザが行います。詳しい仕組みは [オーバーレイ](../../guide/overlays/) を参照してください。

## 使い方

`show()` / `hide()` / `toggle()` で開閉します（`open` 属性でも同じです）。JavaScript を書かずに閉じるには、閉じる操作をする要素に `data-dialog-close` を付けます。

::example dialog/basic

::example dialog/alert

::example dialog/form

## 注意

- **名前が必要です。** `heading` 属性、`title` スロット、`aria-label` のいずれかを付けてください（無い場合は開発時に警告します）。
- 閉じるときは、まず `jimble-close-request`（`reason`: `escape` / `backdrop` / `action`）が発火します。`preventDefault()` すると閉じません（未保存の変更がある場合など）。
- **IME の変換中の Esc では閉じません。** 変換の取り消しであり、ダイアログを閉じる操作ではないためです。
- 閉じると、フォーカスは開く前にあった要素に戻ります。
- 背景クリックで閉じるのは、押したときと離したときの**両方**が背景の上にある場合だけです（テキスト選択のドラッグで閉じてしまうのを防ぎます）。`static-backdrop` で無効にできます。
- `alert` は確認など応答が必須のダイアログです。`role="alertdialog"` になり、背景クリックでは閉じません。破壊的な操作では、安全な側のボタンに `autofocus` を付けてください。
- ダイアログの中から `toast()` を出しても、読み上げ・操作ができます（通知の領域が、開いているダイアログの中へ移動します）。

## キーボード操作

| キー              | 動作                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Tab / Shift + Tab | ダイアログの中を移動（背面には出ません）                          |
| Esc               | 閉じる（`jimble-close-request` → 閉じる）。IME の変換中は閉じない |

## API

::api jimble-dialog
