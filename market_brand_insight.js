/**
 * Merkkisivut: käytettyjen hintakatsaus + vuosimallikohtainen taulukko riviä klikkaamalla.
 */
(function () {
  /* AUTO-GENERATED FILE_TO_BRAND start */
  var FILE_TO_BRAND = {
    'alfa_romeo.html': 'Alfa Romeo',
    'aston_martin.html': 'Aston Martin',
    'audi.html': 'Audi',
    'bentley.html': 'Bentley',
    'bmw.html': 'BMW',
    'buick.html': 'Buick',
    'byd.html': 'BYD',
    'cadillac.html': 'Cadillac',
    'chevrolet.html': 'Chevrolet',
    'chrysler.html': 'Chrysler',
    'citroen.html': 'Citroen',
    'cupra.html': 'Cupra',
    'dacia.html': 'Dacia',
    'dodge.html': 'Dodge',
    'ferrari.html': 'Ferrari',
    'fiat.html': 'Fiat',
    'ford.html': 'Ford',
    'genesis.html': 'Genesis',
    'gmc.html': 'GMC',
    'honda.html': 'Honda',
    'hummer.html': 'Hummer',
    'hyundai.html': 'Hyundai',
    'infiniti.html': 'Infiniti',
    'jaguar.html': 'Jaguar',
    'jeep.html': 'Jeep',
    'kia.html': 'Kia',
    'lamborghini.html': 'Lamborghini',
    'lancia.html': 'Lancia',
    'land_rover.html': 'Land Rover',
    'lexus.html': 'Lexus',
    'lincoln.html': 'Lincoln',
    'lotus.html': 'Lotus',
    'maserati.html': 'Maserati',
    'maybach.html': 'Maybach',
    'mazda.html': 'Mazda',
    'mclaren.html': 'McLaren',
    'mercedes.html': 'Mercedes-Benz',
    'mini.html': 'Mini',
    'mitsubishi.html': 'Mitsubishi',
    'nissan.html': 'Nissan',
    'opel.html': 'Opel',
    'peugeot.html': 'Peugeot',
    'pontiac.html': 'Pontiac',
    'porsche.html': 'Porsche',
    'renault.html': 'Renault',
    'rolls_royce.html': 'Rolls-Royce',
    'saab.html': 'Saab',
    'seat.html': 'Seat',
    'skoda.html': 'Skoda',
    'smart.html': 'Smart',
    'srt.html': 'SRT',
    'subaru.html': 'Subaru',
    'suzuki.html': 'Suzuki',
    'tesla.html': 'Tesla',
    'toyota.html': 'Toyota',
    'vw.html': 'Volkswagen',
    'volvo.html': 'Volvo',
  };
  /* AUTO-GENERATED FILE_TO_BRAND end */

  /** Listassa ja kuvaajan ruksissa näytetään ensin näin monta mallia; loput „Näytä lisää”. */
  var INSIGHT_MODELS_INITIAL = 5;

  function currentFile() {
    var p = location.pathname.replace(/\/$/, '');
    var seg = p.split('/').pop() || '';
    return seg.toLowerCase() || 'index.html';
  }

  function fmtEuro(n) {
    return new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(n) + '\u00a0€';
  }

  function formatModelDisplayName(normKey) {
    if (!normKey) return '';
    return normKey.replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function fetchTextSafe(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.text() : '';
      })
      .catch(function () {
        return '';
      });
  }

  function parseDevaluationCsv(text) {
    var out = {};
    if (!text || !text.trim()) return out;
    var rows = text.split(/\r?\n/);
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i].trim();
      if (!row) continue;
      var cols = row.split(';').map(function (c) {
        return c.trim();
      });
      if (cols.length < 2) continue;
      var b = cols[0];
      var nums = [];
      for (var j = 1; j < cols.length; j++) {
        var n = parseFloat(cols[j]);
        nums.push(isNaN(n) ? 0 : n);
      }
      out[b] = nums;
    }
    return out;
  }

  function parseMileageFactorsCsv(text) {
    var mileageFactors = {};
    if (!text || !text.trim()) return mileageFactors;
    var rows = text.split(/\r?\n/);
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i].trim();
      if (!row) continue;
      var cols = row.split(';').map(function (c) {
        return c.trim();
      });
      if (cols.length < 8) continue;
      mileageFactors[cols[0]] = {
        '50000': parseFloat(cols[1]),
        '100000': parseFloat(cols[2]),
        '150000': parseFloat(cols[3]),
        '200000': parseFloat(cols[4]),
        '250000': parseFloat(cols[5]),
        '300000': parseFloat(cols[6]),
        yli300000: parseFloat(cols[7]),
      };
    }
    return mileageFactors;
  }

  /** Sama logiikka kuin javascript.js / getMileageFactor (ei konsolilogeja). */
  function getMileageFactorLocal(brand, kilometers, fuelType, age, mileageFactors) {
    var brandKey = fuelType === 'sahko' ? brand + '_ev' : brand;
    var factors = mileageFactors[brandKey] || mileageFactors['default'];
    if (!factors) return 1;
    var baseKerroin;
    if (kilometers <= 50000) baseKerroin = factors['50000'];
    else if (kilometers <= 100000) baseKerroin = factors['100000'];
    else if (kilometers <= 150000) baseKerroin = factors['150000'];
    else if (kilometers <= 200000) baseKerroin = factors['200000'];
    else if (kilometers <= 250000) baseKerroin = factors['250000'];
    else if (kilometers <= 300000) baseKerroin = factors['300000'];
    else baseKerroin = factors.yli300000;
    if (isNaN(baseKerroin) || baseKerroin <= 0) baseKerroin = 1.0;
    var ageFactor = 1.0;
    if (age <= 2) ageFactor = 1.0;
    else if (age <= 5) ageFactor = 0.95;
    else if (age <= 8) ageFactor = 0.9;
    else ageFactor = 0.85;
    var finalKerroin = baseKerroin * ageFactor;
    if (isNaN(finalKerroin) || finalKerroin <= 0) return 1.0;
    return finalKerroin;
  }

  /** Sama logiikka kuin javascript.js / calculateDepreciation. */
  function calculateDepreciationLocal(age, depreciationArray, brand, kilometers, fuelType, mileageFactors) {
    if (!depreciationArray || age < 0 || age >= depreciationArray.length) return 0.95;
    var depreciationFactor = parseFloat(depreciationArray[age]);
    if (isNaN(depreciationFactor) || depreciationFactor < 0) depreciationFactor = 0.95;
    if (kilometers > 0) {
      var mileageFactor = getMileageFactorLocal(brand, kilometers, fuelType, age, mileageFactors);
      if (!isNaN(mileageFactor) && mileageFactor > 0) {
        var remainingValue = 1 - depreciationFactor;
        var additionalDepreciation = remainingValue * (mileageFactor - 1);
        depreciationFactor = depreciationFactor + additionalDepreciation;
      }
    }
    return Math.min(Math.max(depreciationFactor, 0), 0.95);
  }

  function enrichPointsWithCsvPricing(points, brand, fuelType, regularDeval, evDeval, mileageFactors) {
    var arr = fuelType === 'sahko' ? evDeval[brand] : regularDeval[brand];
    var out = points.map(function (p) {
      return {
        age: p.age,
        modelYear: p.modelYear,
        median: p.median,
        p25: p.p25,
        p75: p.p75,
        count: p.count,
        medianKm: p.medianKm,
      };
    });
    if (!arr || !out.length || !(out[0].median > 0)) return out;
    var refP = out[0].median;
    for (var i = 0; i < out.length; i++) {
      var pt = out[i];
      var km =
        pt.medianKm != null && !isNaN(pt.medianKm) ? pt.medianKm : 0;
      var dep = calculateDepreciationLocal(pt.age, arr, brand, km, fuelType, mileageFactors);
      pt.theoretical = refP * (1 - dep);
    }
    return out;
  }

  function buildYearTable(brand, modelNorm, byBrandModelYear, minSample) {
    var perYear = byBrandModelYear[brand] && byBrandModelYear[brand][modelNorm];
    if (!perYear) return '<p class="market-brand-insight__year-empty">Ei vuosikohtaisia tietoja.</p>';

    var years = Object.keys(perYear)
      .map(function (y) {
        return parseInt(y, 10);
      })
      .filter(function (y) {
        return !isNaN(y);
      })
      .sort(function (a, b) {
        return b - a;
      });

    var rows = [];
    for (var i = 0; i < years.length; i++) {
      var y = years[i];
      var s = perYear[String(y)];
      if (!s || s.count < minSample) continue;
      var kmCell =
        s.medianKm != null
          ? '<td>' + new Intl.NumberFormat('fi-FI').format(s.medianKm) + ' km</td>'
          : '<td>—</td>';
      rows.push(
        '<tr><td>' +
          y +
          '</td><td>' +
          s.count +
          '</td><td>' +
          fmtEuro(s.medianPrice) +
          '</td><td>' +
          fmtEuro(s.p25) +
          '–' +
          fmtEuro(s.p75) +
          '</td>' +
          kmCell +
          '</tr>'
      );
    }

    if (!rows.length) {
      return '<p class="market-brand-insight__year-empty">Ei riittävän suuria otoksia vuosimallitasolla (väh. ' + minSample + ').</p>';
    }

    return (
      '<div class="market-brand-insight__table-wrap">' +
      '<table class="market-brand-insight__year-table">' +
      '<thead><tr>' +
      '<th scope="col">Vuosimalli</th>' +
      '<th scope="col">Määrä</th>' +
      '<th scope="col">Mediaani</th>' +
      '<th scope="col">Hintahaitari</th>' +
      '<th scope="col">Mediaani km</th>' +
      '</tr></thead><tbody>' +
      rows.join('') +
      '</tbody></table></div>'
    );
  }

  function buildInsightListItem(row) {
    var label = formatModelDisplayName(row.model);
    var hasPrices =
      row.p25 != null &&
      row.p75 != null &&
      row.medianPrice != null &&
      !isNaN(row.p25) &&
      !isNaN(row.p75) &&
      !isNaN(row.medianPrice);

    var li = document.createElement('li');
    li.className = 'market-brand-insight__item';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'market-brand-insight__row';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('data-model', row.model);
    btn.setAttribute(
      'aria-label',
      'Näytä tai piilota vuosimallikohtaiset hinnat: ' + label
    );

    var rowMain = document.createElement('span');
    rowMain.className = 'market-brand-insight__row-main';

    var modelSpan = document.createElement('span');
    modelSpan.className = 'market-brand-insight__model';
    modelSpan.textContent = label;
    rowMain.appendChild(modelSpan);

    if (hasPrices) {
      var prices = document.createElement('span');
      prices.className = 'market-brand-insight__prices';
      prices.textContent =
        ' — ' +
        fmtEuro(row.p25) +
        '–' +
        fmtEuro(row.p75) +
        ', mediaani ' +
        fmtEuro(row.medianPrice);
      rowMain.appendChild(prices);
    }

    var count = document.createElement('span');
    count.className = 'market-brand-insight__count';
    count.textContent = ' (' + row.listingCount + ')';
    rowMain.appendChild(count);

    btn.appendChild(rowMain);

    var chevron = document.createElement('span');
    chevron.className = 'market-brand-insight__chevron';
    chevron.setAttribute('aria-hidden', 'true');
    btn.appendChild(chevron);

    var panel = document.createElement('div');
    panel.className = 'market-brand-insight__year-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'region');

    li.appendChild(btn);
    li.appendChild(panel);
    return li;
  }

  /**
   * Mallit ilmoitusmäärän mukaan (sama logiikka kuin scripts/enrich_top_models.mjs).
   * Vanhassa market_stats.jsonissa topModelsByBrand voi olla lyhyt; tämä käyttää koko byBrandModelYear-rakenteen.
   */
  function buildModelsRankedFromSegments(brand, byMy, minSample) {
    var perBrand = byMy && byMy[brand];
    if (!perBrand) return [];
    var models = [];
    for (var modelN in perBrand) {
      if (!Object.prototype.hasOwnProperty.call(perBrand, modelN)) continue;
      var years = perBrand[modelN];
      var total = 0;
      var wMed = 0;
      var p25Min = Infinity;
      var p75Max = -Infinity;
      for (var y in years) {
        if (!Object.prototype.hasOwnProperty.call(years, y)) continue;
        var s = years[y];
        if (!s || typeof s.count !== 'number') continue;
        total += s.count;
        wMed += s.medianPrice * s.count;
        if (s.p25 != null && !isNaN(s.p25) && s.p25 < p25Min) p25Min = s.p25;
        if (s.p75 != null && !isNaN(s.p75) && s.p75 > p75Max) p75Max = s.p75;
      }
      if (total < minSample) continue;
      var medianPrice = Math.round(wMed / total);
      models.push({
        model: modelN,
        listingCount: total,
        medianPrice: medianPrice,
        p25: p25Min === Infinity ? medianPrice : p25Min,
        p75: p75Max === -Infinity ? medianPrice : p75Max,
      });
    }
    models.sort(function (a, b) {
      return b.listingCount - a.listingCount;
    });
    return models;
  }

  var chartJsPromise = null;
  function loadChartJs() {
    if (typeof Chart !== 'undefined') return Promise.resolve(Chart);
    if (chartJsPromise) return chartJsPromise;
    chartJsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = function () {
        resolve(typeof Chart !== 'undefined' ? Chart : null);
      };
      s.onerror = function () {
        reject(new Error('Chart.js load failed'));
      };
      document.head.appendChild(s);
    });
    return chartJsPromise;
  }

  function refYearFromMeta(meta) {
    if (meta && meta.generatedAt) {
      var d = new Date(meta.generatedAt);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  }

  /** Pisteet: ikä = refYear − vuosimalli, järjestys iän mukaan (nuorin ensin). */
  function getAgePointsForModel(brand, modelNorm, byMy, minSample, refYear) {
    var perYear = byMy[brand] && byMy[brand][modelNorm];
    if (!perYear) return null;
    var years = Object.keys(perYear)
      .map(function (y) {
        return parseInt(y, 10);
      })
      .filter(function (y) {
        return !isNaN(y);
      })
      .sort(function (a, b) {
        return a - b;
      });
    var points = [];
    for (var i = 0; i < years.length; i++) {
      var modelYear = years[i];
      var st = perYear[String(modelYear)];
      if (!st || st.count < minSample) continue;
      var age = refYear - modelYear;
      if (age < 0 || age > 45) continue;
      points.push({
        age: age,
        modelYear: modelYear,
        median: st.medianPrice,
        p25: st.p25,
        p75: st.p75,
        count: st.count,
        medianKm:
          st.medianKm != null && !isNaN(st.medianKm) ? st.medianKm : null,
      });
    }
    points.sort(function (a, b) {
      return a.age - b.age;
    });
    if (!points.length) return null;
    return points;
  }

  /**
   * Yhdistää usean mallin ikäpisteet: hinta- ja km-mediaanit painotetaan ilmoitusmäärällä,
   * haitari min(p25)…max(p75), vuosimalli näytteessä vm-min–max.
   */
  function aggregateAgePointsAcrossModels(modelSeriesList) {
    var byAge = {};
    for (var si = 0; si < modelSeriesList.length; si++) {
      var pts = modelSeriesList[si].points;
      for (var pi = 0; pi < pts.length; pi++) {
        var p = pts[pi];
        var a = p.age;
        if (!byAge[a]) byAge[a] = [];
        byAge[a].push(p);
      }
    }
    var ages = Object.keys(byAge)
      .map(function (x) {
        return parseInt(x, 10);
      })
      .filter(function (x) {
        return !isNaN(x);
      })
      .sort(function (a, b) {
        return a - b;
      });
    var out = [];
    for (var i = 0; i < ages.length; i++) {
      var age = ages[i];
      var group = byAge[age];
      var wSum = 0;
      var wPrice = 0;
      var wKmNum = 0;
      var wKmDen = 0;
      var p25Min = Infinity;
      var p75Max = -Infinity;
      var myMin = Infinity;
      var myMax = -Infinity;
      for (var g = 0; g < group.length; g++) {
        var q = group[g];
        var w = q.count || 0;
        wSum += w;
        wPrice += q.median * w;
        if (q.p25 != null && !isNaN(q.p25) && q.p25 < p25Min) p25Min = q.p25;
        if (q.p75 != null && !isNaN(q.p75) && q.p75 > p75Max) p75Max = q.p75;
        if (q.modelYear != null && !isNaN(q.modelYear)) {
          if (q.modelYear < myMin) myMin = q.modelYear;
          if (q.modelYear > myMax) myMax = q.modelYear;
        }
        if (q.medianKm != null && !isNaN(q.medianKm) && w > 0) {
          wKmNum += q.medianKm * w;
          wKmDen += w;
        }
      }
      if (wSum <= 0) continue;
      var median = Math.round(wPrice / wSum);
      var modelYearLabel =
        myMin !== Infinity && myMax !== -Infinity
          ? myMin === myMax
            ? String(myMin)
            : myMin + '–' + myMax
          : '—';
      out.push({
        age: age,
        modelYear: myMin !== Infinity ? myMin : null,
        modelYearLabel: modelYearLabel,
        median: median,
        p25: p25Min === Infinity ? median : p25Min,
        p75: p75Max === -Infinity ? median : p75Max,
        count: wSum,
        medianKm: wKmDen > 0 ? Math.round(wKmNum / wKmDen) : null,
        aggSegmentCount: group.length,
      });
    }
    return out;
  }

  var brandPriceChartInstance = null;

  var CHART_LINE_COLORS = [
    { border: '#8b7cf8', point: '#8b7cf8' },
    { border: '#22d3ee', point: '#22d3ee' },
    { border: '#f472b6', point: '#f472b6' },
    { border: '#a3e635', point: '#a3e635' },
    { border: '#fb923c', point: '#fb923c' },
    { border: '#e879f9', point: '#e879f9' },
    { border: '#38bdf8', point: '#38bdf8' },
    { border: '#facc15', point: '#facc15' },
  ];

  function renderBrandPriceMultiChart(canvas, ChartCtor, modelSeriesList, chartOpts) {
    if (brandPriceChartInstance) {
      brandPriceChartInstance.destroy();
      brandPriceChartInstance = null;
    }
    if (!modelSeriesList || !modelSeriesList.length || !ChartCtor) return;

    var brand = chartOpts.brand;
    var fuelTypes = chartOpts.fuelTypes || [];
    var regularDeval = chartOpts.regularDeval || {};
    var evDeval = chartOpts.evDeval || {};
    var mileageFactors = chartOpts.mileageFactors || {};
    var showKmLines = chartOpts.showKmLines !== false;

    var narrowViewport =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 640px)').matches;
    var axisTickFont = narrowViewport ? 10 : 12;
    var axisTitleFont = narrowViewport ? 11 : 12;
    var legendFont = narrowViewport ? 9 : 10;

    var grid = 'rgba(148, 163, 184, 0.12)';
    var tick = '#94a3b8';
    var datasets = [];
    var anyKm = false;

    for (var mi = 0; mi < modelSeriesList.length; mi++) {
      var ms = modelSeriesList[mi];
      var basePts = ms.points;
      var c = CHART_LINE_COLORS[mi % CHART_LINE_COLORS.length];
      var hasKm = false;
      for (var hi = 0; hi < basePts.length; hi++) {
        if (
          basePts[hi].medianKm != null &&
          !isNaN(basePts[hi].medianKm)
        ) {
          hasKm = true;
          break;
        }
      }

      datasets.push({
        label: ms.label + ' (ilmoitusmediaani)',
        yAxisID: 'y',
        data: basePts.map(function (p) {
          return { x: p.age, y: p.median };
        }),
        metaPoints: basePts,
        datasetKind: 'price',
        borderColor: c.border,
        backgroundColor: 'transparent',
        tension: 0.25,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: c.point,
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1,
        borderWidth: 2,
      });

      if (hasKm && showKmLines) {
        anyKm = true;
        datasets.push({
          label: ms.label + ' (mediaani km)',
          yAxisID: 'y1',
          data: basePts.map(function (p) {
            return {
              x: p.age,
              y:
                p.medianKm != null && !isNaN(p.medianKm)
                  ? p.medianKm
                  : null,
            };
          }),
          metaPoints: basePts,
          datasetKind: 'km',
          borderColor: c.border,
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.2,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: c.point,
          pointBorderColor: '#0f172a',
          pointBorderWidth: 1,
          borderWidth: 1.5,
        });
      }

      for (var fi = 0; fi < fuelTypes.length; fi++) {
        var ft = fuelTypes[fi];
        var arr = ft === 'sahko' ? evDeval[brand] : regularDeval[brand];
        if (!arr) continue;
        var ptsEnr = enrichPointsWithCsvPricing(
          basePts,
          brand,
          ft,
          regularDeval,
          evDeval,
          mileageFactors
        );
        var hasTheo = false;
        for (var ti = 0; ti < ptsEnr.length; ti++) {
          if (
            ptsEnr[ti].theoretical != null &&
            !isNaN(ptsEnr[ti].theoretical)
          ) {
            hasTheo = true;
            break;
          }
        }
        if (!hasTheo) continue;
        var fuelFi = ft === 'sahko' ? 'sähkö' : 'poltto';
        /* Erottele poltto vs. sähkö legendassa ja kuvaajassa (sama väri per malli). */
        var forecastDash =
          ft === 'sahko' ? [2, 3, 2, 3, 12, 3] : [12, 5];
        datasets.push({
          label: ms.label + ' — Ennuste (' + fuelFi + ')',
          yAxisID: 'y',
          data: ptsEnr.map(function (p) {
            return {
              x: p.age,
              y: p.theoretical != null ? p.theoretical : null,
            };
          }),
          metaPoints: ptsEnr,
          datasetKind: 'csv',
          borderColor: c.border,
          backgroundColor: 'transparent',
          borderDash: forecastDash,
          tension: 0.25,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 1.5,
        });
      }
    }

    var scales = {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Auton ikä (vuotta)',
          color: tick,
          font: { size: axisTitleFont },
        },
        ticks: {
          color: tick,
          font: { size: axisTickFont },
          maxTicksLimit: narrowViewport ? 8 : undefined,
        },
        grid: { color: grid },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Hinta (€)',
          color: tick,
          font: { size: axisTitleFont },
        },
        ticks: {
          color: tick,
          font: { size: axisTickFont },
          callback: function (v) {
            return new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(v);
          },
        },
        grid: { color: grid },
      },
    };

    if (anyKm) {
      scales.y1 = {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Mediaani km',
          color: tick,
          font: { size: axisTitleFont },
        },
        ticks: {
          color: tick,
          font: { size: axisTickFont },
          callback: function (v) {
            return new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(v);
          },
        },
        grid: { drawOnChartArea: false },
      };
    }

    brandPriceChartInstance = new ChartCtor(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: {
          title: { display: false },
          legend: {
            display: true,
            position: narrowViewport ? 'bottom' : 'top',
            labels: {
              color: tick,
              font: { size: legendFont },
              boxWidth: narrowViewport ? 8 : 10,
              padding: narrowViewport ? 6 : 10,
            },
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                if (!items.length) return '';
                var pts = items[0].dataset.metaPoints[items[0].dataIndex];
                if (!pts) return '';
                var vmPart =
                  pts.modelYearLabel != null
                    ? pts.modelYearLabel
                    : pts.modelYear != null
                      ? String(pts.modelYear)
                      : '—';
                return 'Ikä ' + pts.age + ' v · vm. ' + vmPart;
              },
              label: function (ctx) {
                var pts = ctx.dataset.metaPoints[ctx.dataIndex];
                var kind = ctx.dataset.datasetKind;
                if (kind === 'km') {
                  if (pts.medianKm == null) return '';
                  return (
                    ctx.dataset.label +
                    ': ' +
                    new Intl.NumberFormat('fi-FI').format(pts.medianKm) +
                    ' km'
                  );
                }
                if (kind === 'csv') {
                  return (
                    ctx.dataset.label + ': ' + fmtEuro(pts.theoretical)
                  );
                }
                var mp = ctx.dataset.metaPoints;
                var base = mp && mp.length ? mp[0] : null;
                var lines = [
                  ctx.dataset.label + ': ' + fmtEuro(pts.median),
                ];
                if (pts.medianKm != null && !isNaN(pts.medianKm)) {
                  lines.push(
                    'Mediaani km: ' +
                      new Intl.NumberFormat('fi-FI').format(pts.medianKm) +
                      ' km'
                  );
                }
                if (base && ctx.dataIndex > 0 && base.median > 0) {
                  var dropPct = ((base.median - pts.median) / base.median) * 100;
                  var rounded = Math.round(dropPct * 10) / 10;
                  var baseVm =
                    base.modelYearLabel != null
                      ? base.modelYearLabel
                      : base.modelYear != null
                        ? String(base.modelYear)
                        : '';
                  lines.push(
                    'Ero vs. uusin vuosimalli (vm. ' +
                      baseVm +
                      '): ' +
                      (rounded >= 0 ? '−' : '+') +
                      Math.abs(rounded) +
                      ' %'
                  );
                }
                return lines;
              },
              afterBody: function (items) {
                if (!items.length) return [];
                var kind = items[0].dataset.datasetKind;
                if (kind === 'km' || kind === 'csv') return [];
                var pts = items[0].dataset.metaPoints[items[0].dataIndex];
                var lines = [
                  'Hintahaitari: ' + fmtEuro(pts.p25) + ' – ' + fmtEuro(pts.p75),
                  'Otos: ' + pts.count,
                ];
                if (pts.aggSegmentCount != null) {
                  lines.push(
                    'Yhdistettyjä segmenttejä (malli×vuosimalli): ' +
                      pts.aggSegmentCount
                  );
                }
                return lines;
              },
            },
          },
        },
        scales: scales,
      },
    });
  }

  function wireBrandChart(aside, brand, data, topModelsFull, csvBundle, chartOpts) {
    chartOpts = chartOpts || {};
    var minSample = (data.meta && data.meta.minSampleSize) || 5;
    var byMy = data.byBrandModelYear || {};
    var refYear = refYearFromMeta(data.meta);
    var regularDeval = (csvBundle && csvBundle.regularDeval) || {};
    var evDeval = (csvBundle && csvBundle.evDeval) || {};
    var mileageFactors = (csvBundle && csvBundle.mileageFactors) || {};
    if (!mileageFactors.default) {
      mileageFactors.default = {
        '50000': 1.0,
        '100000': 0.9,
        '150000': 0.8,
        '200000': 0.7,
        '250000': 0.6,
        '300000': 0.5,
        yli300000: 0.45,
      };
    }

    var topFull = topModelsFull || [];
    var initialN = Math.min(
      chartOpts.initialVisibleCount != null
        ? chartOpts.initialVisibleCount
        : INSIGHT_MODELS_INITIAL,
      topFull.length
    );

    var block = aside.querySelector('.market-brand-insight__chart-block');
    var grid = block.querySelector(
      '.market-brand-insight__chart-fieldset:not(.market-brand-insight__chart-fuel-fieldset) .market-brand-insight__chart-checkgrid'
    );
    var fuelGrid = block.querySelector('.market-brand-insight__chart-fuel-checkgrid');
    var fuelFieldset = block.querySelector('.market-brand-insight__chart-fuel-fieldset');
    var canvas = aside.querySelector('.market-brand-insight__chart-canvas');
    var emptyEl = aside.querySelector('.market-brand-insight__chart-empty');
    if (!block || !grid || !canvas || !emptyEl) return;

    if (fuelGrid && fuelFieldset) {
      fuelGrid.innerHTML = '';
      var hasReg = !!regularDeval[brand];
      var hasEv = !!evDeval[brand];
      var fIdx = 0;
      if (hasReg) {
        var fl1 = document.createElement('label');
        fl1.className = 'market-brand-insight__chart-check';
        var id1 = 'market-brand-chart-fuel-poltto';
        var cb1 = document.createElement('input');
        cb1.type = 'checkbox';
        cb1.name = 'market-brand-chart-fuel';
        cb1.value = 'bensiini';
        cb1.id = id1;
        cb1.checked = true;
        var sp1 = document.createElement('span');
        sp1.textContent = 'Polttomoottori ja hybridit';
        fl1.setAttribute('for', id1);
        fl1.insertBefore(cb1, fl1.firstChild);
        fl1.appendChild(sp1);
        fuelGrid.appendChild(fl1);
        fIdx++;
      }
      if (hasEv) {
        var fl2 = document.createElement('label');
        fl2.className = 'market-brand-insight__chart-check';
        var id2 = 'market-brand-chart-fuel-sahko';
        var cb2 = document.createElement('input');
        cb2.type = 'checkbox';
        cb2.name = 'market-brand-chart-fuel';
        cb2.value = 'sahko';
        cb2.id = id2;
        cb2.checked = !hasReg;
        var sp2 = document.createElement('span');
        sp2.textContent = 'Sähkö';
        fl2.setAttribute('for', id2);
        fl2.insertBefore(cb2, fl2.firstChild);
        fl2.appendChild(sp2);
        fuelGrid.appendChild(fl2);
        fIdx++;
      }

      var extraRow = document.createElement('div');
      extraRow.className = 'market-brand-insight__chart-fuel-extra-row';

      var kmLab = document.createElement('label');
      kmLab.className =
        'market-brand-insight__chart-check market-brand-insight__chart-check--km';
      var kmId = 'market-brand-chart-km-lines';
      var kmCb = document.createElement('input');
      kmCb.type = 'checkbox';
      kmCb.name = 'market-brand-chart-km-lines';
      kmCb.id = kmId;
      kmCb.checked = true;
      var kmSp = document.createElement('span');
      kmSp.textContent = 'Km-mediaanit kuvaajassa';
      kmLab.setAttribute('for', kmId);
      kmLab.insertBefore(kmCb, kmLab.firstChild);
      kmLab.appendChild(kmSp);
      extraRow.appendChild(kmLab);

      var aggLab = document.createElement('label');
      aggLab.className =
        'market-brand-insight__chart-check market-brand-insight__chart-check--aggregate';
      var aggId = 'market-brand-chart-aggregate';
      var aggCb = document.createElement('input');
      aggCb.type = 'checkbox';
      aggCb.name = 'market-brand-chart-aggregate';
      aggCb.id = aggId;
      aggCb.checked = false;
      var aggSp = document.createElement('span');
      aggSp.textContent =
        'Aggregoi valitut mallit (yksi hinta-, km- ja ennustekäyrä)';
      aggLab.setAttribute('for', aggId);
      aggLab.insertBefore(aggCb, aggLab.firstChild);
      aggLab.appendChild(aggSp);
      extraRow.appendChild(aggLab);

      fuelGrid.appendChild(extraRow);

      fuelFieldset.hidden = false;
    }

    function appendChartModelCheckbox(row, index, checked) {
      var m = row.model;
      var id = 'market-brand-chart-m-' + index;
      var lab = document.createElement('label');
      lab.className = 'market-brand-insight__chart-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'market-brand-chart-model';
      cb.value = m;
      cb.id = id;
      cb.checked = !!checked;
      var span = document.createElement('span');
      span.textContent = formatModelDisplayName(m);
      lab.setAttribute('for', id);
      lab.insertBefore(cb, lab.firstChild);
      lab.appendChild(span);
      grid.appendChild(lab);
    }

    var selectAllLab = document.createElement('label');
    selectAllLab.className =
      'market-brand-insight__chart-check market-brand-insight__chart-check--select-all';
    var selectAllId = 'market-brand-chart-select-all';
    var selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.name = 'market-brand-chart-select-all';
    selectAllCb.id = selectAllId;
    selectAllCb.checked = false;
    var selectAllSp = document.createElement('span');
    selectAllSp.textContent = 'Valitse kaikki';
    selectAllLab.setAttribute('for', selectAllId);
    selectAllLab.insertBefore(selectAllCb, selectAllLab.firstChild);
    selectAllLab.appendChild(selectAllSp);
    grid.appendChild(selectAllLab);

    function syncSelectAllFromModels() {
      var all = grid.querySelectorAll('input[name="market-brand-chart-model"]');
      if (!selectAllCb || !all.length) return;
      var n = all.length;
      var c = 0;
      for (var i = 0; i < n; i++) {
        if (all[i].checked) c++;
      }
      selectAllCb.indeterminate = c > 0 && c < n;
      selectAllCb.checked = c === n && n > 0;
    }

    for (var i = 0; i < initialN; i++) {
      appendChartModelCheckbox(topFull[i], i, i === 0);
    }

    syncSelectAllFromModels();

    if (chartOpts.showMoreModelsBtn && topFull.length > initialN) {
      chartOpts.showMoreModelsBtn.addEventListener('click', function () {
        if (typeof chartOpts.onShowMoreModels === 'function') {
          chartOpts.onShowMoreModels();
        }
        for (var j = initialN; j < topFull.length; j++) {
          appendChartModelCheckbox(topFull[j], j, false);
        }
        chartOpts.showMoreModelsBtn.remove();
        syncSelectAllFromModels();
        refreshChart();
      });
    }

    function selectedFuelTypes() {
      var out = [];
      if (!fuelGrid) return out;
      var fbs = fuelGrid.querySelectorAll('input[name="market-brand-chart-fuel"]');
      for (var f = 0; f < fbs.length; f++) {
        if (fbs[f].checked) out.push(fbs[f].value);
      }
      return out;
    }

    function kmLinesFromCheckbox() {
      if (!fuelGrid) return true;
      var kmEl = fuelGrid.querySelector('#market-brand-chart-km-lines');
      return !kmEl || kmEl.checked;
    }

    function aggregateFromCheckbox() {
      if (!fuelGrid) return false;
      var el = fuelGrid.querySelector('#market-brand-chart-aggregate');
      return !!(el && el.checked);
    }

    function refreshChart() {
      var selected = [];
      var boxes = grid.querySelectorAll('input[name="market-brand-chart-model"]');
      for (var j = 0; j < boxes.length; j++) {
        if (boxes[j].checked) selected.push(boxes[j].value);
      }

      if (brandPriceChartInstance) {
        brandPriceChartInstance.destroy();
        brandPriceChartInstance = null;
      }

      if (!selected.length) {
        emptyEl.textContent = 'Valitse vähintään yksi malli.';
        emptyEl.hidden = false;
        canvas.parentElement.style.display = 'none';
        return;
      }

      var modelSeriesList = [];
      for (var k = 0; k < selected.length; k++) {
        var modelNorm = selected[k];
        var pts = getAgePointsForModel(brand, modelNorm, byMy, minSample, refYear);
        if (pts && pts.length >= 1) {
          modelSeriesList.push({
            label: formatModelDisplayName(modelNorm),
            points: pts,
          });
        }
      }

      if (!modelSeriesList.length) {
        emptyEl.textContent =
          'Valituille malleille ei löytynyt riittävästi vuosipisteitä (väh. ' + minSample + ' ilmoitusta / vuosimalli).';
        emptyEl.hidden = false;
        canvas.parentElement.style.display = 'none';
        return;
      }

      var seriesForChart = modelSeriesList;
      if (
        aggregateFromCheckbox() &&
        modelSeriesList.length > 1
      ) {
        var aggPts = aggregateAgePointsAcrossModels(modelSeriesList);
        if (aggPts.length) {
          seriesForChart = [
            {
              label:
                'Aggregoitu (' + modelSeriesList.length + ' mallia)',
              points: aggPts,
            },
          ];
        }
      }

      emptyEl.hidden = true;
      canvas.parentElement.style.display = '';
      var fts = selectedFuelTypes();
      loadChartJs()
        .then(function (ChartCtor) {
          if (!ChartCtor) return;
          renderBrandPriceMultiChart(canvas, ChartCtor, seriesForChart, {
            brand: brand,
            fuelTypes: fts,
            regularDeval: regularDeval,
            evDeval: evDeval,
            mileageFactors: mileageFactors,
            showKmLines: kmLinesFromCheckbox(),
          });
        })
        .catch(function () {
          emptyEl.textContent = 'Kuvaajakirjastoa ei voitu ladata.';
          emptyEl.hidden = false;
          canvas.parentElement.style.display = 'none';
        });
    }

    grid.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.id === selectAllId) {
        var allModels = grid.querySelectorAll(
          'input[name="market-brand-chart-model"]'
        );
        for (var si = 0; si < allModels.length; si++) {
          allModels[si].checked = t.checked;
        }
        t.indeterminate = false;
      } else if (t && t.name === 'market-brand-chart-model') {
        syncSelectAllFromModels();
      }
      refreshChart();
    });
    if (fuelGrid) {
      fuelGrid.addEventListener('change', refreshChart);
    }
    refreshChart();
  }

  function wireExpandable(aside, brand, data) {
    var minSample = (data.meta && data.meta.minSampleSize) || 5;
    var byMy = data.byBrandModelYear || {};

    aside.addEventListener('click', function (e) {
      var btn = e.target.closest('.market-brand-insight__row');
      if (!btn || !aside.contains(btn)) return;

      var item = btn.closest('.market-brand-insight__item');
      if (!item) return;

      var panel = item.querySelector('.market-brand-insight__year-panel');
      if (!panel) return;

      var modelNorm = btn.getAttribute('data-model');
      if (modelNorm == null) return;

      var expanded = btn.getAttribute('aria-expanded') === 'true';

      if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        panel.innerHTML = '';
        return;
      }

      panel.innerHTML = buildYearTable(brand, modelNorm, byMy, minSample);
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    });
  }

  function run() {
    if (!document.body.classList.contains('brand-page')) return;

    var file = currentFile();
    var brand = FILE_TO_BRAND[file];
    if (!brand) return;

    var main = document.querySelector('main');
    if (!main) return;

    var aside = document.createElement('aside');
    aside.className = 'market-brand-insight';
    aside.setAttribute('aria-label', 'Käytettyjen hintakatsaus: ' + brand);
    aside.innerHTML =
      '<h2 class="market-brand-insight__title">Käytettyjen hintakatsaus: ' +
      brand +
      '</h2><p class="market-brand-insight__loading">Ladataan…</p>';
    main.insertBefore(aside, main.firstChild);

    Promise.all([
      fetch('/data/market_stats.json', { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
      fetchTextSafe('/devaluation.csv'),
      fetchTextSafe('/devaluation_ev.csv'),
      fetchTextSafe('/mileage_factors.csv'),
    ])
      .then(function (results) {
        var data = results[0];
        var csvBundle = {
          regularDeval: parseDevaluationCsv(results[1]),
          evDeval: parseDevaluationCsv(results[2]),
          mileageFactors: parseMileageFactorsCsv(results[3]),
        };
        var minSampleInsight = (data.meta && data.meta.minSampleSize) || 5;
        var fromSegments = buildModelsRankedFromSegments(
          brand,
          data.byBrandModelYear || {},
          minSampleInsight
        );
        var topJson = data.topModelsByBrand && data.topModelsByBrand[brand];
        var topFull =
          fromSegments.length > 0
            ? fromSegments
            : topJson && topJson.length
              ? topJson
              : null;
        var disclaimer = (data.meta && data.meta.disclaimerFi) || '';

        if (!topFull || !topFull.length) {
          aside.innerHTML =
            '<h2 class="market-brand-insight__title">Käytettyjen hintakatsaus: ' +
            brand +
            '</h2><p>Ei riittävästi aggregoitua dataa tässä otoksessa.</p>' +
            (disclaimer ? '<p class="market-brand-insight__meta">' + disclaimer + '</p>' : '');
          return;
        }

        var ol = document.createElement('ol');
        ol.className = 'market-brand-insight__list market-brand-insight__list--interactive';

        var listInitial = Math.min(INSIGHT_MODELS_INITIAL, topFull.length);
        for (var lii = 0; lii < listInitial; lii++) {
          ol.appendChild(buildInsightListItem(topFull[lii]));
        }

        aside.innerHTML =
          '<h2 class="market-brand-insight__title">Käytettyjen hintakatsaus: ' +
          brand +
          '</h2>' +
          '<p class="market-brand-insight__lead">Mallit, joista oli eniten merkintöjä, sekä hintahaitari, mediaani ja otoskoko. <strong>Klikkaa riviä</strong> nähdäksesi hinnat vuosimallittain.</p>';

        aside.appendChild(ol);

        var showMoreBtn = null;
        if (topFull.length > INSIGHT_MODELS_INITIAL) {
          showMoreBtn = document.createElement('button');
          showMoreBtn.type = 'button';
          showMoreBtn.className = 'market-brand-insight__show-more-models';
          var extraN = topFull.length - INSIGHT_MODELS_INITIAL;
          showMoreBtn.textContent = 'Näytä lisää';
          showMoreBtn.setAttribute(
            'aria-label',
            'Näytä kaikki mallit, ' + extraN + ' lisää'
          );
          aside.appendChild(showMoreBtn);
        }

        var chartBlock = document.createElement('div');
        chartBlock.className = 'market-brand-insight__chart-block';
        chartBlock.innerHTML =
          '<h3 class="market-brand-insight__chart-title">Interaktiivinen kuvaaja</h3>' +
          '<p class="market-brand-insight__chart-ai-note">AI-avusteinen malli</p>' +
          '<fieldset class="market-brand-insight__chart-fieldset market-brand-insight__chart-fuel-fieldset">' +
          '<legend class="market-brand-insight__chart-legend">Käyttövoima ja kuvaaja</legend>' +
          '<div class="market-brand-insight__chart-fuel-checkgrid"></div>' +
          '</fieldset>' +
          '<fieldset class="market-brand-insight__chart-fieldset">' +
          '<legend class="market-brand-insight__chart-legend">Mallit kuvaajassa</legend>' +
          '<div class="market-brand-insight__chart-checkgrid"></div>' +
          '</fieldset>' +
          '<div class="market-brand-insight__chart-canvas-wrap">' +
          '<canvas class="market-brand-insight__chart-canvas" aria-label="Mediaanihinta auton iän mukaan" role="img"></canvas>' +
          '</div>' +
          '<p class="market-brand-insight__chart-empty" hidden>Valitse mallit.</p>';
        aside.appendChild(chartBlock);

        if (disclaimer) {
          var meta = document.createElement('p');
          meta.className = 'market-brand-insight__meta';
          meta.textContent = disclaimer;
          aside.appendChild(meta);
        }

        wireBrandChart(aside, brand, data, topFull, csvBundle, {
          showMoreModelsBtn: showMoreBtn,
          initialVisibleCount: INSIGHT_MODELS_INITIAL,
          onShowMoreModels: function () {
            for (var mi = INSIGHT_MODELS_INITIAL; mi < topFull.length; mi++) {
              ol.appendChild(buildInsightListItem(topFull[mi]));
            }
          },
        });
        wireExpandable(aside, brand, data);
      })
      .catch(function () {
        aside.innerHTML =
          '<h2 class="market-brand-insight__title">Käytettyjen hintakatsaus</h2><p>Hintatietoja ei voitu ladata.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
