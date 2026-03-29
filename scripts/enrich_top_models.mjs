#!/usr/bin/env node
/**
 * Päivittää data/market_stats.json → topModelsByBrand -riveihin (kaikki mallit / merkki)
 * p25, p75, medianPrice ja listingCount ilman lähde-JSONia:
 * otos = summa vuosi-segmenttien counteista, mediaani = tilavuuspainotettu
 * vuosimediaanien keskiarvo, hintahaitari = min(p25)…max(p75) vuosien yli.
 * Täydellinen pooled-mediaani: aja build_market_stats.mjs lähdedatalla.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outPath = path.join(ROOT, 'data', 'market_stats.json');

const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const minN = data.meta?.minSampleSize ?? 5;

if (!data.byBrandModelYear) {
  console.error('byBrandModelYear puuttuu');
  process.exit(1);
}

const topModelsByBrand = {};
for (const brand of Object.keys(data.byBrandModelYear)) {
  const models = [];
  for (const modelN of Object.keys(data.byBrandModelYear[brand])) {
    const years = data.byBrandModelYear[brand][modelN];
    let total = 0;
    let wMed = 0;
    let p25Min = Infinity;
    let p75Max = -Infinity;
    for (const y of Object.keys(years)) {
      const s = years[y];
      if (!s || typeof s.count !== 'number') continue;
      total += s.count;
      wMed += s.medianPrice * s.count;
      if (s.p25 < p25Min) p25Min = s.p25;
      if (s.p75 > p75Max) p75Max = s.p75;
    }
    if (total < minN) continue;
    const medianPrice = Math.round(wMed / total);
    models.push({
      model: modelN,
      listingCount: total,
      medianPrice,
      p25: p25Min === Infinity ? medianPrice : p25Min,
      p75: p75Max === -Infinity ? medianPrice : p75Max,
    });
  }
  models.sort((a, b) => b.listingCount - a.listingCount);
  topModelsByBrand[brand] = models;
}

data.topModelsByBrand = topModelsByBrand;
data.meta = data.meta || {};
data.meta.generatedAt = new Date().toISOString();
fs.writeFileSync(outPath, JSON.stringify(data), 'utf8');
console.log('Updated topModelsByBrand in', outPath);
