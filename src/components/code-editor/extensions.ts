// jimble-code-editor の CodeMirror の設定(見た目・色分け・変数のチップ・変数の補完)
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import {
  filterVariables,
  variableQuery,
  variableRegExp,
  variableToken,
  type CodeEditorVariable,
} from './variables.js'

/** 変数の設定(区切り記号と、挿入・補完できる変数) */
export interface VariableOptions {
  variables: readonly CodeEditorVariable[]
  prefix: string
  suffix: string
  /** 未定義の変数のチップに添える説明 */
  unknownTitle: (name: string) => string
}

// 色・余白は CSS 変数で受ける(生の色は書かない)。--_* は部品の base が持つ内部変数
export const theme: Extension = EditorView.theme({
  '&': {
    flex: '1',
    minWidth: '0',
    color: 'inherit',
    backgroundColor: 'transparent',
    fontSize: 'inherit',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--_font)',
    lineHeight: '1.5',
    minHeight: 'calc(var(--_rows) * 1.5em + 0.75rem)',
    maxHeight: 'var(--jimble-code-editor-max-height, 20rem)',
    overflow: 'auto',
  },
  '.cm-content': { padding: '0.375rem 0', caretColor: 'var(--_fg)' },
  '.cm-line': { padding: '0 var(--_px)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--_fg)' },
  '.cm-placeholder': { color: 'var(--_ph)' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-fg-muted)',
    border: 'none',
    borderInlineEnd: '1px solid var(--color-line)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 0.5rem 0 0.75rem' },
  // 変数のチップ(part="variable")。::part(variable) で利用者が変えられる
  '.cm-jimble-variable': {
    display: 'inline-block',
    padding: '0 0.375rem',
    margin: '0 0.0625rem',
    borderRadius: 'var(--jimble-code-editor-variable-radius, var(--radius-sm))',
    backgroundColor: 'var(--jimble-code-editor-variable-bg, var(--color-surface-accent))',
    color: 'var(--jimble-code-editor-variable-fg, var(--color-fg-accent))',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.875em',
    lineHeight: '1.4',
    // 強制色モードでも形が見えるように、透明な枠を持つ
    outline: '1px solid transparent',
  },
  '.cm-jimble-variable[part~="unknown"]': {
    backgroundColor: 'var(--color-surface-warning)',
    color: 'var(--color-fg-warning-strong)',
    textDecoration: 'underline wavy',
    textDecorationThickness: '1px',
  },
  // 候補の一覧(ドロップダウンメニューと同じ見た目)
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface-overlay)',
    color: 'var(--color-fg)',
    border: 'none',
    borderRadius: 'var(--radius-overlay)',
    boxShadow: 'var(--shadow-lg), inset 0 0 0 1px var(--color-line)',
    outline: '1px solid transparent',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-sans)',
    maxHeight: '15rem',
    padding: '0.25rem',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '0.375rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    lineHeight: '1.25',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-item-hover)',
    color: 'var(--color-fg)',
  },
  '.cm-completionLabel': { fontSize: '0.875rem' },
  '.cm-completionDetail': {
    marginInlineStart: '0.75rem',
    fontStyle: 'normal',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--color-fg-muted)',
  },
  // 選択中の候補の背景(item-hover)の上では、補助の色はコントラストが足りないので、本文の色にする
  '.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail': {
    color: 'var(--color-fg)',
  },
  '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '600' },
  '.cm-tooltip.cm-completionInfo': {
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    color: 'var(--color-fg-muted)',
  },
})

// 色分け。色はトークン(コントラストは tests/unit/contrast.test.ts で保証する)
export const highlight: Extension = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [tags.tagName, tags.keyword], color: 'var(--color-fg-accent)' },
    { tag: [tags.attributeName, tags.propertyName], color: 'var(--color-fg-info-strong)' },
    { tag: [tags.string, tags.attributeValue], color: 'var(--color-fg-success-strong)' },
    { tag: [tags.number, tags.bool, tags.null], color: 'var(--color-fg-warning-strong)' },
    { tag: [tags.comment], color: 'var(--color-fg-muted)', fontStyle: 'italic' },
    { tag: [tags.angleBracket, tags.punctuation], color: 'var(--color-fg-muted)' },
    { tag: [tags.invalid], color: 'var(--color-fg-danger)' },
  ]),
)

class VariableWidget extends WidgetType {
  constructor(
    readonly name: string,
    readonly label: string | undefined,
    readonly title: string,
  ) {
    super()
  }
  override eq(other: VariableWidget): boolean {
    // title(未定義の変数の説明)も比べる。言語を切り替えたとき、古い説明の DOM を使い回さない
    return other.name === this.name && other.label === this.label && other.title === this.title
  }
  toDOM(): HTMLElement {
    const chip = document.createElement('span')
    chip.className = 'cm-jimble-variable'
    chip.setAttribute('part', this.label === undefined ? 'variable unknown' : 'variable')
    chip.textContent = this.label ?? this.name
    if (this.label === undefined) chip.title = this.title
    return chip
  }
}

/** `{{name}}` をチップで見せる。チップは 1 つの文字として扱う(カーソルが中に入らず、Backspace 1 回で消える) */
export function variableChips(options: VariableOptions): Extension {
  const labels = new Map(options.variables.map((v) => [v.name, v.label ?? v.name]))
  const decorator = new MatchDecorator({
    regexp: variableRegExp(options.prefix, options.suffix),
    decoration: (match) => {
      const name = match[1]!
      return Decoration.replace({
        widget: new VariableWidget(name, labels.get(name), options.unknownTitle(name)),
      })
    },
  })
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view)
      }
      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations)
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  )
}

/** 開きの区切り(`{{`)を入力したとき・Ctrl+Space で、変数の候補を出す */
export function variableCompletion(options: VariableOptions): Extension {
  const { variables, prefix, suffix } = options
  const source = (context: CompletionContext): CompletionResult | null => {
    // 読み取り専用では開かない(候補のクリックは、CodeMirror の readOnly の検査を通らずに書き換える)
    if (!variables.length || context.state.readOnly) return null
    const line = context.state.doc.lineAt(context.pos)
    const typing = variableQuery(line.text.slice(0, context.pos - line.from), prefix, suffix)
    if (!typing && !context.explicit) return null
    return {
      from: typing ? line.from + typing.from : context.pos,
      // 絞り込みは自前(ラベルの日本語・全角半角・かなの違いに合わせる)
      filter: false,
      options: filterVariables(variables, typing?.query ?? '').map((v) => ({
        label: v.label ?? v.name,
        detail: v.label ? v.name : undefined,
        info: v.description,
        apply: variableToken(v.name, prefix, suffix),
      })),
    }
  }
  return autocompletion({ override: [source], icons: false })
}
