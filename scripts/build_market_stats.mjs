#!/usr/bin/env node
/**
 * ETL: Autotalli parsed JSON -> aggregated market_stats.json for Autollehinta 2.0
 * Usage: node scripts/build_market_stats.mjs --input <a.json> [--input <b.json> ...] [--output data/market_stats.json]
 *         Aja ensin merge_parsed_car_data.mjs jos tarvitset rekisteri+hinta -deduplikoinnin vedosten välillä.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_MIN_SAMPLE = 5;
const MIN_PRICE = 100;
const MAX_PRICE = 2_000_000;
const MIN_YEAR = 1980;
const MAX_YEAR = new Date().getFullYear() + 1;

function parseArgs() {
  const args = process.argv.slice(2);
  /** @type {string[]} */
  const inputs = [];
  let out = path.join(ROOT, 'data', 'market_stats.json');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputs.push(path.resolve(args[++i]));
    } else if (args[i] === '--output' && args[i + 1]) {
      out = path.resolve(args[++i]);
    }
  }
  return { inputs, out };
}

function loadCanonicalBrands() {
  const csvPath = path.join(ROOT, 'devaluation.csv');
  const text = fs.readFileSync(csvPath, 'utf8');
  const brands = new Map();
  for (const line of text.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const brand = line.split(';')[0]?.trim();
    if (brand) {
      brands.set(brand.toLowerCase(), brand);
    }
  }
  return brands;
}

function canonicalBrand(raw, brandMap) {
  if (!raw || raw === 'N/A') return null;
  const t = String(raw).trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (brandMap.has(lower)) return brandMap.get(lower);
  const aliases = {
    vw: 'Volkswagen',
    'mercedes-benz': 'Mercedes-Benz',
    mercedes: 'Mercedes-Benz',
    'mercedes benz': 'Mercedes-Benz',
    'citroën': 'Citroen',
    citroen: 'Citroen',
    škoda: 'Skoda',
    skoda: 'Skoda',
    opel: 'Opel',
    bmw: 'BMW',
    tesla: 'Tesla',
    toyota: 'Toyota',
    'land rover': 'Land Rover',
    'alfa romeo': 'Alfa Romeo',
    'aston martin': 'Aston Martin',
  };
  if (aliases[lower]) {
    const c = aliases[lower];
    if (brandMap.has(c.toLowerCase())) return brandMap.get(c.toLowerCase());
    return c;
  }
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normModel(m) {
  if (!m || m === 'N/A') return null;
  return String(m).trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseYear(v) {
  if (v == null || v === 'N/A') return null;
  const y = parseInt(String(v).trim(), 10);
  if (Number.isNaN(y) || y < MIN_YEAR || y > MAX_YEAR) return null;
  return y;
}

function parsePrice(v) {
  if (v == null || v === 'N/A') return null;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(n) || n < MIN_PRICE || n > MAX_PRICE) return null;
  return n;
}

function parseKm(v) {
  if (v == null || v === 'N/A') return null;
  const n = parseFloat(String(v).replace(/\s/g, ''));
  if (Number.isNaN(n) || n < 0 || n > 2_000_000) return null;
  return n;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

function median(sorted) {
  return percentile(sorted, 0.5);
}

/** Remove prices outside [Q1 - k*IQR, Q3 + k*IQR] */
function iqrFilter(values, k = 1.5) {
  if (values.length < 8) return values;
  const s = [...values].sort((a, b) => a - b);
  const q1 = percentile(s, 0.25);
  const q3 = percentile(s, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return values;
  const lo = q1 - k * iqr;
  const hi = q3 + k * iqr;
  return values.filter((x) => x >= lo && x <= hi);
}

function computeStats(prices, kms) {
  const fp = iqrFilter(prices);
  if (fp.length < DEFAULT_MIN_SAMPLE) return null;
  const sp = [...fp].sort((a, b) => a - b);
  const validKm = kms.filter((k) => k != null && k > 0);
  const sk = validKm.length >= DEFAULT_MIN_SAMPLE ? [...validKm].sort((a, b) => a - b) : null;
  return {
    count: fp.length,
    medianPrice: Math.round(median(sp)),
    p25: Math.round(percentile(sp, 0.25)),
    p75: Math.round(percentile(sp, 0.75)),
    meanPrice: Math.round(sp.reduce((a, b) => a + b, 0) / sp.length),
    medianKm: sk ? Math.round(median(sk)) : null,
  };
}

function main() {
  const { inputs, out } = parseArgs();
  if (inputs.length === 0) {
    console.error('Usage: node scripts/build_market_stats.mjs --input <parsed.json> [--input <b.json> ...] [--output path]');
    process.exit(1);
  }
  for (const p of inputs) {
    if (!fs.existsSync(p)) {
      console.error('Input not found:', p);
      process.exit(1);
    }
  }

  const brandMap = loadCanonicalBrands();
  console.log('Reading JSON (' + inputs.length + ' file(s), this may take a moment)...');
  /** @type {unknown[]} */
  const raw = [];
  for (const p of inputs) {
    const part = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(part)) {
      console.error('Expected top-level JSON array in', p);
      process.exit(1);
    }
    raw.push(...part);
  }

  /** @type {Map<string, { prices: number[], kms: (number|null)[] }>} */
  const segments = new Map();
  let skipped = 0;

  for (const row of raw) {
    const brand = canonicalBrand(row.brand, brandMap);
    const modelN = normModel(row.model);
    const year = parseYear(row.vehicleModelDate ?? row.releaseDate);
    const price = parsePrice(row.price);
    if (!brand || !modelN || year == null || price == null) {
      skipped++;
      continue;
    }
    const km = parseKm(row.ajettu);
    const key = `${brand}\u0000${modelN}\u0000${year}`;
    if (!segments.has(key)) {
      segments.set(key, { prices: [], kms: [] });
    }
    const seg = segments.get(key);
    seg.prices.push(price);
    seg.kms.push(km);
  }

  const byBrandModelYear = {};
  const byBrandYear = {};

  for (const [key, { prices, kms }] of segments) {
    const [brand, modelN, yearStr] = key.split('\u0000');
    const year = yearStr;
    const stats = computeStats(prices, kms);
    if (!stats) continue;

    if (!byBrandModelYear[brand]) byBrandModelYear[brand] = {};
    if (!byBrandModelYear[brand][modelN]) byBrandModelYear[brand][modelN] = {};
    byBrandModelYear[brand][modelN][year] = stats;

    if (!byBrandYear[brand]) byBrandYear[brand] = {};
    if (!byBrandYear[brand][year]) {
      byBrandYear[brand][year] = { prices: [], kms: [] };
    }
    byBrandYear[brand][year].prices.push(...prices);
    byBrandYear[brand][year].kms.push(...kms);
  }

  const byBrandYearOut = {};
  for (const brand of Object.keys(byBrandYear)) {
    byBrandYearOut[brand] = {};
    for (const year of Object.keys(byBrandYear[brand])) {
      const { prices, kms } = byBrandYear[brand][year];
      const stats = computeStats(prices, kms);
      if (stats) byBrandYearOut[brand][year] = stats;
    }
  }

  /** Top models by listing count per brand (SEO / merkkisivut) + mallikohtainen hintahaitari ja mediaani */
  const topModelsByBrand = {};
  for (const brand of Object.keys(byBrandModelYear)) {
    const models = [];
    for (const modelN of Object.keys(byBrandModelYear[brand])) {
      const allPrices = [];
      const allKms = [];
      for (const y of Object.keys(byBrandModelYear[brand][modelN])) {
        const key = `${brand}\u0000${modelN}\u0000${y}`;
        const seg = segments.get(key);
        if (seg) {
          allPrices.push(...seg.prices);
          allKms.push(...seg.kms);
        }
      }
      const stats = computeStats(allPrices, allKms);
      if (!stats) continue;
      models.push({
        model: modelN,
        listingCount: stats.count,
        medianPrice: stats.medianPrice,
        p25: stats.p25,
        p75: stats.p75,
      });
    }
    models.sort((a, b) => b.listingCount - a.listingCount);
    topModelsByBrand[brand] = models;
  }

  const sourceName =
    inputs.length === 1 ? path.basename(inputs[0]) : inputs.length + '_merged_inputs:' + inputs.map((p) => path.basename(p)).join('+');
  const snapshotMatch = sourceName.match(/(\d{4}-\d{2}-\d{2})/);
  const sourceSnapshot = snapshotMatch ? snapshotMatch[1] : null;

  const output = {
    meta: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceFile: sourceName,
      sourceSnapshot,
      sourceFiles: inputs.map((p) => path.basename(p)),
      minSampleSize: DEFAULT_MIN_SAMPLE,
      disclaimerFi:
        'Luvut perustuvat tilastolliseen otokseen. Ne eivät ole virallisia hinta-arvioita eivätkä takaa tiettyä hintaa.',
      methodologyFi:
        'Segmentti = merkki + malli + vuosimalli. Hintoihin on sovellettu tilastollista poikkeavuuksien suodatusta (IQR). Mediaani on tyypillistä hintaa parempi tunnusluku kuin keskiarvo.',
    },
    byBrandModelYear,
    byBrandYear: byBrandYearOut,
    topModelsByBrand,
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(output), 'utf8');
  const stat = fs.statSync(out);
  console.log(`Wrote ${out} (${(stat.size / 1024).toFixed(1)} KiB)`);
  console.log(`Rows in source: ${raw.length}, skipped (invalid): ${skipped}`);
  console.log(`Brands with data: ${Object.keys(byBrandModelYear).length}`);
}

main();
