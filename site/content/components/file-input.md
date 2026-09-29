---
title: File Input
order: 30
description: ファイルの添付（ドロップエリア・一覧・アップロード）
---

`<jimble-file-input>` は、ファイルを添付する入力です。ドロップエリアにファイルをドラッグ＆ドロップするか、「ファイルを選択」ボタンで選びます。選んだファイルは一覧に出て、個別に削除できます。フォームに参加し、ファイルはそのままフォームに送られます。

## 使い方

::example file-input/basic

::example file-input/upload

## 制限（`accept`・`max-size`・`max-files`）

- `accept` は `<input accept>` と同じ書き方です（`.pdf,image/*`）。`max-size` は 1 ファイルの最大サイズ（バイト）、`max-files` は最大の数（`multiple` のとき）です。
- 合わないファイルは追加されず、**理由つきで一覧に出ます**（「対応していないファイル形式です」「サイズが 5 MB を超えています」「上限（3 ファイル）を超えています」）。`jimble-reject`（`detail` は `{ file, reason }`）も出ます。次にファイルを追加すると、拒否の表示は消えます。
- 制限の説明（対応形式・サイズ・数）は、ドロップエリアに表示され、ボタンの説明として読み上げられます。
- `multiple` を付けなければ 1 つだけで、新しく選ぶと置き換わります。

## サーバーへのアップロード（`upload`）

`upload` プロパティに関数を渡すと、追加されたファイルを自動でサーバーへ送ります。

```js
el.upload = async (file, { onProgress, signal }) => {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body, signal })
  if (!res.ok) throw new Error('failed')
  return (await res.json()).id // フォームに送られる値
}
```

- 進捗は `onProgress(0〜1)` で伝えます（`fetch` は進捗を取れないので、必要なら `XMLHttpRequest` を使います）。`signal` は、アップロード中に削除（中止）したときに abort されます。
- 関数が返した値（ID など）が、フォームに送られます。**ファイルそのものは送られません。** 何も返さなければ、ファイル名が送られます。
- 失敗すると（例外を投げると）一覧に「アップロードに失敗しました」と出て、**再試行ボタン**が出ます。
- **アップロード中・失敗のファイルがあると、フォームの検証が通りません**（送信をブロックします）。
- `jimble-upload-start`・`jimble-upload-complete`（`detail` は `{ file, value }`）・`jimble-upload-error`（`detail` は `{ file, error }`）が出ます。

## 注意

- ラベル・ヒントは [Field](../field/) で付けます。`required` にすると、1 つも選ばれていないときに検証エラーになります。
- ドロップができない利用者のために、ボタンからも選べます。**キーボードの操作先はボタンです**（Enter / Space）。追加・削除・エラーは読み上げにも伝わります（`role="status"`）。
- `preview` を付けると、画像のサムネイルが出ます（`blob:` の画像を許可する CSP が必要です）。
- ファイルの中身（種類）の検証はブラウザ側の `accept` と `File.type` だけです。**サーバー側でも必ず検証してください。**
- ファイルはフォームの状態復元（戻るボタンなど）で復元されません。
- フォルダーのドロップ、ドラッグでの並べ替え、ファイルの編集（画像のトリミングなど）、チャンク分割アップロードは未対応です。
- プログラムからは `addFiles(files)`、`removeFile(file)`、`clear()`、`files`（追加済みの `File`）を使えます。

## API

::api jimble-file-input
