import { registerTheme, component } from '../core/theme.js';
import type { JbStack } from '../components/jb-stack.js';
import type { JbText } from '../components/jb-text.js';
import type { JbButton } from '../components/jb-button.js';
import type { JbInput } from '../components/jb-input.js';
import type { JbSelect } from '../components/jb-select.js';
import type { JbCheckbox } from '../components/jb-checkbox.js';
import type { JbRadio } from '../components/jb-radio.js';
import type { JbTabs } from '../components/jb-tabs.js';
import type { JbTable } from '../components/jb-table.js';
import type { JbPagination } from '../components/jb-pagination.js';
import type { JbDialog } from '../components/jb-dialog.js';
import type { JbToast } from '../components/jb-toast.js';
import type { JbForm } from '../components/jb-form.js';
import type { JbGrid } from '../components/jb-grid.js';
import type { JbStat } from '../components/jb-stat.js';
import type { JbChart } from '../components/jb-chart.js';
import type { JbFile } from '../components/jb-file.js';
import type { JbDateRange } from '../components/jb-daterange.js';
import type { JbBreadcrumb } from '../components/jb-breadcrumb.js';
import type { JbAccordion } from '../components/jb-accordion.js';
import type { JbEmpty } from '../components/jb-empty.js';
import type { JbIcon } from '../components/jb-icon.js';
import type { JbMenu } from '../components/jb-menu.js';
import type { JbNav } from '../components/jb-nav.js';
import type { JbPageHeader } from '../components/jb-page-header.js';
import { iconPaths } from './icons.js';
import { menuPosition } from './position.js';
import type { Align, ButtonVariant, Justify, Size, TextVariant, Width } from '../core/types.js';

/**
 * tailui テーマ
 *
 * <p>
 * <a href="https://tailui.in/">tailui</a> の書き方に寄せた明るいテーマ。
 * tailui は JS も CSS も配っておらず、<b>Tailwind のクラスだけで書かれた HTML</b> を配っている。
 * つまり<b>そのままテーマにできる</b>——ここでやっているのは、その書き方を
 * 各コンポーネントのテンプレートに移し替えることだけである。
 * </p>
 *
 * <p>tailui の見た目の決まりごと（実物から写したもの）</p>
 *
 * <ul>
 *   <li>面は白 ＋ <code>ring-1 ring-gray-900/5</code> ＋ <code>shadow-sm</code>。枠線より輪郭（ring）を使う</li>
 *   <li>入力も枠線を持たず <code>ring-1 ring-inset ring-gray-200</code>、フォーカスで <code>ring-indigo-600</code></li>
 *   <li>角は <code>rounded-lg</code> / <code>rounded-xl</code>、押せるものは <code>active:scale-95</code></li>
 *   <li>主色は indigo-600、文字は gray-900 と gray-500</li>
 * </ul>
 *
 * <p>
 * tailui 本体は Tailwind v4 を前提にしているが、ここで使っているクラスは
 * <b>v3 でも通るものだけ</b>にしてある（CSS の抽出が tailwind-dark と同じ仕掛けで済む）。
 * </p>
 *
 * <p>
 * 字面も tailui に合わせて Plus Jakarta Sans を先頭に置いてあるが、
 * <b>フォントの取得はしない</b>。使いたい場合はアプリ側の HTML で読み込むこと。
 * </p>
 *
 * <p>
 * クラス名は必ず「文字列そのまま」で書くこと。
 * 'bg-' + color のような組み立て方をすると、CSS 生成時に検出されない。
 * </p>
 */

/* 間隔 */
const GAP: Record<Size, string> = { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-5', xl: 'gap-8' };

/* 余白 */
const PAD: Record<Size, string> = { none: 'p-0', xs: 'p-1', sm: 'p-2', md: 'p-3', lg: 'p-5', xl: 'p-8' };

/* 交差軸 */
const ALIGN: Record<Align, string> = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' };

/* 主軸 */
const JUSTIFY: Record<Justify, string> = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end',
	between: 'justify-between'
};

/* 幅 */
const WIDTH: Record<Width, string> = { full: 'w-full', sm: 'w-full max-w-sm', md: 'w-full max-w-2xl', lg: 'w-full max-w-5xl' };

/*
 * ボタン
 *
 * tailui の「押せるもの」は、角丸・影・active:scale-95 が共通で、
 * 主・危険は塗り、控えめは文字だけ、という作りになっている。
 */
const BUTTON_BASE: string = 'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON: Record<ButtonVariant, string> = {
	default: 'border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:shadow',
	primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-500/20 focus:ring-2 focus:ring-indigo-500/40',
	danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow-md hover:shadow-red-500/20 focus:ring-2 focus:ring-red-500/40',
	quiet: 'px-4 py-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700',
	'quiet-danger': 'px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700'
};

/* 文字 */
const TEXT: Record<TextVariant, string> = {
	title: 'text-2xl font-bold tracking-tight text-gray-900',
	heading: 'text-base font-semibold leading-7 text-gray-900',
	body: 'text-sm leading-6 text-gray-700',
	caption: 'text-xs text-gray-500',
	danger: 'text-sm font-medium text-red-600'
};

/*
 * 入力
 *
 * tailui の入力は<b>枠線を持たない</b>。ring-inset で輪郭を描き、
 * フォーカスで ring を太くして色を変える。
 */
const FIELD_BASE = 'block w-full rounded-lg border-0 bg-white px-4 text-gray-900 shadow-sm ring-1 ring-inset transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset disabled:opacity-60 sm:text-sm sm:leading-6';
const FIELD_NORMAL = 'ring-gray-200 hover:ring-gray-300 focus:ring-indigo-600';
const FIELD_ERROR = 'ring-red-300 hover:ring-red-400 focus:ring-red-600';

/* ラベルと補足（各入力で共通） */
const LABEL_CLASS = 'mb-2 block text-sm font-medium leading-6 text-gray-900';
const HINT_CLASS = 'mt-1.5 text-xs text-gray-500';
const ERROR_CLASS = 'mt-1.5 text-xs font-medium text-red-600';

/* カード面（stat / chart / empty / card で使い回す） */
const SURFACE = 'rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5';

/* ページ送り（tailui は上に線を引く形） */
const PAGE_BUTTON = 'inline-flex cursor-pointer items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40';
const PAGE_CURRENT = 'inline-flex cursor-pointer items-center border-t-2 border-indigo-500 px-4 pt-4 text-sm font-medium text-indigo-600';

/* 知らせの色（tailui の badge / alert と同じ、薄い塗り ＋ ring） */
const TOAST_CLASS: Record<string, string> = {
	info: 'bg-white text-gray-900 ring-gray-900/10',
	success: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
	warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
	danger: 'bg-red-50 text-red-800 ring-red-600/20'
};

/* ダイアログの幅 */
const DIALOG_WIDTH: Record<string, string> = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-3xl'
};

/**
 * クラス名をつなぐ
 *
 * @param names クラス名
 * @return クラス
 */
const classes = (...names: (string | false | undefined)[]): string => names.filter(Boolean).join(' ');

/**
 * 対応表から引く
 *
 * @param map 対応表
 * @param key キー
 * @param fallback 既定値
 * @return クラス
 */
const pick = <K extends string>(map: Record<K, string>, key: K | undefined, fallback = ''): string =>
	(key == null ? undefined : map[key]) ?? fallback;

/* 表示と幅だけは :host に当てる（Shadow DOM のホストには class を付けられないため） */
const HOST_STYLES = `
	:host { display: block; }
	:host([jb-width="full"]) { width: 100%; }
	:host([jb-width="sm"]) { width: 100%; max-width: 24rem; }
	:host([jb-width="md"]) { width: 100%; max-width: 42rem; }
	:host([jb-width="lg"]) { width: 100%; max-width: 64rem; }
`;

/* ダイアログの位置決めだけは CSS で持つ */
const DIALOG_STYLES = `
	:host { display: none; }
	:host([jb-open]) { display: block; position: fixed; inset: 0; z-index: 1000; }
`;

/* グリッドと SVG は utility では表せないので CSS で持つ */
const GRID_STYLES = `
	:host { display: grid; gap: .75rem; }
	:host([jb-columns="1"]) { grid-template-columns: 1fr; }
	:host([jb-columns="2"]) { grid-template-columns: repeat(2, 1fr); }
	:host([jb-columns="3"]) { grid-template-columns: repeat(3, 1fr); }
	:host([jb-columns="4"]) { grid-template-columns: repeat(4, 1fr); }
	:host([jb-columns="5"]) { grid-template-columns: repeat(5, 1fr); }
	:host([jb-columns="6"]) { grid-template-columns: repeat(6, 1fr); }
	:host([jb-gap="sm"]) { gap: .5rem; }
	:host([jb-gap="lg"]) { gap: 1.25rem; }
	:host([jb-gap="xl"]) { gap: 2rem; }
	@media (max-width: 720px) { :host { grid-template-columns: 1fr !important; } }
`;

const CHART_STYLES = HOST_STYLES + `
	svg { display: block; width: 100%; overflow: visible; }
	.bar { fill: rgb(79 70 229); }
	.line { fill: none; stroke: rgb(79 70 229); stroke-width: 2; vector-effect: non-scaling-stroke; }
	.dot { fill: rgb(79 70 229); }
	.axis { stroke: rgb(229 231 235); }
`;

const FILE_STYLES = HOST_STYLES + `
	input[type="file"] { display: none; }
`;

/* つかんで並べ替えるときの目印（utility クラスで書けないので直接書く） */
const TABLE_DRAG_STYLES = `
	tbody tr.dragging { opacity: .4; }
	tbody tr.drop-before td { box-shadow: inset 0 2px 0 0 #4f46e5; }
	tbody tr.drop-after td { box-shadow: inset 0 -2px 0 0 #4f46e5; }
`;

/* jb-icon */
const ICON_STYLES = `
	:host { display: inline-flex; align-items: center; justify-content: center; color: inherit; vertical-align: middle; }
	svg { width: 18px; height: 18px; display: block; }
	:host([jb-size="sm"]) svg { width: 14px; height: 14px; }
	:host([jb-size="lg"]) svg { width: 24px; height: 24px; }
`;

/* jb-menu（表の枠に切り取られないよう、一覧は fixed で置く） */
const MENU_STYLES = `
	:host { display: inline-block; position: relative; }
	.list { position: fixed; z-index: 40; }
`;

/* jb-nav */
const NAV_STYLES = `
	:host { display: flex; flex-direction: column; height: 100%; }
`;

/* jb-page-header */
const PAGE_HEADER_STYLES = `
	:host { display: block; }
	::slotted([slot="breadcrumb"]) { display: block; margin-bottom: .5rem; }
	::slotted([slot="below"]) { display: block; margin-top: 1rem; }
`;

/* 切り替えスイッチ（peer は Shadow DOM でも効くが、ここは素直に CSS で書く） */
const SWITCH_STYLES = HOST_STYLES + `
	input:checked + span { background-color: rgb(79 70 229); }
	input:checked + span > span { transform: translateX(1.25rem); }
	input:focus-visible + span { box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgb(79 70 229); }
`;

export default registerTheme({

	name: 'tailui',

	tokens: {
		'font': "'Plus Jakarta Sans', system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
		'color-bg': '#f9fafb',
		'color-text': '#111827',
		'font-size-body': '14px'
	},

	base: [
		'html, body { margin: 0; padding: 0; min-height: 100%; }',
		'body { background: var(--jb-color-bg); color: var(--jb-color-text);',
		' font-family: var(--jb-font); font-size: var(--jb-font-size-body); }',
		'*, *::before, *::after { box-sizing: border-box; }'
	].join('\n'),

	shared: [() => import('../../vendor/tailui.css.js')],

	components: {

		'jb-stack': component<JbStack>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class=${classes(
					'flex min-w-0',
					el.direction === 'row' ? 'flex-row' : 'flex-col',
					pick(GAP, el.gap, 'gap-3'),
					pick(PAD, el.pad, el.surface ? 'p-6' : ''),
					pick(ALIGN, el.align, el.direction === 'row' ? 'items-center' : ''),
					pick(JUSTIFY, el.justify),
					el.wrap ? 'flex-wrap' : '',
					el.surface ? 'rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5' : '',
					pick(WIDTH, el.width)
				)}><slot></slot></div>
			`
		}),

		'jb-text': component<JbText>({
			styles: HOST_STYLES,
			template: (el, html) => html`<span class=${pick(TEXT, el.variant, TEXT.body)}>${el.text}</span>`
		}),

		'jb-button': component<JbButton>({
			styles: ':host { display: inline-block; }',
			template: (el, html) => html`
				<button
					type="button"
					class=${classes(BUTTON_BASE, pick(BUTTON, el.variant, BUTTON.default))}
					?disabled=${el.disabled || el.loading}
					@click=${(e: Event) => el.handleClick(e)}>
					${el.loading
						? html`<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>`
						: ''}${!el.loading && el.icon ? html`<jb-icon jb-name=${el.icon} jb-size="sm"></jb-icon>` : ''}${el.label}
				</button>
			`
		}),

		'jb-input': component<JbInput>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div>
					${el.label
						? html`<label class=${LABEL_CLASS}>
								${el.label}${el.required ? html`<span class="ml-0.5 text-red-500">*</span>` : ''}
							</label>`
						: ''}
					${el.multiline
						? html`<textarea
								class=${classes(FIELD_BASE, 'min-h-28 resize-y py-3', el.error ? FIELD_ERROR : FIELD_NORMAL)}
								.value=${el.value ?? ''}
								placeholder=${el.placeholder ?? ''}
								?disabled=${el.disabled}
								@input=${(e: Event) => el.handleInput(e)}
								@change=${(e: Event) => el.handleChange(e)}></textarea>`
						: html`<input
								class=${classes(FIELD_BASE, 'py-3', el.error ? FIELD_ERROR : FIELD_NORMAL)}
								type=${el.type || 'text'}
								.value=${el.value ?? ''}
								placeholder=${el.placeholder ?? ''}
								?disabled=${el.disabled}
								@input=${(e: Event) => el.handleInput(e)}
								@change=${(e: Event) => el.handleChange(e)}>`}
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-select': component<JbSelect>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div>
					${el.label
						? html`<label class=${LABEL_CLASS}>${el.label}${el.required ? html`<span class="ml-0.5 text-red-500">*</span>` : ''}</label>`
						: ''}
					<div class="relative">
						<select
							class=${classes(FIELD_BASE, 'appearance-none py-3 pr-10', el.error ? FIELD_ERROR : FIELD_NORMAL)}
							?disabled=${el.disabled}
							@change=${(e: Event) => el.handleChange(e)}>
							${el.placeholder || !el.value
								? html`<option value="" ?selected=${!el.value}>${el.placeholder || '選択してください'}</option>`
								: ''}
							${el.options.map((option) => html`
								<option value=${option.value} ?disabled=${option.disabled === true} ?selected=${option.value === el.value}>${option.label}</option>
							`)}
						</select>
						<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
							<jb-icon jb-name="chevron-down" jb-size="sm"></jb-icon>
						</span>
					</div>
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-checkbox': component<JbCheckbox>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div>
					<label class="group flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-600"
							.checked=${el.checked}
							?disabled=${el.disabled}
							@change=${(e: Event) => el.handleChange(e)}>
						<span class="text-sm font-medium text-gray-900 transition-colors group-hover:text-indigo-600">${el.label}</span>
					</label>
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-switch': component<JbCheckbox>({
			styles: SWITCH_STYLES,
			template: (el, html) => html`
				<div>
					<label class="inline-flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							class="sr-only"
							.checked=${el.checked}
							?disabled=${el.disabled}
							@change=${(e: Event) => el.handleChange(e)}>
						<span class="relative h-7 w-12 rounded-full bg-gray-200 transition-colors duration-300 ease-in-out">
							<span class="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-300 ease-in-out"></span>
						</span>
						<span class="text-sm font-medium text-gray-900">${el.label}</span>
					</label>
					${el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-radio': component<JbRadio>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div>
					${el.label
						? html`<label class=${LABEL_CLASS}>${el.label}${el.required ? html`<span class="ml-0.5 text-red-500">*</span>` : ''}</label>`
						: ''}
					<div class=${classes('flex', el.inline ? 'flex-row flex-wrap gap-3' : 'flex-col gap-3')}>
						${el.options.map((option) => html`
							<label class=${classes(
								'relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:bg-gray-50',
								option.value === el.value ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600' : 'border-gray-200'
							)}>
								<input
									type="radio"
									class="mt-0.5 h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
									name=${el.name}
									value=${option.value}
									?checked=${option.value === el.value}
									?disabled=${el.disabled || option.disabled === true}
									@change=${(e: Event) => el.handleChange(e)}>
								<span class="text-sm font-medium leading-6 text-gray-900">${option.label}</span>
							</label>
						`)}
					</div>
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-tabs': component<JbTabs>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class="flex gap-6 border-b border-gray-200">
					${el.tabs.map((tab) => html`
						<button
							class=${classes(
								'-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
								tab.value === el.value
									? 'border-indigo-500 text-indigo-600'
									: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
							)}
							@click=${() => el.handleSelect(tab.value)}>
							${tab.label}
							${tab.badge == null
								? ''
								: html`<span class=${classes(
									'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
									tab.value === el.value
										? 'bg-indigo-50 text-indigo-700 ring-indigo-600/10'
										: 'bg-gray-50 text-gray-600 ring-gray-500/10'
								)}>${tab.badge}</span>`}
						</button>
					`)}
				</div>
			`
		}),

		'jb-table': component<JbTable>({
			styles: HOST_STYLES + TABLE_DRAG_STYLES,
			template: (el, html) => html`
				<div class="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
					<table class="min-w-full divide-y divide-gray-300">
						<thead>
							<tr>
								${el.columns.map((column) => html`
									<th
										scope="col"
										class=${classes(
											'px-3 py-3.5 text-sm font-semibold text-gray-900',
											column.align === 'center' ? 'text-center' : column.align === 'end' ? 'text-right' : 'text-left',
											column.sortable === true ? 'cursor-pointer select-none hover:text-indigo-600' : ''
										)}
										style=${column.width == null ? '' : 'width:' + column.width}
										@click=${() => el.handleSort(column)}>
										${column.label}
										${el.sortKey === column.key ? html`<span class="ml-1 text-indigo-600">${el.sortOrder === 'asc' ? '▲' : '▼'}</span>` : ''}
									</th>
								`)}
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							${el.loading
								? html`<tr><td class="px-3 py-10 text-center text-sm text-gray-500" colspan=${el.columns.length}>読み込み中…</td></tr>`
								: el.rows.length === 0
									? html`<tr><td class="px-3 py-10 text-center text-sm text-gray-500" colspan=${el.columns.length}>${el.empty}</td></tr>`
									: el.rows.map((row, index) => html`
										<tr
											class=${classes(
												'transition-colors hover:bg-gray-50',
												el.clickable ? 'cursor-pointer' : '',
												el.reorderable ? 'cursor-grab' : '',
												el.dragState(index)
											)}
											draggable=${el.reorderable ? 'true' : 'false'}
											@click=${() => el.handleRowClick(row, index)}
											@dragstart=${(e: DragEvent) => el.handleDragStart(index, e)}
											@dragover=${(e: DragEvent) => el.handleDragOver(index, e)}
											@drop=${(e: DragEvent) => el.handleDrop(index, e)}
											@dragend=${() => el.handleDragEnd()}>
											${row.cells.map((cell, position) => html`
												<td class=${classes(
													'whitespace-nowrap px-3 py-4 text-sm',
													/* tailui は「見出しになる最初の列」だけ濃くする（飾りだけの列は飛ばす） */
													position === el.columns.findIndex((column) => column.label !== '')
														? 'font-medium text-gray-900'
														: 'text-gray-500',
													el.columns[position]?.align === 'center' ? 'text-center' : el.columns[position]?.align === 'end' ? 'text-right' : 'text-left'
												)}>${cell}</td>
											`)}
										</tr>
									`)}
						</tbody>
					</table>
				</div>
			`
		}),

		'jb-pagination': component<JbPagination>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<nav class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200">
					<span class="pt-4 text-sm text-gray-500">${el.summary || '全 ' + String(el.total) + ' 件'}</span>
					<div class="flex items-center">
						<button class=${PAGE_BUTTON} ?disabled=${el.page <= 1} @click=${() => el.handleSelect(el.page - 1)}>前へ</button>
						${el.pageNumbers().map((number) => number === 0
							? html`<span class="px-2 pt-4 text-sm text-gray-400">…</span>`
							: html`<button class=${number === el.page ? PAGE_CURRENT : PAGE_BUTTON} @click=${() => el.handleSelect(number)}>${number}</button>`)}
						<button class=${PAGE_BUTTON} ?disabled=${el.page >= el.pages} @click=${() => el.handleSelect(el.page + 1)}>次へ</button>
					</div>
				</nav>
			`
		}),

		'jb-dialog': component<JbDialog>({
			styles: DIALOG_STYLES,
			template: (el, html) => html`
				${el.open ? html`
					<div class="absolute inset-0 bg-gray-500/75 transition-opacity" @click=${() => el.handleClose()}></div>
					<div class=${classes('relative mx-auto mt-24 w-[calc(100%-2rem)] transform overflow-hidden rounded-xl bg-white text-left shadow-xl ring-1 ring-gray-900/5 transition-all', DIALOG_WIDTH[el.size] ?? DIALOG_WIDTH['md'])}>
						<div class="flex items-center justify-between gap-3 px-6 pt-6">
							<h3 class="text-base font-semibold leading-6 text-gray-900">${el.title}</h3>
							${el.closable
								? html`<button
										class="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
										@click=${() => el.handleClose()}>
										<jb-icon jb-name="close" jb-size="sm"></jb-icon>
									</button>`
								: ''}
						</div>
						<div class="px-6 py-4 text-sm text-gray-600"><slot></slot></div>
						<div class="bg-gray-50 px-6 py-4"><slot name="footer"></slot></div>
					</div>
				` : ''}
			`
		}),

		'jb-toast': component<JbToast>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class=${classes(
					'flex min-w-60 max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ring-inset',
					TOAST_CLASS[el.variant] ?? TOAST_CLASS['info']
				)}>
					<span class="flex-1">${el.message}</span>
					<button class="cursor-pointer opacity-50 transition-opacity hover:opacity-100" @click=${() => el.handleClose()}>
						<jb-icon jb-name="close" jb-size="sm"></jb-icon>
					</button>
				</div>
			`
		}),

		'jb-form': component<JbForm>({
			styles: ':host { display: contents; }',
			template: (_el, html) => html`<slot></slot>`
		}),

		'jb-grid': component<JbGrid>({
			styles: GRID_STYLES,
			template: (el, html) => html`
				<style>${el.min ? ':host { grid-template-columns: repeat(auto-fill, minmax(' + el.min + ', 1fr)); }' : ''}</style>
				<slot></slot>
			`
		}),

		'jb-stat': component<JbStat>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class="relative flex h-full flex-col overflow-hidden rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5 transition-colors hover:bg-gray-50">
					<span class="text-xs font-medium uppercase tracking-wider text-gray-500">${el.label}</span>
					<span class="mt-3 flex items-baseline gap-x-2">
						<span class="text-2xl font-semibold tracking-tight text-gray-900">${el.value}</span>
						${el.unit ? html`<span class="text-xs font-medium text-gray-500">${el.unit}</span>` : ''}
						${el.delta
							? html`<span class=${classes(
								'flex items-center text-xs font-medium',
								el.trend === 'up' ? 'text-emerald-600' : el.trend === 'down' ? 'text-red-600' : 'text-gray-500'
							)}>${el.trend === 'up' ? '▲' : el.trend === 'down' ? '▼' : ''} ${el.delta}</span>`
							: ''}
					</span>
					${el.hint ? html`<span class="mt-1 text-xs text-gray-400">${el.hint}</span>` : ''}
				</div>
			`
		}),

		'jb-chart': component<JbChart>({
			styles: CHART_STYLES,
			template: (el, html, svg) => html`
				<div class=${SURFACE}>
					${el.title ? html`<div class="mb-3 text-base font-semibold leading-6 text-gray-900">${el.title}</div>` : ''}
					${el.points.length === 0
						? html`<div class="py-8 text-center text-sm text-gray-500">${el.empty}</div>`
						: html`
							<svg viewBox="0 0 100 100" preserveAspectRatio="none" style=${'height:' + String(el.height) + 'px'}>
								${el.type === 'bar'
									? el.points.map((point, index) => {
										const width = 100 / el.points.length;
										const height = el.ratio(point.value) * 96;
										return svg`<rect class="bar"
											x=${String(index * width + width * 0.15)}
											y=${String(100 - height)}
											width=${String(width * 0.7)}
											height=${String(height)}></rect>`;
									})
									: svg`
										<polyline class="line" points=${el.polyline(100, 96)}></polyline>
										${el.points.map((point, index) => svg`<circle class="dot"
											cx=${String(el.points.length === 1 ? 50 : (index / (el.points.length - 1)) * 100)}
											cy=${String(96 - el.ratio(point.value) * 96)}
											r="1.2"></circle>`)}
									`}
								${svg`<line class="axis" x1="0" y1="100" x2="100" y2="100"></line>`}
							</svg>
							<div class="mt-1 flex justify-between">
								${el.points.map((point) => html`<span class="text-xs text-gray-500">${point.label}</span>`)}
							</div>
						`}
				</div>
			`
		}),

		'jb-file': component<JbFile>({
			styles: FILE_STYLES,
			template: (el, html) => html`
				<div>
					${el.label ? html`<label class=${LABEL_CLASS}>${el.label}</label>` : ''}
					<label
						class=${classes(
							'flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors',
							el.dragging ? 'border-indigo-400 bg-indigo-50/50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300',
							el.error ? 'border-red-300' : ''
						)}
						@dragover=${(e: DragEvent) => el.handleDragging(e, true)}
						@dragleave=${(e: DragEvent) => el.handleDragging(e, false)}
						@drop=${(e: DragEvent) => el.handleDrop(e)}>
						<jb-icon jb-name="upload" jb-size="lg"></jb-icon>
						<span class="mt-1 font-semibold text-gray-900">ここに放り込むか、押して選んでください</span>
						${el.accept ? html`<span class="text-xs text-gray-400">${el.accept}</span>` : ''}
						<input type="file" accept=${el.accept} ?multiple=${el.multiple} ?disabled=${el.disabled}
							@change=${(e: Event) => el.handleSelect(e)}>
					</label>
					${el.files.length === 0 ? '' : html`
						<div class="mt-2 flex flex-col gap-1">
							${el.files.map((file) => html`
								<span class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
									<span>${file.name}（${Math.ceil(file.size / 1024)}KB）</span>
									<button class="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700" @click=${() => el.handleClear()}>取消</button>
								</span>
							`)}
						</div>
					`}
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-daterange': component<JbDateRange>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div>
					${el.label
						? html`<label class=${LABEL_CLASS}>${el.label}${el.required ? html`<span class="ml-0.5 text-red-500">*</span>` : ''}</label>`
						: ''}
					<div class="flex items-center gap-2">
						<input type="date" class=${classes(FIELD_BASE, 'py-3', FIELD_NORMAL)} .value=${el.from}
							?disabled=${el.disabled} @change=${(e: Event) => el.handleFrom(e)}>
						<span class="text-gray-400">〜</span>
						<input type="date" class=${classes(FIELD_BASE, 'py-3', FIELD_NORMAL)} .value=${el.to}
							?disabled=${el.disabled} @change=${(e: Event) => el.handleTo(e)}>
					</div>
					${el.error
						? html`<p class=${ERROR_CLASS}>${el.error}</p>`
						: el.hint ? html`<p class=${HINT_CLASS}>${el.hint}</p>` : ''}
				</div>
			`
		}),

		'jb-breadcrumb': component<JbBreadcrumb>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<nav aria-label="Breadcrumb">
					<ol class="flex flex-wrap items-center gap-2 text-sm text-gray-500">
						${el.items.map((item, index) => html`
							<li class="flex items-center gap-2">
								${index === 0 ? '' : html`<span class="text-gray-300">${el.separator}</span>`}
								${item.path == null
									? html`<span class="px-2 py-1 font-medium text-gray-900">${item.label}</span>`
									: html`<button
											class="cursor-pointer rounded-md px-2 py-1 font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
											@click=${() => el.handleSelect(item)}>${item.label}</button>`}
							</li>
						`)}
					</ol>
				</nav>
			`
		}),

		'jb-accordion': component<JbAccordion>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					${el.sections.map((section) => html`
						<div>
							<button
								class="flex w-full cursor-pointer items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-gray-50/50"
								@click=${() => el.handleToggle(section.value)}>
								<span class="text-sm font-semibold text-gray-900">${section.label}</span>
								<span class=${classes('text-gray-400 transition-transform', el.isOpen(section.value) ? 'rotate-180' : '')}>
									<jb-icon jb-name="chevron-down" jb-size="sm"></jb-icon>
								</span>
							</button>
							${el.isOpen(section.value)
								? html`<div class="px-4 pb-4 text-sm text-gray-600"><slot name=${'section-' + section.value}></slot></div>`
								: ''}
						</div>
					`)}
				</div>
			`
		}),

		'jb-empty': component<JbEmpty>({
			styles: HOST_STYLES,
			template: (el, html) => html`
				<div class="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-indigo-300">
					${el.icon ? html`<div class="text-3xl">${el.icon}</div>` : ''}
					<h3 class="mt-2 text-sm font-semibold text-gray-900">${el.heading}</h3>
					${el.description ? html`<p class="mt-1 text-sm text-gray-500">${el.description}</p>` : ''}
					<div class="mt-6"><slot></slot></div>
				</div>
			`
		}),

		'jb-icon': component<JbIcon>({
			styles: ICON_STYLES,
			template: (el, html, svg) => html`
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					role=${el.alt ? 'img' : 'presentation'}
					aria-label=${el.alt || 'アイコン'}
					aria-hidden=${el.alt ? 'false' : 'true'}>
					${iconPaths(el.name).map((path) => svg`<path d=${path}></path>`)}
				</svg>
			`
		}),

		'jb-menu': component<JbMenu>({
			styles: MENU_STYLES,
			template: (el, html) => html`
				<button
					class="inline-flex cursor-pointer select-none items-center gap-x-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all hover:bg-gray-50 hover:shadow hover:ring-gray-300 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					type="button"
					aria-haspopup="menu"
					aria-expanded=${el.open ? 'true' : 'false'}
					?disabled=${el.disabled}
					@click=${(e: Event) => el.handleToggle(e)}>
					${el.icon ? html`<jb-icon jb-name=${el.icon} jb-size="sm"></jb-icon>` : ''}
					${el.label ? html`<span>${el.label}</span>` : ''}
				</button>
				${el.open ? html`
					<div class="list w-56 origin-top-right rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5" role="menu" style=${menuPosition(el)}>
						${el.items.map((item) => item.divider === true
							? html`<div class="my-1 h-px bg-gray-100"></div>`
							: html`
								<button
									class=${classes(
										'flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
										item.danger === true
											? 'text-red-600 hover:bg-red-50 hover:text-red-700'
											: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
									)}
									type="button"
									role="menuitem"
									?disabled=${item.disabled === true}
									@click=${(e: Event) => el.handleSelect(item, e)}>
									${item.icon ? html`<jb-icon jb-name=${item.icon} jb-size="sm"></jb-icon>` : ''}
									<span>${item.label}</span>
								</button>
							`)}
					</div>
				` : ''}
			`
		}),

		'jb-nav': component<JbNav>({
			styles: NAV_STYLES,
			template: (el, html) => html`
				<div class="flex h-full flex-col gap-2 border-r border-gray-200 bg-white p-4">
					${el.heading ? html`<div class="px-2 pb-3 text-base font-bold tracking-tight text-gray-900">${el.heading}</div>` : ''}
					<slot></slot>
					<div class="flex flex-col gap-1">
						${el.items.map((item, index) => html`
							${el.startsGroup(index)
								? html`<div class="px-2 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">${item.group}</div>`
								: ''}
							<button
								class=${classes(
									'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
									el.isCurrent(item)
										? 'current bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100'
										: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
								)}
								type="button"
								?disabled=${item.disabled === true}
								@click=${() => el.handleSelect(item)}>
								${item.icon ? html`<jb-icon jb-name=${item.icon} jb-size="sm"></jb-icon>` : ''}
								<span class="flex-1 truncate">${item.label}</span>
								${item.badge == null
									? ''
									: html`<span class="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-500/10">${item.badge}</span>`}
							</button>
						`)}
					</div>
					<div class="mt-auto pt-4"><slot name="footer"></slot></div>
				</div>
			`
		}),

		'jb-page-header': component<JbPageHeader>({
			styles: PAGE_HEADER_STYLES,
			template: (el, html) => html`
				<slot name="breadcrumb"></slot>
				<div class="flex flex-wrap items-start gap-3">
					<div class="min-w-0 flex-1">
						<h1 class="text-2xl font-bold tracking-tight text-gray-900">${el.heading}</h1>
						${el.description ? html`<p class="mt-1 text-sm leading-6 text-gray-500">${el.description}</p>` : ''}
					</div>
					<div class="flex flex-wrap items-center gap-2"><slot></slot></div>
				</div>
				<slot name="below"></slot>
			`
		})

	}

});
