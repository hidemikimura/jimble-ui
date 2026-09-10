import { html } from '../../vendor/lit.js';
import type { TemplateResult } from '../../vendor/lit.js';
import { Builder, text } from '../core/builder.js';
import type { Context } from '../core/context.js';
import type { TextValue } from '../core/builder.js';
import type { AppState, IconSize } from '../core/types.js';

/**
 * 飾り（アイコン）ビルダー
 *
 * <pre>
 * UI.icon('trash').lg().alt('削除');
 * </pre>
 *
 * <p>使える名前は {@code ICON_NAMES} を参照。知らない名前を書くと開発モードで警告が出る。</p>
 */
export class IconBuilder<S extends object = AppState> extends Builder<S> {

	private iconName: TextValue<S>;
	private iconSize: IconSize = 'md';
	private altText: TextValue<S> | undefined;

	constructor (name: TextValue<S>) {

		super();
		this.iconName = name;

	}

	/** 小さくする */
	sm (): this {

		this.iconSize = 'sm';
		return this;

	}

	/** 大きくする */
	lg (): this {

		this.iconSize = 'lg';
		return this;

	}

	/**
	 * 大きさ
	 *
	 * @param size 大きさ
	 * @return ビルダー
	 */
	size (size: IconSize): this {

		this.iconSize = size;
		return this;

	}

	/**
	 * 読み上げ用の説明
	 *
	 * @param text 文言
	 * @return ビルダー
	 */
	alt (text: TextValue<S>): this {

		this.altText = text;
		return this;

	}

	protected override template (ctx: Context<S>): TemplateResult {

		return html`<jb-icon
			.name=${text(this.iconName, ctx)}
			.size=${this.iconSize}
			.alt=${text(this.altText, ctx)}
		></jb-icon>`;

	}

}
