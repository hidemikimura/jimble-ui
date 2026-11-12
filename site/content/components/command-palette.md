---
title: Command Palette
order: 43
description: ページや操作を名前で探して実行する、モーダルの検索窓
---

`<jimble-command-palette>` は、管理画面のどこからでも、ページ（「注文の一覧」）や操作（「顧客を登録」）を名前で探して実行する検索窓です。開いている間は、背面を操作できません（モーダル）。

**全部入りには含まれません。** 別に読み込みます。

```html
<!-- CDN: 全部入りに加えて -->
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hidemikimura/jimble-ui@0/dist/cdn/command-palette.js"
></script>
```

```ts
// npm
import '@hidemikimura/jimble-ui/command-palette'
```

- コマンドは子の `<jimble-command>` で書きます（名前は中身の文字。`value`・`group`・`keywords`（読み）・`icon`・`shortcut`（表示だけ）・`href`・`disabled`）。多い・動的なときは `commands` プロパティ（配列）で渡します。
- 絞り込みは、全角・半角、大文字・小文字、ひらがな・カタカナを区別しません。名前の先頭に一致するものが先に並びます。
- ↑↓ で選び、Enter で実行、Esc で閉じます。フォーカスは入力欄のままです。
- 選ぶと `jimble-select`（`detail.value`・`item`）が出て、閉じます。`href` があれば、閉じたあとそのページへ移動します（[Router](../router/) があれば、アプリの中の移動になります）。
- `hotkey="mod+k"` を付けると、Ctrl+K（macOS は ⌘K）で開閉します。**既定では付きません**（ブラウザや支援技術のキーとぶつからないよう、使う側が決めます）。入力欄の中では反応しません。
- サーバーで探すときは `load` プロパティを使います（[Combobox](../combobox/) の `load` と同じ形）。

## 使い方

::example command-palette/basic

::example command-palette/load

## Do / Don't

::dos command-palette

## API

::api jimble-command-palette

::api jimble-command
