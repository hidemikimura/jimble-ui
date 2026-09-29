---
title: Button
order: 1
description: 操作の実行・ページ遷移に使うボタン
---

`<jimble-button>` は操作の実行やページ遷移に使います。`href` を指定するとリンク（`<a>`）として描画されます。

## 使い方

::example button/variants

::example button/sizes

::example button/icons

::example button/states

::example button/link

::example button/form

## 注意

- `type` の既定は **`button`** です（ネイティブの `<button>` は `submit`）。フォームの誤送信を避けるためです。
- `type="submit"` / `"reset"` は所属フォームの `requestSubmit()` / `reset()` を呼びます。フォーム関連カスタム要素は送信ボタンになれないため、**`name` / `value` は送信されません**。
- `loading` 中はクリックを無効にしますが、フォーカスは維持します（スクリーンリーダーには `aria-busy` と「読み込み中」が伝わります）。
- `icon-only` のときは `aria-label` が必須です（無い場合は開発時に警告します）。

## キーボード操作

| キー          | 動作                                                              |
| ------------- | ----------------------------------------------------------------- |
| Enter / Space | 実行（リンクとして描画されている場合は Enter のみ）               |
| Tab           | フォーカスの移動（`disabled` は飛ばされ、`loading` は止まります） |

## カスタマイズ

::example button/customize

## API

::api jimble-button
