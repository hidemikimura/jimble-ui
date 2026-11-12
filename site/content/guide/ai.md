---
title: AI から使う
order: 8
description: Claude Code などの AI に jimble-ui を正しく使わせるための skill・CLI・資料
---

jimble-ui には、AI（Claude Code など）が jimble-ui を正しく使うための **skill** が同梱されています。属性の名前を推測して間違える、ラベルを付け忘れる、`<table>` を書いてしまう、といった間違えやすい点を、あらかじめ伝えられます。

## 案内を置く（`init`）

プロジェクトの直下で、次を実行します。

```bash
npx @hidemikimura/jimble-ui init
```

次の 2 つを置きます。何度実行しても同じ結果になるので、jimble-ui を更新したら、もう一度実行してください。

| 置くもの                    | 読むエージェント                         | 内容                                                                                                       |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.claude/skills/jimble-ui/` | Claude Code                              | パッケージの skill の写し。`jimble-` の部品で画面を書く・直すときに、自動で使われます                      |
| `AGENTS.md` の一部          | Codex・Cursor など、AGENTS.md を読むもの | skill の場所と、下の CLI の使い方。印（`jimble-ui:start` / `end`）の間だけを書き換え、ほかの内容は残します |

- `--link` を付けると、写さずに、`node_modules` の中へのシンボリックリンクにします。`npm update` で自動で最新になります（`node_modules` が無い環境では切れます）。プロジェクトに jimble-ui を入れてから使ってください。
- `--no-agents-md` を付けると、`AGENTS.md` に触れません。
- 写しはチームで共有できます（`.claude/skills/` と `AGENTS.md` をコミットする）。

手で置く場合は、パッケージの `skills/jimble-ui/` を `.claude/skills/` にコピーします。

```bash
mkdir -p .claude/skills
cp -r node_modules/@hidemikimura/jimble-ui/skills/jimble-ui .claude/skills/
```

## CLI で調べる

部品の属性・スロット・イベント・part・CSS 変数、説明、テーマ、[ページのテンプレート](../templates/)を、ターミナルから引けます。人も AI エージェントも、同じコマンドを使えます。インストールする前でも、`npx` で実行できます。

```bash
npx @hidemikimura/jimble-ui component button   # 1 つの部品の API（名前なしで一覧）
npx @hidemikimura/jimble-ui search 日付          # 部品・説明・テーマをまとめて探す
npx @hidemikimura/jimble-ui docs overlays       # 説明の本文（名前なしで一覧）
npx @hidemikimura/jimble-ui themes              # 既製のテーマと読み込み方
npx @hidemikimura/jimble-ui template list      # ページのテンプレート（そのまま開ける HTML。名前なしで一覧）
```

**`npx jimble-ui` と書かず、必ず `@hidemikimura/` を付けてください。** 付けないと、プロジェクトに入れる前は、同じ名前の別のパッケージが実行されるおそれがあります。

### 機械が読む形（`--json`）

`--json` を付けると、どのコマンドも決まった形の JSON を出します。エージェントやスクリプトから使うときは、こちらを読みます。

```json
{
  "apiVersion": 1,
  "type": "component.detail",
  "data": { "tag": "jimble-button", "...": "..." },
  "meta": { "version": "0.18.0" }
}
```

失敗したときは、終了コードが 1 になり、`code` と、打ち間違いなら近い名前の候補を出します。

```json
{
  "apiVersion": 1,
  "error": "jimble-buton という要素はありません",
  "code": "ERR_UNKNOWN_COMPONENT",
  "suggestions": [{ "name": "jimble-button", "reason": "似た名前" }]
}
```

**分岐には `code` を使ってください**（`error` の文言は、改善のために変わります）。`code` は、一度出したら意味を変えず、消しません。

| code                    | 意味                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `ERR_UNKNOWN`           | 分類されないエラー                                         |
| `ERR_UNKNOWN_COMMAND`   | コマンドの名前が分からない                                 |
| `ERR_INVALID_OPTION`    | 知らないオプション、または値の誤り                         |
| `ERR_MISSING_ARGUMENT`  | 必要な引数がない                                           |
| `ERR_UNKNOWN_COMPONENT` | その名前の部品がない                                       |
| `ERR_UNKNOWN_TOPIC`     | その名前の説明がない                                       |
| `ERR_DATA_NOT_FOUND`    | パッケージの資料が見つからない（インストールが壊れている） |
| `ERR_UNKNOWN_TEMPLATE`  | その名前のテンプレートがない                               |
| `ERR_UNKNOWN_THEME`     | その名前のテーマがない                                     |

## skill の内容

| 内容                 | 説明                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| コンポーネント早見   | 全要素の属性・候補値・スロット・イベントと、詳細ページへのリンク（`custom-elements.json` から自動で生成）                                                   |
| 共通の規約           | 属性・イベントの命名、真偽値の書き方、共通の属性                                                                                                            |
| 間違えやすい点       | ラベルの付け方、フォームの値と検証、表の組み立て、オーバーレイ（ダイアログ・メニュー・セレクト・通知）、ナビゲーション、カスタマイズの順序、言語の切り替え  |
| すぐ使える断片       | 検証つきのフォーム、確認ダイアログ、メニュー、セレクト、並べ替えできる表、通知、一覧ページの骨格。ドキュメントの例と同じもので、自動検査（axe）を通っている |
| やってはいけないこと | 内部のクラス名に依存する、存在しない属性を書く、など                                                                                                        |

skill 内のタグ・属性は、実装の API と食い違わないことを自動テストで確かめています。

## そのほかの AI・ツール向けの資料

| 資料                                                         | 場所                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| すべての属性・スロット・イベント・part・CSS 変数（機械可読） | `node_modules/@hidemikimura/jimble-ui/custom-elements.json`            |
| VS Code の HTML 補完データ                                   | `dist/vscode.html-data.json`（[はじめに](../getting-started/) を参照） |
| 型定義                                                       | パッケージに同梱（`HTMLElementTagNameMap` とイベントの型を含む）       |

## AI が書いたコードの確認

AI が書いたコードでも、**キーボードだけで操作して確かめてください**（Tab、矢印、Enter、Space、Esc）。入力欄とアイコンだけのボタンに名前が付いているかも確認します。ラベルの付け忘れは、配布物では警告が出ないため、実行しても気づけません。詳しくは [アクセシビリティ](../accessibility/) を参照してください。
