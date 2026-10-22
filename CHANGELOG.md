# Changelog

## [0.11.0](https://github.com/hidemikimura/jimble-ui/compare/v0.10.0...v0.11.0) (2026-10-22)


### 追加

* **theme:** 小さなボタンの hover の色を変えられ、カレンダーの月の選択の重なりを直す ([7dace0f](https://github.com/hidemikimura/jimble-ui/commit/7dace0f1ce98459acbf09055e91e91295f527752))

## [0.10.0](https://github.com/hidemikimura/jimble-ui/compare/v0.9.0...v0.10.0) (2026-10-22)


### 追加

* **theme:** 項目の hover の色とページネーションの影を、CSS 変数で変えられるようにする ([1e9082f](https://github.com/hidemikimura/jimble-ui/commit/1e9082f0c9c13947a067e092cdb1e2eabce8904d))

## [0.9.0](https://github.com/hidemikimura/jimble-ui/compare/v0.8.4...v0.9.0) (2026-10-21)


### 追加

* **theme:** ボタンの hover の色を種類ごとに変えられ、暗幕の濃さと表の行の hover も変えられる ([db61734](https://github.com/hidemikimura/jimble-ui/commit/db61734628de857d271613cf9ef47dd97ef3cdfc))


### 修正

* **site:** テーマのページで、長い CSS 変数の名前が、狭い画面で表を横にはみ出させるのを直す ([1b3fe5b](https://github.com/hidemikimura/jimble-ui/commit/1b3fe5b9413912d9d01ccd8c2db0e712bed2c7f2))

## [0.8.4](https://github.com/hidemikimura/jimble-ui/compare/v0.8.3...v0.8.4) (2026-10-21)


### ドキュメント

* **skill:** 部品ごとの注意書きを references に分け、SKILL.md を短くする ([9eff47e](https://github.com/hidemikimura/jimble-ui/commit/9eff47ea0647e36db39fb33b2c65d0a62dde1076))

## [0.8.3](https://github.com/hidemikimura/jimble-ui/compare/v0.8.2...v0.8.3) (2026-10-21)


### 修正

* **components:** オーバーレイ系の部品固有の角丸の変数が、効かなかったのを直す ([e3756ee](https://github.com/hidemikimura/jimble-ui/commit/e3756eef17e6e2811cce41bdfabb8ab2fd11e8be))

## [0.8.2](https://github.com/hidemikimura/jimble-ui/compare/v0.8.1...v0.8.2) (2026-10-15)


### 修正

* **components:** 存在しない CSS 変数が、部品の一覧に載っていたのを直す ([bb4f05c](https://github.com/hidemikimura/jimble-ui/commit/bb4f05c75d302333e1d6b1a469f0532b8550269a))

## [0.8.1](https://github.com/hidemikimura/jimble-ui/compare/v0.8.0...v0.8.1) (2026-10-15)


### 修正

* **breadcrumb:** 区切りのない最初の項目と、文字の縦位置が揃わないのを直す ([0d0f3e9](https://github.com/hidemikimura/jimble-ui/commit/0d0f3e995981bc7eac79b14ab90ba6a2b71e537a))

## [0.8.0](https://github.com/hidemikimura/jimble-ui/compare/v0.7.2...v0.8.0) (2026-10-15)


### 追加

* **theme:** テーマで設定できる項目を増やす ([2db54f2](https://github.com/hidemikimura/jimble-ui/commit/2db54f2614d9b23ae0b0a7e5c458e7461eea9abb))


### 修正

* **dual-listbox:** すべて追加・すべて削除のボタンの名前に、見える文字を含める ([3fe3f7d](https://github.com/hidemikimura/jimble-ui/commit/3fe3f7d48cd88c40026fca5e283df7e4edf9ce82))
* **theme:** 効いていなかった太さと色のクラスを直し、細いサイドバーのアイコンを出す ([a4171c1](https://github.com/hidemikimura/jimble-ui/commit/a4171c1addad7d82dace868ff60043134cbc30e8))


### ドキュメント

* **theme-lab:** 新しいテーマの項目を、theme.css と調整パネルに載せる ([df7f56f](https://github.com/hidemikimura/jimble-ui/commit/df7f56fa334750ecb518b49df813939c0510567d))

## [0.7.2](https://github.com/hidemikimura/jimble-ui/compare/v0.7.1...v0.7.2) (2026-10-10)


### 修正

* **app-shell:** ドロワーや select の一覧を開いたとき、ページが動くのを直す ([2675138](https://github.com/hidemikimura/jimble-ui/commit/2675138dcc85169af1bbd3f8c62cea6ec6215533))

## [0.7.1](https://github.com/hidemikimura/jimble-ui/compare/v0.7.0...v0.7.1) (2026-10-10)


### 修正

* **app-shell:** 本文をクリックしたとき、画面の先頭へ戻るのを直す ([008b2b8](https://github.com/hidemikimura/jimble-ui/commit/008b2b8fc49a4b78fde5d371e77155605b709583))

## [0.7.0](https://github.com/hidemikimura/jimble-ui/compare/v0.6.2...v0.7.0) (2026-10-08)


### ⚠ BREAKING CHANGES

* **events:** jimble-open や jimble-close などのイベントは、バブルしなくなった。 親や document で受けているコードは、届かなくなる。リスナーは部品自身に付けるか、 キャプチャ段階で受ける。

### 追加

* **events:** jimble-* のイベントを、既定でバブルさせない ([0cb32e8](https://github.com/hidemikimura/jimble-ui/commit/0cb32e899fed4f415e8f033f510b820456bf955e))

## [0.6.2](https://github.com/hidemikimura/jimble-ui/compare/v0.6.1...v0.6.2) (2026-10-08)


### 修正

* **app-shell:** 部品の内側でフォーカスしたとき、画面が大きく跳ぶのを直す ([303b552](https://github.com/hidemikimura/jimble-ui/commit/303b55220809000d206ed9b55dc27ab5446ca615))

## [0.6.1](https://github.com/hidemikimura/jimble-ui/compare/v0.6.0...v0.6.1) (2026-10-08)


### ドキュメント

* **theme-lab:** jimble-ui の依存を 0.6.0 に上げる ([bc796ba](https://github.com/hidemikimura/jimble-ui/commit/bc796ba1089ad704e20aed95d99b6fc2feb71a6a))

## [0.6.0](https://github.com/hidemikimura/jimble-ui/compare/v0.5.0...v0.6.0) (2026-10-08)


### 追加

* **app-shell:** ヘッダーとサイドバーの色・アイコンの大きさを、CSS 変数で変えられるようにする ([0d5afd5](https://github.com/hidemikimura/jimble-ui/commit/0d5afd5a81868897b1e0463746606f0704c56af0))


### 修正

* **app-shell:** ヘッダーとサイドバーの重なり順が効いていなかったのを直す ([2bbde91](https://github.com/hidemikimura/jimble-ui/commit/2bbde911d7b8a09a243bc981b3c32d0dc1cefeb9))


### ドキュメント

* **theme-lab:** 全部品とヘッダー・サイドバーの色を試せるようにする ([ea2ae0e](https://github.com/hidemikimura/jimble-ui/commit/ea2ae0e75ec6f8799f5175da092a71f5ea4384b6))

## [0.5.0](https://github.com/hidemikimura/jimble-ui/compare/v0.4.1...v0.5.0) (2026-10-08)


### 追加

* **app-shell:** サイドバーを、細い表示と広い表示に切り替えられるようにする ([76b33b8](https://github.com/hidemikimura/jimble-ui/commit/76b33b86972ce57916aad00425654e17c213f673))

## [0.4.1](https://github.com/hidemikimura/jimble-ui/compare/v0.4.0...v0.4.1) (2026-10-07)


### 修正

* **app-shell:** サイドバーの高さを、画面の高さに揃える ([12c69c3](https://github.com/hidemikimura/jimble-ui/commit/12c69c34b4d44dbb2626ab8a5a217d60f37a5087))

## [0.4.0](https://github.com/hidemikimura/jimble-ui/compare/v0.3.2...v0.4.0) (2026-10-07)


### 追加

* **kanban:** カンバンボード jimble-kanban を追加する ([d2f06f2](https://github.com/hidemikimura/jimble-ui/commit/d2f06f272c9a5271922a28eac336486dd3f0459f))

## [0.3.2](https://github.com/hidemikimura/jimble-ui/compare/v0.3.1...v0.3.2) (2026-09-30)


### 修正

* **dual-listbox:** 行にマウスを重ねても、リストの左右の枠が消えないようにする ([2770268](https://github.com/hidemikimura/jimble-ui/commit/2770268ac2ce4f5f7dd7ee2da32a04c88b180526))

## [0.3.1](https://github.com/hidemikimura/jimble-ui/compare/v0.3.0...v0.3.1) (2026-09-30)


### 修正

* **router:** 更新の直後ではなく、次のマイクロタスクで描画する ([8e3c966](https://github.com/hidemikimura/jimble-ui/commit/8e3c9660e0ef76613ce3c4f707a760e9706f8d65))


### ドキュメント

* **theme-lab:** デザイナー向けのカラーテーマ調整サイトを追加する ([72d0984](https://github.com/hidemikimura/jimble-ui/commit/72d09841645ae26be1042c070c868b03c41934a7))

## [0.3.0](https://github.com/hidemikimura/jimble-ui/compare/v0.2.0...v0.3.0) (2026-09-29)


### 追加

* **date-input:** カレンダーの見出しで、月と年を直接選べるようにする ([c55ab56](https://github.com/hidemikimura/jimble-ui/commit/c55ab565f06088b8244f8ce631d866a414209083))
* **field:** validate を外から実行する showErrors / hideErrors と、値の変更での自動再検証 ([a915185](https://github.com/hidemikimura/jimble-ui/commit/a9151852a1c696baa0d678ff0bab23556d89f054))
* **router:** jimble-router を追加(Navigation API を使う SPA 用ルーター) ([e67e327](https://github.com/hidemikimura/jimble-ui/commit/e67e327fa15af6d7802dc6922a3cf5b76a391a8c))
* 左右分割の選択 jimble-dual-listbox と、フィールド単位の検証 jimble-field の validate ([23950c2](https://github.com/hidemikimura/jimble-ui/commit/23950c238454ed9b6ea6374e7f74b30a7901cc7f))


### 修正

* **a11y:** 強制色モードで、スイッチ・ラジオ・タブの選択状態とスライダーが見えるようにする ([955429b](https://github.com/hidemikimura/jimble-ui/commit/955429bda58ed808f20004a1ae514a4e40ab5cd2))
* **components:** ツールチップの余白、combobox の search-group、date-input の picker-only ([e93f269](https://github.com/hidemikimura/jimble-ui/commit/e93f2695e94a43fc8c6d882fc5891eef16ec633b))


### ドキュメント

* バージョンを固定する例を [@0](https://github.com/0).3 に更新 ([10ea5cd](https://github.com/hidemikimura/jimble-ui/commit/10ea5cd17d8f906cd93ad50337c366b52a6cee4a))

## [0.2.0](https://github.com/hidemikimura/jimble-ui/compare/v0.1.0...v0.2.0) (2026-09-29)


### 追加

* **combobox:** 取得・複数選択・追加・上限・並べ替え・グループに対応 ([c59a0e1](https://github.com/hidemikimura/jimble-ui/commit/c59a0e1b876cdb473b6e29ff2be5e37d955df9d8))
* **date-input:** 日時(time)・期間(range)・複数の月(months)に対応 ([ce272b4](https://github.com/hidemikimura/jimble-ui/commit/ce272b49f8c1ed02e568236ddb959d811893b7ad))
* **drawer:** 画面の端から出るサイドモーダル jimble-drawer を追加 ([5b4b6f3](https://github.com/hidemikimura/jimble-ui/commit/5b4b6f37e25c99f1f5774943d296c525fd3c43af))
* **file-input:** ドロップエリアつきのファイル添付 jimble-file-input を追加 ([4ee7f1f](https://github.com/hidemikimura/jimble-ui/commit/4ee7f1f2e18f3ae0e756d3c0a0f1dfcd307dc97c))
* **icon:** 名前で選べる公開アイコン jimble-icon を追加 ([93267af](https://github.com/hidemikimura/jimble-ui/commit/93267af4a8f06a7832ebc7618516d681068f8e25))
* **spinner:** 読み込み中を示す jimble-spinner を追加 ([4fb43f7](https://github.com/hidemikimura/jimble-ui/commit/4fb43f70f82c4a1d9642012e8db6e9c0e699cbff))
* **tooltip:** ホバー・フォーカスで補足を出す jimble-tooltip を追加 ([eb9d4f3](https://github.com/hidemikimura/jimble-ui/commit/eb9d4f3e812556bccee44411cd487e5790d29606))
* 日付入力・色選択・コンボボックスと AI 向け skill を追加 ([c9c0a88](https://github.com/hidemikimura/jimble-ui/commit/c9c0a8870e8b5dd2b36c5010fee39296d0eadeff))


### 修正

* **drawer:** 幅を dvw ではなく % で決め、位置の検査では動きを止める ([960918c](https://github.com/hidemikimura/jimble-ui/commit/960918c002c6abd4b0d2a8d10c52cd546ba9260c))
* **scroll-lock:** scrollbar-gutter をやめ、消えたスクロールバーの幅を余白で補う ([bcc3e59](https://github.com/hidemikimura/jimble-ui/commit/bcc3e5941aa51d0460c32fd1f363f99b1cc5a381))
* **styles:** 自動入力で入力欄の一部だけが青くなるのを直す ([15bb5ff](https://github.com/hidemikimura/jimble-ui/commit/15bb5ff7ee80bc300db6455ea79efbd9af458188))


### ドキュメント

* **field:** label・hint・error が Field の属性であることを各入力部品のページに明記 ([54d36e6](https://github.com/hidemikimura/jimble-ui/commit/54d36e6674d0dc409037b19e626d872d8dc161ee))
* バージョンを固定する例を [@0](https://github.com/0).2 に更新 ([23c4005](https://github.com/hidemikimura/jimble-ui/commit/23c4005b8ac0cad245860a36a178742f96a05c7c))

## 0.1.0 (2026-09-29)


### 追加

* **forms:** フォーム部品(input/textarea/checkbox/switch/radio-group/field)を追加 ([3c87e19](https://github.com/hidemikimura/jimble-ui/commit/3c87e192a916c42c29ba484531d1ce41fc0b48be))
* **layout:** app-shell/sidebar-nav/page-header/tabs/breadcrumb/pagination/table を追加 ([e840f8b](https://github.com/hidemikimura/jimble-ui/commit/e840f8b25f21c2a68264e5013981568b43f5c98f))
* **overlay:** dialog/dropdown-menu/select/toast を追加 ([1ca2aca](https://github.com/hidemikimura/jimble-ui/commit/1ca2aca17954d83f675d13d057b7ee75c7c24f20))


### ドキュメント

* **release:** 未公開パッケージ向けにトークンの作り方を明確化 ([de56d11](https://github.com/hidemikimura/jimble-ui/commit/de56d1156817f9f77156b751d65b5da57fe4cd3c))

## Changelog

変更履歴は [release-please](https://github.com/googleapis/release-please) がコミットメッセージ（Conventional Commits）から自動で書きます。
