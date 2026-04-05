import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // No any — ever
      '@typescript-eslint/no-explicit-any': 'error',

      // Max 2 params per function
      'max-params': ['error', 3],

      // Max line length — matches Prettier printWidth (100)
      // ignores URLs, strings, template literals, and regex
      'max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreComments: false,
        },
      ],

      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // TODO: re-enable once stub classes are implemented
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    ignores: ['**/dist/', '**/node_modules/', '**/tests/fixtures/'],
  },
)
