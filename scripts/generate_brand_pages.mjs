#!/usr/bin/env node
/**
 * Merkkisivut: lukee devaluation.csv + devaluation_ev.csv, kirjoittaa puuttuvat {slug}.html,
 * päivittää footer.js:n merkkilinkit, automerkkit.html:n merkkilistan,
 * sitemap.xml:n Merkkisivut-osion (kaikki slug.html-URLit CSV-merkeistä),
 * ja market_brand_insight.js:n FILE_TO_BRAND.
 *
 * Kun audi.html / tesla.html -rakennetta muutat, aja ensin pohjan uudelleenotto:
 *   npm run extract:brand-template
 * sitten generointi:
 *   npm run generate:brands
 *
 * Liput: --extract-template (vain pohjat), --dry-run (ei kirjoituksia), --force (ylikirjoita olemassa olevat HTML:t).
 * Slug-poikkeukset: scripts/brand_slug_overrides.json. Footer: <!-- BRAND_LINKS_START/END -->.
 * Staattinen mallilista: {{TOP_MODELS_LIST}} = kaikki mallit data/market_stats.json → byBrandModelYear[merkki] (ilman lukumääriä).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://autollehinta.fi';
const DENY = new Set(['vw_test', 'getpage', 'index']);
const argv = process.argv.slice(2);
const dry = argv.includes('--dry-run');
const force = argv.includes('--force');
const extract = argv.includes('--extract-template');
const TOP_MODELS_LIMIT = 5;

function loadJson(p) {
  const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}
function csvBrands(f) {
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .slice(1)
    .map((l) => l.split(';')[0]?.trim())
    .filter(Boolean);
}
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function reEsc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function defaultSlug(brand) {
  return brand
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}
function slugForBrand(brand, ov) {
  if (ov[brand]) return ov[brand];
  return defaultSlug(brand);
}

/** Sama kuin market_brand_insight.js / formatModelDisplayName */
function formatModelDisplayName(normKey) {
  if (!normKey) return '';
  return String(normKey).replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Kaikki mallit merkille byBrandModelYear:stä (SEO); järjestys: eniten ilmoituksia yhteensä. */
function buildStaticModelsListHtml(brand, stats) {
  const byMy = stats?.byBrandModelYear?.[brand];
  if (byMy && typeof byMy === 'object') {
    const rows = [];
    for (const modelNorm of Object.keys(byMy)) {
      let total = 0;
      const perYear = byMy[modelNorm];
      if (!perYear || typeof perYear !== 'object') continue;
      for (const y of Object.keys(perYear)) {
        const seg = perYear[y];
        if (seg && typeof seg.count === 'number') total += seg.count;
      }
      if (total > 0) rows.push({ modelNorm, total });
    }
    rows.sort((a, b) => b.total - a.total || a.modelNorm.localeCompare(b.modelNorm, 'fi'));
    if (rows.length) {
      return rows
        .map(({ modelNorm }) => `                    <li>${escHtml(formatModelDisplayName(modelNorm))}</li>`)
        .join('\n');
    }
  }
  const legacy = stats?.topModelsByBrand?.[brand];
  if (legacy?.length) {
    return legacy
      .map((row) => `                    <li>${escHtml(formatModelDisplayName(row.model))}</li>`)
      .join('\n');
  }
  return '                    <li>Ajantasaiset mallit löytyvät sivun yläosan käytettyjen hintakatsauksesta, kun otos on riittävä.</li>';
}

function fillTemplate(tpl, brand, slug, topModelsListHtml) {
  const e = escHtml(brand);
  const list = topModelsListHtml ?? '';
  return tpl
    .split('{{BASE_URL}}')
    .join(BASE_URL)
    .split('{{SLUG}}')
    .join(slug)
    .split('{{BRAND_ESC}}')
    .join(e)
    .split('{{BRAND}}')
    .join(e)
    .split('{{TOP_MODELS_LIST}}')
    .join(list);
}

/**
 * Varmistaa malliosion pohjassa {{TOP_MODELS_LIST}} (ei kovakoodattuja rivejä Audi/Teslasta).
 * Ajetaan extractissa heti kun merkki on jo {{BRAND}}.
 */
function ensureTopModelsPlaceholder(html) {
  if (html.includes('{{TOP_MODELS_LIST}}')) return html;
  const block = `                <h2>{{BRAND}}-merkiltä löytyy muun muassa malleja:</h2>
                <ul>
{{TOP_MODELS_LIST}}
                </ul>`;
  const reOld =
    /<h2>\{\{BRAND\}\}-merkin (nykyiset mallit|eniten ilmoituksia saaneet mallit|mallit tässä aineistossa)<\/h2>\s*<p>[\s\S]*?<\/p>\s*<ul>[\s\S]*?<\/ul>/;
  const reNew =
    /<h2>\{\{BRAND\}\}-merkiltä löytyy muun muassa malleja:<\/h2>(?:\s*<p>[\s\S]*?<\/p>)?\s*<ul>[\s\S]*?<\/ul>/;
  if (reOld.test(html)) return html.replace(reOld, block);
  if (reNew.test(html)) return html.replace(reNew, block);
  return html;
}

function extractTemplates() {
  const outDir = path.join(__dirname, 'templates');
  fs.mkdirSync(outDir, { recursive: true });
  const audiPath = path.join(ROOT, 'audi.html');
  const teslaPath = path.join(ROOT, 'tesla.html');
  if (fs.existsSync(audiPath)) {
    let s = fs.readFileSync(audiPath, 'utf8');
    s = s.split('https://autollehinta.fi').join('{{BASE_URL}}');
    s = s.replace(/\/audi\.html/g, '/{{SLUG}}.html');
    s = s.replace(/\bAudin\b/g, '{{BRAND}}-merkin');
    s = s.replace(/\bAudilla\b/g, '{{BRAND}}-merkillä');
    s = s.replace(/\bAudi\b/g, '{{BRAND}}');
    s = ensureTopModelsPlaceholder(s);
    fs.writeFileSync(path.join(outDir, 'brand_page_multi.html.template'), s, 'utf8');
    console.log('Wrote templates/brand_page_multi.html.template');
  }
  if (fs.existsSync(teslaPath)) {
    let s = fs.readFileSync(teslaPath, 'utf8');
    s = s.split('https://autollehinta.fi').join('{{BASE_URL}}');
    s = s.replace(/\/tesla\.html/g, '/{{SLUG}}.html');
    s = s.replace(/\bTeslan\b/g, '{{BRAND}}-merkin');
    s = s.replace(/\bTeslalla\b/g, '{{BRAND}}-merkillä');
    s = s.replace(/\bTesla\b/g, '{{BRAND}}');
    s = ensureTopModelsPlaceholder(s);
    fs.writeFileSync(path.join(outDir, 'brand_page_ev.html.template'), s, 'utf8');
    console.log('Wrote templates/brand_page_ev.html.template');
  }
}

function patchFooter(rowsHtml, dryRun) {
  const p = path.join(ROOT, 'footer.js');
  let s = fs.readFileSync(p, 'utf8');
  const a = '<!-- BRAND_LINKS_START -->';
  const b = '<!-- BRAND_LINKS_END -->';
  if (!s.includes(a) || !s.includes(b)) {
    console.error('footer.js: missing BRAND_LINKS HTML markers');
    process.exit(1);
  }
  s = s.replace(new RegExp(`${reEsc(a)}[\\s\\S]*?${reEsc(b)}`, 'm'), `${a}\n${rowsHtml}\n            ${b}`);
  if (!dryRun) fs.writeFileSync(p, s, 'utf8');
}

/** automerkkit.html: merkkilinkit (sama järjestys / data kuin footer). */
function patchBrandIndexPage(sorted, dryRun) {
  const p = path.join(ROOT, 'automerkkit.html');
  if (!fs.existsSync(p)) {
    console.warn('automerkkit.html: tiedostoa ei löydy, ohitetaan merkkilistan päivitys');
    return;
  }
  let s = fs.readFileSync(p, 'utf8');
  const start = '<!-- BRAND_INDEX_LIST_START -->';
  const end = '<!-- BRAND_INDEX_LIST_END -->';
  if (!s.includes(start) || !s.includes(end)) {
    console.error('automerkkit.html: puuttuvat BRAND_INDEX_LIST_START/END -merkit');
    process.exit(1);
  }
  const items = sorted
    .map(
      ({ brand, slug }) =>
        `            <li><a href="./${slug}.html">${escHtml(brand)}</a></li>`
    )
    .join('\n');
  const block = `${start}\n        <ul class="brand-index-list" role="navigation" aria-label="Automerkit">\n${items}\n        </ul>\n        ${end}`;
  s = s.replace(new RegExp(`${reEsc(start)}[\\s\\S]*?${reEsc(end)}`, 'm'), block);
  if (!dryRun) fs.writeFileSync(p, s, 'utf8');
}

function patchSitemap(slugs, dryRun) {
  const p = path.join(ROOT, 'sitemap.xml');
  const s = fs.readFileSync(p, 'utf8');
  const marker = '  <!-- Merkkisivut -->';
  const i = s.indexOf(marker);
  const j = s.indexOf('</urlset>', i);
  if (i === -1 || j === -1) {
    console.error('sitemap.xml: bad structure');
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const urls = slugs
    .map(
      (slug) => `  <url>
    <loc>${BASE_URL}/${slug}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('\n');
  const out = s.slice(0, i) + marker + '\n' + urls + '\n' + s.slice(j);
  if (!dryRun) fs.writeFileSync(p, out, 'utf8');
}

function patchInsight(entries, dryRun) {
  const p = path.join(ROOT, 'market_brand_insight.js');
  let s = fs.readFileSync(p, 'utf8');
  const a = '/* AUTO-GENERATED FILE_TO_BRAND start */';
  const e = '/* AUTO-GENERATED FILE_TO_BRAND end */';
  if (!s.includes(a) || !s.includes(e)) {
    console.error('market_brand_insight.js: missing markers');
    process.exit(1);
  }
  const lines = entries.map(([f, br]) => `    '${f}': '${br.replace(/'/g, "\\'")}',`).join('\n');
  s = s.replace(
    new RegExp(`${reEsc(a)}[\\s\\S]*?${reEsc(e)}`, 'm'),
    `${a}\n  var FILE_TO_BRAND = {\n${lines}\n  };\n  ${e}`
  );
  if (!dryRun) fs.writeFileSync(p, s, 'utf8');
}

function main() {
  if (extract) {
    extractTemplates();
    return;
  }

  const ovPath = path.join(__dirname, 'brand_slug_overrides.json');
  const ov = fs.existsSync(ovPath) ? loadJson(ovPath) : {};
  const reg = csvBrands(path.join(ROOT, 'devaluation.csv'));
  const ev = csvBrands(path.join(ROOT, 'devaluation_ev.csv'));
  const regSet = new Set(reg);
  const evSet = new Set(ev);
  const allBrands = [...new Set([...reg, ...ev])].sort((a, b) => a.localeCompare(b, 'fi'));

  const tplMPath = path.join(__dirname, 'templates', 'brand_page_multi.html.template');
  const tplEPath = path.join(__dirname, 'templates', 'brand_page_ev.html.template');
  if (!fs.existsSync(tplMPath) || !fs.existsSync(tplEPath)) {
    console.error('Run first: node scripts/generate_brand_pages.mjs --extract-template');
    process.exit(1);
  }
  const tplM = fs.readFileSync(tplMPath, 'utf8');
  const tplE = fs.readFileSync(tplEPath, 'utf8');

  const marketPath = path.join(ROOT, 'data', 'market_stats.json');
  let marketStats = null;
  if (fs.existsSync(marketPath)) {
    try {
      marketStats = loadJson(marketPath);
    } catch (err) {
      console.warn('market_stats.json:', err.message);
    }
  } else {
    console.warn('Puuttuu data/market_stats.json — staattinen mallilista käyttää fallback-tekstiä.');
  }

  const rows = [];
  let created = 0;
  let skipped = 0;

  for (const brand of allBrands) {
    const slug = slugForBrand(brand, ov);
    if (!slug || DENY.has(slug)) continue;
    const evOnly = !regSet.has(brand) && evSet.has(brand);
    const tpl = evOnly ? tplE : tplM;
    const topModelsListHtml = buildStaticModelsListHtml(brand, marketStats);
    const html = fillTemplate(tpl, brand, slug, topModelsListHtml);
    const outPath = path.join(ROOT, `${slug}.html`);
    rows.push({ brand, slug });

    if (fs.existsSync(outPath) && !force) {
      skipped++;
      continue;
    }
    if (dry) {
      console.log('[dry-run]', slug + '.html', evOnly ? 'ev' : 'multi');
      created++;
      continue;
    }
    fs.writeFileSync(outPath, html, 'utf8');
    console.log('Wrote', slug + '.html');
    created++;
  }

  const sorted = [...rows].sort((a, b) => a.brand.localeCompare(b.brand, 'fi'));
  const footerHtml = sorted
    .map(
      ({ brand, slug }) =>
        `            <span class="separator">|</span>\n            <a href="./${slug}.html">${escHtml(brand)}</a>`
    )
    .join('\n');
  const mapEntries = sorted.map((r) => [`${r.slug}.html`, r.brand]);
  const sitemapSlugs = [...new Set(rows.map((r) => r.slug))].sort();

  patchFooter(footerHtml, dry);
  patchBrandIndexPage(sorted, dry);
  patchSitemap(sitemapSlugs, dry);
  patchInsight(mapEntries, dry);

  console.log(`Done. written: ${created}, skipped: ${skipped}${dry ? ' (dry-run)' : ''}`);
}

main();
