---
title: App Shell
order: 15
description: 管理画面の枠組み（ヘッダー・サイドバー・本文）
---

`<jimble-app-shell>` は、管理画面の枠組みです。上に固定されるヘッダー、左のサイドバー、本文の 3 つの領域を持ちます。

- **広い画面**（48rem 以上）では、サイドバーを常に表示します。
- **狭い画面**では、サイドバーを閉じ、ヘッダーのボタンで**モーダルのドロワー**（ネイティブの `<dialog>`）として開きます。

サイドバーは `slot="sidebar"`、ヘッダーは `slot="header"`、本文は既定スロットです。下の例は iframe の中で表示しています。「別のタブで開く」から、ブラウザの幅を変えて確認できます。

## 使い方

::example app-shell/basic

::example app-shell/admin-page

::example app-shell/collapsible

::example app-shell/theme

## サイドバーを細くする（`sidebar-collapsible`）

`sidebar-collapsible` を付けると、ヘッダーの左にボタンが出て、サイドバーを**アイコンだけの細い表示**（4rem）と**項目名つきの広い表示**（16rem）に切り替えられます（広い画面のみ。狭い画面のドロワーは、いつも項目名つきです）。

- 細い表示でも、**マウスを重ねる、またはキーボードでフォーカスすると、本文に重なるように広がり**、項目名と子項目（`jimble-nav-group`）が使えます。本文の位置は動きません。離れる（フォーカスが外れる）と細い表示に戻ります。
- タッチでは、重ねても広がりません（タップでそのまま開きます）。広げるときはボタンを使います。
- 項目に `slot="icon"` のアイコンを付けてください。アイコンのない項目は、細い表示では頭文字が出ます。
- 現在の状態は `sidebar-collapsed` 属性（`sidebarCollapsed`）です。初期値にも使えます。切り替わると `jimble-sidebar-toggle`（`detail.collapsed`）が出るので、状態を覚えておきたいときは `localStorage` などに保存して、次の表示で `sidebar-collapsed` に渡します。

```js
shell.addEventListener('jimble-sidebar-toggle', (e) =>
  localStorage.setItem('sidebar-collapsed', String(e.detail.collapsed)),
)
```

細い表示の幅は `--jimble-app-shell-sidebar-collapsed-width` で、広がったときの幅は `--jimble-app-shell-sidebar-width` で変えます。

## アクセシビリティ

- ヘッダーは `banner`、本文は `main` のランドマークです。サイドバーの `jimble-sidebar-nav` は `nav` ランドマークになります。
- 先頭に、フォーカスすると現れる「本文へ移動」のスキップリンクがあります。
- **固定ヘッダーがフォーカスを隠しません**（WCAG 2.4.11）。キーボードでフォーカスした要素がヘッダーの下に隠れる場合は、自動でスクロールを補正します。
- 切り替えボタンは、名前が固定（「サイドバーの幅を切り替え」）で、状態は `aria-expanded` で伝わります。細い表示でも、項目名は読み上げに残ります（画面から隠すだけです）。
- ドロワーは Esc・背景クリック・閉じるボタン・サイドバーのリンクのクリックで閉じ、フォーカスは開いたボタンに戻ります。ドロワーが開いている間、背面は操作できません。
- ドロワーを開いている間に `toast()` を出しても、通知はドロワーの中に表示されます（[オーバーレイの仕組み](../../guide/overlays/) を参照）。

## テーマ（色・アイコンの大きさ）

ヘッダーとサイドバーの色は、CSS 変数で変えられます。`jimble-app-shell` に指定するか、`:root` に書くと、アプリ全体に効きます。**既定は、他の部品と同じ意味トークン**（背景は `--jimble-color-surface` など）なので、指定しなければ今までと同じ見た目です。

```css
jimble-app-shell {
  --jimble-app-shell-header-bg: #0f172a;
  --jimble-app-shell-header-text: #f8fafc;
  --jimble-app-shell-sidebar-bg: #0f172a;
  --jimble-sidebar-nav-text: #cbd5e1;
  --jimble-sidebar-nav-current-bg: #4338ca;
  --jimble-sidebar-nav-current-text: #ffffff;
  --jimble-sidebar-nav-icon-size: 1.5rem;
}
```

- ヘッダーの背景（`--jimble-app-shell-header-bg`）と文字色（`--jimble-app-shell-header-text`）。ヘッダーの中のボタン（メニュー・幅の切り替え）は、この文字色を引き継ぎます。ボタンにマウスを重ねたときの背景は `--jimble-app-shell-header-hover-bg` です。
- サイドバーの背景は `--jimble-app-shell-sidebar-bg`（狭い画面のドロワー、細い表示で広がった面も同じ）。項目の文字・アイコン・現在のページの色、アイコンの大きさは、[Sidebar Nav](../sidebar-nav/) の変数です。
- **背景を暗くするときは、文字・アイコン・ホバー・現在のページの色も一緒に変えてください。** 文字は 4.5:1、アイコンと縁は 3:1 以上のコントラストが目安です。フォーカスの輪郭も、背景に見える色にします（`--jimble-sidebar-nav-ring-focus`）。

## カスタマイズ

| CSS 変数                                     | 既定値                        | 説明                                           |
| -------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| `--jimble-app-shell-header-height`           | `3.5rem`                      | ヘッダーの高さ                                 |
| `--jimble-app-shell-sidebar-width`           | `16rem`                       | サイドバーの幅（細い表示で広がったときも同じ） |
| `--jimble-app-shell-sidebar-collapsed-width` | `4rem`                        | 細い表示のサイドバーの幅                       |
| `--jimble-app-shell-main-padding`            | `1rem`（広い画面は `1.5rem`） | 本文の余白                                     |

## API

::api jimble-app-shell
