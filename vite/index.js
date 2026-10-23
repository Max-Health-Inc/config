import path from 'path'

const REACT_PLUGINS = ['@vitejs/plugin-react', '@vitejs/plugin-react-swc']

function isMissing(error, name) {
  const notFound = error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND'
  return notFound && String(error.message).includes(`'${name}'`)
}

export async function loadReactPlugin(load = (name) => import(name)) {
  for (const name of REACT_PLUGINS) {
    try {
      return (await load(name)).default
    } catch (error) {
      if (!isMissing(error, name)) throw error
    }
  }
  throw new Error(`createViteConfig needs ${REACT_PLUGINS.join(' or ')} installed as a devDependency`)
}

/**
 * Create a shared Vite config for React + Tailwind projects.
 *
 * @param {object} [options]
 * @param {number} [options.port] - Dev server port (default: 3000)
 * @param {import('vite').PluginOption[]} [options.plugins] - Additional Vite plugins, appended after the React plugin
 * @param {Record<string, string>} [options.alias] - Additional or overriding resolve aliases (merged over '@' -> ./src)
 * @param {import('vite').BuildOptions} [options.build] - Additional build options, merged over the shared defaults
 * @param {import('vite').ServerOptions} [options.server] - Additional dev-server options, merged over { port }
 * @param {import('vite').DepOptimizationOptions} [options.optimizeDeps] - Dependency pre-bundling options
 * @param {Record<string, unknown>} [options.define] - Extra global constant replacements, merged over the production defines
 * @param {{ format?: 'es' | 'iife' }} [options.worker] - Web worker bundling options
 */
export function createViteConfig(options = {}) {
  const {
    port = 3000,
    plugins = [],
    alias = {},
    build = {},
    server = {},
    optimizeDeps,
    define = {},
    worker,
  } = options

  return async ({ command, mode }) => {
    const react = await loadReactPlugin()
    const prodDefines = command === 'build' && mode === 'production' && process.env.VITE_PROXY_BASE
      ? { 'import.meta.env.VITE_PROXY_BASE': JSON.stringify(process.env.VITE_PROXY_BASE) }
      : {}

    return {
      base: process.env.VITE_BASE || '/',
      plugins: [react(), ...plugins],
      server: { port, ...server },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), './src'),
          ...alias,
        },
      },
      define: { ...prodDefines, ...define },
      ...(optimizeDeps ? { optimizeDeps } : {}),
      ...(worker ? { worker } : {}),
      build: {
        sourcemap: false,
        reportCompressedSize: false,
        ...build,
      },
    }
  }
}
