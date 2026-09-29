---
title: Toast
order: 14
description: 一時的な通知
---

通知は `toast()` 関数で出します。要素を自分で置く必要はありません（最初の呼び出しで `<body>` に置き場が作られます）。

```js
import { toast } from '@hidemikimura/jimble-ui/toast'

toast('保存しました')
toast.success('保存しました')
toast({
  heading: '削除しました',
  message: '注文 #1024',
  variant: 'success',
  action: { label: '元に戻す', onClick: undo },
})
```

CDN から読み込んだ場合は、グローバルの `JimbleUI.toast` でも呼べます（`onclick="JimbleUI.toast('...')"`）。

## 使い方

::example toast/basic

::example toast/options

::example toast/in-dialog

## 表示時間と操作

- 既定では、info / success は 5 秒、warning は 8 秒で消えます。**danger は自動では消えません。**
- **操作（`action`）を付けた通知も自動では消えません**（押す前に消えないように）。`duration`（ミリ秒）で変えられ、`0` は消えません。
- マウスが乗っている間・フォーカスがある間は、時間が止まります。
- すべての通知に閉じるボタンが付きます（`dismissible: false` で外せます）。

## アクセシビリティ

- 置き場には、通知が来る前から `role="status"`（polite）と `role="alert"`（assertive）のライブリージョンがあります。info / success は polite、warning / danger は assertive で読み上げられます。種別名（「エラー」など）も読み上げられます。
- 通知は、開いているモーダルダイアログの**中**へ移動して表示されます。モーダルの外は inert になり、外にある通知は操作も読み上げもできなくなるためです。ダイアログを閉じると元の場所に戻ります。
- 自動で消える通知は、キーボードだけの人が読み終える前に消える可能性があります。重要な情報は通知だけに頼らず、画面内にも表示してください（`jimble-alert`）。

## 置く位置

置き場を HTML に書いておくと、位置を指定できます（`top-start` / `top` / `top-end` / `bottom-start` / `bottom` / `bottom-end`。既定は `bottom-end`）。

```html
<jimble-toast-region placement="top-end"></jimble-toast-region>
```

## API

### toast()

| 引数          | 型                                             | 説明                                         |
| ------------- | ---------------------------------------------- | -------------------------------------------- |
| `message`     | `string`                                       | 表示する文言（文字列だけを渡すこともできる） |
| `variant`     | `'info' \| 'success' \| 'warning' \| 'danger'` | 種別（既定 `info`）                          |
| `heading`     | `string`                                       | 見出し                                       |
| `duration`    | `number`                                       | 自動で消えるまでの時間(ms)。`0` は消えない   |
| `dismissible` | `boolean`                                      | 閉じるボタン（既定 `true`）                  |
| `action`      | `{ label: string, onClick?: () => void }`      | 操作ボタン。押すと `onClick` を呼んで閉じる  |

戻り値は `{ dismiss(), element }` です。

::api jimble-toast

### jimble-toast-region

::api jimble-toast-region
