#!/usr/bin/env node
/**
 * Yksi komento: kerää c:\temp\scripts\autotalli\parsed_car_data_YYYY-MM-DD.json
 * → merge (dedupe) → data/merged_parsed.json + data/price_timeseries.json
 * → build_market_stats → data/market_stats.json
 *
 * Usage:
 *   node scripts/run_merge_and_build.mjs
 *   node scripts/run_merge_and_build.mjs --dir "D:\data\autotalli"
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Oletus: käyttäjän tyypillinen polku tai repo-vierus (package.json build:market -tyyli). */
function defaultAutotalliDir() {
  const winPath = 'c:\\temp\\scripts\\autotalli';
  if (fs.existsSync(winPath)) return winPath;
  return path.resolve(ROOT, '..', 'scripts', 'autotalli');
}

function parseDir(argv) {
  const i = argv.indexOf('--dir');
  if (i !== -1 && argv[i + 1]) return path.resolve(argv[i + 1]);
  return defaultAutotalliDir();
}

function listParsedCarDataJson(dir) {
  if (!fs.existsSync(dir)) {
    console.error('Hakemistoa ei löydy:', dir);
    process.exit(1);
  }
  const names = fs
    .readdirSync(dir)
    .filter((n) => /^parsed_car_data_\d{4}-\d{2}-\d{2}\.json$/i.test(n));
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return names.map((n) => path.join(dir, n));
}

function runNode(scriptRelative, args) {
  const script = path.join(ROOT, scriptRelative);
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const dir = parseDir(process.argv.slice(2));
const inputs = listParsedCarDataJson(dir);

if (inputs.length === 0) {
  console.error('Ei tiedostoja parsed_car_data_YYYY-MM-DD.json hakemistossa:', dir);
  process.exit(1);
}

console.log('Autotalli-hakemisto:', dir);
console.log('Löytyi', inputs.length, 'JSON-vedosta:');
inputs.forEach((p) => console.log('  -', path.basename(p)));

const mergedOut = path.join(ROOT, 'data', 'merged_parsed.json');
const tsOut = path.join(ROOT, 'data', 'price_timeseries.json');
const marketOut = path.join(ROOT, 'data', 'market_stats.json');

runNode('scripts/merge_parsed_car_data.mjs', [
  '--out',
  mergedOut,
  '--timeseries',
  tsOut,
  ...inputs,
]);

runNode('scripts/build_market_stats.mjs', ['--input', mergedOut, '--output', marketOut]);

console.log('\nValmis:');
console.log(' ', mergedOut);
console.log(' ', tsOut);
console.log(' ', marketOut);
