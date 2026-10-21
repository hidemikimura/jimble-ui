<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# オーバーレイ・通知

ダイアログ・ドロワー・ツールチップ・メニュー・通知の使い方。

- **ダイアログ**: `heading` 属性（または `title` スロット / `aria-label`）が必要。開閉は `el.show()` / `el.hide()` / `open` 属性。中の要素に `data-dialog-close` を付けると、JavaScript なしで閉じる。確認など応答が必須のものは `alert`（背景クリックで閉じない）にして、安全な側のボタンに `autofocus`。閉じる前に `jimble-close-request`（`preventDefault()` で止められる）。
- **ドロワー**（`jimble-drawer`。サイドモーダル・スライドパネル・ボトムシート）: 画面の端から出るモーダル。API と挙動は `jimble-dialog` と同じ（`heading`・`show()` / `hide()`・`data-dialog-close`・`jimble-close-request`）。位置は `placement`（`end` 右・既定 / `start` 左 / `top` / `bottom`）、幅は `size`。確認など短い操作は dialog、詳細・絞り込み・編集は drawer。開いている間は背面が操作できない（非モーダルは未対応）。
- **ツールチップ**（`jimble-tooltip`）: `<jimble-tooltip text="説明" placement="top|bottom|left|right" multiline>` で**フォーカスできる要素（ネイティブの `button`・`a`、または `jimble-button`）を 1 つ**囲む（入力欄などほかの `jimble-*` は不可）。ホバーとフォーカスで出て、Esc で消える。補足だけを入れる（重要な情報・操作は入れない）。アイコンだけのボタンの名前は `aria-label`（ツールチップではない）。入力欄の説明は `jimble-field` の `hint`。
- **メニュー**: トリガーは `slot="trigger"`。項目は `jimble-menu-item`（`value`）。選ばれたら `jimble-select`（`e.detail.value`）。
- **通知**: `JimbleUI.toast('...')` / `JimbleUI.toast.success('...')`（CDN）または `import { toast } from '@hidemikimura/jimble-ui/toast'`。`toast({ message, variant, heading, duration, action })`。danger と `action` 付きは自動で消えない。要素を自分で置かない。ダイアログの中で出しても操作・読み上げできる。重要な情報は通知だけに頼らず `jimble-alert` などで画面内にも出す。

### 確認ダイアログ（破壊的な操作）

```html
<jimble-button variant="danger" onclick="document.getElementById('dlg-alert').show()">
  削除する
</jimble-button>

<jimble-dialog id="dlg-alert" alert size="sm" heading="この注文を削除しますか？">
  削除すると元に戻せません。
  <jimble-button slot="footer" autofocus data-dialog-close>キャンセル</jimble-button>
  <jimble-button
    slot="footer"
    variant="danger"
    data-dialog-close
    onclick="JimbleUI.toast({ message: '注文を削除しました', variant: 'success' })"
  >
    削除する
  </jimble-button>
</jimble-dialog>
```

### ドロワー（絞り込みフォーム）

```html
<jimble-button onclick="document.getElementById('drw-form').show()">絞り込み</jimble-button>

<jimble-drawer id="drw-form" heading="絞り込み" placement="start" size="sm">
  <form id="drw-form-body" class="stack">
    <jimble-field label="キーワード">
      <jimble-input name="q" autocomplete="off"></jimble-input>
    </jimble-field>
    <jimble-field label="状態">
      <jimble-select name="status" placeholder="すべて">
        <jimble-option value="open">未対応</jimble-option>
        <jimble-option value="done">完了</jimble-option>
      </jimble-select>
    </jimble-field>
  </form>
  <jimble-button slot="footer" data-dialog-close>キャンセル</jimble-button>
  <jimble-button slot="footer" variant="primary" data-dialog-close>適用</jimble-button>
</jimble-drawer>
```

### メニュー

```html
<jimble-dropdown-menu id="menu-basic">
  <jimble-button slot="trigger">
    操作
    <svg
      slot="suffix"
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  </jimble-button>
  <jimble-menu-item value="edit">編集</jimble-menu-item>
  <jimble-menu-item value="copy">複製</jimble-menu-item>
  <jimble-menu-item value="archive" disabled>アーカイブ（無効）</jimble-menu-item>
  <jimble-menu-separator></jimble-menu-separator>
  <jimble-menu-item value="delete" variant="danger">削除</jimble-menu-item>
</jimble-dropdown-menu>
<script>
  document.getElementById('menu-basic').addEventListener('jimble-select', (e) => {
    JimbleUI.toast('選ばれた項目: ' + e.detail.value)
  })
</script>
```

### 通知（種別・見出し・操作・表示時間）

```html
<div class="row">
  <jimble-button
    onclick="
      JimbleUI.toast({
        heading: '削除しました',
        message: '注文 #1024',
        variant: 'success',
        action: { label: '元に戻す', onClick: () => JimbleUI.toast('元に戻しました') },
      })
    "
  >
    元に戻せる通知
  </jimble-button>
  <jimble-button onclick="JimbleUI.toast({ message: '2 秒で消えます', duration: 2000 })">
    2 秒で消える
  </jimble-button>
  <jimble-button onclick="JimbleUI.toast({ message: '自分で閉じるまで残ります', duration: 0 })">
    消えない通知
  </jimble-button>
</div>
```
