(function () {
    'use strict';

    const eur = new Intl.NumberFormat('fi-FI', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    });

    const eurDec = new Intl.NumberFormat('fi-FI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    function monthlyPayment(principal, annualRate, numPayments) {
        if (principal <= 0 || numPayments <= 0) return 0;
        const r = annualRate / 12;
        if (r <= 0) return principal / numPayments;
        const pow = Math.pow(1 + r, numPayments);
        return (principal * r * pow) / (pow - 1);
    }

    function totalFinancingCost(price, down, annualRate, years, origination, monthlyFee) {
        const n = Math.round(years * 12);
        const principal = Math.max(0, price - down);
        const pmt = monthlyPayment(principal, annualRate, n);
        return down + origination + n * (pmt + monthlyFee);
    }

    function findBreakEvenNewPrice(targetTotal, down, annualRate, years, origination, monthlyFee) {
        function totalAtPrice(price) {
            return totalFinancingCost(price, down, annualRate, years, origination, monthlyFee);
        }

        let lo = 0;
        let hi = Math.max(down, 5000);
        while (totalAtPrice(hi) < targetTotal && hi < 5e7) {
            hi *= 2;
        }

        if (totalAtPrice(lo) > targetTotal) return null;
        if (totalAtPrice(hi) < targetTotal) return null;

        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            if (totalAtPrice(mid) < targetTotal) lo = mid;
            else hi = mid;
        }
        return (lo + hi) / 2;
    }

    function parseNum(el) {
        if (!el) return NaN;
        const v = parseFloat(String(el.value).replace(',', '.'));
        return v;
    }

    function wireStepper(minusBtn, plusBtn, input, step) {
        minusBtn.addEventListener('click', function () {
            const v = parseNum(input);
            if (!isNaN(v)) input.value = Math.max(0, v - step);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        plusBtn.addEventListener('click', function () {
            const v = parseNum(input);
            if (!isNaN(v)) input.value = v + step;
            else input.value = step;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    function initAccordion(btn) {
        if (!btn) return;
        const content = btn.nextElementSibling;
        if (!content || !content.classList.contains('accordion-content')) return;

        btn.addEventListener('click', function () {
            btn.classList.toggle('active');
            if (content.classList.contains('show')) {
                content.classList.remove('show');
                content.style.maxHeight = null;
            } else {
                content.classList.add('show');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    }

    function recalc() {
        const priceNewEl = document.getElementById('finPriceNew');
        const priceUsedEl = document.getElementById('finPriceUsed');
        const downEl = document.getElementById('finDown');
        const rateNewEl = document.getElementById('finRateNew');
        const rateUsedEl = document.getElementById('finRateUsed');
        const feeNewEl = document.getElementById('finFeeNew');
        const feeUsedEl = document.getElementById('finFeeUsed');
        const origNewEl = document.getElementById('finOrigNew');
        const origUsedEl = document.getElementById('finOrigUsed');
        const yearsEl = document.getElementById('finLoanYears');

        const priceNew = parseNum(priceNewEl);
        const priceUsed = parseNum(priceUsedEl);
        const down = parseNum(downEl);
        const rateNew = (parseNum(rateNewEl) || 0) / 100;
        const rateUsed = (parseNum(rateUsedEl) || 0) / 100;
        const feeNew = parseNum(feeNewEl) || 0;
        const feeUsed = parseNum(feeUsedEl) || 0;
        const origNew = parseNum(origNewEl) || 0;
        const origUsed = parseNum(origUsedEl) || 0;
        const years = parseNum(yearsEl) || 6;

        const resultBox = document.getElementById('finResultBox');
        const leadEl = document.getElementById('finResultLead');
        const subEl = document.getElementById('finResultSub');
        const breakEl = document.getElementById('finBreakEven');
        const titleYears = document.getElementById('finTitleYears');
        const cardNewTotal = document.getElementById('finCardNewTotal');
        const cardNewPmt = document.getElementById('finCardNewPmt');
        const cardNewRate = document.getElementById('finCardNewRate');
        const cardUsedTotal = document.getElementById('finCardUsedTotal');
        const cardUsedPmt = document.getElementById('finCardUsedPmt');
        const cardUsedRate = document.getElementById('finCardUsedRate');
        const barNew = document.getElementById('finBarNew');
        const barUsed = document.getElementById('finBarUsed');
        const barNewVal = document.getElementById('finBarNewVal');
        const barUsedVal = document.getElementById('finBarUsedVal');

        if (titleYears) titleYears.textContent = String(Math.round(years));

        if (
            isNaN(priceNew) ||
            isNaN(priceUsed) ||
            isNaN(down) ||
            isNaN(years) ||
            years <= 0
        ) {
            if (leadEl) leadEl.textContent = 'Syötä hinnat ja laina-aika.';
            if (subEl) subEl.textContent = '';
            if (breakEl) breakEl.textContent = '';
            if (resultBox) resultBox.style.opacity = '0.85';
            return;
        }

        const n = Math.round(years * 12);
        const totalNew = totalFinancingCost(priceNew, down, rateNew, years, origNew, feeNew);
        const totalUsed = totalFinancingCost(priceUsed, down, rateUsed, years, origUsed, feeUsed);

        const pNew = Math.max(0, priceNew - down);
        const pUsed = Math.max(0, priceUsed - down);
        const pmtNew = monthlyPayment(pNew, rateNew, n);
        const pmtUsed = monthlyPayment(pUsed, rateUsed, n);

        if (cardNewTotal) cardNewTotal.textContent = eur.format(Math.round(totalNew)) + ' €';
        if (cardNewPmt) cardNewPmt.textContent = eurDec.format(pmtNew) + ' €/kk';
        if (cardNewRate) cardNewRate.textContent = (rateNew * 100).toFixed(2).replace('.', ',') + ' %';
        if (cardUsedTotal) cardUsedTotal.textContent = eur.format(Math.round(totalUsed)) + ' €';
        if (cardUsedPmt) cardUsedPmt.textContent = eurDec.format(pmtUsed) + ' €/kk';
        if (cardUsedRate) cardUsedRate.textContent = (rateUsed * 100).toFixed(2).replace('.', ',') + ' %';

        const maxBar = Math.max(totalNew, totalUsed, 1);
        if (barNew) barNew.style.width = (100 * totalNew) / maxBar + '%';
        if (barUsed) barUsed.style.width = (100 * totalUsed) / maxBar + '%';
        if (barNewVal) barNewVal.textContent = eur.format(Math.round(totalNew)) + ' €';
        if (barUsedVal) barUsedVal.textContent = eur.format(Math.round(totalUsed)) + ' €';

        const diff = Math.abs(totalNew - totalUsed);
        const diffRounded = Math.round(diff);

        if (Math.abs(totalNew - totalUsed) < 1) {
            if (leadEl) leadEl.textContent = 'Kokonaiskustannukset ovat käytännössä samat.';
            if (subEl) subEl.textContent = '';
        } else if (totalUsed < totalNew) {
            if (leadEl)
                leadEl.textContent =
                    'Käytetty auto on ' + eur.format(diffRounded) + ' € halvempi ' + Math.round(years) + ' vuodessa.';
            if (subEl) subEl.textContent = 'Hintaero ylittää korkoedun.';
        } else {
            if (leadEl)
                leadEl.textContent =
                    'Uusi auto on ' + eur.format(diffRounded) + ' € halvempi ' + Math.round(years) + ' vuodessa.';
            if (subEl) subEl.textContent = 'Matalampi korko kompensoi hintaeron.';
        }

        const targetUsed = totalFinancingCost(priceUsed, down, rateUsed, years, origUsed, feeUsed);
        const breakPrice = findBreakEvenNewPrice(targetUsed, down, rateNew, years, origNew, feeNew);
        if (breakEl) {
            if (breakPrice != null && isFinite(breakPrice)) {
                breakEl.textContent =
                    'Uusi kannattaa, kun sen hinta on enintään ' + eur.format(Math.round(breakPrice)) + ' €.';
            } else {
                breakEl.textContent =
                    'Tasapainohintaa ei löytynyt näillä oletuksilla (tarkista käsiraha ja korot).';
            }
        }

        if (resultBox) resultBox.style.opacity = '1';
    }

    document.addEventListener('DOMContentLoaded', function () {
        const acc = document.querySelector('.fin-advanced .accordion');
        initAccordion(acc);

        wireStepper(
            document.getElementById('finPriceNewMinus'),
            document.getElementById('finPriceNewPlus'),
            document.getElementById('finPriceNew'),
            500
        );
        wireStepper(
            document.getElementById('finPriceUsedMinus'),
            document.getElementById('finPriceUsedPlus'),
            document.getElementById('finPriceUsed'),
            500
        );

        document.querySelectorAll('.fin-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                document.querySelectorAll('.fin-chip').forEach(function (c) {
                    c.classList.remove('is-active');
                });
                chip.classList.add('is-active');
                const y = parseInt(chip.getAttribute('data-years'), 10);
                const hidden = document.getElementById('finLoanYears');
                if (hidden && !isNaN(y)) hidden.value = y;
                recalc();
            });
        });

        const inputs = document.querySelectorAll(
            '#finPriceNew, #finPriceUsed, #finDown, #finRateNew, #finRateUsed, #finFeeNew, #finFeeUsed, #finOrigNew, #finOrigUsed, #finLoanYears'
        );
        inputs.forEach(function (el) {
            el.addEventListener('input', recalc);
            el.addEventListener('change', recalc);
        });

        recalc();
    });
})();
