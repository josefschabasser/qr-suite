module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['import', '@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/no-shadow': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'import/no-duplicates': 'error',
    'indent-legacy': 'off',
    indent: 'off',
    'jsx-quotes': ['error', 'prefer-single'],
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 100, ignoreUrls: true, ignoreComments: true }],
    'no-undef': 'error',
    'no-unused-vars': ['error', { vars: 'all', args: 'none', ignoreRestSiblings: false }],
    'no-var': ['error'],
    'object-shorthand': 'error',
    'prefer-const': ['error', { destructuring: 'any' }],
    quotes: 'off',
    semi: ['error', 'never'],
  },
}