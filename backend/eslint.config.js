const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

/**
 * What the API is checked against.
 *
 * The *recommended* sets rather than the type-aware ones: `tsc --noEmit` runs separately and owns
 * types, and the type-aware rules need a project graph that makes a lint run slow enough that people
 * stop running it. What is left is what the compiler does not look at — an unused local, a `catch`
 * that swallows without saying so, a `require` in a module that already imports.
 *
 * `prisma/seed.ts` is included on purpose: it writes to the same tables as the service and is the
 * file most likely to be edited in a hurry.
 */
module.exports = tseslint.config(
  {
    // The generated Prisma client and the compiled output.
    ignores: ['dist/**', 'node_modules/**', 'src/generated/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // A leading underscore is how this codebase says "this parameter exists for the caller's sake".
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // An empty block is often a deliberate silence (a session that is already over, a visit that
      // must end regardless); requiring a comment inside it is what keeps that readable.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
);
