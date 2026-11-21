import path from 'path'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'

export function isMissing(error, name) {
  const notFound = error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND'
  return notFound && String(error.message).includes(`'${name}'`)
}

/** Import `name` as the project at `root` resolves it, so a preset needs no peer declaration. */
export function fromProject(name, root = process.cwd()) {
  const require = createRequire(path.join(root, 'package.json'))
  return import(pathToFileURL(require.resolve(name)).href)
}
