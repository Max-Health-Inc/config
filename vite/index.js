import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

/**
 * Create a shared Vite config for React + Tailwind projects.
 *
 * @param {object} [options]
 * @param {number} [options.port] - Dev server port (default: 3000)
 * @param {import('vite').Plugin[]} [options.plugins] - Additional Vite plugins
 * @param {Record<string, string>} [options.alias] - Additional resolve aliases
 * @param {object} [options.build] - Additional build options
 */
export function createViteConfig(options = {}) {
  const {
    port = 3000,
    plugins = [],
    alias = {},
    build = {},
  } = options

  return defineConfig(({ command, mode }) => {
    const prodDefines = command === 'build' && mode === 'production' && process.env.VITE_PROXY_BASE
      ? { 'import.meta.env.VITE_PROXY_BASE': JSON.stringify(process.env.VITE_PROXY_BASE) }
      : {}

    return {
      base: process.env.VITE_BASE || '/',
      plugins: [react(), ...plugins],
      server: { port },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), './src'),
          ...alias,
        },
      },
      define: prodDefines,
      build: {
        sourcemap: false,
        reportCompressedSize: false,
        ...build,
      },
    }
  })
}
