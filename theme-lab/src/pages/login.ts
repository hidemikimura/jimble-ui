import { html } from 'lit'

export function login() {
  return html`<div class="login">
    <jimble-card>
      <div class="stack">
        <h2>ログイン</h2>
        <jimble-field label="メールアドレス" required>
          <jimble-input type="email" name="email" autocomplete="email"></jimble-input>
        </jimble-field>
        <jimble-field label="パスワード" required hint="8 文字以上">
          <jimble-input
            type="password"
            name="password"
            autocomplete="current-password"
          ></jimble-input>
        </jimble-field>
        <jimble-checkbox>ログインしたままにする</jimble-checkbox>
        <jimble-button variant="primary" block href="/">ログイン</jimble-button>
        <jimble-alert variant="danger"
          >メールアドレスまたはパスワードが正しくありません。</jimble-alert
        >
        <a href="/">パスワードを忘れた方</a>
      </div>
    </jimble-card>
  </div>`
}
