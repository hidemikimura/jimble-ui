/**
 * SKILL.md と実装のズレを見つける（LLM を使わない検査）
 *
 * <p>
 * jimble-ui は「AI に画面を書かせる」ことを目当てにしている。
 * その AI が読むのは docs/SKILL.md だけなので、
 * <b>実装に足したものが SKILL.md に載っていなければ、その機能は無いのと同じ</b>である。
 * 逆に SKILL.md にしか無いメソッドを書けば、AI は必ず落ちるコードを書く。
 * </p>
 *
 * <p>ここで見るのは 4 つ。どれも API キーも通信も要らないので、毎回の CI で回せる。</p>
 *
 * <ol>
 *   <li>実装 → 文書：UI の入口とビルダーの公開メソッドが SKILL.md に載っているか</li>
 *   <li>文書 → 実装：SKILL.md のコード例が呼んでいるメソッドが実在するか</li>
 *   <li>テーマ網羅：コンポーネントが全テーマに実装されているか（欠けると画面に赤枠が出る）</li>
 *   <li>アイコン名：ICONS の名前と SKILL.md の一覧が一致しているか</li>
 * </ol>
 *
 *   node tools/check-skill.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(root, 'docs/SKILL.md'), 'utf8');

/* 見つけた問題。1 つでもあれば終了コード 1 */
const problems = [];

/**
 * 問題を記録する
 *
 * @param {string} title 見出し
 * @param {string[]} lines 中身
 */
function ng (title, lines) {

	problems.push({ title, lines });

}

/* ------------------------------------------------------------------
 * 下ごしらえ：SKILL.md からコード例だけを抜く
 * ------------------------------------------------------------------ */

/* ```ts / ```js のブロックだけ（``` だけの囲みは図なので除く） */
const samples = [...skill.matchAll(/```(?:ts|js|typescript)\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

/* 表や本文も含めた「SKILL.md 全体」。載っているかどうかの判定はこちらで見る */
const documented = skill;

/* ------------------------------------------------------------------
 * 1. 実装 → 文書
 * ------------------------------------------------------------------ */

/* src/ui.ts の入口（UI.xxx） */
const uiSource = readFileSync(join(root, 'src/ui.ts'), 'utf8');
const uiEntries = [...uiSource.matchAll(/^\t([a-zA-Z][\w]*)\s*[<(]/gm)].map((m) => m[1]);

const missingEntries = uiEntries.filter((name) => !documented.includes('UI.' + name + '('));
if (missingEntries.length > 0) {
	ng('SKILL.md に載っていない UI の入口', missingEntries.map((n) => 'UI.' + n + '()'));
}

/* dist/**\/*.d.ts の公開メソッド */
if (!existsSync(join(root, 'dist/index.d.ts'))) {
	console.error('[skill] dist/ がありません。先に npm run build を実行してください');
	process.exit(2);
}

/**
 * .d.ts から公開メソッド名を集める
 *
 * <p>private / protected と、内部用の名前は数えない。</p>
 *
 * @param {string} directory 探す場所
 * @return {Map<string, string[]>} メソッド名 → どのファイルにあるか
 */
function publicMethods (directory) {

	const found = new Map();

	for (const file of walk(join(root, directory))) {

		if (!file.endsWith('.d.ts')) {
			continue;
		}

		for (const line of readFileSync(file, 'utf8').split('\n')) {

			/* インデント 4 の「名前(」だけを見る。private / protected は除く */
			const matched = /^ {4}(?:static )?([a-zA-Z][\w]*)\s*[(<]/.exec(line);
			if (matched == null || /^ {4}(?:private|protected|constructor)/.test(line)) {
				continue;
			}

			const name = matched[1];
			if (INTERNAL.has(name)) {
				continue;
			}
			if (!found.has(name)) {
				found.set(name, []);
			}
			found.get(name).push(file.slice(root.length + 1));

		}

	}

	return found;

}

/* 画面を書く人が直接呼ばないもの */
const INTERNAL = new Set(['template', 'render', 'accept', 'click', 'emit', 'renderChildren', 'constructor']);

const builderMethods = publicMethods('dist/builders');
const missingMethods = [...builderMethods.keys()].filter((name) => !documented.includes('.' + name + '('));
if (missingMethods.length > 0) {
	ng('SKILL.md に載っていないビルダーのメソッド', missingMethods.map((n) =>
		'.' + n + '()  （' + builderMethods.get(n).join(' / ') + '）'));
}

/* ------------------------------------------------------------------
 * 2. 文書 → 実装
 * ------------------------------------------------------------------ */

/* 実在する名前 = ビルダー ∪ 中核クラス ∪ UI の入口 ∪ 公開関数 */
const known = new Set([...builderMethods.keys(), ...uiEntries, ...publicMethods('dist/core').keys()]);
for (const name of [...publicMethods('dist/components').keys()]) {
	known.add(name);
}
for (const matched of readFileSync(join(root, 'dist/index.d.ts'), 'utf8').matchAll(/export \{ ([^}]+) \}/g)) {
	for (const name of matched[1].split(',')) {
		known.add(name.trim());
	}
}

/* 素の JavaScript / DOM のもの。ここに無い名前が出たら実装と突き合わせる */
const BUILTIN = new Set([
	'map', 'filter', 'find', 'findIndex', 'flatMap', 'forEach', 'reduce', 'some', 'every',
	'slice', 'splice', 'concat', 'join', 'push', 'pop', 'shift', 'unshift', 'reverse',
	'includes', 'indexOf', 'startsWith', 'endsWith', 'trim', 'split', 'replace', 'padStart',
	'toLowerCase', 'toUpperCase', 'toFixed', 'toString', 'localeCompare', 'test', 'exec',
	'then', 'catch', 'finally', 'all', 'race', 'json', 'text', 'stringify', 'parse',
	'keys', 'values', 'entries', 'from', 'of', 'assign', 'max', 'min', 'ceil', 'floor', 'round',
	'has', 'add', 'delete', 'get', 'set', 'clear', 'sort',
	'querySelector', 'addEventListener', 'define', 'log', 'warn', 'error', 'info',
	'toLocaleString', 'toISOString', 'getTime', 'now', 'isArray', 'fetch'
]);

const called = new Set([...samples.matchAll(/\.([a-zA-Z][\w]*)\s*\(/g)].map((m) => m[1]));
const ghosts = [...called].filter((name) => !known.has(name) && !BUILTIN.has(name));
if (ghosts.length > 0) {
	ng('SKILL.md のコード例が呼んでいるが、実装に無いメソッド', ghosts.map((n) => '.' + n + '()'));
}

/* UI.xxx( の形も見る（入口の綴り間違い） */
const usedEntries = new Set([...samples.matchAll(/\bUI\.([a-zA-Z][\w]*)\s*\(/g)].map((m) => m[1]));
const ghostEntries = [...usedEntries].filter((name) => !uiEntries.includes(name));
if (ghostEntries.length > 0) {
	ng('SKILL.md のコード例にある、実装に無い UI の入口', ghostEntries.map((n) => 'UI.' + n + '()'));
}

/* ------------------------------------------------------------------
 * 3. テーマ網羅
 * ------------------------------------------------------------------ */

const tags = [];
for (const file of readdirSync(join(root, 'src/components'))) {
	if (!file.startsWith('jb-')) {
		continue;
	}
	const source = readFileSync(join(root, 'src/components', file), 'utf8');
	for (const matched of source.matchAll(/customElements\.define\('([^']+)'/g)) {
		tags.push(matched[1]);
	}
}

const themes = ['original', 'bootstrap5', 'tailwind-dark'];
const holes = [];
for (const theme of themes) {
	const source = readFileSync(join(root, 'src/themes/' + theme + '.ts'), 'utf8');
	for (const tag of tags) {
		if (!source.includes("'" + tag + "': component")) {
			holes.push(theme + ' に ' + tag + ' がありません');
		}
	}
}
if (holes.length > 0) {
	ng('テーマに実装が無いコンポーネント（画面に赤枠が出る）', holes);
}

/* ------------------------------------------------------------------
 * 4. アイコン名
 * ------------------------------------------------------------------ */

const iconSource = readFileSync(join(root, 'src/themes/icons.ts'), 'utf8');
const iconNames = [...iconSource.matchAll(/^\t'([a-z][\w-]*)':\s*\[/gm)].map((m) => m[1]);

/* SKILL.md の「使えるアイコン名」の囲み */
const iconBlock = /使えるアイコン名[\s\S]*?```\n([\s\S]*?)```/.exec(skill);
if (iconBlock == null) {
	ng('SKILL.md にアイコン名の一覧がありません', ['「使えるアイコン名」の囲みを置いてください']);
} else {
	const listed = new Set(iconBlock[1].split(/\s+/).filter((word) => /^[a-z][\w-]*$/.test(word)));
	const missing = iconNames.filter((name) => !listed.has(name));
	const extra = [...listed].filter((name) => !iconNames.includes(name) && !/^[操向画人知]/.test(name));
	if (missing.length > 0) {
		ng('SKILL.md の一覧に無いアイコン', missing);
	}
	if (extra.length > 0) {
		ng('SKILL.md にあるが実装に無いアイコン', extra);
	}
}

/* ------------------------------------------------------------------
 * 結果
 * ------------------------------------------------------------------ */

console.log('[skill] UI の入口 ' + uiEntries.length + ' / ビルダーのメソッド ' + builderMethods.size
	+ ' / コンポーネント ' + tags.length + ' / アイコン ' + iconNames.length);

if (problems.length === 0) {
	console.log('[skill] SKILL.md と実装は一致しています');
	process.exit(0);
}

for (const problem of problems) {
	console.error('\n[skill] ' + problem.title);
	for (const line of problem.lines) {
		console.error('  - ' + line);
	}
}
console.error('\n[skill] ' + problems.length + ' 件。docs/SKILL.md を直してください');
process.exit(1);

/**
 * 配下のファイルを列挙する
 *
 * @param {string} directory 場所
 * @return {string[]} ファイル
 */
function walk (directory) {

	const found = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			found.push(...walk(path));
		} else {
			found.push(path);
		}
	}
	return found;

}
