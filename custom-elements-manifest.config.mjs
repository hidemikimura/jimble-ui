/**
 * `static properties` で `state: true` にした内部の状態を、API から外す。
 * 解析ツールの Lit 対応は `state: true` を見ないので、そのままだと属性の一覧に載ってしまう。
 */
function hideInternalState() {
  /** `モジュールのパス#クラス名` → 内部の状態の名前 */
  const internal = new Map()

  const isTrue = (ts, prop) =>
    ts.isPropertyAssignment(prop) &&
    prop.name?.text === 'state' &&
    prop.initializer.kind === ts.SyntaxKind.TrueKeyword

  return {
    name: 'jimble-hide-internal-state',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return
      const properties = node.members.find(
        (m) =>
          ts.isPropertyDeclaration(m) &&
          m.name?.text === 'properties' &&
          m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
      )
      const init = properties?.initializer
      if (!init || !ts.isObjectLiteralExpression(init)) return
      const names = init.properties
        .filter(
          (p) =>
            ts.isPropertyAssignment(p) &&
            ts.isObjectLiteralExpression(p.initializer) &&
            p.initializer.properties.some((q) => isTrue(ts, q)),
        )
        .map((p) => p.name.text)
      if (names.length) internal.set(`${moduleDoc.path}#${node.name.text}`, new Set(names))
    },
    moduleLinkPhase({ moduleDoc }) {
      moduleDoc.declarations = (moduleDoc.declarations ?? []).map((decl) => {
        const names = internal.get(`${moduleDoc.path}#${decl.name}`)
        if (!names) return decl
        return {
          ...decl,
          attributes: (decl.attributes ?? []).filter((a) => !names.has(a.fieldName ?? a.name)),
          members: (decl.members ?? []).map((m) =>
            names.has(m.name) ? { ...m, privacy: 'private' } : m,
          ),
        }
      })
    },
  }
}

export default {
  // 基底クラス(src/base)も解析して、継承した属性・メソッドを各要素の API に含める
  globs: ['src/components/**/jimble-*.ts', 'src/base/*.ts'],
  exclude: ['**/*.test.ts'],
  outdir: '.',
  litelement: true,
  plugins: [hideInternalState()],
}
