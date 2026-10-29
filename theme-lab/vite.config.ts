import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5199, strictPort: false, open: false },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // theme.css の light-dark() を、そのまま出す（ダークモード）。light-dark() に対応していない
    // ブラウザを対象にすると、CSS の圧縮が --lightningcss-light/-dark の変数に置き換え、色が効かなくなる
    cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'],
  },
})
