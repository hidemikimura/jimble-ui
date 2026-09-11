import { JbElement } from './base.js';
import type { PropertyDeclarations } from '../../vendor/lit.js';
import type { SelectOption } from '../core/types.js';

/**
 * 複数選択（選択欄の形）
 *
 * <p>
 * {@code jb-checkboxes} と<b>値の形は同じ</b>（選ばれた値の配列）だが、
 * 見せ方が違う。選択肢が多いとき・検索して絞りたいときはこちら。
 * </p>
 *
 * <p>
 * 素のテーマでは {@code <select multiple>} をそのまま出す。
 * Tom Select のような外部ライブラリで描くのは<b>テーマの仕事</b>で、
 * テーマ定義の {@code mount} / {@code update} / {@code unmount} で載せる。
 * </p>
 */
export class JbMultiselect extends JbElement {

	static override tag = 'jb-multiselect';

	static override properties: PropertyDeclarations = {
		name: { type: String },
		options: { attribute: false },
		values: { attribute: false },
		label: { type: String },
		placeholder: { type: String },
		hint: { type: String },
		error: { type: String, reflect: true, attribute: 'jb-error' },
		required: { type: Boolean, reflect: true, attribute: 'jb-required' },
		disabled: { type: Boolean, reflect: true, attribute: 'jb-disabled' },
		searchable: { type: Boolean, reflect: true, attribute: 'jb-searchable' }
	};

	/** 項目名 */
	name = '';

	/** 選択肢 */
	options: SelectOption[] = [];

	/** 選ばれている値 */
	values: string[] = [];

	/** 見出し */
	label = '';

	/** 例示 */
	placeholder = '';

	/** 補足 */
	hint = '';

	/** エラー文言 */
	error = '';

	/** 必須か */
	required = false;

	/** 使用不可 */
	disabled = false;

	/**
	 * 検索して絞れるようにしたいか
	 *
	 * <p>
	 * <b>これは「望み」であって「実現」ではない。</b>叶えられるテーマ（外部ライブラリを
	 * 載せたテーマ）はそう描き、叶えられないテーマは素の選択欄のままにする。
	 * </p>
	 */
	searchable = false;

	/**
	 * 選ばれている値かどうか
	 *
	 * @param value 値
	 * @return 選ばれていれば true
	 */
	isSelected (value: string): boolean {

		return this.values.includes(value);

	}

	/**
	 * 素の選択欄で選ばれたときの処理（テーマのテンプレートから呼ぶ）
	 *
	 * @param event イベント
	 */
	handleChange (event: Event): void {

		const select = event.target as HTMLSelectElement;
		this.accept([...select.selectedOptions].map((option) => option.value));

	}

	/**
	 * 外部ライブラリから値を受け取る（テーマの mount から呼ぶ）
	 *
	 * @param values 値
	 */
	handleExternal (values: readonly string[]): void {

		this.accept([...values]);

	}

	/**
	 * 値を確定して知らせる
	 *
	 * <p>選択肢の並び順を保つ。選んだ順には並べ替えない。</p>
	 *
	 * @param values 値
	 */
	protected accept (values: string[]): void {

		const chosen = new Set(values);
		const ordered = this.options.map((option) => option.value).filter((value) => chosen.has(value));

		/* 選択肢に無い値が来たら、それも落とさずに後ろへ付ける */
		for (const value of values) {
			if (!ordered.includes(value)) {
				ordered.push(value);
			}
		}

		if (ordered.length === this.values.length && ordered.every((value, index) => value === this.values[index])) {
			return;
		}

		this.values = ordered;
		this.dispatchEvent(new CustomEvent('jb-change', {
			detail: { name: this.name, values: ordered },
			bubbles: true,
			composed: true
		}));

	}

}

customElements.define('jb-multiselect', JbMultiselect);
