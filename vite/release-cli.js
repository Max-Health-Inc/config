#!/usr/bin/env node
// Prints the release version for HEAD, for a deploy job's tag step: `release-version`.
import { readPackageVersion, resolveReleaseVersion } from './release.js'

process.stdout.write(resolveReleaseVersion(readPackageVersion(process.cwd())))
