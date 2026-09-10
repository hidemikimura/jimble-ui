#!/bin/sh
#
# vendor/ の CSS モジュールを作り直す
#
#   sh tools/build-themes.sh
#
# Tailwind 系テーマのクラスを増やしたときと、Bootstrap を上げたときに実行する。
#
# Tailwind 系は<b>テーマごとに別の CSS を作る</b>。
# 1 つにまとめると、選ばなかったテーマのクラスまで配ることになるため。
#
set -e
cd "$(dirname "$0")/.."

for theme in tailwind-dark tailui; do
	echo "--- $theme"
	JIMBLE_THEME_SRC="./src/themes/$theme.ts" \
		npx --yes tailwindcss@3 -c tools/tailwind.config.cjs -i tools/tailwind.css -o "/tmp/jb-$theme.css" --minify
	node tools/css-to-module.mjs "/tmp/jb-$theme.css" "vendor/$theme.css.js" \
		"Tailwind CSS（$theme テーマが使うクラスだけを抽出したもの）"
done

echo "--- bootstrap5"
npm pack bootstrap@5 --pack-destination /tmp >/dev/null
tar -xzf /tmp/bootstrap-5*.tgz -C /tmp
node tools/css-to-module.mjs /tmp/package/dist/css/bootstrap.min.css vendor/bootstrap5.css.js "Bootstrap 5 の CSS（bootstrap5 テーマが使う）"
