# Autollehinta.fi

Staattinen verkkosivu auton käyttökustannusten ja arvonaleneman laskentaan sekä rahoitusvertailuun. Julkinen etusivu toimii ilman palvelinta; Express-palvelin on valinnainen lokitukselle ja kehitykselle.

**Projektin juuri on `C:\temp\autollehinta`.** Älä sekoita polkuun `C:\temp\scripts\autollehinta` (siellä on erillisiä työkaluja, ei näitä `scripts/*.mjs` -tiedostoja). Komennot ja `npm run` ajetaan aina `autollehinta`-kansiosta.

## Käynnistäminen

```bash
npm install
npm start
```

Avaa selaimessa: `http://localhost:3000`

Vaihtoehto: mikä tahansa staattinen palvelin projektin juureen (esim. `python -m http.server`), jos et tarvitse `/logCalculate`-lokitusta.

## Markkinadatan päivitys (Autotalli-vedokset)

Kun sinulla on yksi tai useampi tiedosto `parsed_car_data_YYYY-MM-DD.json` (tuotettu erikseen Python-skriptillä hakemistoon `c:\temp\scripts\autotalli`):

```bash
npm run data:refresh
```

tai:

```bash
node scripts/run_merge_and_build.mjs
```

tai Windowsissa: `refresh_market_data.bat`

Tämä:

1. Yhdistää kaikki `parsed_car_data_YYYY-MM-DD.json` -tiedostot (dedupe rekisteri + hinta, uusin vedos voittaa).
2. Kirjoittaa `data/merged_parsed.json` ja `data/price_timeseries.json`.
3. Päivittää `data/market_stats.json` (merkkisivujen hintakatsaus jne.).

Muu lähdehakemisto:

```bash
node scripts/run_merge_and_build.mjs --dir "D:\polku\autotalli"
```

Tarkemmin: [scripts/README_merge_parsed.md](scripts/README_merge_parsed.md).

## NPM-skriptit

| Komento | Kuvaus |
|--------|--------|
| `npm start` | Express (portti 3000), staattiset tiedostot juuresta |
| `npm run data:refresh` | Merge + `market_stats.json` (oletushakemisto Autotalli) |
| `npm run build:market` | Vain aggregointi, jos `data/merged_parsed.json` on jo olemassa |

## Keskeiset tiedostot

- `index.html` — päälaskuri, vertailukortit  
- `rahoitusvertailu.html` — uusi vs. käytetty rahoituksella  
- `style.css`, `javascript.js`, `financing-calculator.js`  
- `data/market_stats.json` — aggregoitu markkinadata merkkisivuille  
- `market_brand_insight.js` — lataa merkkisivuilla `market_stats.json`, listan, vuosimallitaulukon (klikkaus) ja **Chart.js**-kuvaajan (mediaani vs. vuosimalli, CDN)  
- `scripts/build_market_stats.mjs` — JSON → `market_stats.json`  
- `scripts/merge_parsed_car_data.mjs` — usean vedoksen yhdistäminen  
- `scripts/run_merge_and_build.mjs` — yksi komento: merge + build  

Autotallin keräys ja parsinta: erillinen hakemisto `c:\temp\scripts\autotalli` (ks. sen `README.md`).

## Vaatimukset

- Node.js 18+ (ESM-skriptit `scripts/*.mjs`)
