# Changelog

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
