# ルーター（SPA）

`jimble-router` の使い方。

`<jimble-router>` に `routes` を渡す（JS のプロパティ。1 ドキュメントに 1 つ）。ページ用の基底クラスは要らない。

```js
router.routes = [
  { path: '/', render: () => html`<page-home></page-home>` },
  {
    path: '/users/:id',
    name: 'user',
    title: ({ params }) => `ユーザー ${params.id}`,
    load: ({ params, signal }) => fetchUser(params.id, signal), // 任意。終わるまで画面は切り替わらない
    render: ({ data, query }, user) => html`<page-user .user=${user}></page-user>`,
  },
]
router.fallback = { render: () => html`<page-not-found></page-not-found>` } // 404
router.navigate('/users/1', { data: { flash: '保存しました' }, state: { tab: 'a' } })
router.setQuery({ page: 2 }) // URL の検索文字列だけ差し替える(再描画しない。既定は履歴を増やさない replace)
```

- ページの部品を動的 `import()` するのは、**`load` の中**(`await import('./pages/page-user.js')`)。終わるまで画面が切り替わらないので、`render` の時点で要素は定義済み。デプロイで古くなった画面で取得に失敗したときは、自動で通常のページ遷移に切り替えて復旧する(`no-chunk-reload` で止められる)。
- `html` は、npm なら `@hidemikimura/jimble-ui/router`、CDN なら `JimbleUI.html`。
- リンクの `<a href>` は、そのまま SPA の遷移になる(除外は `data-router-ignore`)。
- `data` は遷移先に **1 回だけ**渡る値(戻る・進む・リロードでは `undefined`)。`state` は履歴に保存され、戻る・進むで復元される。
- スクロール位置は、戻る・進む・リロードで復元される。内側の要素がスクロールするレイアウトは `scroll-container="#main"`。
- **`title` を必ず付ける**(遷移のたびに読み上げる)。サーバーは、どのパスでも同じ HTML を返す必要がある。離脱前の確認・ルートのネストは未対応。
