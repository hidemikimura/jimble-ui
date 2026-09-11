import { LitElement, html, svg, nothing } from '../../vendor/lit.js';
import type { PropertyValues, TemplateResult } from '../../vendor/lit.js';
import { currentTheme, subscribeTheme } from '../core/theme.js';
import { isDev, report, fail, JimbleError } from '../core/dev.js';

/**
 * コンポーネント基底
 *
 * <p>
 * 見た目は一切持たない。<b>状態（プロパティ）と振る舞い（イベント）だけ</b>を持ち、
 * HTML と CSS は現在のテーマから受け取る。
 * </p>
 */
export abstract class JbElement extends LitElement {

	/** タグ名（サブクラスで指定する） */
	static tag = '';

	/* テーマ購読の解除関数 */
	#unsubscribe: (() => void) | null = null;

	/* 外部ライブラリを取り付けているときの持ち手 */
	#handle: unknown = null;

	/* 取り付けに使った定義（テーマが変わったか見るため） */
	#attached: object | null = null;

	/* 取り付けたときの器（作り直されていないか見るため） */
	#anchor: Element | null = null;

	/* 取り付けの最中か（描画が続けて来ても二重に取り付けない） */
	#attaching = false;

	/* 取り付けに失敗した定義（同じものを何度も試さない） */
	#failed: object | null = null;

	override createRenderRoot (): HTMLElement | DocumentFragment {

		const root = super.createRenderRoot();
		this.#applyStyles(root);
		return root;

	}

	override connectedCallback (): void {

		super.connectedCallback();
		this.#unsubscribe = subscribeTheme(() => {
			/* テーマが変わったら、載せていたライブラリは<b>必ず捨てて</b>から作り直す */
			this.#detach();
			this.#failed = null;
			this.#applyStyles(this.renderRoot);
			this.requestUpdate();
		});

	}

	override disconnectedCallback (): void {

		this.#unsubscribe?.();
		this.#unsubscribe = null;
		this.#detach();
		super.disconnectedCallback();

	}

	override updated (changed: PropertyValues): void {

		super.updated(changed);
		void this.#syncExternal();

	}

	/**
	 * 外部ライブラリの取り付け・更新をする
	 *
	 * <p>
	 * テーマが {@code mount} を持つ部品だけが対象。持たないテーマに切り替わったら外す。
	 * </p>
	 */
	async #syncExternal (): Promise<void> {

		if (this.#attaching) {
			return;
		}

		const tag = (this.constructor as typeof JbElement).tag;
		const external = currentTheme().external(tag);

		if (external == null) {
			this.#detach();
			return;
		}

		/*
		 * 一度失敗した取り付けは<b>もう試さない</b>。
		 * 描画のたびに試すと、ライブラリによっては 2 回目以降が
		 * 「もう初期化済み」のような<b>別の誤り</b>になり、最初の原因が埋もれる。
		 */
		if (this.#failed === external) {
			return;
		}

		/* 同じ定義で取り付け済みなら、値を伝えるだけ */
		if (this.#attached === external) {

			if (this.#anchor != null && this.#anchor !== this.renderRoot.firstElementChild) {
				fail(
					tag + ' の器が作り直されました（外部ライブラリが載せた中身は失われています）',
					'テーマのテンプレートで、mount が掴む要素を条件分岐の外に出してください'
				);
				this.#detach();
				return;
			}

			try {
				external.update?.(this, this.renderRoot, this.#handle);
			} catch (error) {
				report(error, tag + ' の update');
			}
			return;

		}

		this.#detach();
		this.#attaching = true;

		try {
			const libraries = await currentTheme().libraries(external.uses);
			/* 待っている間に画面から消えていることがある */
			if (!this.isConnected) {
				return;
			}
			this.#handle = external.mount(this, this.renderRoot, libraries);
			this.#attached = external;
			this.#anchor = this.renderRoot.firstElementChild;
		} catch (error) {
			this.#failed = external;
			report(error, tag + ' の mount（この部品の取り付けは諦めます）');
		} finally {
			this.#attaching = false;
		}

	}

	/**
	 * 取り付けていたものを外す
	 */
	#detach (): void {

		if (this.#attached == null) {
			return;
		}

		const external = this.#attached as { unmount?: (el: unknown, root: ParentNode, handle: unknown) => void };
		try {
			external.unmount?.(this, this.renderRoot, this.#handle);
		} catch (error) {
			report(error, (this.constructor as typeof JbElement).tag + ' の unmount');
		}

		this.#handle = null;
		this.#attached = null;
		this.#anchor = null;

	}

	override render (): unknown {

		const tag = (this.constructor as typeof JbElement).tag;
		const template = currentTheme().template(tag);

		if (template == null) {
			return this.#missing(tag);
		}

		try {
			return template(this, html, svg);
		} catch (error) {
			report(error, tag + ' のテンプレート');
			return isDev() ? errorBox(tag + ' のテンプレートで例外が発生しました') : nothing;
		}

	}

	/**
	 * テーマにテンプレートが無いことを知らせる
	 *
	 * <p>黙って空白にしない。これが一番見つけにくい壊れ方なので、必ず目に見える形で出す。</p>
	 *
	 * @param tag タグ名
	 * @return テンプレート
	 */
	#missing (tag: string): unknown {

		const theme = currentTheme().name;
		const message = 'テーマ "' + theme + '" に ' + tag + ' のテンプレートがありません';

		report(new JimbleError(message, 'そのテーマの components に "' + tag + '" を足すか、テンプレートを持つテーマを継承してください'));

		return isDev() ? errorBox(message) : nothing;

	}

	/**
	 * テーマのスタイルを適用する
	 *
	 * @param root シャドウルート
	 */
	#applyStyles (root: HTMLElement | DocumentFragment): void {

		const shadow = root as ShadowRoot;
		if (shadow?.adoptedStyleSheets == null) {
			return;
		}
		shadow.adoptedStyleSheets = currentTheme().styleSheets((this.constructor as typeof JbElement).tag);

	}

}

/**
 * 画面に出す赤いエラー表示
 *
 * @param message 文言
 * @return テンプレート
 */
function errorBox (message: string): TemplateResult {

	return html`<span style="display:inline-block;padding:2px 6px;border:1px solid #f43f5e;border-radius:4px;background:#fff1f2;color:#9f1239;font:11px/1.5 ui-monospace,monospace">${message}</span>`;

}
