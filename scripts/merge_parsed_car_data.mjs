#!/usr/bin/env node
/**
 * Yhdistää useita parsed_car_data_*.json -vedoksia:
 * - dedupe: sama normalisoitu rekisteri + sama hinta (€) → säilyy uusimman snapshotin rivi
 * - eri hinta, sama rekisteri → molemmat säilyvät (hintakehitys)
 * - Tuloste: merged JSON + valinnainen price_timeseries (rekisteri × snapshot × hinta)
 *
 * Usage:
 *   node scripts/merge_parsed_car_data.mjs --out data/merged_parsed.json [--timeseries data/price_timeseries.json] <file1.json> [file2.json ...]
 *
 * Snapshot-päivä: tiedostonimestä parsed_car_data_YYYY-MM-DD.json, muuten rivin hakupaiva, muuten tiedoston mtime.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} s */
function normalizeReg(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim().toUpperCase().replace(/\s+/g, '');
  return t.length >= 4 ? t : null;
}

/**
 * Poimi rekisteritunnus kuva-URL:stä, autotunniste-linkistä tai tekstistä.
 * @param {{ image?: string, description?: string, name?: string, rekisteri?: string }} row
 */
export function extractRegistration(row) {
  if (row.licensePlate && row.licensePlate !== 'N/A') {
    const n = normalizeReg(String(row.licensePlate).replace(/\s/g, ''));
    if (n) return n;
  }
  if (row.rekisteri && row.rekisteri !== 'N/A') {
    const n = normalizeReg(String(row.rekisteri));
    if (n) return n;
  }
  const image = row.image || '';
  const desc = row.description || '';
  const name = row.name || '';

  const mPath = image.match(/\/([A-Z]{1,3}-[A-Z0-9]{1,4})\//i);
  if (mPath) return normalizeReg(mPath[1]);

  const mAuto = desc.match(/autotunniste\/([A-Z0-9]+-[A-Z0-9]+)/i);
  if (mAuto) return normalizeReg(mAuto[1]);

  const text = `${desc} ${name}`;
  const m3 = text.match(/\b([A-Z]{3}-\d{3})\b/i);
  if (m3) return normalizeReg(m3[1]);

  const m4 = text.match(/\b([A-Z]{2,3}-[A-Z0-9]{2,4})\b/i);
  if (m4) return normalizeReg(m4[1]);

  return null;
}

/** @param {{ name?: string }} row */
export function extractListingId(row) {
  const name = row.name || '';
  const m = name.match(/\((\d{5,14})\)\s*\|\s*Autotalli/i);
  return m ? m[1] : null;
}

/** @param {unknown} v */
function priceEuroKey(v) {
  if (v == null || v === 'N/A') return null;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

/** @param {string} filePath */
function snapshotFromPath(filePath) {
  const base = path.basename(filePath);
  const m = base.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const st = fs.statSync(filePath);
  return st.mtime.toISOString().slice(0, 10);
}

/**
 * @param {{ rekisteri: string|null, listingId: string|null, priceKey: number|null, sourceSnapshot: string, seq: number }} parts
 */
function dedupeKey(parts) {
  const { rekisteri, listingId, priceKey, sourceSnapshot, seq } = parts;
  if (priceKey == null) return `badprice:${sourceSnapshot}:${seq}`;
  if (rekisteri) return `r:${rekisteri}|p:${priceKey}`;
  if (listingId) return `id:${listingId}|p:${priceKey}`;
  return `u:${sourceSnapshot}:${seq}`;
}

function parseArgs(argv) {
  const outIdx = argv.indexOf('--out');
  const tsIdx = argv.indexOf('--timeseries');
  let out = null;
  let timeseries = null;
  const files = [];
  if (outIdx !== -1 && argv[outIdx + 1]) out = path.resolve(argv[outIdx + 1]);
  if (tsIdx !== -1 && argv[tsIdx + 1]) timeseries = path.resolve(argv[tsIdx + 1]);
  for (let i = 0; i < argv.length; i++) {
    if (i === outIdx || i === outIdx + 1 || i === tsIdx || i === tsIdx + 1) continue;
    if (argv[i] === '--out' || argv[i] === '--timeseries') continue;
    if (argv[i].startsWith('-')) continue;
    files.push(path.resolve(argv[i]));
  }
  return { out, timeseries, files };
}

function main() {
  const { out, timeseries, files } = parseArgs(process.argv.slice(2));
  if (!out || files.length === 0) {
    console.error(
      'Usage: node scripts/merge_parsed_car_data.mjs --out <merged.json> [--timeseries <price_ts.json>] <parsed1.json> [parsed2.json ...]'
    );
    process.exit(1);
  }

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error('Tiedostoa ei löydy:', f);
      process.exit(1);
    }
  }

  const sortedFiles = [...files].sort((a, b) => snapshotFromPath(a).localeCompare(snapshotFromPath(b)));

  /** @type {Array<Record<string, unknown>>} */
  const enrichedOrdered = [];
  let globalSeq = 0;

  for (const filePath of sortedFiles) {
    const sourceSnapshot = snapshotFromPath(filePath);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(raw)) {
      console.error('Ei JSON-taulukko:', filePath);
      process.exit(1);
    }
    for (const row of raw) {
      const rek = extractRegistration(row);
      const lid = extractListingId(row);
      const rowSnapshot = typeof row.hakupaiva === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.hakupaiva)
        ? row.hakupaiva
        : sourceSnapshot;
      const priceKey = priceEuroKey(row.price);
      const e = {
        ...row,
        sourceSnapshot: rowSnapshot,
        rekisteri: rek || 'N/A',
      };
      enrichedOrdered.push({
        ...e,
        _dedupe: { rekisteri: rek, listingId: lid, priceKey, sourceSnapshot: rowSnapshot, seq: globalSeq++ },
      });
    }
  }

  const dedupeMap = new Map();
  for (const row of enrichedOrdered) {
    const d = row._dedupe;
    const key = dedupeKey(d);
    const { _dedupe, ...clean } = row;
    dedupeMap.set(key, clean);
  }

  const merged = Array.from(dedupeMap.values());

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(merged), 'utf8');
  console.log('Kirjoitettu', out, '(' + merged.length + ' riviä, lähteitä ' + sortedFiles.length + ')');

  if (timeseries) {
    const byReg = new Map();
    for (const row of enrichedOrdered) {
      const reg = row.rekisteri;
      if (!reg || reg === 'N/A') continue;
      const priceKey = priceEuroKey(row.price);
      if (priceKey == null) continue;
      if (!byReg.has(reg)) {
        byReg.set(reg, {
          rekisteri: reg,
          brand: row.brand,
          model: row.model,
          vehicleModelDate: row.vehicleModelDate,
          observations: [],
        });
      }
      const entry = byReg.get(reg);
      entry.observations.push({
        sourceSnapshot: row.sourceSnapshot,
        price: priceKey,
        ajettu: row.ajettu,
      });
    }
    for (const v of byReg.values()) {
      v.observations.sort((a, b) => a.sourceSnapshot.localeCompare(b.sourceSnapshot));
    }
    const series = Array.from(byReg.values()).filter((x) => x.observations.length >= 1);
    const payload = {
      generatedAt: new Date().toISOString(),
      sourceFiles: sortedFiles.map((f) => path.basename(f)),
      series,
    };
    fs.mkdirSync(path.dirname(timeseries), { recursive: true });
    fs.writeFileSync(timeseries, JSON.stringify(payload), 'utf8');
    console.log('Kirjoitettu', timeseries, '(' + series.length + ' rekisteriä, havaintoja yhteensä ' + enrichedOrdered.filter((r) => r.rekisteri && r.rekisteri !== 'N/A').length + ')');
  }
}

main();
