import type {
  PluginOption,
  BuildOptions,
  ServerOptions,
  DepOptimizationOptions,
  UserConfigExport,
} from 'vite'

export interface CreateViteConfigOptions {
  /** Dev server port (default: 3000). */
  port?: number
  /** Additional Vite plugins, appended after the React plugin. */
  plugins?: PluginOption[]
  /** Additional or overriding resolve aliases (merged over '@' -> ./src). */
  alias?: Record<string, string>
  /** Additional build options, merged over the shared defaults. */
  build?: BuildOptions
  /** Additional dev-server options, merged over `{ port }`. */
  server?: ServerOptions
  /** Dependency pre-bundling options. */
  optimizeDeps?: DepOptimizationOptions
  /** Extra global constant replacements, merged over the production defines. */
  define?: Record<string, unknown>
  /** Web worker bundling options. */
  worker?: { format?: 'es' | 'iife' }
}

/**
 * Create a shared Vite config for React + Tailwind projects.
 * Applies the shared defaults (React plugin, `@` -> ./src alias, env-driven
 * base, production `VITE_PROXY_BASE` define, no sourcemaps) and merges in any
 * per-app overrides.
 */
export declare function createViteConfig(
  options?: CreateViteConfigOptions,
): UserConfigExport
