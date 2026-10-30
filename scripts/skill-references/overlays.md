# オーバーレイ・通知

ダイアログ・ドロワー・ツールチップ・メニュー・通知の使い方。

- **ダイアログ**: `heading` 属性（または `title` スロット / `aria-label`）が必要。開閉は `el.show()` / `el.hide()` / `open` 属性。中の要素に `data-dialog-close` を付けると、JavaScript なしで閉じる。確認など応答が必須のものは `alert`（背景クリックで閉じない）にして、安全な側のボタンに `autofocus`。閉じる前に `jimble-close-request`（`preventDefault()` で止められる）。
- **ドロワー**（`jimble-drawer`。サイドモーダル・スライドパネル・ボトムシート）: 画面の端から出るモーダル。API と挙動は `jimble-dialog` と同じ（`heading`・`show()` / `hide()`・`data-dialog-close`・`jimble-close-request`）。位置は `placement`（`end` 右・既定 / `start` 左 / `top` / `bottom`）、幅は `size`。確認など短い操作は dialog、詳細・絞り込み・編集は drawer。開いている間は背面が操作できない（非モーダルは未対応）。
- **ツールチップ**（`jimble-tooltip`）: `<jimble-tooltip text="説明" placement="top|bottom|left|right" multiline>` で**フォーカスできる要素（ネイティブの `button`・`a`、または `jimble-button`）を 1 つ**囲む（入力欄などほかの `jimble-*` は不可）。ホバーとフォーカスで出て、Esc で消える。補足だけを入れる（重要な情報・操作は入れない）。アイコンだけのボタンの名前は `aria-label`（ツールチップではない）。入力欄の説明は `jimble-field` の `hint`。
- **メニュー**: トリガーは `slot="trigger"`。項目は `jimble-menu-item`（`value`）。選ばれたら `jimble-select`（`e.detail.value`）。**サブメニュー**は、項目の中に `slot="submenu"` の `jimble-menu-item` を入れる（入れ子も可）。サブメニューの項目を選んでも、`jimble-dropdown-menu` から `jimble-select` が出る。開く側の項目には `value` を付けない。
- **通知**: `JimbleUI.toast('...')` / `JimbleUI.toast.success('...')`（CDN）または `import { toast } from '@hidemikimura/jimble-ui/toast'`。`toast({ message, variant, heading, duration, action })`。danger と `action` 付きは自動で消えない。要素を自分で置かない。ダイアログの中で出しても操作・読み上げできる。重要な情報は通知だけに頼らず `jimble-alert` などで画面内にも出す。

### 確認ダイアログ（破壊的な操作）

{{example:dialog/alert}}

### ドロワー（絞り込みフォーム）

{{example:drawer/form}}

### メニュー

{{example:dropdown-menu/basic}}

### 通知（種別・見出し・操作・表示時間）

{{example:toast/options}}
