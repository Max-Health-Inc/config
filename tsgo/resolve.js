import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/**
 * The package TypeScript 7 ships its native compiler in for one platform, named the way
 * `typescript`'s own `getExePath` looks it up.
 * @param {string} [platform]
 * @param {string} [arch]
 * @returns {string}
 */
export function platformPackage(platform = process.platform, arch = process.arch) {
  return `@typescript/typescript-${platform}-${arch}`
}

/**
 * The native `tsc` executable from this package's optional TypeScript 7 platform dependency.
 * Depending on the platform package alone keeps a second `typescript` out of the install: under
 * bun's isolated linker it would become what this package's typescript-eslint peer resolves, and
 * typescript-eslint refuses TypeScript 7.
 * @param {{ resolve?: (specifier: string) => string, exists?: (path: string) => boolean, platform?: string, arch?: string }} [options]
 * @returns {string}
 */
export function nativeTsc({ resolve = createRequire(import.meta.url).resolve, exists = existsSync, platform = process.platform, arch = process.arch } = {}) {
  const name = platformPackage(platform, arch)
  let manifest
  try {
    manifest = resolve(`${name}/package.json`)
  } catch {
    throw new Error(`tsgo: ${name} is not installed. TypeScript 7 has no build for this platform, or optional dependencies were omitted; reinstall @max-health-inc/config with them.`)
  }
  const exe = join(dirname(manifest), 'lib', platform === 'win32' ? 'tsc.exe' : 'tsc')
  if (!exists(exe)) throw new Error(`tsgo: ${exe} does not exist.`)
  return platform === 'win32' && exe.length >= 248 ? `\\\\?\\${exe}` : exe
}
