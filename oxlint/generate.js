#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { generatedFiles, serialize } from './config.js'

for (const [name, config] of Object.entries(generatedFiles)) {
  writeFileSync(new URL(name, import.meta.url), serialize(config))
}
