/**
 * Tailwind 系テーマ用の設定
 *
 * <p>
 * テーマファイルに書かれたクラス名だけを走査して CSS を作る。
 * どのテーマを見るかは環境変数 JIMBLE_THEME_SRC で渡す
 * （tools/build-themes.sh がテーマごとに呼ぶ）。
 * </p>
 */
module.exports = {
	content: [process.env.JIMBLE_THEME_SRC ?? './src/themes/tailwind-dark.ts'],
	theme: { extend: {} },
	plugins: []
};
