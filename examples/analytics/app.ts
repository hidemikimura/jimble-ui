import { UI, App, notify } from '../../dist/index.js';
import type { Context } from '../../dist/index.js';
import { fetchAnalytics, parseCsvFile } from './analytics-service.js';
import type { AnalyticsSummary, ChartPoint } from './analytics-service.js';

interface ReportFile {
	id: string;
	name: string;
	size: number;
	rows: number;
	addedAt: string;
}

/* この画面が使う状態。ここに書いたものだけが読み書きできる */
declare global {
	interface JimbleAppState {
		dateFrom: string;
		dateTo: string;
		loading: boolean;
		summary: AnalyticsSummary;
		dailyPv: ChartPoint[];
		bySource: ChartPoint[];
		reportFiles: ReportFile[];
	}
}

const EMPTY_SUMMARY: AnalyticsSummary = {
	pv: 0,
	pvDelta: 0,
	sessions: 0,
	sessionsDelta: 0,
	bounceRate: 0,
	bounceRateDelta: 0,
	avgDuration: 0,
	avgDurationDelta: 0
};

const today = new Date();
const defaultTo = formatIsoDate(today);
const fromDate = new Date(today);
fromDate.setDate(fromDate.getDate() - 6);
const defaultFrom = formatIsoDate(fromDate);

const OverviewPage = (ctx: Context) => UI.column(

	UI.breadcrumb([
		{ label: 'ホーム', path: '/' },
		{ label: 'アクセス解析' }
	]),

	UI.row(
		UI.title('アクセス解析'),
		UI.dateRange('period')
			.label('対象期間')
			.bind('dateFrom', 'dateTo')
			.onChange(() => void reload(ctx))
	).justify('between').align('end'),

	UI.grid(
		UI.stat('PV', (c) => formatNumber(c.get('summary').pv))
			.unit('view')
			.delta((c) => deltaText(c.get('summary').pvDelta), (c) => deltaDirection(c.get('summary').pvDelta)),
		UI.stat('セッション', (c) => formatNumber(c.get('summary').sessions))
			.unit('件')
			.delta((c) => deltaText(c.get('summary').sessionsDelta), (c) => deltaDirection(c.get('summary').sessionsDelta)),
		UI.stat('直帰率', (c) => formatPercent(c.get('summary').bounceRate))
			.delta((c) => deltaText(c.get('summary').bounceRateDelta), (c) => deltaDirection(c.get('summary').bounceRateDelta)),
		UI.stat('平均滞在時間', (c) => formatDuration(c.get('summary').avgDuration))
			.delta((c) => deltaText(c.get('summary').avgDurationDelta), (c) => deltaDirection(c.get('summary').avgDurationDelta))
	).columns(4).gap('lg'),

	UI.grid(
		UI.chart((c) => c.get('dailyPv')).line().title('日別PV').height(220).empty('データがありません'),
		UI.chart((c) => c.get('bySource')).bar().title('流入元別セッション').height(220).empty('データがありません')
	).columns(2).min('320px').gap('lg'),

	UI.accordion()
		.section('metrics', '指標の定義',
			UI.column(
				UI.label('PV（ページビュー）'),
				UI.caption('ページが表示された回数の合計です。同一ユーザーの再訪問による表示も含みます。'),
				UI.label('セッション'),
				UI.caption('一定時間内の一連の閲覧行動を 1 件として数えたものです。'),
				UI.label('直帰率'),
				UI.caption('最初の 1 ページだけ見てサイトを離れたセッションの割合です。')
			).gap('sm')
		)
		.section('terms', '用語の補足',
			UI.column(
				UI.label('平均滞在時間'),
				UI.caption('セッションが開始してから終了するまでの平均時間です。'),
				UI.label('流入元'),
				UI.caption('検索・SNS・広告・リンク・直接アクセスなど、訪問のきっかけを分類したものです。')
			).gap('sm')
		)
		.single()

).gap('lg').width('lg');

const ReportsPage = (_ctx: Context) => UI.column(

	UI.breadcrumb([
		{ label: 'ホーム', path: '/' },
		{ label: 'アクセス解析', path: '/' },
		{ label: 'レポート' }
	]),

	UI.row(
		UI.title('レポート'),
		UI.button('概要へ戻る').go('/')
	).justify('between'),

	UI.file('csv')
		.label('CSVファイルを添付')
		.accept('.csv')
		.multiple()
		.hint('この枠に放り込むか、押して選んでください')
		.onSelect(attachFiles),

	UI.empty('まだレポートがありません')
		.icon('📄')
		.description('CSVファイルを添付すると、ここに一覧表示されます')
		.when((c) => c.get('reportFiles').length === 0),

	UI.grid(
		UI.each((c) => c.get('reportFiles'), (file) =>
			UI.card(
				UI.label(file.name),
				UI.caption(formatBytes(file.size) + ' ・ ' + String(file.rows) + ' 行'),
				UI.caption('追加: ' + file.addedAt)
			).gap('xs').pad('md')
		)
	).columns(3).min('220px').gap('md').unless((c) => c.get('reportFiles').length === 0)

).gap('lg').width('lg');

async function reload (ctx: Context): Promise<void> {
	ctx.set('loading', true);
	const report = await fetchAnalytics(ctx.get('dateFrom'), ctx.get('dateTo'));
	ctx.store.patch({
		summary: report.summary,
		dailyPv: report.dailyPv,
		bySource: report.bySource,
		loading: false
	});
}

async function attachFiles (files: File[], ctx: Context): Promise<void> {
	if (files.length === 0) { return; }
	const parsed = await Promise.all(files.map((file) => parseCsvFile(file)));
	const added: ReportFile[] = parsed.map((item) => ({
		id: makeId(),
		name: item.name,
		size: item.size,
		rows: item.rows,
		addedAt: formatDateTime(new Date())
	}));
	ctx.store.patch({ reportFiles: [...ctx.get('reportFiles'), ...added] });
	notify.success(String(files.length) + '件のCSVを追加しました');
}

function formatIsoDate (date: Date): string {
	return date.toISOString().slice(0, 10);
}

function formatDateTime (date: Date): string {
	const pad = (n: number): string => String(n).padStart(2, '0');
	return String(date.getFullYear()) + '/' + pad(date.getMonth() + 1) + '/' + pad(date.getDate())
		+ ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatNumber (value: number): string {
	return new Intl.NumberFormat('ja-JP').format(Math.round(value));
}

function formatPercent (value: number): string {
	return value.toFixed(1) + '%';
}

function formatDuration (seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = Math.round(seconds % 60);
	return String(minutes) + '分' + String(rest).padStart(2, '0') + '秒';
}

function formatBytes (bytes: number): string {
	if (bytes < 1024) { return String(bytes) + 'B'; }
	if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + 'KB'; }
	return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function deltaText (percent: number): string {
	const sign = percent > 0 ? '+' : '';
	return sign + percent.toFixed(1) + '%';
}

function deltaDirection (percent: number): 'up' | 'down' | 'flat' {
	if (percent > 0.5) { return 'up'; }
	if (percent < -0.5) { return 'down'; }
	return 'flat';
}

function makeId (): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

App.of()
	.state({
		dateFrom: defaultFrom,
		dateTo: defaultTo,
		loading: false,
		summary: EMPTY_SUMMARY,
		dailyPv: [],
		bySource: [],
		reportFiles: []
	})
	.theme('original')
	.route('/', OverviewPage, { enter: reload })
	.route('/reports', ReportsPage)
	.mount();
