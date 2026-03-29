# Parsed Autotalli -vedosten yhdistäminen

Työkalut: [run_merge_and_build.mjs](run_merge_and_build.mjs) (yksi komento), [merge_parsed_car_data.mjs](merge_parsed_car_data.mjs), [build_market_stats.mjs](build_market_stats.mjs).

## 0. Yksi komento (suositeltu)

Kerää automaattisesti kaikki `parsed_car_data_YYYY-MM-DD.json` hakemistosta `c:\temp\scripts\autotalli` (tai `--dir`), ajaa mergen ja päivittää `data/market_stats.json`.

```powershell
cd c:\temp\autollehinta
npm run data:refresh
```

tai:

```powershell
node scripts/run_merge_and_build.mjs
```

Muu hakemisto:

```powershell
node scripts/run_merge_and_build.mjs --dir "D:\oma\polku\autotalli"
```

Tai kaksoisklikkaa [refresh_market_data.bat](../refresh_market_data.bat) projektin juuressa.

**Huom:** Tämä ei hae Autotallista uutta dataa — JSON:t pitää olla jo tuotettu Python-skriptillä. Tämä vain yhdistää ja laskee sivuston käyttämän `market_stats.json` -tiedoston.

## 1. Yhdistä + dedupe + hinta-aikasarja (manuaalinen)

Rekisterinumero poimitaan järjestyksessä: `licensePlate` / `rekisteri` -kentät, kuva-URL:n polku (`/ABC-123/`), `autotunniste/…` kuvauksessa, regex tekstissä. Ilman rekisteriä dedupe käyttää ilmoitus-ID:tä `name`-kentästä `(123456) | Autotalli`.

- **Dedupe:** avain `(rekisteri, pyöristetty hinta €)`. Sama pari useassa vedoksessa → säilyy **uusimman** tiedoston rivi (tiedostot ajetaan vanhimmasta uusimpaan).
- **Eri hinta, sama rekisteri:** molemmat säilyvät (`merged_parsed.json`).
- **price_timeseries.json:** kaikki havainnot rekisterikohtaisesti (myös ennen dedupea), snapshot-päivineen — kuvaajia varten.

```powershell
cd c:\temp\autollehinta

node scripts/merge_parsed_car_data.mjs `
  --out data/merged_parsed.json `
  --timeseries data/price_timeseries.json `
  c:\temp\scripts\autotalli\parsed_car_data_2025-04-27.json `
  c:\temp\scripts\autotalli\parsed_car_data_2026-03-29.json
```

## 2. Aggregoi market_stats

Yksi syöte (yhdistetty tai yksittäinen vedos):

```powershell
node scripts/build_market_stats.mjs --input data/merged_parsed.json
```

Useita JSONeja **ilman** mergeä (vain peräkkäinen concat, ei rekisteri-dedupea):

```powershell
node scripts/build_market_stats.mjs `
  --input c:\temp\scripts\autotalli\parsed_car_data_2025-04-27.json `
  --input c:\temp\scripts\autotalli\parsed_car_data_2026-03-29.json
```

## 3. Uusi aineisto (Python)

[c:\temp\scripts\autotalli\test_parse_json.py](c:\temp\scripts\autotalli\test_parse_json.py) täyttää `rekisteri` (lista + kuva/kuvaus tai detail-sivun rekisteri).

## Huomioita

- Vanhoissa JSONeissa ei välttämättä ole `rekisteri`/`licensePlate`; merge käyttää silloin kuva-URL:ia ja teksti-regexiä.
- `market_stats.json` on poikkileikkausaggregaatti; yksittäisen auton hintakehitys: `price_timeseries.json`.
