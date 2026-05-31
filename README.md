# @max-health/config

Shared configuration presets for Max Health repositories.

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
| `tsconfig/app.json` | ES2022, bundler resolution, strict, react-jsx, verbatimModuleSyntax |
| `tsconfig/node.json` | ES2022, bundler resolution, strict, no jsx |
| `eslint/react` | typescript-eslint recommended + react-hooks + react-refresh + consistent-type-imports |
| `eslint/node` | typescript-eslint recommended + consistent-type-imports |
| `vite` | react-swc, `@` alias, VITE_PROXY_BASE/VITE_BASE env support |

## Customization

All factories accept options for overrides. The tsconfig files can be extended with additional `compilerOptions`. See each file for available options.
