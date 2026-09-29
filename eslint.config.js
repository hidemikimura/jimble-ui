import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import lit from 'eslint-plugin-lit'
import wc from 'eslint-plugin-wc'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'site/dist', '**/*.generated.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ...lit.configs['flat/recommended'],
  },
  {
    files: ['src/**/*.ts'],
    ...wc.configs['flat/recommended'],
    rules: {
      ...wc.configs['flat/recommended'].rules,
      // タグ名は jimble-* 固定で、クラス名との対応は define() で保証する
      'wc/guard-super-call': 'off',
    },
  },
  {
    files: ['build/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, __DEV__: 'readonly' } },
  },
)
