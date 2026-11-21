import type { BuildOptions, Plugin, PluginOption, UserConfig } from 'vite'

/** The manifest written next to the bundle. */
export declare const INPUTS_FILE: 'inputs.json'
/** The single-file app the build emits. */
export declare const APP_FILE: 'index.html'
/** Replaced in `index.html` by the input hash, e.g. `<meta name="mcp-app-build" content="%MCP_APP_BUILD%">`. */
export declare const BUILD_PLACEHOLDER: '%MCP_APP_BUILD%'

export interface InputManifest {
  /** SHA-256 over `files`, the build id. */
  hash: string
  /** Project-relative, `/`-separated, sorted. */
  files: string[]
}

export type Freshness = 'fresh' | 'stale' | 'missing'

/** Imports a module as the project at `root` resolves it. */
export type ModuleLoader = (name: string, root?: string) => Promise<Record<string, unknown>>

export interface SingleFileOptions {
  useRecommendedBuildConfig?: boolean
  removeViteModuleLoader?: boolean
  inlinePattern?: string[]
  deleteInlinedFiles?: boolean
  overrideConfig?: Partial<UserConfig>
}

export interface McpAppOptions {
  /** Directory holding the app's `index.html`. */
  root: string
  /** Base for the manifest's relative paths; the bundle is fresh while every file under it that the build read is unchanged. */
  projectRoot: string
  outDir: string
  /** Files the build depends on without importing them (lockfile, config, brand tokens), relative to `projectRoot`. */
  extraInputs?: readonly string[]
  /** Plugins that run before the single-file plugin. */
  plugins?: readonly PluginOption[]
  /** Options for `vite-plugin-singlefile`, merged over `{ removeViteModuleLoader: true }`. */
  singleFile?: SingleFileOptions
  /** Merged over the preset's build options. */
  build?: BuildOptions
}

/** SHA-256 over each project-relative file's name and bytes, in sorted order; a missing file hashes as missing. */
export declare function inputHash(projectRoot: string, files: readonly string[]): string

/** Writes `inputs.json` next to the bundle and puts the input hash in place of `%MCP_APP_BUILD%` in `index.html`. */
export declare function inputManifest(projectRoot: string, extraInputs?: readonly string[]): Plugin

/** The manifest in `outDir`, or null when it, the app or a valid shape is missing. */
export declare function readManifest(outDir: string): InputManifest | null

/** `fresh` while every manifest input hashes as it did at build time, `stale` when one changed, `missing` without a bundle. */
export declare function freshness(projectRoot: string, outDir: string): Freshness

/** `viteSingleFile` from `vite-plugin-singlefile`, resolved from the project at `root`. */
export declare function loadSingleFilePlugin(
  load?: ModuleLoader,
  root?: string,
): Promise<(options?: SingleFileOptions) => PluginOption>

/** Vite config that builds an MCP App (one self-contained `index.html`) into `outDir`, with an input manifest for {@link freshness}. */
export declare function mcpAppConfig(options: McpAppOptions, load?: ModuleLoader): Promise<UserConfig>
