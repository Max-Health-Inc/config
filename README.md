# @max-health/config

Shared configuration presets for Max Health repositories.  
Aligned with latest Vite template (ES2023, erasableSyntaxOnly, flat ESLint config with recommended presets).

## Install

```bash
npm install --save-dev github:max-health-inc/config
```

## Usage

### TypeScript

**tsconfig.app.json:**
```json
{
  "extends": "@max-health/config/tsconfig/app.json",
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
  "extends": "@max-health/config/tsconfig/node.json",
  "include": ["vite.config.ts"]
}
```

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

**eslint.config.js:**
```js
import { createReactConfig } from '@max-health/config/eslint/react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default createReactConfig({ tsconfigRootDir: __dirname })
```

For Node.js projects:
```js
import { createNodeConfig } from '@max-health/config/eslint/node'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default createNodeConfig({ tsconfigRootDir: __dirname })
```

### Vite

**vite.config.ts:**
```ts
import { createViteConfig } from '@max-health/config/vite'
import tailwindcss from '@tailwindcss/vite'

export default createViteConfig({
  port: 5175,
  plugins: [tailwindcss()],
})
```

## What's included

| Config | Key settings |
|--------|-------------|
| `tsconfig/app.json` | ES2023, bundler resolution, strict, react-jsx, verbatimModuleSyntax, erasableSyntaxOnly, noUncheckedIndexedAccess, `types: ["vite/client"]` |
| `tsconfig/node.json` | ES2023, bundler resolution, strict, erasableSyntaxOnly, `types: ["node"]` |
| `eslint/react` | typescript-eslint recommended + `reactHooks.configs.flat.recommended` + `reactRefresh.configs.vite` + consistent-type-imports |
| `eslint/node` | typescript-eslint recommended + consistent-type-imports |
| `vite` | react-swc, `@` alias, VITE_PROXY_BASE/VITE_BASE env support |

## Best practice alignment

- **ES2023 target** — matches Vite 6 template (was ES2020/ES2022)
- **`erasableSyntaxOnly`** — TS 5.8+ requirement for proper type-only erasure in bundlers
- **`noUncheckedIndexedAccess`** — from tsconfig/bases strictest, catches `obj[key]` without undefined check
- **`noImplicitOverride`** — enforces `override` keyword on class methods
- **`types: ["vite/client"]`** — eliminates need for `vite-env.d.ts` in every repo
- **`globalIgnores()`** — proper flat config API instead of `{ ignores: [] }` object
- **`reactHooks.configs.flat.recommended`** — official flat config preset (not manual rule spread)
- **`reactRefresh.configs.vite`** — official preset instead of manual plugin config

## Customization

All factories accept options for overrides. The tsconfig files can be extended with additional `compilerOptions`. See each file for available options.
