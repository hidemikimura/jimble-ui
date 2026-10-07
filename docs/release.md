# リリース手順

リリースは **release-please** が自動化しています。人が行うのは「リリース PR をマージする」ことと、初回の準備だけです。

## 初回の準備（一度だけ）

以下は、リポジトリの持ち主が npm / GitHub で設定します（トークンや権限に関わるため、自動化していません）。

### 1. GitHub

1. **Settings → Actions → General → Workflow permissions**: 「Read and write permissions」を選び、「Allow GitHub Actions to create and approve pull requests」にチェックを入れる（release-please がリリース PR を作るため）。
2. **Settings → Pages → Build and deployment → Source**: 「GitHub Actions」を選ぶ（ドキュメントサイトのデプロイ用）。
3. （任意）main ブランチを保護し、`CI` を必須のチェックにする。

### 2. npm

パッケージ名は `@hidemikimura/jimble-ui`（スコープ付き）です。`@hidemikimura` のスコープを持つアカウントで作業します。

npm の Trusted Publishing（トークン不要の認証）は、**パッケージがすでに存在しないと設定できません**。そのため、次の順序で進めます。

1. **初回だけトークンで公開する。**
   1. npmjs.com の **Access Tokens → Generate New Token → Granular Access Token** で、トークンを作る。
      - **Packages and scopes**: まだパッケージが存在しないので、パッケージは選べない。**スコープ `@hidemikimura` を選び、Read and write** にする（スコープ単位の権限があれば、未公開の新しいパッケージも公開できる）。
      - **Expiration**: 短めにする（書き込みができるトークンの上限は 90 日）。
      - CI から公開するトークンは、**2FA を要求しない設定**が必要になることがある（画面の表示に従う）。
      - `@hidemikimura` は、自分のユーザー名のスコープであればそのまま使える。ユーザー名と違うスコープにする場合は、先に npm の Organization を作る。
   2. GitHub の **Settings → Secrets and variables → Actions** に `NPM_TOKEN` として登録する。
   3. `.github/workflows/release.yml` の `env: NODE_AUTH_TOKEN` のコメントを外す。
   4. 「通常のリリース」の手順で、最初のリリース（0.1.0）を公開する。
2. **Trusted Publishing に切り替える。**
   1. npmjs.com のパッケージの **Settings → Trusted publishing** で GitHub Actions を追加する: Organization or user = `hidemikimura`、Repository = `jimble-ui`、Workflow filename = `release.yml`。
   2. `release.yml` の `env: NODE_AUTH_TOKEN` を再びコメントアウトし、GitHub の `NPM_TOKEN` と npm のトークンを**削除**する。
   3. 以後は OIDC で認証して公開される（`--provenance` により、由来が npm のページに表示される）。

## 通常のリリース

1. 変更を main にマージする（Conventional Commits）。
2. release-please が **「chore(main): release x.y.z」というリリース PR** を作る（バージョンと CHANGELOG を更新）。マージするたびに更新される。
3. リリース前に、[docs/manual-checks.md](manual-checks.md) の手動確認を行う（スクリーンリーダー・IME・強制色モード）。結果はリリース PR のコメントに残す。
4. リリース PR をマージする → タグと GitHub Release が作られ、`publish` ジョブが走る。lint・型・テスト・ビルド・配布物の検査・スモークテストを通ってから、`npm publish --provenance` が実行される。
5. 公開後に、jsDelivr（`https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@x.y.z/dist/cdn/jimble-ui.js`）で読み込めること、ドキュメントサイトが更新されたことを確認する。

## バージョンの決まり方

| コミット | 1.0 より前 (0.x) | 1.0 以降 |
| --- | --- | --- |
| `fix:` / `perf:` | patch | patch |
| `feat:` | minor | minor |
| `feat!:` / `BREAKING CHANGE:` | **minor**（0.x は minor が互換性を壊してよい） | major |

初回のリリースは、`feat` を含むので **0.1.0** になります。1.0.0 にするのは、P1 の API が固まり、実際の利用のフィードバックを受けてからです（設計書 Q8）。

## 手元での確認

公開せずに配布物を確認できます。

```sh
npm run build
npm run check-dist      # サイズ予算・同梱ファイル・生の色や @property の混入
npm run check-package   # publint + are-the-types-wrong
npm run pack-smoke      # npm pack したものを空のプロジェクトに入れて、ビルド・型・実ブラウザで確認
npm pack --dry-run      # 含まれるファイルの一覧
```

## 困ったとき

- **リリース PR が作られない**: コミットが Conventional Commits か、`feat` / `fix` などを含むか確認する。`docs` / `chore` だけでは作られない。
- **publish ジョブが 403 になる**: 初回は、`NPM_TOKEN` にスコープ `@hidemikimura` の Read and write があるか、2FA の設定でトークンが弾かれていないかを確認する。Trusted Publishing に切り替えたあとは、Workflow filename が `release.yml` と一致しているかを確認する。
- **publish ジョブだけが止まった・失敗した**: 実行画面の「Re-run」で再実行すると、release-please が「リリースは作成済み」と判断して、**publish が飛ばされます**（npm に公開されないまま「成功」になる）。代わりに、Actions の **Release → Run workflow** で、公開するタグ（例: `v0.4.0`）を指定して手動実行する。そのタグのソースで、検証と `npm publish` が走る。npm にまだ無いバージョンだけ公開できる。
- **公開を取り消したい**: 公開から 72 時間以内なら `npm unpublish @hidemikimura/jimble-ui@x.y.z` できる。それ以降は `npm deprecate` を使う。
