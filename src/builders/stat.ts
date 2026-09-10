import { html } from '../../vendor/lit.js';
import type { TemplateResult } from '../../vendor/lit.js';
import { Builder, resolve, text } from '../core/builder.js';
import type { Context } from '../core/context.js';
import type { TextValue } from '../core/builder.js';
import type { AppState, Resolvable, Trend } from '../core/types.js';

/**
 * 統計タイルビルダー
 *
 * <pre>
 * UI.stat('今月の売上', (ctx) => format(ctx.get('sales')))
 *     .unit('円')
 *     .delta('+12%', 'up');
 * </pre>
 */
export class StatBuilder<S extends object = AppState> extends Builder<S> {

	private labelText: TextValue<S>;
	private valueText: TextValue<S>;
	private unitText: TextValue<S> | undefined;
	private deltaText: TextValue<S> | undefined;
	private trendValue: Resolvable<Trend, Context<S>> = 'flat';
	private hintText: TextValue<S> | undefined;

	constructor (label: TextValue<S>, value: TextValue<S>) {

		super();
		this.labelText = label;
		this.valueText = value;

	}

	/**
	 * 単位
	 *
	 * @param text 単位
	 * @return ビルダー
	 */
	unit (text: TextValue<S>): this {

		this.unitText = text;
		return this;

	}

	/**
	 * 増減
	 *
	 * @param text 増減（例: '+12%'）
	 * @param trend 向き
	 * @return ビルダー
	 */
	delta (text: TextValue<S>, trend: Resolvable<Trend, Context<S>> = 'flat'): this {

		this.deltaText = text;
		this.trendValue = trend;
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

	protected override template (ctx: Context<S>): TemplateResult {

		return html`<jb-stat
			.label=${text(this.labelText, ctx)}
			.value=${text(this.valueText, ctx)}
			.unit=${text(this.unitText, ctx)}
			.delta=${text(this.deltaText, ctx)}
			.trend=${resolve(this.trendValue, ctx) ?? 'flat'}
			.hint=${text(this.hintText, ctx)}
		></jb-stat>`;

	}

}
