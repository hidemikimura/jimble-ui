/**
 * SKILL.md だけを渡した AI が、正しい画面を書けるかを測る
 *
 * <p>
 * <b>これは「文書の検査」であって、AI の検査ではない。</b>
 * 落ちたときに直すのは AI ではなく docs/SKILL.md である。
 * 型検査の誤りは、そのまま「SKILL.md で説明できていなかったところ」の一覧になる。
 * </p>
 *
 * <p>
 * わざと <b>1 往復</b>にしてある。コンパイラを見ながら直させると、
 * 文書が足りなくても最後には通ってしまい、何が足りないのか分からなくなる。
 * </p>
 *
 * <p>
 * 結果は毎回同じにはならない（LLM なので）。
 * だから <b>これを必須の関門にはしない</b>。手で流すのと、定期実行で傾向を見るためのもの。
 * </p>
 *
 *   node tools/eval-skill.mjs              全課題
 *   node tools/eval-skill.mjs 01           01 で始まる課題だけ
 *
 * 動かすのに必要なもの（どちらか）
 *
 *   claude コマンド（Claude Code）… そのまま使える
 *   ANTHROPIC_API_KEY             … CI ではこちら。モデルは JIMBLE_EVAL_MODEL で変えられる
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runDirectory = join(root, 'tools/eval/run');
const skill = readFileSync(join(root, 'docs/SKILL.md'), 'utf8');
const filter = process.argv[2] ?? '';

/* AI に渡す指示。SKILL.md 以外の手掛かりを与えない */
const INSTRUCTION = [
	'あなたは jimble-ui というフロントフレームワークで画面を作ります。',
	'使い方の資料は次の SKILL.md だけです。ここに書かれていないメソッドは存在しません。',
	'',
	'--- SKILL.md ここから ---',
	skill,
	'--- SKILL.md ここまで ---',
	'',
	'次の課題に対する app.ts を 1 つだけ、```ts の囲みで出してください。説明は要りません。',
	'',
	'* import は `import { UI, App, notify } from \'../../../../dist/index.js\';` のように',
	'  `../../../../dist/index.js` から行うこと（型は `import type { Context } from ...`）',
	'* 使う状態は `declare global { interface JimbleAppState { ... } }` で宣言し、',
	'  `App.of().state({...})` に同じキーを全部書くこと',
	'* 最後に `.route(...)` と `.mount()` まで書き、そのまま動く 1 ファイルにすること',
	'* HTML と CSS は 1 文字も書かないこと'
].join('\n');

const tasks = readdirSync(join(root, 'tools/eval/tasks'))
	.filter((file) => file.endsWith('.md') && file.startsWith(filter))
	.sort();

if (tasks.length === 0) {
	console.error('[eval] 課題がありません: tools/eval/tasks/' + filter + '*.md');
	process.exit(2);
}

const results = [];

for (const task of tasks) {

	const name = task.replace(/\.md$/, '');
	const body = readFileSync(join(root, 'tools/eval/tasks', task), 'utf8');
	const directory = join(runDirectory, name);

	process.stdout.write('[eval] ' + name + ' … 書かせています');

	let answer;
	try {
		answer = ask(INSTRUCTION + '\n\n--- 課題 ---\n' + body);
	} catch (error) {
		console.log('');
		console.error('[eval] ' + name + ' の生成に失敗しました: ' + String(error.message).split('\n')[0]);
		results.push({ name, ok: false, errors: ['生成に失敗'], code: '' });
		continue;
	}

	const code = extract(answer);
	rmSync(directory, { recursive: true, force: true });
	mkdirSync(directory, { recursive: true });
	writeFileSync(join(directory, 'app.ts'), code);
	writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({
		extends: '../../../../tsconfig.base.json',
		include: ['**/*.ts']
	}, null, '\t') + '\n');
	writeFileSync(join(directory, 'index.html'), [
		'<!doctype html>',
		'<meta charset="utf-8">',
		'<title>' + name + '</title>',
		'<script type="module" src="./app.js"></script>',
		''
	].join('\n'));

	process.stdout.write(' → 型検査');

	const errors = typeCheck(directory);
	results.push({ name, ok: errors.length === 0, errors, code });

	console.log(errors.length === 0 ? ' … 通りました' : ' … ' + errors.length + ' 件の誤り');
	for (const error of errors) {
		console.log('    ' + error);
	}

}

/* ------------------------------------------------------------------
 * 結果
 * ------------------------------------------------------------------ */

const passed = results.filter((r) => r.ok).length;
const report = [
	'# SKILL.md の評価',
	'',
	'SKILL.md だけを渡した AI に画面を書かせ、1 往復で型検査が通るかを見たもの。',
	'落ちた項目は「SKILL.md で説明できていなかったところ」である。',
	'',
	'実行: ' + new Date().toISOString(),
	'',
	'| 課題 | 結果 | 誤り |',
	'| --- | --- | --- |',
	...results.map((r) => '| ' + r.name + ' | ' + (r.ok ? '通った' : '落ちた') + ' | ' + r.errors.length + ' |'),
	'',
	'**' + passed + ' / ' + results.length + ' 通過**',
	''
];

for (const result of results.filter((r) => !r.ok)) {
	report.push('## ' + result.name + ' の誤り', '');
	report.push('```');
	report.push(...result.errors);
	report.push('```', '');
}

writeFileSync(join(runDirectory, 'report.md'), report.join('\n'));
console.log('\n[eval] ' + passed + ' / ' + results.length + ' 通過（tools/eval/run/report.md に書きました）');

/* 落ちても終了コードは 0。これは関門ではなく物差しである */
process.exit(0);

/* ------------------------------------------------------------------
 * 部品
 * ------------------------------------------------------------------ */

/**
 * AI に書かせる
 *
 * @param {string} prompt 指示
 * @return {string} 返事
 */
function ask (prompt) {

	if (process.env.ANTHROPIC_API_KEY == null && hasClaudeCommand()) {
		return execFileSync('claude', ['-p', '--output-format', 'text'], {
			input: prompt,
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
			timeout: 10 * 60 * 1000
		});
	}

	if (process.env.ANTHROPIC_API_KEY == null) {
		console.error('\n[eval] claude コマンドも ANTHROPIC_API_KEY もありません');
		process.exit(2);
	}

	return callApi(prompt);

}

/* claude コマンドがあるか */
function hasClaudeCommand () {

	try {
		execFileSync('claude', ['--version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}

}

/**
 * API を直接叩く（CI 用）
 *
 * @param {string} prompt 指示
 * @return {string} 返事
 */
function callApi (prompt) {

	const model = process.env.JIMBLE_EVAL_MODEL ?? 'claude-sonnet-4-5';
	const response = execFileSync('curl', [
		'-sS', '-X', 'POST', (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com') + '/v1/messages',
		'-H', 'content-type: application/json',
		'-H', 'anthropic-version: 2023-06-01',
		'-H', 'x-api-key: ' + process.env.ANTHROPIC_API_KEY,
		'--data-binary', '@-'
	], {
		input: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
		timeout: 10 * 60 * 1000
	});

	const parsed = JSON.parse(response);
	if (parsed.error != null) {
		throw new Error(parsed.error.message ?? JSON.stringify(parsed.error));
	}
	return (parsed.content ?? []).map((part) => part.text ?? '').join('');

}

/**
 * 返事から TypeScript を取り出す
 *
 * @param {string} answer 返事
 * @return {string} コード
 */
function extract (answer) {

	const matched = /```(?:ts|typescript)?\n([\s\S]*?)```/.exec(answer);
	return (matched == null ? answer : matched[1]).trim() + '\n';

}

/**
 * 型検査する
 *
 * @param {string} directory 場所
 * @return {string[]} 誤り
 */
function typeCheck (directory) {

	try {
		execFileSync('npx', ['tsc', '-p', directory, '--noEmit'], { encoding: 'utf8', cwd: root });
		return [];
	} catch (error) {
		return String(error.stdout ?? '')
			.split('\n')
			.filter((line) => line.includes('error TS'))
			.map((line) => line.replace(directory + '/', '').trim());
	}

}
