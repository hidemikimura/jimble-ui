/**
 * ブラウザで実際に動かして確かめる
 *
 * <p>
 * 型検査では「テーマにテンプレートが無い」「イベントが繋がっていない」は見つからない。
 * ここでは examples/parts の画面を <b>4 つのテーマすべてで</b>開き、
 * サイドバー・見出し・行のメニュー・つかんで並べ替え・飾りが動くかを見る。
 * </p>
 *
 * <p>
 * 見た目の良し悪しは見ない。<b>壊れているかどうか</b>だけを見る。
 * 色や余白で落とすと、直していない日に赤くなって信用されなくなる。
 * </p>
 *
 *   node tools/check-browser.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.JIMBLE_CHECK_PORT ?? 8123);

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.map': 'application/json'
};

/* examples/ を配る小さなサーバ。外の道具に頼らない */
const server = createServer((request, response) => {

	const path = decodeURIComponent((request.url ?? '/').split('?')[0]);
	const file = join(root, path);

	if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
		response.writeHead(404);
		response.end();
		return;
	}

	response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
	response.end(readFileSync(file));

});

await new Promise((done) => server.listen(port, done));

const url = 'http://localhost:' + String(port) + '/examples/parts/index.html';
const themes = ['original', 'bootstrap5', 'tailwind-dark', 'tailui', 'ecx'];

/*
 * CI では npx playwright install が入れたものが既定で見つかる。
 * 別の場所にある Chromium を使いたいときだけ JIMBLE_CHROMIUM で指す。
 */
const executablePath = process.env.JIMBLE_CHROMIUM;
const browser = await chromium.launch(executablePath == null ? {} : { executablePath });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

/* シャドウルートをまたいで要素を探す道具をページに入れておく */
await page.addInitScript(() => {
	window.deepAll = (selector) => {
		const found = [];
		const walk = (node) => {
			for (const element of node.querySelectorAll('*')) {
				if (element.matches(selector)) { found.push(element); }
				if (element.shadowRoot) { walk(element.shadowRoot); }
			}
		};
		walk(document.body);
		return found;
	};
	window.deepOne = (selector) => window.deepAll(selector)[0] ?? null;
	window.deepText = () => {
		const walk = (node) => {
			let text = '';
			for (const element of node.querySelectorAll('*')) {
				if (element.shadowRoot) { text += walk(element.shadowRoot); }
			}
			return text + (node.textContent ?? '');
		};
		return walk(document.body).replace(/\s+/g, ' ').trim();
	};
});

const failures = [];
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') { consoleErrors.push(message.text()); } });
page.on('pageerror', (error) => { consoleErrors.push('pageerror: ' + error.message); });

/**
 * 1 項目を確かめる
 *
 * @param {string} label 何を見たか
 * @param {boolean} ok 通ったか
 * @param {string} detail 落ちたときに出す中身
 */
function check (label, ok, detail = '') {

	console.log((ok ? '  OK  ' : '  NG  ') + label + (ok || detail === '' ? '' : ' :: ' + detail));
	if (!ok) {
		failures.push(label + (detail === '' ? '' : ' :: ' + detail));
	}

}

for (const theme of themes) {

	console.log('[browser] ' + theme);

	/* ハッシュだけの移動では読み直されないので、毎回違う URL で開く */
	await page.goto(url + '?t=' + String(Date.now()) + '#/');
	await page.waitForTimeout(900);

	if (theme !== 'original') {
		await page.getByText(theme, { exact: true }).click();
		await page.waitForTimeout(700);
	}

	/* サイドバー */
	const navButtons = await page.evaluate(() => window.deepOne('jb-nav').shadowRoot.querySelectorAll('button').length);
	check(theme + ' サイドバーの項目', navButtons >= 4, String(navButtons));

	const current = await page.evaluate(() => {
		const element = window.deepOne('jb-nav').shadowRoot.querySelector('.current, .active');
		return element == null ? '(なし)' : element.textContent.replace(/\s+/g, ' ').trim();
	});
	check(theme + ' 今いる場所が光る', current.includes('ホーム'), current);

	/* 飾り（名前 → SVG） */
	const icons = await page.evaluate(() => {
		const all = window.deepAll('jb-icon');
		let paths = 0;
		for (const icon of all) { paths += icon.shadowRoot?.querySelectorAll('path').length ?? 0; }
		return { icons: all.length, paths };
	});
	check(theme + ' 飾りが図形になる', icons.icons > 0 && icons.paths > 0, JSON.stringify(icons));

	/* 一覧へ */
	await page.evaluate(() => { location.hash = '#/makers'; });
	await page.waitForTimeout(700);

	const text = await page.evaluate(() => window.deepText());
	check(theme + ' 画面見出し', text.includes('メーカー') && text.includes('つかんで並べ替え'));

	/* 行のメニュー */
	await page.evaluate(() => { window.deepOne('jb-menu').shadowRoot.querySelector('button').click(); });
	await page.waitForTimeout(300);
	const opened = await page.evaluate(() => window.deepOne('jb-menu').hasAttribute('jb-open'));
	const items = await page.evaluate(() => window.deepOne('jb-menu').shadowRoot.textContent.replace(/\s+/g, ' ').trim());
	check(theme + ' メニューが開く', opened && items.includes('編集') && items.includes('削除'), items);

	await page.mouse.click(600, 40);
	await page.waitForTimeout(300);
	check(theme + ' 外側を押すと閉じる', await page.evaluate(() => !window.deepOne('jb-menu').hasAttribute('jb-open')));

	/* メニューの項目が動く */
	await page.evaluate(() => { window.deepOne('jb-menu').shadowRoot.querySelector('button').click(); });
	await page.waitForTimeout(250);
	await page.evaluate(() => {
		const buttons = [...window.deepOne('jb-menu').shadowRoot.querySelectorAll('button')];
		buttons.find((button) => button.textContent.includes('削除')).click();
	});
	await page.waitForTimeout(400);
	check(theme + ' メニューの項目が動く', (await page.evaluate(() => window.deepText())).includes('削除の確認'));

	await page.evaluate(() => {
		const buttons = window.deepAll('jb-button');
		buttons.find((button) => button.label === 'やめる').shadowRoot.querySelector('button').click();
	});
	await page.waitForTimeout(300);

	/* つかんで並べ替え（DragEvent を直接投げる） */
	await page.evaluate(() => {
		const table = window.deepOne('jb-table');
		const rows = [...table.shadowRoot.querySelectorAll('tbody tr')];
		const transfer = new DataTransfer();
		const rect = rows[2].getBoundingClientRect();
		const y = rect.top + rect.height - 2;
		rows[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
		rows[2].dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: transfer, clientY: y }));
		rows[2].dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer, clientY: y }));
	});
	await page.waitForTimeout(500);
	const order = await page.evaluate(() => window.deepOne('jb-table').rows.map((row) => row.key));
	check(theme + ' つかんで並べ替え', JSON.stringify(order) === JSON.stringify(['2', '3', '1', '4']), order.join(','));

	/* 危険操作の文字ボタン */
	await page.evaluate(() => { location.hash = '#/makers/edit'; });
	await page.waitForTimeout(600);
	const variant = await page.evaluate(() => {
		const button = window.deepAll('jb-button').find((element) => element.label === '削除');
		return button?.getAttribute('jb-variant') ?? '(なし)';
	});
	check(theme + ' 危険操作の文字ボタン', variant === 'quiet-danger', variant);

}

/* 知らない飾りの名前は、黙って消えずに知らせが出る */
await page.goto(url + '?t=' + String(Date.now()) + '#/');
await page.waitForTimeout(700);
const warnings = [];
page.on('console', (message) => { if (message.type() === 'warning') { warnings.push(message.text()); } });
await page.evaluate(() => {
	const icon = document.createElement('jb-icon');
	icon.setAttribute('jb-name', 'trahs');
	document.body.appendChild(icon);
});
await page.waitForTimeout(400);
console.log('[browser] 診断');
check('知らない飾りの名前で知らせが出る', warnings.some((w) => w.includes('trahs') && w.includes('もしかして')), warnings.join(' | '));

await browser.close();
server.close();

if (consoleErrors.length > 0) {
	console.error('\n[browser] コンソールに例外が出ています');
	for (const error of consoleErrors) {
		console.error('  - ' + error);
	}
}

if (failures.length > 0 || consoleErrors.length > 0) {
	console.error('\n[browser] ' + String(failures.length + consoleErrors.length) + ' 件');
	process.exit(1);
}

console.log('\n[browser] すべて通りました');
