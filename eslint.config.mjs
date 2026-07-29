import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  /**
   * Build output only. `.ssr` is the intermediate server bundle the prerender
   * compiles and then throws away — linting it reports Rollup's output as if it
   * were hand-written source, and every browser global in it as undefined.
   *
   * Flat config does not read .gitignore, so anything generated has to be named
   * here as well as there.
   */
  { ignores: ['dist', '.ssr', 'coverage', 'node_modules'] },

  js.configs.recommended,

  // Typed linting applies only to source files that tsconfig actually covers.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.es2023 },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // the codebase uses `void promise` for deliberate fire-and-forget calls
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // no silent `any` anywhere — the whole point of stage 0
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  /**
   * The prerender entry never reaches a browser, so it is never in the hot
   * reload graph the react-refresh rule protects. Exporting `render`, `headFor`
   * and `PRERENDER_PATHS` next to a component is the point of the file.
   */
  {
    files: ['src/entry-server.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Node-side files outside the TS project: lint them, but untyped.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },

  prettier
)
