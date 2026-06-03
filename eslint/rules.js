/**
 * Shared ESLint rule objects.
 *
 * Use these when you need to compose rules into a custom flat config
 * (e.g. with eslint-config-next) instead of using the factory functions.
 *
 * @example
 * import { sharedRules, typeCheckedRules } from '@max-health/config/eslint/rules'
 */

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
  'eqeqeq': ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
}

// ── Type-checked rules (catches async bugs) ─────────────────
export const typeCheckedRules = {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
}

// ── Security rules (backend packages) ───────────────────────
export const securityRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
}

// ── Best practice rules ─────────────────────────────────────
// Alias — sharedRules already contains best-practice rules mixed in.
// This export provides a semantic name for consumers that distinguish them.
export const bestPracticeRules = {
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
  'eqeqeq': ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
}
