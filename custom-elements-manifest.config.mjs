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

/**
 * クラスの JSDoc の `@status experimental` を、宣言の `status` に写す（公開段階。設計書 §24）。
 * 安定（既定）は書かない。非推奨は解析ツールが標準で読む `@deprecated 代わりの案内` を使う。
 */
function releaseStatus() {
  const STATUSES = new Set(['experimental'])
  /** `モジュールのパス#クラス名` → 公開段階 */
  const found = new Map()
  return {
    name: 'jimble-release-status',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return
      const tag = ts.getJSDocTags(node).find((t) => t.tagName.text === 'status')
      if (!tag) return
      const value = ts.getTextOfJSDocComment(tag.comment)?.trim() ?? ''
      if (!STATUSES.has(value))
        throw new Error(
          `${moduleDoc.path} の ${node.name.text}: @status は ${[...STATUSES].join(' / ')} だけ（安定なら書かない）。書かれていたもの: ${value}`,
        )
      found.set(`${moduleDoc.path}#${node.name.text}`, value)
    },
    moduleLinkPhase({ moduleDoc }) {
      moduleDoc.declarations = (moduleDoc.declarations ?? []).map((decl) => {
        const status = found.get(`${moduleDoc.path}#${decl.name}`)
        return status ? { ...decl, status } : decl
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
  plugins: [hideInternalState(), releaseStatus()],
}
