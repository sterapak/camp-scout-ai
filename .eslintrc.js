// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021:  true,
  },
  parserOptions: {
    ecmaVersion:  2020,
    sourceType:   'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
  plugins: ['react', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  rules: {
    // still enforce named functions
    'func-names': ['error', 'always'],

    // allow default exports
    'import/no-default-export': 'off',
    'import/prefer-default-export': 'off',

    // temporarily disable unresolved and named-import checks
    'import/no-unresolved': 'off',
    'import/named':         'off',

    // React 17+ JSX runtime
    'react/react-in-jsx-scope': 'off',
    // you’re not using prop-types
    'react/prop-types':        'off',
  },
}
