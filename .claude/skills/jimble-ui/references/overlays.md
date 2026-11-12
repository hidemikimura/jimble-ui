<!-- 生成物: scripts/gen-skill.ts が scripts/skill-template.md・scripts/skill-references・custom-elements.json・site/examples から作る。直接編集しない。 -->

# オーバーレイ・通知

ダイアログ・ドロワー・ポップオーバー・コマンドパレット・ツールチップ・メニュー・通知の使い方。

**知らせ方の選び方**（同じ種類の知らせは、いつも同じ部品で出す。1 回の操作で複数を同時に出さない）:

- 操作の結果（保存した・削除した）→ 通知 `JimbleUI.toast()`。失敗は `variant: 'danger'`（残る）、やり直せるなら `action`。
- 項目ごとの入力の誤り → `jimble-field` の `error`。誤りの要約・画面の一部への注意 → その部分の上に `jimble-alert`。
- 画面・アプリ全体に関わること（保守・期限）→ 本文の先頭に `jimble-alert`。
- 先へ進む前に答えが要ること（削除の確認）→ `jimble-dialog` の `alert`。
- データがない（0 件・検索の結果なし）→ `jimble-empty-state`。読み込み中 → `jimble-skeleton` / `jimble-spinner` / `jimble-progress`。状態 → `jimble-badge`。
- 文章は「何が起きたか」と「次に何をすればよいか」を書く（「エラーが発生しました」だけにしない）。色だけで重さを伝えない。

- **ダイアログ**: `heading` 属性（または `title` スロット / `aria-label`）が必要。開閉は `el.show()` / `el.hide()` / `open` 属性。中の要素に `data-dialog-close` を付けると、JavaScript なしで閉じる。確認など応答が必須のものは `alert`（背景クリックで閉じない）にして、安全な側のボタンに `autofocus`。閉じる前に `jimble-close-request`（`preventDefault()` で止められる）。
- **ドロワー**（`jimble-drawer`。サイドモーダル・スライドパネル・ボトムシート）: 画面の端から出るモーダル。API と挙動は `jimble-dialog` と同じ（`heading`・`show()` / `hide()`・`data-dialog-close`・`jimble-close-request`）。位置は `placement`（`end` 右・既定 / `start` 左 / `top` / `bottom`）、幅は `size`。確認など短い操作は dialog、詳細・絞り込み・編集は drawer。開いている間は背面が操作できない（非モーダルは未対応）。
- **ポップオーバー**（`jimble-popover`）: ボタンの近くに開く、操作できる小さなパネル（モーダルではない）。絞り込みの条件・その場での確認・表示の設定など。トリガーは `slot="trigger"`、名前は `heading`（表示する）か `label`。開くと `autofocus` → 最初のフォーカスできる要素へ。Esc・外側クリック・Tab で外へ出る・`data-popover-close` の要素で閉じる。中のセレクト・コンボボックスを開いても閉じない。`placement`（bottom-start / bottom-end / top-start / top-end）・`--jimble-popover-width`。操作の一覧なら `jimble-dropdown-menu`、長いフォームや答えが必須の確認なら `jimble-dialog`。
- **コマンドパレット**（`jimble-command-palette` > `jimble-command`）: ページや操作を名前で探して実行する、モーダルの検索窓（管理画面に 1 つ）。**全部入りに含まれない**ので、別に読み込む（`import '@hidemikimura/jimble-ui/command-palette'`、CDN は `dist/cdn/command-palette.js`）。コマンドは `jimble-command`（名前は中身の文字。`value`・`group`・`keywords`（読み）・`icon`・`shortcut`（表示だけ）・`href`・`disabled`）か `commands` プロパティ。開くのは `show()`、または `hotkey="mod+k"`（既定では付かない）。選ぶと `jimble-select`（`detail.value`・`item`）で閉じ、`href` があれば移動する。サーバーで探すなら `load`（コンボボックスと同じ形）。値を選ぶ入力欄には使わない（`jimble-combobox`）。
- **ツールチップ**（`jimble-tooltip`）: `<jimble-tooltip text="説明" placement="top|bottom|left|right" multiline>` で**フォーカスできる要素（ネイティブの `button`・`a`、または `jimble-button`）を 1 つ**囲む（入力欄などほかの `jimble-*` は不可）。ホバーとフォーカスで出て、Esc で消える。補足だけを入れる（重要な情報・操作は入れない）。アイコンだけのボタンの名前は `aria-label`（ツールチップではない）。入力欄の説明は `jimble-field` の `hint`。
- **メニュー**: トリガーは `slot="trigger"`。項目は `jimble-menu-item`（`value`）。選ばれたら `jimble-select`（`e.detail.value`）。**サブメニュー**は、項目の中に `slot="submenu"` の `jimble-menu-item` を入れる（入れ子も可）。サブメニューの項目を選んでも、`jimble-dropdown-menu` から `jimble-select` が出る。開く側の項目には `value` を付けない。
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

### ポップオーバー（その場で確認する）

```html
<jimble-popover heading="この下書きを削除しますか？" placement="bottom-end">
  <jimble-button slot="trigger" variant="danger">削除</jimble-button>
  <jimble-stack gap="4">
    <p style="margin: 0">削除した下書きは、元に戻せません。</p>
    <jimble-stack direction="horizontal" gap="2" justify="end">
      <jimble-button data-popover-close autofocus>キャンセル</jimble-button>
      <jimble-button
        variant="danger"
        data-popover-close
        onclick="JimbleUI.toast.success('下書きを削除しました')"
        >削除する</jimble-button
      >
    </jimble-stack>
  </jimble-stack>
</jimble-popover>
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
