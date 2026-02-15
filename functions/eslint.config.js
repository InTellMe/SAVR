const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        args: 'after-used',
      }],
    },
  },
  {
    ignores: ['lib/**/*', 'node_modules/**/*'],
  }
);
