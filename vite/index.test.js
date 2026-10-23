import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createViteConfig, loadReactPlugin } from './index.js'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

function missing(name) {
  const error = new Error(`Cannot find package '${name}' imported from /app/node_modules/@max-health-inc/config/vite/index.js`)
  error.code = 'ERR_MODULE_NOT_FOUND'
  return error
}

function loader(installed) {
  return async (name) => {
    if (!(name in installed)) throw missing(name)
    return { default: installed[name] }
  }
}

const oxc = () => ({ name: 'oxc' })
const swc = () => ({ name: 'swc' })

describe('package.json', () => {
  it('declares both React plugins as optional peers, so the ./vite preset is resolvable without forcing them on eslint-only consumers', () => {
    for (const name of ['@vitejs/plugin-react', '@vitejs/plugin-react-swc']) {
      assert.ok(manifest.peerDependencies?.[name], `${name} is not a peer dependency`)
      assert.equal(manifest.peerDependenciesMeta?.[name]?.optional, true, `${name} is not an optional peer`)
    }
  })
})

describe('loadReactPlugin', () => {
  it('prefers @vitejs/plugin-react', async () => {
    assert.equal(await loadReactPlugin(loader({ '@vitejs/plugin-react': oxc, '@vitejs/plugin-react-swc': swc })), oxc)
  })

  it('falls back to @vitejs/plugin-react-swc for an SWC-only app', async () => {
    assert.equal(await loadReactPlugin(loader({ '@vitejs/plugin-react-swc': swc })), swc)
  })

  it('names both packages when neither is installed', async () => {
    await assert.rejects(loadReactPlugin(loader({})), /@vitejs\/plugin-react or @vitejs\/plugin-react-swc/)
  })

  it('rethrows a plugin that is installed but broken instead of hiding it behind the fallback', async () => {
    const broken = missing('@babel/core')
    const load = async (name) => {
      if (name === '@vitejs/plugin-react') throw broken
      return { default: swc }
    }
    await assert.rejects(loadReactPlugin(load), (error) => error === broken)
  })
})

describe('createViteConfig', () => {
  it('builds with the installed React plugin', async () => {
    const config = await createViteConfig()({ command: 'build', mode: 'production' })
    const names = [config.plugins[0]].flat(Infinity).map((plugin) => plugin.name)
    assert.ok(names.some((name) => name.startsWith('vite:react')), `no React plugin in ${names.join(', ')}`)
  })

  it('appends caller plugins after the React plugin', async () => {
    const extra = { name: 'extra' }
    const config = await createViteConfig({ plugins: [extra] })({ command: 'serve', mode: 'development' })
    assert.equal(config.plugins.at(-1), extra)
  })
})
