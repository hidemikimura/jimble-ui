export default {
  // 基底クラス(src/base)も解析して、継承した属性・メソッドを各要素の API に含める
  globs: ['src/components/**/jimble-*.ts', 'src/base/*.ts'],
  exclude: ['**/*.test.ts'],
  outdir: '.',
  litelement: true,
}
