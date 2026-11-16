// SPDX-License-Identifier: MIT

/**
 * How much of the published API surface the docs actually cover.
 *
 * For every publishable workspace package, the exports reachable from its
 * declared entry points are collected (following `export * from` and
 * `export { x } from` within the package), then matched against the prose. A
 * symbol counts as documented when the docs name it.
 *
 * This is a deliberately coarse signal: naming a symbol is not the same as
 * explaining it. It is here to catch the case that actually happens — a package
 * grows an export and no one writes a word about it — not to grade prose.
 *
 * Usage:
 *   doccheck coverage                  report
 *   doccheck coverage --list           also list what is missing
 *   doccheck coverage --min=40         fail below a percentage
 *   doccheck coverage --json           machine-readable
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, markdownFiles } from './files.js';
import { exportsOf } from './symbols.js';

/** Entry points that are not TypeScript (html, assets) carry no symbols. */
const CODE_ENTRY = /\.(ts|tsx|mts|cts)$/;

function workspaceGlobs(config) {
  // A single-package repo documents its own root package; a monorepo documents
  // each publishable workspace.
  return config.pkg.workspaces ?? ['.'];
}

/** Publishable packages only: a private workspace has no public API to document. */
function publishablePackages(config) {
  const out = [];
  for (const rel of workspaceGlobs(config)) {
    const manifest = path.join(ROOT, rel, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (pkg.private) continue;

    const entries = new Set();
    const exp = pkg.exports;
    if (typeof exp === 'string') entries.add(exp);
    else if (exp && typeof exp === 'object') {
      for (const value of Object.values(exp)) {
        if (typeof value === 'string') entries.add(value);
        else if (value && typeof value === 'object') {
          for (const nested of Object.values(value)) {
            if (typeof nested === 'string') entries.add(nested);
          }
        }
      }
    }
    if (entries.size === 0 && typeof pkg.main === 'string') entries.add(pkg.main);

    const files = [...entries]
      .filter((e) => CODE_ENTRY.test(e))
      .map((e) => path.join(ROOT, rel, e))
      .filter((f) => fs.existsSync(f));
    if (files.length > 0) out.push({ name: pkg.name, dir: rel, entries: files });
  }
  return out;
}

/**
 * Report how much of the published API surface the docs name.
 *
 * @param {import("./files.js").DocCheckConfig} config
 * @param {{ list?: boolean, json?: boolean, min?: number|null }} [opts]
 * @returns {number} process exit code
 */
export function checkDocsCoverage(config, opts = {}) {
  const { list: wantList = false, json: asJson = false } = opts;
  const min = opts.min ?? config.minCoverage ?? null;

  const docs = markdownFiles(config);
  const corpus = docs.map((d) => fs.readFileSync(path.join(ROOT, d), 'utf8')).join('\n');
  // One pass over the prose: the set of identifier-shaped words it contains.
  const mentioned = new Set(corpus.match(/[A-Za-z_$][\w$]*/g) ?? []);

  const packages = publishablePackages(config);
  if (packages.length === 0) {
    console.error('doccheck coverage: no publishable workspace packages found.');
    return 1;
  }

  const report = [];
  for (const pkg of packages) {
    const symbols = new Set();
    for (const entry of pkg.entries) for (const n of exportsOf(entry)) symbols.add(n);
    const all = [...symbols].sort();
    const missing = all.filter((s) => !mentioned.has(s));
    const documented = all.length - missing.length;
    report.push({
      package: pkg.name,
      total: all.length,
      documented,
      coverage: all.length === 0 ? 100 : Math.round((documented / all.length) * 1000) / 10,
      missing,
    });
  }

  const total = report.reduce((n, r) => n + r.total, 0);
  const documented = report.reduce((n, r) => n + r.documented, 0);
  const overall = total === 0 ? 100 : Math.round((documented / total) * 1000) / 10;

  if (asJson) {
    console.log(JSON.stringify({ overall, total, documented, packages: report }, null, 2));
  } else {
    console.log(`doccheck coverage: ${documented}/${total} exported symbols named in the docs — ${overall}%\n`);
    for (const r of [...report].sort((a, b) => a.coverage - b.coverage)) {
      console.log(`  ${String(r.coverage).padStart(5)}%  ${r.package}  (${r.documented}/${r.total})`);
      if (wantList && r.missing.length > 0) {
        console.log(`          undocumented: ${r.missing.join(', ')}`);
      }
    }
    console.log('');
  }

  if (min !== null && overall < min) {
    console.error(`doccheck coverage: ${overall}% is below the required ${min}%.`);
    return 1;
  }
  return 0;
}
