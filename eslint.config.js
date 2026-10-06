import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-x': reactX,
      'react-dom': reactDom,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactX.configs['recommended-typescript'].rules,
      ...reactDom.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', {'allowNumber': true, 'allowNullish': true, 'allowBoolean': true}],
      '@typescript-eslint/no-explicit-any': 'warn',
      // These rules are intentionally disabled because the project’s generated/derived data models
      // make them noisy without improving runtime safety; keep the stronger type-aware rules enabled.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/restrict-plus-operands': ['error', {allowNumberAndString: true}],
      // React-X's newer guidance conflicts with established, intentional patterns in this app.
      'react-hooks/set-state-in-effect': 'off',
      'react-x/use-state': 'off',
      'react-x/no-array-index-key': 'off',
      'react-x/no-context-provider': 'off',
      'react-x/no-use-context': 'off',
      'react-x/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': 'off',
      'no-control-regex': 'off',
    },
  },
  {
    files: ['src/pages/beer-league.tsx'],
    rules: {'@typescript-eslint/no-confusing-void-expression': 'off'},
  },
  {
    files: ['src/pages/components/player/api-player-screens.tsx'],
    rules: {'@typescript-eslint/consistent-type-definitions': 'warn'},
  },
  {
    files: ['src/pages/components/player/player-all-stats.tsx'],
    rules: {
      // The current-season target is derived from stable player props; compiler optimization can safely fall back here.
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
)
