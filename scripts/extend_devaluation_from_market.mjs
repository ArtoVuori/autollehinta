#!/usr/bin/env node
/**
 * Pidentää devaluation.csv / devaluation_ev.csv iät 11–MAX_AGE.
 *
 * Metodologia:
 * - Säilyttää sarakkeet 0–10 sellaisenaan lähtö-CSV:stä (toimituksellinen käyrä).
 * - Aggregoi market_stats.json: merkki × ikä (refYear − vuosimalli), painotettu
 *   keskihinta = Σ(medianPrice × count) / Σ(count) segmenteittäin.
 * - Referenssihinta: ensimmäinen ikä 0–5, jossa otos ≥ minSample.
 * - Ikä a 11…MAX_AGE: jos otos riittää, empiirinen kerroin = 1 − hinta(a)/refPrice,
 *   rajattu [edellinen kerroin, 0.95]. Muuten jatke: edellinen + askel (max 0.005,
 *   oletus (f10−f9) tai 0.02).
 * - Pakota kumulatiivinen monotonisuus (ei pienene iän myötä).
 *
 * Käyttö:
 *   node scripts/extend_devaluation_from_market.mjs
 *   node scripts/extend_devaluation_from_market.mjs --ev
 *
 * Oletus: data/market_stats.json, kirjoitus devaluation.csv tai --ev → devaluation_ev.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEVALUATION_MAX_AGE = 20;
const BASE_MAX = 10;
const MIN_SAMPLE = 5;
const DEFAULT_STEP = 0.02;
const MIN_STEP = 0.005;

function parseCsvDevaluation(content) {
  const lines = content.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';').map((s) => s.trim());
    const brand = cols[0];
    const nums = cols.slice(1).map((x) => {
      const n = parseFloat(x);
      return Number.isFinite(n) ? n : 0;
    });
    rows.push({ brand, factors: nums });
  }
  return rows;
}

function refYearFromMeta(meta) {
  if (meta?.generatedAt) {
    const y = parseInt(String(meta.generatedAt).slice(0, 4), 10);
    if (!Number.isNaN(y)) return y;
  }
  return new Date().getFullYear();
}

function aggregateByAge(brand, byBrandModelYear, refYear, maxAge) {
  const byAge = {};
  const perBrand = byBrandModelYear[brand];
  if (!perBrand || typeof perBrand !== 'object') return byAge;

  for (const modelNorm of Object.keys(perBrand)) {
    const perYear = perBrand[modelNorm];
    if (!perYear || typeof perYear !== 'object') continue;
    for (const yearStr of Object.keys(perYear)) {
      const y = parseInt(yearStr, 10);
      if (Number.isNaN(y)) continue;
      const age = refYear - y;
      if (age < 0 || age > maxAge) continue;
      const seg = perYear[yearStr];
      if (!seg || typeof seg.medianPrice !== 'number' || typeof seg.count !== 'number')
        continue;
      if (seg.count < 1 || seg.medianPrice <= 0) continue;
      if (!byAge[age]) byAge[age] = { sumP: 0, w: 0 };
      byAge[age].sumP += seg.medianPrice * seg.count;
      byAge[age].w += seg.count;
    }
  }
  return byAge;
}

function weightedMeanPrice(byAge, age) {
  const b = byAge[age];
  if (!b || b.w <= 0) return null;
  return b.sumP / b.w;
}

function pickRefPrice(byAge, minSample) {
  for (let a = 0; a <= 5; a++) {
    const b = byAge[a];
    if (b && b.w >= minSample) return b.sumP / b.w;
  }
  for (let a = 6; a <= BASE_MAX; a++) {
    const b = byAge[a];
    if (b && b.w >= minSample) return b.sumP / b.w;
  }
  return null;
}

function extendBrandFactors(existingFactors, byAge, minSample, maxAge) {
  const f = existingFactors.slice(0, BASE_MAX + 1);
  while (f.length < BASE_MAX + 1) {
    f.push(f.length ? f[f.length - 1] : 0);
  }
  const step = Math.max(
    MIN_STEP,
    Number.isFinite(f[10] - f[9]) ? f[10] - f[9] : DEFAULT_STEP
  );
  const refPrice = pickRefPrice(byAge, minSample);

  for (let age = BASE_MAX + 1; age <= maxAge; age++) {
    let cand;
    const b = byAge[age];
    const wmp = weightedMeanPrice(byAge, age);
    if (refPrice && wmp != null && b && b.w >= minSample) {
      const emp = 1 - wmp / refPrice;
      cand = Math.min(0.95, Math.max(f[age - 1], emp));
    } else {
      cand = Math.min(0.95, f[age - 1] + step);
    }
    cand = Math.max(cand, f[age - 1]);
    cand = Math.min(0.95, cand);
    f.push(cand);
  }

  return f;
}

function buildHeader(maxAge) {
  return ['Brand', ...Array.from({ length: maxAge + 1 }, (_, i) => String(i))].join(
    ';'
  );
}

function formatFactor(n) {
  if (!Number.isFinite(n)) return '0';
  const c = Math.min(0.95, Math.max(0, n));
  return String(Math.round(c * 10000) / 10000);
}

function formatRow(brand, factors) {
  return [brand, ...factors.map(formatFactor)].join(';');
}

function main() {
  const isEv = process.argv.includes('--ev');
  const inputCsv = path.join(ROOT, isEv ? 'devaluation_ev.csv' : 'devaluation.csv');
  const marketPath = path.join(ROOT, 'data', 'market_stats.json');

  const rawCsv = fs.readFileSync(inputCsv, 'utf8');
  const rows = parseCsvDevaluation(rawCsv);
  const stats = JSON.parse(fs.readFileSync(marketPath, 'utf8').replace(/^\uFEFF/, ''));
  const refYear = refYearFromMeta(stats.meta);
  const byMy = stats.byBrandModelYear || {};

  const outRows = rows.map((row) => {
    const byAge = aggregateByAge(row.brand, byMy, refYear, DEVALUATION_MAX_AGE);
    const factors = extendBrandFactors(
      row.factors,
      byAge,
      MIN_SAMPLE,
      DEVALUATION_MAX_AGE
    );
    return { brand: row.brand, factors };
  });

  const header = buildHeader(DEVALUATION_MAX_AGE);
  const lines = [header, ...outRows.map((r) => formatRow(r.brand, r.factors))];
  fs.writeFileSync(inputCsv, lines.join('\n') + '\n', 'utf8');
  console.log(
    'Wrote',
    inputCsv,
    'brands',
    outRows.length,
    'refYear',
    refYear,
    'ages 0–' + DEVALUATION_MAX_AGE
  );
}

main();
