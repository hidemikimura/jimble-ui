export interface Product {
	id: number;
	name: string;
	code: string;
	price: number;
	category: 'food' | 'drink' | 'other';
	published: boolean;
}

export type NewProduct = Omit<Product, 'id'>;

const products: Product[] = [
	{ id: 1, name: 'りんごジュース', code: 'D-001', price: 180, category: 'drink', published: true },
	{ id: 2, name: 'オレンジジュース', code: 'D-002', price: 190, category: 'drink', published: true },
	{ id: 3, name: 'ミネラルウォーター', code: 'D-003', price: 120, category: 'drink', published: false },
	{ id: 4, name: 'ポテトチップス', code: 'F-001', price: 150, category: 'food', published: true },
	{ id: 5, name: 'チョコレート', code: 'F-002', price: 220, category: 'food', published: true },
	{ id: 6, name: 'クッキー', code: 'F-003', price: 300, category: 'food', published: false },
	{ id: 7, name: 'ティッシュペーパー', code: 'O-001', price: 250, category: 'other', published: true },
	{ id: 8, name: '除菌シート', code: 'O-002', price: 400, category: 'other', published: false }
];

let nextId = products.length + 1;

function delay<T> (value: T, ms = 200): Promise<T> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(value), ms);
	});
}

export async function listProducts (): Promise<Product[]> {
	return delay(products.map((p) => ({ ...p })));
}

export async function getProduct (id: number): Promise<Product | null> {
	const found = products.find((p) => p.id === id);
	return delay(found ? { ...found } : null);
}

export async function createProduct (data: NewProduct): Promise<Product> {
	const product: Product = { ...data, id: nextId };
	nextId += 1;
	products.push(product);
	return delay(product);
}

export async function deleteProduct (id: number): Promise<void> {
	const index = products.findIndex((p) => p.id === id);
	if (index >= 0) {
		products.splice(index, 1);
	}
	return delay(undefined);
}
