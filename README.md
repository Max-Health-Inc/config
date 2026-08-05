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
