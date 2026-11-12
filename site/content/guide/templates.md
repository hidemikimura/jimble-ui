---
title: ページのテンプレート
order: 2.5
description: 一覧・詳細・編集フォーム・設定・ログイン・ダッシュボードの、すぐ使えるページ
---

管理画面によくあるページを、jimble-ui の部品だけで組んだテンプレートです。そのまま開ける HTML として取り出し、文言とデータを差し替えて使います。どれも、自動テストで axe（アクセシビリティの検査）を、ライトとダークの両方で通しています。

## 取り出し方

CLI で、CDN から jimble-ui を読み込む、そのまま開ける HTML 文書を出せます。

```bash
npx @hidemikimura/jimble-ui template              # 一覧
npx @hidemikimura/jimble-ui template list > orders.html
npx @hidemikimura/jimble-ui template form --theme forest > customer.html
npx @hidemikimura/jimble-ui template detail --fragment   # <body> の中身だけ
```

- `--theme <名前>` で、[既製のテーマ](../theming/) を読み込む `<link>` を足します。
- `--fragment` は、`<body>` の中身だけを出します。自分のページや、サーバーのテンプレートに貼るときに使います。このときは、jimble-ui の読み込み（[はじめに](../getting-started/)）を自分で書いてください。
- 下の各例の「ソース」も、同じ内容です。

テンプレートの見た目は、部品だけでできています。並べ方と余白は [Stack](../../components/stack/) と [Grid](../../components/grid/) でそろえ、それで書けない所（ページの外側の余白など）だけを `style` 属性に書いています。ページの CSS やフレームワークに依存しないので、Tailwind などの自分の CSS に置き換えて構いません。送信の処理（`onsubmit`）は、通知を出すだけの見本です。

## 一覧

検索と絞り込み、並べ替えの印、行ごとの操作メニュー、ページ送り。

::example templates/list

## 詳細

見出しの操作（印刷・編集）、注意のお知らせ、項目の一覧、タブで分けた内訳と進み具合。

::example templates/detail

## 編集フォーム

必須の項目、ヒント、ラジオ・セレクト・日付・スイッチ・チェックボックス。保存のボタンは、カードのフッターに貼り付きます（`sticky-footer`）。送信すると、未入力の必須の項目にエラーが出ます。

::example templates/form

## 設定

タブで分けた設定の項目と、まとめて保存するボタン。

::example templates/settings

## ログイン

app-shell を使わない、画面の中央のカード。`autocomplete` で、パスワードの管理ツールが働くようにしています。

::example templates/login

## ダッシュボード

数字のカード、お知らせ、最近の注文の表。

::example templates/dashboard
