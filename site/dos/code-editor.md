## Do

- メールの文面・HTML・JSON のテンプレートなど、変数を含むコードの編集に使う。
- 全部入りに含まれないので、別に読み込む（`@hidemikimura/jimble-ui/code-editor`、CDN は `dist/cdn/code-editor.js`）。
- 変数は `variables` プロパティで渡し、ボタンやメニューから入れるときは `insertVariable()` を呼ぶ。

## Don't

- ふつうの複数行の文章に使う。それは `jimble-textarea`（読み込みが軽い）。
- Tab でインデントできることを前提にする（Tab は次の項目へ移る）。
- 送信された `{{name}}` を、サーバーで検証せずに使う。
