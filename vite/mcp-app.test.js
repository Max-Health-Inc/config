import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import {
  APP_FILE,
  BUILD_PLACEHOLDER,
  INPUTS_FILE,
  freshness,
  inputHash,
  loadSingleFilePlugin,
  mcpAppConfig,
  readManifest,
} from './mcp-app.js'

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const ownLoader = (name) => import(name)

function write(root, file, text) {
  const path = join(root, file)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
}

function scaffold() {
  const project = mkdtempSync(join(tmpdir(), 'mcp-app-'))
  write(project, 'app/index.html', `<!doctype html><html><head><meta name="mcp-app-build" content="${BUILD_PLACEHOLDER}"><link rel="stylesheet" href="./style.css"></head><body><script type="module" src="./main.js"></script></body></html>`)
  write(project, 'app/main.js', "import { greet } from './util.js'\ndocument.body.textContent = greet('widget')\n")
  write(project, 'app/util.js', 'export const greet = (name) => `hello-from-util ${name}`\n')
  write(project, 'app/style.css', 'body { color: rebeccapurple }\n')
  write(project, 'lock.txt', 'v1\n')
  return project
}

describe('mcpAppConfig', () => {
  let project
  let outDir

  before(async () => {
    project = scaffold()
    outDir = join(project, 'dist')
    const config = await mcpAppConfig({ root: join(project, 'app'), projectRoot: project, outDir, extraInputs: ['lock.txt'] }, ownLoader)
    await build({ ...config, configFile: false })
  })

  after(() => {
    rmSync(project, { recursive: true, force: true })
  })

  it('emits one self-contained index.html and the input manifest', () => {
    assert.deepEqual(readdirSync(outDir).sort(), [APP_FILE, INPUTS_FILE])
    const html = readFileSync(join(outDir, APP_FILE), 'utf8')
    assert.match(html, /hello-from-util/)
    assert.match(html, /<style[^>]*>body{color:#639/)
    assert.doesNotMatch(html, /<script[^>]+src=/)
    assert.doesNotMatch(html, /<link[^>]+stylesheet/)
  })

  it('lists the project files the build read plus the extra inputs, relative and sorted', () => {
    const manifest = readManifest(outDir)
    assert.ok(manifest)
    for (const file of ['app/main.js', 'app/util.js', 'app/style.css', 'lock.txt']) assert.ok(manifest.files.includes(file), file)
    assert.deepEqual(manifest.files, [...manifest.files].sort())
    assert.ok(manifest.files.every((file) => !file.includes('\\') && !file.startsWith('..')))
    assert.equal(manifest.hash, inputHash(project, manifest.files))
  })

  it('stamps the input hash as the build id', () => {
    const html = readFileSync(join(outDir, APP_FILE), 'utf8')
    assert.ok(!html.includes(BUILD_PLACEHOLDER))
    assert.ok(html.includes(readManifest(outDir).hash))
  })

  it('reports fresh, then stale when a source or extra input changes, and fresh again once restored', () => {
    assert.equal(freshness(project, outDir), 'fresh')
    write(project, 'app/util.js', 'export const greet = () => "changed"\n')
    assert.equal(freshness(project, outDir), 'stale')
    write(project, 'app/util.js', 'export const greet = (name) => `hello-from-util ${name}`\n')
    assert.equal(freshness(project, outDir), 'fresh')
    write(project, 'lock.txt', 'v2\n')
    assert.equal(freshness(project, outDir), 'stale')
    write(project, 'lock.txt', 'v1\n')
    assert.equal(freshness(project, outDir), 'fresh')
  })

  it('reports missing without a bundle or with an unreadable manifest', () => {
    assert.equal(freshness(project, join(project, 'nowhere')), 'missing')
    const broken = join(project, 'broken')
    write(broken, APP_FILE, '<html></html>')
    write(broken, INPUTS_FILE, '{ not json')
    assert.equal(freshness(project, broken), 'missing')
    write(broken, INPUTS_FILE, JSON.stringify({ hash: 1, files: [] }))
    assert.equal(readManifest(broken), null)
  })
})

describe('mcpAppConfig options', () => {
  it('resolves vite-plugin-singlefile from the project by default and orders the plugins', async () => {
    const own = { name: 'own' }
    const config = await mcpAppConfig({
      root: PACKAGE_ROOT,
      projectRoot: PACKAGE_ROOT,
      outDir: join(PACKAGE_ROOT, 'out'),
      plugins: [own],
      build: { target: 'es2023' },
    })
    const names = config.plugins.flat().map((plugin) => plugin.name)
    assert.equal(names[0], 'own')
    assert.equal(names.at(-1), 'mcp-app-input-manifest')
    assert.ok(names.includes('vite:singlefile'))
    assert.equal(config.build.target, 'es2023')
    assert.equal(config.build.emptyOutDir, true)
  })

  it('passes singleFile options over the defaults', async () => {
    let received
    const load = async () => ({ viteSingleFile: (options) => { received = options; return { name: 'stub' } } })
    await mcpAppConfig({ root: 'r', projectRoot: PACKAGE_ROOT, outDir: 'o', singleFile: { inlinePattern: ['*.css'] } }, load)
    assert.deepEqual(received, { removeViteModuleLoader: true, inlinePattern: ['*.css'] })
  })

  it('names the package when the plugin does not export viteSingleFile', async () => {
    await assert.rejects(loadSingleFilePlugin(async () => ({})), /vite-plugin-singlefile/)
  })
})
