import { JbElement } from './base.js';
import type { PropertyDeclarations } from '../../vendor/lit.js';
import type { SelectOption } from '../core/types.js';

/**
 * 複数選択（チェックボックスの群れ）
 *
 * <p>
 * {@code jb-checkbox} が 1 つの入り切りなのに対し、こちらは
 * <b>選択肢の中から何個でも選ぶ</b>ためのもの。選ばれている値の配列を持ち、
 * 変わったら {@code jb-change} で配列ごと投げる。
 * </p>
 */
export class JbCheckboxes extends JbElement {

	static override tag = 'jb-checkboxes';

	static override properties: PropertyDeclarations = {
		name: { type: String },
		options: { attribute: false },
		values: { attribute: false },
		label: { type: String },
		hint: { type: String },
		error: { type: String, reflect: true, attribute: 'jb-error' },
		required: { type: Boolean, reflect: true, attribute: 'jb-required' },
		disabled: { type: Boolean, reflect: true, attribute: 'jb-disabled' },
		inline: { type: Boolean, reflect: true, attribute: 'jb-inline' }
	};

	/** 項目名 */
	name = '';

	/** 選択肢 */
	options: SelectOption[] = [];

	/** 選ばれている値 */
	values: string[] = [];

	/** 見出し */
	label = '';

	/** 補足 */
	hint = '';

	/** エラー文言 */
	error = '';

	/** 必須か */
	required = false;

	/** 使用不可 */
	disabled = false;

	/** 横に並べるか */
	inline = false;

	/**
	 * その値が選ばれているか
	 *
	 * @param value 値
	 * @return 選ばれていれば true
	 */
	isChecked (value: string): boolean {

		return this.values.includes(value);

	}

	/**
	 * 1 つ入り切りしたときの処理（テーマのテンプレートから呼ぶ）
	 *
	 * @param option 選択肢
	 * @param event イベント
	 */
	handleToggle (option: SelectOption, event: Event): void {

		const checked = (event.target as HTMLInputElement).checked;

		/* 選択肢の並び順を保つ。押した順に並べ替えない */
		const chosen = new Set(this.values);
		if (checked) {
			chosen.add(option.value);
		} else {
			chosen.delete(option.value);
		}
		this.values = this.options.map((entry) => entry.value).filter((value) => chosen.has(value));

		this.dispatchEvent(new CustomEvent('jb-change', {
			detail: { name: this.name, values: this.values, value: option.value, checked },
			bubbles: true,
			composed: true
		}));

	}

}

customElements.define('jb-checkboxes', JbCheckboxes);
