/**
 * Markkinaviite: lataa /data/market_stats.json ja näyttää segmentin tilastot laskurin tulosten yhteydessä.
 */
(function () {
  let cache = null;
  let loadPromise = null;

  function normModel(s) {
    if (!s || typeof s !== 'string') return '';
    return s.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function resolveBrandKey(brandSelectValue, data) {
    if (!brandSelectValue || !data.byBrandYear) return null;
    const keys = Object.keys(data.byBrandYear);
    const lower = brandSelectValue.trim().toLowerCase();
    const exact = keys.find((k) => k.toLowerCase() === lower);
    return exact || null;
  }

  async function loadMarketStats() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;
    loadPromise = fetch('/data/market_stats.json', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('market_stats ' + r.status);
        return r.json();
      })
      .then((d) => {
        cache = d;
        return d;
      })
      .catch((e) => {
        console.warn('market_stats:', e);
        loadPromise = null;
        return null;
      });
    return loadPromise;
  }

  function formatEuro(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return (
      new Intl.NumberFormat('fi-FI', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n)
    );
  }

  function findSegmentStats(data, brandKey, modelNorm, yearStr) {
    const minN = data.meta?.minSampleSize ?? 5;
    if (modelNorm && data.byBrandModelYear[brandKey]?.[modelNorm]?.[yearStr]) {
      const s = data.byBrandModelYear[brandKey][modelNorm][yearStr];
      if (s && s.count >= minN) return { stats: s, level: 'model' };
    }
    if (data.byBrandYear[brandKey]?.[yearStr]) {
      const s = data.byBrandYear[brandKey][yearStr];
      if (s && s.count >= minN) return { stats: s, level: 'brand' };
    }
    return null;
  }

  function compareUserPrice(userPrice, stats) {
    if (userPrice == null || !stats) return null;
    const m = stats.medianPrice;
    if (m <= 0) return null;
    const pct = ((userPrice - m) / m) * 100;
    return { pct: Math.round(pct * 10) / 10, median: m };
  }

  function formatModelDisplayName(normKey) {
    if (!normKey) return '';
    return normKey.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Täyttää mallivalikon markkinadatan malleilla valitulle merkille.
   */
  window.populateMarketModelSelect = async function (brandSelectValue) {
    const sel = document.getElementById('marketModel');
    if (!sel || sel.tagName !== 'SELECT') return;

    const prev = sel.value;
    sel.innerHTML = '';
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = '— Ei mallia (vain merkki + vuosi) —';
    sel.appendChild(optNone);

    if (!brandSelectValue) return;

    const data = await loadMarketStats();
    if (!data?.byBrandModelYear) return;

    const brandKey = resolveBrandKey(brandSelectValue, data);
    if (!brandKey || !data.byBrandModelYear[brandKey]) return;

    const models = Object.keys(data.byBrandModelYear[brandKey]).sort((a, b) =>
      formatModelDisplayName(a).localeCompare(formatModelDisplayName(b), 'fi')
    );
    for (const m of models) {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = formatModelDisplayName(m);
      sel.appendChild(o);
    }
    if (prev && models.includes(prev)) {
      sel.value = prev;
    }
  };

  function renderHtml(data, brandKey, yearStr, modelNorm, userPrice, fuelLabel) {
    const minN = data.meta?.minSampleSize ?? 5;
    const found = findSegmentStats(data, brandKey, modelNorm, yearStr);

    let body = '';
    if (!found) {
      body =
        '<p class="market-reference__lead">Markkinadatasta ei löytynyt riittävän suurta otosta tälle merkille' +
        (modelNorm ? ', mallille ja vuodelle' : ' ja vuodelle') +
        ' (vähintään ' + minN + '). Kokeile toista mallia tai vuosimallia.</p>';
    } else {
      const { stats, level } = found;
      const cmp = compareUserPrice(userPrice, stats);
      let compareLine = '';
      if (cmp && userPrice > 0) {
        if (Math.abs(cmp.pct) < 2) {
          compareLine =
            '<p class="market-reference__compare">Syöttämäsi hankintahinta on lähellä markkinamediaania.</p>';
        } else if (cmp.pct > 0) {
          compareLine =
            '<p class="market-reference__compare">Syöttämäsi hankintahinta on noin <strong>' +
            Math.abs(cmp.pct) +
            ' %</strong> markkinamediaania korkeampi.</p>';
        } else {
          compareLine =
            '<p class="market-reference__compare">Syöttämäsi hankintahinta on noin <strong>' +
            Math.abs(cmp.pct) +
            ' %</strong> markkinamediaania alempi.</p>';
        }
      }
      const kmLine =
        stats.medianKm != null
          ? '<li>Mediaanimittarilukema otoksessa: ' +
            new Intl.NumberFormat('fi-FI').format(stats.medianKm) +
            ' km</li>'
          : '';
      body =
        '<p class="market-reference__lead">Ilmoitushintoihin perustuva viite' +
        (level === 'model' ? ' (merkki + malli + vuosimalli)' : ' (koko merkki + vuosimalli)') +
        (fuelLabel ? ', käyttövoima: ' + fuelLabel : '') +
        '.</p>' +
        '<ul class="market-reference__stats">' +
        '<li>' +
        stats.count +
        '</li>' +
        '<li>Mediaanihinta: ' +
        formatEuro(stats.medianPrice) +
        '</li>' +
        '<li>Hintahaitari: ' +
        formatEuro(stats.p25) +
        ' – ' +
        formatEuro(stats.p75) +
        '</li>' +
        kmLine +
        '</ul>' +
        compareLine;
    }

    return (
      '<div class="market-reference__inner">' +
      '<h3 class="market-reference__title">Markkinaviite (käytetyt ilmoitukset)</h3>' +
      body +
      '<p class="market-reference__meta">' +
      (data.meta?.disclaimerFi || '') +
      '</p>' +
      '</div>'
    );
  }

  window.updateMarketReference = async function (opts) {
    const el = document.getElementById('marketReference');
    if (!el) return;

    const { brand, modelInput, year, userPrice, fuelLabel } = opts;
    el.classList.remove('market-reference--hidden');
    el.innerHTML = '<p class="market-reference__loading">Ladataan markkinatietoa…</p>';

    const data = await loadMarketStats();
    if (!data) {
      el.innerHTML =
        '<div class="market-reference__inner"><p class="market-reference__lead">Markkinatietoa ei voitu ladata. Tarkista verkkoyhteys tai yritä myöhemmin uudelleen.</p></div>';
      return;
    }

    const brandKey = resolveBrandKey(brand, data);
    if (!brandKey) {
      el.innerHTML =
        '<div class="market-reference__inner"><p class="market-reference__lead">Tälle merkille ei ole markkinadataa tässä otoksessa.</p><p class="market-reference__meta">' +
        (data.meta?.disclaimerFi || '') +
        '</p></div>';
      return;
    }

    const yearStr = String(year);
    const modelNorm = normModel(modelInput);
    el.innerHTML = renderHtml(data, brandKey, yearStr, modelNorm, userPrice, fuelLabel);
  };

  window.clearMarketReference = function () {
    const el = document.getElementById('marketReference');
    if (!el) return;
    el.classList.add('market-reference--hidden');
    el.innerHTML = '';
  };
})();
