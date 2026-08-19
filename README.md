# @max-health-inc/config

Shared configuration presets for Max Health repositories.  
Aligned with latest Vite template (ES2023, erasableSyntaxOnly, flat ESLint config with recommended presets).

## Install

Published to GitHub Packages. Add the registry mapping once per consuming repo (`.npmrc`):

```ini
@max-health-inc:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install --save-dev @max-health-inc/config
```

`NODE_AUTH_TOKEN` needs `read:packages`. In CI it is the `GH_PACKAGES_TOKEN` secret;
locally, `gh auth token` works.

### What each preset needs you to install

Only the four packages both ESLint presets import are declared as `peerDependencies`, so
npm installs those and nothing else. The rest are listed here instead of being declared,
because `peerDependencies` apply to the whole package while these are needed by ONE
subpath — npm cannot scope a peer to `./vite` or `./eslint/react`, so declaring them made
every consumer install them. A Cloudflare Worker using only `eslint/node` was pulling in
Vite, the React SWC plugin, both React ESLint plugins and Tailwind's Vite plugin (~77 dev
packages, `@babel` tree included) for nothing.

| Preset | Install alongside it |
|--------|----------------------|
| `eslint/node`, `eslint/react`, `eslint/rules` | `eslint`, `@eslint/js`, `globals`, `typescript-eslint` — **declared as peers**, installed for you |
| `eslint/react` (additionally) | `eslint-plugin-react-hooks` (>=5), `eslint-plugin-react-refresh` (>=0.4) |
| `vite` | `vite` (>=6), `@vitejs/plugin-react-swc` (>=4) |
| `vitest` | `vitest` (>=2) |
| `tsconfig/*` | nothing (`tsconfig/worker.json` wants `@cloudflare/workers-types`) |
| `tsconfig/test-bun.json` | `@types/bun` (supplies `bun-types/test`) |

A React app on Vite already has every one of these in its own `devDependencies`, so this
is a no-op there. If one is missing the preset fails at import with a plain
module-not-found naming the package.

`@tailwindcss/vite` is not in the table because nothing here imports it: pass it in
yourself via `createViteConfig({ plugins: [tailwindcss()] })` as shown below. It was
declared as a peer purely by mistake.

## Usage

### TypeScript

**tsconfig.app.json:**
```json
{
  "extends": "@max-health-inc/config/tsconfig/app.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

> Note: `types: ["vite/client"]` is included — no `vite-env.d.ts` file needed!

**tsconfig.node.json:**
```json
{
  "extends": "@max-health-inc/config/tsconfig/node.json",
  "include": ["vite.config.ts"]
}
```

**tsconfig.json (Cloudflare Worker):**
```json
{
  "extends": "@max-health-inc/config/tsconfig/worker.json",
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

> Uses `@cloudflare/workers-types` (no DOM libs). Add `@cloudflare/workers-types` to the worker's devDependencies.

**tsconfig.json (root):**
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

#### Typechecking tests

Test files are not in `tsconfig.app.json` (`include: ["src"]`), so `tsc -b` never sees
them. A test file that does not compile still runs and still passes, which is how fixtures
end up asserting against resources their own types would reject.

Add a third project. Compose your environment config with the runner preset — `extends`
takes an array, later entries win:

**tsconfig.test.json (bun):**
```json
{
  "extends": ["./tsconfig.app.json", "@max-health-inc/config/tsconfig/test-bun.json"],
  "include": ["test"]
}
```

**tsconfig.test.json (vitest):**
```json
{
  "extends": ["./tsconfig.app.json", "@max-health-inc/config/tsconfig/test-vitest.json"],
  "include": ["test"]
}
```

Then reference it from the root config so `tsc -b` builds it:

```json
{ "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.test.json" }] }
```

`test-bun.json` pulls the `bun:test` declaration through `files`, NOT through `types`, for
two reasons worth knowing before you reach for `types: ["bun"]` yourself:

- `types` replaces the inherited array rather than adding to it, so setting it drops the
  environment's own types and `import.meta.env` stops resolving.
- Bun's full globals declare a `fetch` NAMESPACE carrying `preconnect`, so `typeof fetch`
  becomes function-plus-property and ordinary browser fetch functions no longer satisfy
  it. Browser code under test then reports errors that do not exist where it ships.

Because `types` is left alone, one preset works for app, node and worker projects alike.
Tests that use Node globals (`Buffer`, `fs`) add `"types": ["node", "vite/client"]` to
their own test config — the preset does not guess an environment.

### ESLint

**eslint.config.js (React):**
```js
import { createReactConfig } from '@max-health-inc/config/eslint/react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default createReactConfig({ tsconfigRootDir: __dirname })
```

**eslint.config.js (Node.js):**
```js
import { createNodeConfig } from '@max-health-inc/config/eslint/node'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default createNodeConfig({ tsconfigRootDir: __dirname })
```

**With security rules (backend/workers):**
```js
export default createNodeConfig({
  tsconfigRootDir: __dirname,
  security: true,
})
```

**Without type-checked rules (faster linting):**
```js
export default createNodeConfig({
  tsconfigRootDir: __dirname,
  typeChecked: false,
})
```

**Linting test files (opt-in):**
```js
export default createReactConfig({
  tsconfigRootDir: __dirname,
  tests: true,
  // Optional: also run the type-checked rules over tests. Needs a test project
  // (see "Typechecking tests" above) because type-aware linting throws on files
  // the named tsconfig excludes.
  testTsconfig: './tsconfig.test.json',
})
```

Without this, `test/**` is linted by nothing: the factory covers `src/**` and
`vite.config.ts` only. Expect a backlog the first time you switch it on — unused imports
and stray `any`s accumulate in files no rule has ever read.

### Vite

**vite.config.ts:**
```ts
import { createViteConfig } from '@max-health-inc/config/vite'
import tailwindcss from '@tailwindcss/vite'

export default createViteConfig({
  port: 5175,
  plugins: [tailwindcss()],
})
```

### Vitest

**vitest.config.ts** — a leaf package needs only its test globs:
```ts
import { createVitestConfig } from '@max-health-inc/config/vitest'

export default createVitestConfig()
```

A repo root that publishes coverage and CI reports opts into both:
```ts
import { createVitestConfig } from '@max-health-inc/config/vitest'

export default createVitestConfig({
  include: ['src/test/**/*.test.{ts,js}'],
  exclude: ['**/pipelineParity.test.ts'],
  setupFiles: ['src/test/setup.ts'],
  fileParallelism: false,       // sequential — avoids cache/file races on Windows
  coverage: true,               // v8 → test/coverage
  reports: true,                // html + junit + default → test/
})
```

`coverage` and `reports` are opt-in: a leaf package running `vitest run` should not
have to name an html/junit destination, and repos that do publish them get one
layout instead of re-deriving it. Pass an object to either for overrides, and
`test` as a last-resort escape hatch for keys the preset does not model.

## What's included

| Config | Key settings |
|--------|-------------|
| `tsconfig/app.json` | ES2023, bundler resolution, strict, react-jsx, verbatimModuleSyntax, erasableSyntaxOnly, noUncheckedIndexedAccess, `types: ["vite/client"]` |
| `tsconfig/node.json` | ES2023, bundler resolution, strict, erasableSyntaxOnly, `types: ["node"]` |
| `tsconfig/worker.json` | ES2023, bundler resolution, strict, erasableSyntaxOnly, noUncheckedIndexedAccess, `types: ["@cloudflare/workers-types"]` (no DOM) |
| `eslint/react` | typescript-eslint recommended + reactHooks + reactRefresh + type-checked rules + consistent-type-imports |
| `eslint/node` | typescript-eslint recommended + type-checked rules + consistent-type-imports |
| `vite` | react-swc, `@` alias, VITE_PROXY_BASE/VITE_BASE env support |
| `vitest` | `src/**/*.test.ts` discovery, build-artifact excludes, opt-in v8 coverage and html/junit reports |
| `tsconfig/test-bun.json`, `tsconfig/test-vitest.json` | Test projects, so `tsc -b` covers test files without a runner's globals overriding the environment's |
| `doccheck` | CLI: badge/link rot, doc examples that must compile, API-docs coverage |

## doccheck

Docs rot without ever failing a build. `doccheck` makes three kinds of rot fail
one. It ships as a `bin`, has no runtime dependencies, and shells out to the
repo's own `tsc`, so it drags nothing into a consumer that does not run it.

```bash
npx doccheck badges     # badges resolve, version badge matches package.json
npx doccheck examples   # fenced ts/tsx examples compile against the real packages
npx doccheck coverage   # how much of the published API the docs name
npx doccheck all
```

Configure with a `doccheck` key in the repo's `package.json`:

```json
{
  "doccheck": {
    "workspace": "frontend/ui",
    "skipSegments": ["lib"],
    "skipPrefixes": ["backend/public"],
    "minCoverage": 8
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `workspace` | `"."` | Directory the examples are compiled from |
| `skipSegments` | see below | Extra path segments to ignore |
| `skipPrefixes` | `[]` | Extra repo-relative prefixes to ignore |
| `minCoverage` | `null` | Coverage floor; use as a ratchet |

`node_modules`, `dist`, `build`, `coverage`, `.git`, `.doccheck`, `.next`, `out`
and `vendor` are always skipped.

**`workspace` is the setting that matters.** The examples have to be compiled
from a directory their own imports resolve from. Compiling somewhere else and
bridging with tsconfig `paths` looks equivalent and is not: it breaks React's
own types, so `React.ComponentProps<"button">` quietly loses `className` and
`children`, and every tsx example is checked against a degraded surface while
still reporting a pass. Point `workspace` at the app that has the UI packages
installed.

### What each command checks

`badges` — a hardcoded version badge that disagrees with `package.json` (prefer
a dynamic `img.shields.io/github/v/release` endpoint, which cannot drift), an
Actions badge naming a workflow that is not on disk or pointing at another
repository, a badge with no alt text, an anchor matching no heading, and an
in-repo link resolving to nothing. Links follow VitePress conventions, so
extensionless targets and root-absolute site routes are not false positives. A
page can declare `<!-- linkcheck: external /prefix/ -->` for paths injected at
deploy time; only the prefixes it names are excused.

`examples` — every fenced `ts`/`tsx` block is compiled. Blocks are fragments, so
three kinds of noise resolve from the compiler's own diagnostics rather than by
hand: a bare `return` means the block is a function body and it is re-emitted
wrapped; a name the example never defines is declared as both a value and a
type; an illustrative import path is dropped and its bindings declared, while
imports that should resolve are checked for real. A block that is a shape sketch
rather than code opts out with `<!-- doccheck: skip — why -->`.

`coverage` — walks each publishable workspace package's entry points, follows
`export *` and `export { x } from`, and matches the resulting symbols against
the prose. Deliberately coarse: naming a symbol is not explaining it. It catches
a package growing an export that nobody writes a word about.

Both `badges` and `examples` carry a **canary**: a fixture that must produce its
expected result before the real run is trusted. A checker whose parser has
silently stopped matching otherwise reports a clean pass over zero findings,
which is the one failure mode a checker must never have.

## Vitest Options

| Option | Default | Description |
|--------|---------|-------------|
| `include` | `['src/**/*.test.ts']` | Test globs |
| `exclude` | `[]` | Merged over `node_modules/**`, `dist/**`, `out/**`, `**/coverage/**` |
| `setupFiles` | — | Files run before each test file |
| `fileParallelism` | vitest default | `false` runs test files sequentially |
| `testTimeout` / `hookTimeout` | vitest default | Timeouts in ms |
| `environment` | `node` | `node` \| `jsdom` \| `happy-dom` \| `edge-runtime` |
| `coverage` | off | `true` for v8 → `test/coverage`, or an object |
| `reports` | off | `true` for html+junit+default → `test/`, or an object |
| `viteConfig` | `{}` | Extra Vite-level config (plugins, resolve, …) |
| `test` | `{}` | Escape hatch merged last over `test` |

## ESLint Options

| Option | Default | Description |
|--------|---------|-------------|
| `tsconfigRootDir` | — | Root dir for tsconfig resolution |
| `typeChecked` | `true` | Enable `no-floating-promises`, `await-thenable`, `no-misused-promises` |
| `security` | `false` | Enable `no-eval`, `no-implied-eval`, `no-new-func` |
| `ignores` | `[]` | Additional ignore patterns |
| `extraRules` | `{}` | Additional rules to merge |
| `tests` | `false` | Lint test files. Opt-in: consumers pin caret ranges and CI installs with `--no-frozen-lockfile`, so linting tests by default would redden a repo on an unrelated PR |
| `testGlobs` | `test/**` + colocated `*.test.*` | Which files the test block covers |
| `testTsconfig` | — | Test tsconfig path. Set it to also get type-checked rules in tests; without it they stay off, because type-aware linting throws on files the project excludes |

## Rules included

### Base (always active)
- `@typescript-eslint/no-unused-vars` (error, ignores `_` prefix)
- `@typescript-eslint/no-explicit-any` (error)
- `@typescript-eslint/consistent-type-imports` (error, inline-type-imports)
- `@typescript-eslint/no-unused-expressions` (error)
- `eqeqeq` (error, allows `== null`)
- `no-var` (error)
- `prefer-const` (error)
- `no-console` (warn, allows warn/error/info)
- `no-debugger` (error)
- `no-duplicate-imports` (error)

### Type-checked (opt-in, default: on)
- `@typescript-eslint/no-floating-promises` (error)
- `@typescript-eslint/await-thenable` (error)
- `@typescript-eslint/no-misused-promises` (error)

### Security (opt-in, default: off)
- `no-eval` (error)
- `no-implied-eval` (error)
- `no-new-func` (error)

## Migration to v3 (package renamed)

v3 renames the package from `@max-health/config` to **`@max-health-inc/config`** and
publishes it to GitHub Packages instead of being installed from a git URL. No config
values changed; v3.0.0 is byte-identical to v2.4.0 apart from its name.

The rename is not cosmetic: GitHub Packages resolves an npm scope to the owner that
hosts it, so a package named `@max-health/*` can never be published from the
`Max-Health-Inc` org — the registry answers `404 … does not exist under owner
"max-health"`. Matching the scope to the owner is the only way to serve it from
GitHub Packages, the same as `@max-health-inc/shared-ui` and the `@max-network/*`
packages.

In each consuming repo:

```diff
- "@max-health/config": "github:max-health-inc/config"
+ "@max-health-inc/config": "^3.0.0"
```

then update every specifier that names it — `extends` in each tsconfig, plus the
eslint / vite / vitest imports:

```diff
- "extends": "@max-health/config/tsconfig/app.json"
+ "extends": "@max-health-inc/config/tsconfig/app.json"
```

and make sure the repo's `.npmrc` maps the scope (see [Install](#install)). A stale
`@max-health/config` specifier fails at resolution, so nothing silently keeps the old
copy.

## Migration from v1

v2 enables `typeChecked` by default. If your project doesn't have a tsconfig with `project` references set up, pass `typeChecked: false`.

## Customization

All factories accept options for overrides. The tsconfig files can be extended with additional `compilerOptions`. See each file for available options.
