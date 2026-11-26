import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { isAbsolute, join, relative, resolve, sep } from 'path'
import { fromProject } from './project.js'

export const INPUTS_FILE = 'inputs.json'
export const APP_FILE = 'index.html'
export const BUILD_PLACEHOLDER = '%MCP_APP_BUILD%'

const SINGLE_FILE_PLUGIN = 'vite-plugin-singlefile'

function posix(path) {
  return path.split(sep).join('/')
}

/** SHA-256 over each project-relative file's name and bytes, in sorted order; a missing file hashes as missing. */
export function inputHash(projectRoot, files) {
  const hash = createHash('sha256')
  for (const file of [...files].sort()) {
    const path = join(projectRoot, file)
    hash.update(`${file}\0`)
    hash.update(existsSync(path) ? readFileSync(path) : 'missing')
    hash.update('\0')
  }
  return hash.digest('hex')
}

function ownSource(projectRoot, id) {
  if (id.startsWith('\0') || id.includes('node_modules')) return null
  const path = id.split('?')[0] ?? id
  if (!isAbsolute(path) || !existsSync(path)) return null
  const rel = posix(relative(projectRoot, path))
  return rel === '' || rel.startsWith('..') || isAbsolute(rel) ? null : rel
}

function normalizeInputs(projectRoot, files) {
  return files.map((file) => posix(relative(projectRoot, resolve(projectRoot, file))))
}

/** Writes `inputs.json` next to the bundle and puts the input hash in place of `%MCP_APP_BUILD%` in `index.html`. */
export function inputManifest(projectRoot, extraInputs = []) {
  const extra = normalizeInputs(projectRoot, extraInputs)
  return {
    name: 'mcp-app-input-manifest',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const sources = [...this.getModuleIds()].flatMap((id) => ownSource(projectRoot, id) ?? [])
        const files = [...new Set([...sources, ...extra])].sort()
        const manifest = { hash: inputHash(projectRoot, files), files }
        const app = bundle[APP_FILE]
        if (app?.type === 'asset' && typeof app.source === 'string') app.source = app.source.replaceAll(BUILD_PLACEHOLDER, manifest.hash)
        this.emitFile({ type: 'asset', fileName: INPUTS_FILE, source: `${JSON.stringify(manifest, null, 2)}\n` })
      },
    },
  }
}

export function readManifest(outDir) {
  const path = join(outDir, INPUTS_FILE)
  if (!existsSync(path) || !existsSync(join(outDir, APP_FILE))) return null
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const { hash, files } = parsed
  if (typeof hash !== 'string' || !Array.isArray(files) || !files.every((f) => typeof f === 'string')) return null
  return { hash, files }
}

export function freshness(projectRoot, outDir) {
  const manifest = readManifest(outDir)
  if (!manifest) return 'missing'
  return inputHash(projectRoot, manifest.files) === manifest.hash ? 'fresh' : 'stale'
}

export async function loadSingleFilePlugin(load = fromProject, root = process.cwd()) {
  const mod = await load(SINGLE_FILE_PLUGIN, root)
  const plugin = mod.viteSingleFile ?? mod.default?.viteSingleFile
  if (typeof plugin !== 'function') throw new Error(`${SINGLE_FILE_PLUGIN} does not export viteSingleFile`)
  return plugin
}

/** Vite config that builds an MCP App (one self-contained `index.html`) into `outDir`, with an input manifest for {@link freshness}. */
export async function mcpAppConfig(options, load = fromProject) {
  const viteSingleFile = await loadSingleFilePlugin(load, options.projectRoot)
  return {
    root: options.root,
    publicDir: false,
    logLevel: 'warn',
    plugins: [
      ...(options.plugins ?? []),
      viteSingleFile({ removeViteModuleLoader: true, ...options.singleFile }),
      inputManifest(options.projectRoot, options.extraInputs),
    ],
    build: {
      outDir: options.outDir,
      emptyOutDir: true,
      minify: true,
      cssMinify: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 8192,
      target: 'es2022',
      ...options.build,
    },
  }
}
