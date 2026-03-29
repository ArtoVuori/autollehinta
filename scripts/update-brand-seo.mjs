import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const skip = new Set([
  'index.html',
  'blog_01.html',
  'blog_02.html',
  'terms.html',
  'terms_explanations.html',
  'rahoitusvertailu.html',
  'getpage.html',
  'vw_test.html',
]);

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html') && !skip.has(f));

for (const f of files) {
  let html = fs.readFileSync(path.join(root, f), 'utf8');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) continue;
  const oldTitle = titleMatch[1].trim();
  if (!oldTitle.includes('Yleistä tietoa')) continue;

  const brand = oldTitle.replace(/\s*-\s*Yleistä tietoa\s*$/i, '').trim();
  const newTitle = `${brand}: arvonalenema ja kulutus | Autollehinta.fi`;
  const newDesc = `Tyypillinen arvon alenema, kulutusluvut ja käyttövoimat: ${brand}. Katso yhteenveto ja laske omien autokustannustesi arvio etusivun laskurilla.`;
  const newKeywords = `${brand}, arvonalenema, auton kulutus, käyttövoima, kuukausikustannus, Autollehinta`;

  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  const pageUrl = canonicalMatch ? canonicalMatch[1] : `https://autollehinta.fi/${f}`;

  html = html.replace(/<title>[^<]+<\/title>/, `<title>${newTitle}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeAttr(newDesc)}">`
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]*">/,
    `<meta name="keywords" content="${escapeAttr(newKeywords)}">`
  );

  const ogBlock = `
    <meta name="robots" content="index, follow">
    <meta property="og:site_name" content="Autollehinta.fi">
    <meta property="og:locale" content="fi_FI">
    <meta property="og:title" content="${escapeAttr(newTitle)}">
    <meta property="og:description" content="${escapeAttr(newDesc)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttr(pageUrl)}">
    <meta property="og:image" content="https://autollehinta.fi/og-default.svg">
    <meta property="og:image:alt" content="${escapeAttr(brand + ' – arvonalenema ja kulutus')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(newTitle)}">
    <meta name="twitter:description" content="${escapeAttr(newDesc)}">
    <meta name="twitter:image" content="https://autollehinta.fi/og-default.svg">`;

  if (!html.includes('property="og:title"')) {
    html = html.replace(/(<meta name="keywords" content="[^"]*">)/, `$1${ogBlock}`);
  }

  fs.writeFileSync(path.join(root, f), html);
  console.log('Updated', f);
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
