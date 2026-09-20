import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * What the console is checked against.
 *
 * Deliberately the *recommended* sets rather than the type-aware ones: `tsc --noEmit` already runs in
 * CI and owns types, so the linter is here for the things the compiler does not look at — a hook
 * called conditionally, a dependency missing from an effect, a variable nobody reads, a `console.log`
 * that found its way into a screen.
 *
 * The audit tools under `tools/` are plain Node scripts (the browsers they drive are the point), so
 * they are checked as Node rather than as React.
 */
export default tseslint.config(
  {
    // `dist/` is build output, and `backend/` has its own config and its own lockfile: linting it
    // from here would check it against the console's globals and rules.
    ignores: ['dist/**', 'public/**', 'backend/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      // Every screen in this console is a component module; exporting a helper beside one is how the
      // codebase already reads, so a non-component export is a warning the author can weigh.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // A leading underscore is how the codebase says "this parameter exists for the caller's sake".
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tools/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
