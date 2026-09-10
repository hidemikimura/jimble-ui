import { UI, App, notify } from '../../dist/index.js';
import type { Context } from '../../dist/index.js';
import { loadSettings, saveSettings, resetSettings, fetchHistory } from './settings-service.js';
import type { Settings, HistoryEntry } from './settings-service.js';

/* この画面が使う状態。ここに書いたものだけが読み書きできる */
declare global {
	interface JimbleAppState {
		tab: string;
		form: Settings;
		errors: Record<string, string>;
		hasError: boolean;
		saving: boolean;
		resetting: boolean;
		confirmingReset: boolean;
		history: HistoryEntry[];
		loading: boolean;
	}
}

/* 保存の変更者。デモのため固定値として扱う */
const CURRENT_USER = 'kimura@ecx.co.jp';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAGE_SIZE_OPTIONS = [
	{ value: '10', label: '10件' },
	{ value: '20', label: '20件' },
	{ value: '50', label: '50件' }
];

function emptySettings (): Settings {
	return {
		siteName: '',
		adminEmail: '',
		pageSize: '20',
		notifyEnabled: false,
		notifyEmail: '',
		notifyTypes: { error: true, warning: true, daily: false }
	};
}

function validate (form: Settings): Record<string, string> {
	const errors: Record<string, string> = {};

	if (!form.siteName.trim()) {
		errors.siteName = 'サイト名を入力してください';
	}

	if (!form.adminEmail.trim()) {
		errors.adminEmail = '管理者メールアドレスを入力してください';
	} else if (!EMAIL_RE.test(form.adminEmail)) {
		errors.adminEmail = 'メールアドレスの形式が正しくありません';
	}

	if (form.notifyEnabled) {
		if (!form.notifyEmail.trim()) {
			errors.notifyEmail = '通知先アドレスを入力してください';
		} else if (!EMAIL_RE.test(form.notifyEmail)) {
			errors.notifyEmail = 'メールアドレスの形式が正しくありません';
		}
	}

	return errors;
}

function formatDateTime (iso: string): string {
	return new Date(iso).toLocaleString('ja-JP');
}

/* 検証エラー表示中だけ入力のたびに再検証し、直した項目のエラーを消す */
function revalidate (_value: unknown, ctx: Context): void {
	if (!ctx.get('hasError')) { return; }
	ctx.store.patch({ errors: validate(ctx.get('form')) });
}

async function enterSettings (ctx: Context): Promise<void> {
	ctx.set('loading', true);
	const form = await loadSettings();
	ctx.store.patch({ form, errors: {}, hasError: false, loading: false });
}

async function enterHistory (ctx: Context): Promise<void> {
	ctx.set('loading', true);
	const history = await fetchHistory();
	ctx.store.patch({ history, loading: false });
}

async function save (ctx: Context): Promise<void> {
	const form = ctx.get('form');
	const errors = validate(form);
	ctx.store.patch({ errors, hasError: Object.keys(errors).length > 0 });

	if (Object.keys(errors).length > 0) {
		notify.warning('入力内容を確認してください');
		return;
	}

	ctx.set('saving', true);
	await saveSettings(form, CURRENT_USER);
	const history = await fetchHistory();
	ctx.store.patch({ saving: false, history });
	notify.success('保存しました');
}

async function doReset (ctx: Context): Promise<void> {
	ctx.set('resetting', true);
	const form = await resetSettings(CURRENT_USER);
	const history = await fetchHistory();
	ctx.store.patch({
		form,
		errors: {},
		hasError: false,
		resetting: false,
		confirmingReset: false,
		history
	});
	notify.success('初期設定に戻しました');
}

const SettingsPage = (ctx: Context) => UI.column(

	UI.row(
		UI.title('システム設定'),
		UI.button('保存履歴').quiet().go('/history')
	).justify('between'),

	UI.tabs([
		{ value: 'basic', label: '基本' },
		{ value: 'notify', label: '通知' }
	]).bind('tab'),

	UI.form(
		UI.column(

			UI.card(
				UI.column(
					UI.text('siteName').label('サイト名').required().bind('form.siteName')
						.onInput(revalidate).error(() => ctx.get('errors').siteName),
					UI.text('adminEmail').label('管理者メールアドレス').required().bind('form.adminEmail')
						.onInput(revalidate).error(() => ctx.get('errors').adminEmail),
					UI.select('pageSize').label('表示件数').required()
						.options(PAGE_SIZE_OPTIONS).bind('form.pageSize')
				).gap('md')
			).when((c) => c.get('tab') === 'basic'),

			UI.card(
				UI.column(
					UI.toggle('notifyEnabled').label('メール通知を受け取る').bind('form.notifyEnabled'),
					UI.text('notifyEmail').label('通知先アドレス').bind('form.notifyEmail')
						.disabled((c) => !c.get('form').notifyEnabled)
						.onInput(revalidate).error(() => ctx.get('errors').notifyEmail),
					UI.label('通知の種類'),
					UI.row(
						UI.checkbox('notifyError').label('エラー').bind('form.notifyTypes.error'),
						UI.checkbox('notifyWarning').label('警告').bind('form.notifyTypes.warning'),
						UI.checkbox('notifyDaily').label('日次レポート').bind('form.notifyTypes.daily')
					).gap('lg')
				).gap('md')
			).when((c) => c.get('tab') === 'notify'),

			UI.row(
				UI.button('初期設定に戻す').onClick((c) => c.set('confirmingReset', true)),
				UI.button('保存').primary().loading(() => ctx.get('saving')).onClick(save)
			).justify('end').gap('sm')

		).gap('lg')
	).onSubmit(save),

	UI.dialog(UI.label('設定を初期状態に戻します。この操作は元に戻せません。'))
		.title('初期設定に戻す')
		.size('sm')
		.open(() => ctx.get('confirmingReset'))
		.onClose(() => ctx.set('confirmingReset', false))
		.footer(
			UI.row(
				UI.button('やめる').onClick(() => ctx.set('confirmingReset', false)),
				UI.button('初期設定に戻す').danger()
					.loading(() => ctx.get('resetting')).onClick(doReset)
			).justify('end').gap('sm')
		)

).gap('lg').width('md');

const HistoryPage = (ctx: Context) => UI.column(

	UI.row(
		UI.title('保存履歴'),
		UI.button('設定画面へ戻る').go('/')
	).justify('between'),

	UI.table<HistoryEntry>(() => ctx.get('history'))
		.rowKey((entry) => entry.savedAt)
		.loading(() => ctx.get('loading'))
		.empty('まだ保存されていません')
		.column({ key: 'savedAt', label: '保存日時', cell: (entry) => formatDateTime(entry.savedAt) })
		.column({ key: 'changedBy', label: '変更者' })

).gap('lg').width('md');

App.of()
	.state({
		tab: 'basic',
		form: emptySettings(),
		errors: {},
		hasError: false,
		saving: false,
		resetting: false,
		confirmingReset: false,
		history: [],
		loading: false
	})
	.theme('original')
	.route('/', SettingsPage, { enter: enterSettings })
	.route('/history', HistoryPage, { enter: enterHistory })
	.mount();
