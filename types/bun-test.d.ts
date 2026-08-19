// Pulled in by tsconfig/test-bun.json via `files`, which is how a test project gets the
// `bun:test` module declaration WITHOUT `types: ["bun"]`.
//
// Two reasons it is a reference file and not a `types` entry:
//
//   1. `types` replaces the inherited array wholesale, so a preset that sets it drops the
//      environment's own types — `vite/client` for an app, `node`, `@cloudflare/workers-types`
//      — and `import.meta.env` stops resolving. A reference leaves `types` alone, so one
//      preset serves every environment.
//   2. `bun-types/test` rather than `bun`: bun declares a `fetch` NAMESPACE carrying
//      `preconnect`, so under its full globals `typeof fetch` is function-plus-property and
//      a plain fetch function no longer satisfies it. Browser code under test then reports
//      errors that do not exist in the environment it actually ships to.
/// <reference types="bun-types/test" />
