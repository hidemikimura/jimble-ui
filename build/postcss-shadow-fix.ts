// Tailwind v4 の出力を Shadow DOM 内でも動くように補正する PostCSS プラグイン（設計書 §2.4 / F1）
//
// Tailwind v4 は --tw-* の初期値を @property で登録するが、@property は Shadow DOM 内の
// stylesheet では無視される。互換用の `@layer properties { @supports (旧ブラウザ判定) {…} }` は
// 最新ブラウザでは適用されない。そのため:
//   1. @layer properties 内の @supports ラッパーを外して常に有効にする
//      （`*, ::before, ::after, ::backdrop { --tw-x: 初期値 }` が全要素に効く。inherits:false の代替）
//   2. 無効な @property --tw-* を削除する
import type { AtRule, Plugin } from 'postcss'

export default function shadowFix(): Plugin {
  return {
    postcssPlugin: 'jimble-shadow-fix',
    Once(root) {
      root.walkAtRules('layer', (layer: AtRule) => {
        if (layer.params !== 'properties' || !layer.nodes) return
        for (const node of [...layer.nodes]) {
          if (node.type === 'atrule' && node.name === 'supports') {
            for (const child of [...(node.nodes ?? [])]) layer.insertBefore(node, child)
            node.remove()
          }
        }
      })
      root.walkAtRules('property', (rule: AtRule) => {
        if (rule.params.startsWith('--tw-')) rule.remove()
      })
      // 空になったコンテナは残さない
      root.walkAtRules((rule: AtRule) => {
        if (
          rule.name === 'layer' &&
          rule.nodes &&
          rule.nodes.length === 0 &&
          rule.params !== 'properties'
        ) {
          rule.remove()
        }
      })
    },
  }
}
shadowFix.postcss = true as const
