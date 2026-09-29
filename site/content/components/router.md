---
title: Router
order: 32
description: シングルページアプリのルーター（Navigation API）
---

`<jimble-router>` は、シングルページアプリのルーターです。URL に合わせて、ページの中身をこの要素の中に表示します。ブラウザの [Navigation API](https://developer.mozilla.org/docs/Web/API/Navigation_API) を使うので、リンクのクリック・戻る・進む・リロードが、そのまま扱えます。ページ用の基底クラスは要りません。

## 使い方

::example router/basic

```html
<jimble-router id="app"></jimble-router>
<script type="module">
  import { html } from '@hidemikimura/jimble-ui/router' // CDN では JimbleUI.html
  const app = document.getElementById('app')
  app.routes = [
    { path: '/', render: () => html`<page-home></page-home>` },
    {
      path: '/users/:id',
      name: 'user',
      title: ({ params }) => `ユーザー ${params.id}`,
      load: ({ params, signal }) =>
        fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json()),
      render: ({ data }, user) => html`<page-user .user=${user} .flash=${data?.flash}></page-user>`,
    },
  ]
  app.fallback = { render: () => html`<page-not-found></page-not-found>` }
</script>
```

## ルートの定義

| 項目                  | 内容                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`                | パスのパターン（`/users/:id`。[URLPattern](https://developer.mozilla.org/docs/Web/API/URL_Pattern_API) の書き方）。大文字小文字を区別せず、末尾の `/` は付いていても付いていなくてもよい。先に書いたものが優先される |
| `name`                | `url()`・`navigateTo()` で使う名前                                                                                                                                                                                   |
| `render(ctx, loaded)` | ページの中身を返す。Lit のテンプレート（`html\`...\``）か、DOM の要素。遷移のたびに、要素は作り直される                                                                                                              |
| `load(ctx)`           | ページを表示する**前**にデータを取得する。終わるまで画面は切り替わらず、`busy` 属性が付く。結果が `render` の第 2 引数                                                                                               |
| `title`               | `document.title`（文字列、または関数）                                                                                                                                                                               |
| `redirect`            | リダイレクト先（文字列、または `(ctx) => URL`）。`data` は引き継がれる                                                                                                                                               |

`ctx` には、`params`（パスの値）、`query`（`URLSearchParams`）、`url`、`data`、`state`、`navigationType`、`signal`（別の遷移に置き換わると abort される。`fetch` に渡す）、`wait(promise)` があります。どのルートにもマッチしないときは、`fallback`（404 のページ）を表示します。`fallback` がなければ、ブラウザの通常の遷移に任せます。`load` や `render` が失敗したときは、`errorPage(ctx, error)` を指定するとそのページを表示します。指定しなければ、`jimble-route-error` を出して、遷移を失敗させます。

## ページの部品を動的に読み込む（`load`）

ページの部品を動的 `import()` で読み込む（コード分割）ときは、**`load` の中**で行います。`load` が終わるまで画面は切り替わらないので、`render` の時点では、その要素はもう定義済みです（定義前の空の要素が一瞬見えることも、スクロール位置の復元が早すぎることもありません）。`render` は同期なので、`render` の中では `await import()` できません。

```js
{
  path: '/users/:id',
  load: async ({ params, signal }) => {
    // 部品の読み込みと、データの取得を並行して待つ
    const [, user] = await Promise.all([
      import('./pages/page-user.js'),                 // カスタム要素を定義するモジュール
      fetch(`/api/users/${params.id}`, { signal }).then((r) => r.json()),
    ])
    return user
  },
  render: (ctx, user) => html`<page-user .user=${user}></page-user>`,
}
```

**デプロイで古くなった画面の自動復旧**: ビルドのたびにファイル名が変わるバンドラー（Vite など）では、デプロイのあとに古い画面を開いたままだと、部品の取得が失敗します（「Failed to fetch dynamically imported module」など。ブラウザごとに文言が違います）。`jimble-router` は、この失敗を検知して、**通常のページ遷移に切り替え**て、新しい画面を読み込み直します。

- 同じ URL で 10 秒以内に続けて失敗したときは、繰り返さず、通常のエラー（`errorPage` または `jimble-route-error`）として扱います（本当にファイルが無いときに、無限に読み込み直さないため）。
- `jimble-route-error` の `preventDefault()` で、その場の復旧を止められます。`no-chunk-reload` 属性で、常に止められます。
- ネットワークの不通など、動的 import の失敗ではないエラーでは、復旧しません。

## 遷移と値の受け渡し

```js
app.navigate('/users/1', { data: { flash: '保存しました' }, state: { tab: 'profile' } })
app.navigateTo('user', { id: 1 }, { query: { tab: 'profile' }, data: { flash: '…' } })
app.back('/users') // 戻る履歴がなければ '/users' へ
```

| 渡し方  | 中身                                                                 | 戻る・進む・リロード    |
| ------- | -------------------------------------------------------------------- | ----------------------- |
| `data`  | 遷移先に **1 回だけ**渡る `{ key: value }`（履歴には残らない）       | 渡らない（`undefined`） |
| `state` | 履歴に**保存**される `{ key: value }`（structured clone できるもの） | 復元される              |

- リンク（`<a href>`）は、同じオリジンなら、そのまま SPA の遷移になります。`target` 付き、`download`、新しいタブ、修飾キーつきのクリックは、ブラウザ任せです。除外したいリンクには `data-router-ignore` を付けます。
- `data` が必要なリンクは、`click` を受けて `navigate(href, { data })` を呼びます（上の例）。
- `router.setEntryState({...})` で、いまのエントリの `state` を書き換えられます（遷移も再描画もしません）。
- `router.current` で、いま表示中のルート・`params`・`url`・`data`・`state` を取れます。

## URL の検索文字列だけを差し替える（`setQuery`）

```js
app.setQuery({ page: 2, q: 'abc' }) // 履歴は replace。ページは再描画されない
app.setQuery({ page: 3 }, { history: 'push' }) // 履歴に残す（ページ送りなど）
app.setQuery({ q: null }) // null・undefined・空文字は、そのキーを消す
app.setQuery({ only: 1 }, { merge: false }) // ほかのキーも消す
```

**ページは再描画されません**（ページングや検索条件の変更で、入力中の内容を失わないため）。一覧などの更新は、ページの側で行います。変更は `jimble-route-change`（`detail.queryOnly = true`、`detail.query`）で分かるので、それを受けて描き直してください（上の例の一覧）。`router.current.url.searchParams` で、いまの値も読めます。入力のたびに呼ぶときは、履歴が増えない `replace`（既定）にしてください。

## スクロール位置の復元

- **戻る・進む・リロードで、スクロール位置が復元されます**（ページの中身が入ったあと）。新しい遷移は、先頭に戻します。
- 復元をページの内容の確定後にするため、`load` の完了を待ってから画面を切り替えます。ページの中で、自前にデータを取得するときは、`ctx.wait(promise)` に渡すと、完了を待ちます。
- **スクロールが window ではなく、内側の要素で起きるレイアウト**では、`scroll-container` にその要素のセレクターを指定します（`<jimble-router scroll-container="#main">`）。位置は、履歴のエントリごとに保存されます。[App Shell](../app-shell/) は、本文が window でスクロールするので、指定は要りません。
- ダイアログの表示状態などの復元はしません。

## アクセシビリティ

- 遷移のたびに、ページのタイトルを読み上げ（`role="status"`）、フォーカスを**ページの先頭**へ移します（ページの中の `autofocus` があれば、そちら）。SPA では、ブラウザがページの切り替わりを知らせないためです。**`title` を必ず指定してください。**
- 最初の表示・`setQuery` では、フォーカスも読み上げも動かしません。
- ページには、見出し（`h1`）を 1 つ置いてください。

## 注意

- **1 つのドキュメントに、1 つだけ**置けます（Navigation API がドキュメントに 1 つだけのため）。
- Navigation API があるブラウザ（Chrome / Edge / Firefox / Safari の最新）で動きます。ない場合は、現在の URL のページを表示するだけで、リンクは通常のページ遷移になります（`data`・`state` は渡らず、サーバーが、すべてのパスでアプリを返す必要があります）。
- 直接 URL を開く・リロードのために、**サーバーは、ルートのパスでも、同じ HTML を返す**必要があります（一般的な SPA と同じです）。
- 未対応: 離脱前の確認（未保存の警告）、ルートのネスト（`children`）。

## キーボード・API

::api jimble-router
