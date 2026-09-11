import { html } from '../../vendor/lit.js';
import type { TemplateResult } from '../../vendor/lit.js';
import { Builder, resolve, text } from '../core/builder.js';
import type { TextValue } from '../core/builder.js';
import type { Context } from '../core/context.js';
import type { AppState, Path, PathValue, Resolvable, SelectOption } from '../core/types.js';

/**
 * 複数選択ビルダー
 *
 * <pre>
 * UI.checkboxes('categories')
 *     .label('商品カテゴリ')
 *     .options((ctx) =&gt; ctx.get('categoryOptions'))
 *     .bind('form.category_ids')      // string[] を持つパス
 *     .inline();
 * </pre>
 */
export class CheckboxesBuilder<S extends object = AppState> extends Builder<S> {

	private name: string;
	private optionList: Resolvable<SelectOption[], Context<S>> = [];
	private path: string | null = null;
	private fixedValues: Resolvable<string[], Context<S>> | undefined;
	private labelText: TextValue<S> | undefined;
	private hintText: TextValue<S> | undefined;
	private errorText: Resolvable<string | undefined, Context<S>> | undefined;
	private requiredValue = false;
	private disabledValue: Resolvable<boolean, Context<S>> | undefined;
	private inlineValue = false;
	private changeHandler: ((values: string[], ctx: Context<S>) => unknown) | null = null;

	constructor (name: string) {

		super();
		this.name = name;

	}

	/**
	 * 選択肢
	 *
	 * @param options 選択肢
	 * @return ビルダー
	 */
	options (options: Resolvable<SelectOption[], Context<S>>): this {

		this.optionList = options;
		return this;

	}

	/**
	 * 見出し
	 *
	 * @param text 文言
	 * @return ビルダー
	 */
	label (text: TextValue<S>): this {

		this.labelText = text;
		return this;

	}

	/**
	 * 補足
	 *
	 * @param text 文言
	 * @return ビルダー
	 */
	hint (text: TextValue<S>): this {

		this.hintText = text;
		return this;

	}

	/**
	 * エラー文言
	 *
	 * @param text 文言
	 * @return ビルダー
	 */
	error (text: Resolvable<string | undefined, Context<S>>): this {

		this.errorText = text;
		return this;

	}

	/**
	 * 必須の印を出す
	 *
	 * @return ビルダー
	 */
	required (): this {

		this.requiredValue = true;
		return this;

	}

	/**
	 * 使用不可
	 *
	 * @param value 使用不可か
	 * @return ビルダー
	 */
	disabled (value: Resolvable<boolean, Context<S>> = true): this {

		this.disabledValue = value;
		return this;

	}

	/**
	 * 横に並べる
	 *
	 * @return ビルダー
	 */
	inline (): this {

		this.inlineValue = true;
		return this;

	}

	/**
	 * 選ばれている値を直接指定する
	 *
	 * @param values 値
	 * @return ビルダー
	 */
	values (values: Resolvable<string[], Context<S>>): this {

		this.fixedValues = values;
		return this;

	}

	/**
	 * 状態と双方向に結び付ける（{@code string[]} を持つパス）
	 *
	 * @param path 状態のパス
	 * @return ビルダー
	 */
	bind<P extends Path<S> & string> (path: P): this {

		this.path = path;
		return this;

	}

	/**
	 * 変わったときの処理
	 *
	 * @param handler 処理
	 * @return ビルダー
	 */
	onChange (handler: (values: string[], ctx: Context<S>) => unknown): this {

		this.changeHandler = handler;
		return this;

	}

	protected override template (ctx: Context<S>): TemplateResult {

		const current = this.fixedValues !== undefined
			? resolve(this.fixedValues, ctx)
			: (this.path == null ? [] : ctx.store.get(this.path as Path<S> & string));

		return html`<jb-checkboxes
			.name=${this.name}
			.options=${resolve(this.optionList, ctx) ?? []}
			.values=${Array.isArray(current) ? current.map((value) => String(value)) : []}
			.label=${text(this.labelText, ctx)}
			.hint=${text(this.hintText, ctx)}
			.error=${resolve(this.errorText, ctx) ?? ''}
			.required=${this.requiredValue}
			.disabled=${resolve(this.disabledValue, ctx) === true}
			.inline=${this.inlineValue}
			@jb-change=${(event: CustomEvent<{ values: string[] }>) => this.accept(event.detail.values, ctx)}
		></jb-checkboxes>`;

	}

	/**
	 * 選ばれた値を受け取る
	 *
	 * @param values 値
	 * @param ctx コンテキスト
	 */
	protected accept (values: string[], ctx: Context<S>): void {

		if (this.path != null) {
			ctx.store.set(this.path as Path<S> & string, values as PathValue<S, Path<S> & string>);
		}
		this.changeHandler?.(values, ctx);

	}

}
