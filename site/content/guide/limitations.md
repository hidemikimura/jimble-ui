---
title: 既知の制約
order: 7
description: 未対応のことと、仕組み上の制約
---

## 未対応のこと

| 部品          | 未対応                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| Select        | 選択肢の絞り込み（コンボボックス）、複数選択                                            |
| Dropdown Menu | サブメニュー、チェック付きの項目                                                        |
| Input         | 日付系の `type`、`spellcheck` / `autofocus` 属性                                        |
| Table         | セルの結合（`colspan` / `rowspan`）、行の選択（チェックボックス列）、仮想スクロール     |
| Tabs          | タブの追加・削除・並べ替え                                                              |
| Pagination    | ページ番号を入力して移動                                                                |
| 全体          | ダークモード（色は意味トークン経由なので、将来追加できる設計です）、右から左の言語(RTL) |

## 仕組み上の制約

- **`jimble-button type="submit"` は送信ボタンにならない。** フォーム関連カスタム要素は送信ボタン（submitter）になれないため、`form.requestSubmit()` を呼びます。ボタンの `name` / `value` は送信されず、`formaction` などにも対応しません。必要な場合はネイティブの `<button>` を使ってください。
- **ARIA の参照は Shadow DOM の境界をまたげない。** ラベル・ヒント・エラーは、文字列として部品へ渡され、部品の中に写されます（`jimble-field`）。そのため、`aria-labelledby` で `jimble-input` の内側を参照することはできません。
- **ネイティブの `<table>` は使えない。** 表はカスタム要素で組み立てます（[Table](../../components/table/)）。
- **CSS Anchor Positioning が必要。** メニューとセレクトの位置は、この機能で決まります。Chrome / Edge 125 以降、Firefox 147 以降、Safari 26 以降で動きます。
- **サーバーサイドレンダリング(SSR)は対象外。** Shadow DOM を宣言的に書く（Declarative Shadow DOM）ことは想定していません。
- **Safari / Firefox（macOS）の既定では、Tab がボタンやリンクに止まらない。** これはブラウザとシステムの設定で、jimble-ui の挙動ではありません。フォームの入力欄には Tab で移動できます。

## 変更が入るとき

1.0 までは、マイナーバージョンで互換性が壊れることがあります。変更点は [CHANGELOG](https://github.com/hidemikimura/jimble-ui/blob/main/CHANGELOG.md) に載ります。
