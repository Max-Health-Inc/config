/**
 * Shared ESLint rule objects.
 *
 * Use these when you need to compose rules into a custom flat config
 * (e.g. with eslint-config-next) instead of using the factory functions.
 *
 * @example
 * import { sharedRules, typeCheckedRules } from '@max-health-inc/config/eslint/rules'
 */

// ── Best practice rules (language-agnostic, also part of sharedRules) ──
export const bestPracticeRules = {
  'eqeqeq': ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
}

// ── TypeScript strict rules ─────────────────────────────────
export const sharedRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
  ],
  '@typescript-eslint/no-unused-expressions': 'error',
  ...bestPracticeRules,
}

// ── Type-checked rules (async bugs, and `any` leaking in) ───
// The no-unsafe rules catch the `any` that `JSON.parse` and `Response.json()` return before it
// reaches typed code: parse it with a schema instead.
export const typeCheckedRules = {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
}

// ── Security rules (backend packages) ───────────────────────
export const securityRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
}

// ── Strict rules (opt-in) ───────────────────────────────────
export const strictRules = {
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  '@typescript-eslint/no-empty-object-type': 'error',
  'object-shorthand': ['error', 'always'],
  'prefer-template': 'warn',
}

// ── Bun test runner (bun-types gaps) ────────────────────────
// bun-types declares `expect(p).rejects/resolves` matchers as returning void although
// they return promises that must be awaited, and `mock.module` as `void | Promise<void>`.
export const bunTestRules = {
  '@typescript-eslint/await-thenable': 'off',
  '@typescript-eslint/no-floating-promises': [
    'error',
    { allowForKnownSafeCalls: [{ from: 'package', package: 'bun:test', name: 'module' }] },
  ],
}
