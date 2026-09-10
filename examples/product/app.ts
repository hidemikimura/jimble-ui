import { UI, App, notify } from '../../dist/index.js';
import type { Context } from '../../dist/index.js';
import { listProducts, getProduct, createProduct, deleteProduct } from './product-service.js';
import type { Product } from './product-service.js';

const PAGE_SIZE = 5;

interface ProductForm {
	name: string;
	code: string;
	price: number | null;
	category: Product['category'];
	published: boolean;
}

/* この画面が使う状態。ここに書いたものだけが読み書きできる */
declare global {
	interface JimbleAppState {
		list: Product[];
		loading: boolean;
		filter: 'all' | 'published' | 'unpublished';
		keyword: string;
		page: number;
		sortKey: string;
		sortOrder: 'asc' | 'desc';
		form: ProductForm;
		errors: Record<string, string>;
		saving: boolean;
		current: Product | null;
		confirming: boolean;
		removing: boolean;
	}
}

const CATEGORY_LABELS: Record<Product['category'], string> = {
	food: '食品',
	drink: '飲料',
	other: 'その他'
};

const CATEGORIES: { value: Product['category']; label: string }[] = [
	{ value: 'food', label: '食品' },
	{ value: 'drink', label: '飲料' },
	{ value: 'other', label: 'その他' }
];

function categoryLabel (category: Product['category']): string {
	return CATEGORY_LABELS[category];
}

function emptyForm (): ProductForm {
	return { name: '', code: '', price: null, category: 'food', published: false };
}

function visible (ctx: Context): Product[] {
	const filter = ctx.get('filter');
	const keyword = ctx.get('keyword').trim();

	let items = ctx.get('list').filter((p) => {
		if (filter === 'published' && !p.published) return false;
		if (filter === 'unpublished' && p.published) return false;
		if (keyword && !p.name.includes(keyword)) return false;
		return true;
	});

	const sortKey = ctx.get('sortKey');
	const sortOrder = ctx.get('sortOrder');
	if (sortKey === 'name' || sortKey === 'price') {
		items = [...items].sort((a, b) => {
			const cmp = sortKey === 'name'
				? a.name.localeCompare(b.name)
				: a.price - b.price;
			return sortOrder === 'asc' ? cmp : -cmp;
		});
	}

	return items;
}

function paged (ctx: Context): Product[] {
	const items = visible(ctx);
	const page = ctx.get('page');
	const start = (page - 1) * PAGE_SIZE;
	return items.slice(start, start + PAGE_SIZE);
}

function validate (form: ProductForm): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!form.name.trim()) errors.name = '商品名を入力してください';
	if (!form.code.trim()) errors.code = '商品コードを入力してください';
	if (form.price === null) {
		errors.price = '価格を入力してください';
	} else if (form.price < 0) {
		errors.price = '価格は0以上で入力してください';
	}
	return errors;
}

function revalidate (_value: unknown, ctx: Context): void {
	ctx.set('errors', validate(ctx.get('form')));
}

const ListPage = (ctx: Context) => UI.column(

	UI.row(
		UI.title('商品一覧'),
		UI.button('新規登録').primary().go('/product/new')
	).justify('between'),

	UI.tabs((c) => [
		{ value: 'all', label: 'すべて', badge: c.get('list').length },
		{ value: 'published', label: '公開中', badge: c.get('list').filter((p) => p.published).length },
		{ value: 'unpublished', label: '非公開', badge: c.get('list').filter((p) => !p.published).length }
	]).bind('filter').onChange(() => ctx.set('page', 1)),

	UI.text('keyword').placeholder('商品名で絞り込み').bind('keyword')
		.onInput(() => ctx.set('page', 1)),

	UI.table<Product>((c) => paged(c))
		.rowKey((p) => String(p.id))
		.loading(() => ctx.get('loading'))
		.empty('該当する商品がありません')
		.sort(() => ctx.get('sortKey'), () => ctx.get('sortOrder'))
		.onSort((key, order) => ctx.store.patch({ sortKey: key, sortOrder: order }))
		.column({ key: 'name', label: '商品名', sortable: true })
		.column({ key: 'code', label: 'コード' })
		.column({ key: 'price', label: '価格', sortable: true, align: 'end' })
		.column({ key: 'category', label: 'カテゴリ', cell: (p) => categoryLabel(p.category) })
		.column({
			key: 'actions',
			label: '',
			align: 'end',
			cell: (p) => UI.button('詳細').quiet().go('/product/' + String(p.id))
		}),

	UI.pagination()
		.page(() => ctx.get('page'))
		.pages((c) => Math.max(1, Math.ceil(visible(c).length / PAGE_SIZE)))
		.total((c) => visible(c).length)
		.onChange((page) => ctx.set('page', page))

).gap('lg').width('lg');

const NewPage = (ctx: Context) => UI.column(
	UI.title('商品登録'),
	UI.form(
		UI.card(
			UI.text('name').label('商品名').required().bind('form.name')
				.onInput(revalidate).error(() => ctx.get('errors').name),
			UI.text('code').label('商品コード').required().bind('form.code')
				.onInput(revalidate).error(() => ctx.get('errors').code),
			UI.number('price').label('価格').required().bind('form.price')
				.onInput(revalidate).error(() => ctx.get('errors').price),
			UI.select('category').label('カテゴリ').required()
				.options(CATEGORIES).bind('form.category'),
			UI.checkbox('published').label('公開中').bind('form.published'),
			UI.row(
				UI.button('キャンセル').go('/'),
				UI.button('登録する').primary().loading(() => ctx.get('saving')).onClick(submit)
			).justify('end').gap('sm')
		).gap('lg')
	).onSubmit(submit)
).gap('lg').width('md');

async function submit (ctx: Context): Promise<void> {
	const errors = validate(ctx.get('form'));
	ctx.set('errors', errors);
	if (Object.keys(errors).length > 0) {
		notify.warning('入力内容を確認してください');
		return;
	}
	ctx.set('saving', true);
	const form = ctx.get('form');
	await createProduct({
		name: form.name,
		code: form.code,
		price: form.price ?? 0,
		category: form.category,
		published: form.published
	});
	ctx.store.patch({ saving: false, form: emptyForm(), errors: {} });
	notify.success('登録しました');
	ctx.go('/');
}

const DetailPage = (ctx: Context) => UI.column(

	UI.row(
		UI.title(() => ctx.get('current')?.name ?? '商品詳細'),
		UI.button('一覧へ戻る').go('/')
	).justify('between'),

	UI.card(
		UI.row(UI.label('商品コード'), UI.label(() => ctx.get('current')?.code ?? '')).justify('between'),
		UI.row(UI.label('価格'), UI.label(() => String(ctx.get('current')?.price ?? ''))).justify('between'),
		UI.row(
			UI.label('カテゴリ'),
			UI.label(() => {
				const current = ctx.get('current');
				return current ? categoryLabel(current.category) : '';
			})
		).justify('between'),
		UI.row(
			UI.label('公開状況'),
			UI.label(() => (ctx.get('current')?.published ? '公開中' : '非公開'))
		).justify('between')
	).gap('md'),

	UI.button('削除').danger().onClick(() => ctx.set('confirming', true)),

	UI.dialog(UI.label(() => (ctx.get('current')?.name ?? '') + ' を削除します。元に戻せません。'))
		.title('削除の確認')
		.size('sm')
		.open(() => ctx.get('confirming'))
		.onClose(() => ctx.set('confirming', false))
		.footer(
			UI.row(
				UI.button('やめる').onClick(() => ctx.set('confirming', false)),
				UI.button('削除する').danger().loading(() => ctx.get('removing')).onClick(remove)
			).justify('end').gap('sm')
		)

).gap('lg').width('md');

async function remove (ctx: Context): Promise<void> {
	const current = ctx.get('current');
	if (!current) return;
	ctx.set('removing', true);
	await deleteProduct(current.id);
	ctx.store.patch({ removing: false, confirming: false, current: null });
	notify.success('削除しました');
	ctx.go('/');
}

App.of()
	.state({
		list: [],
		loading: false,
		filter: 'all',
		keyword: '',
		page: 1,
		sortKey: 'name',
		sortOrder: 'asc',
		form: emptyForm(),
		errors: {},
		saving: false,
		current: null,
		confirming: false,
		removing: false
	})
	.theme('original')
	.route('/', ListPage, {
		enter: async (ctx) => {
			ctx.set('loading', true);
			const list = await listProducts();
			ctx.store.patch({ list, loading: false, page: 1 });
		}
	})
	.route('/product/new', NewPage, {
		enter: async (ctx) => {
			ctx.store.patch({ form: emptyForm(), errors: {} });
		}
	})
	.route('/product/:id', DetailPage, {
		enter: async (ctx) => {
			const id = Number(ctx.params.id ?? '');
			const current = await getProduct(id);
			ctx.store.patch({ current, confirming: false });
		}
	})
	.mount();
