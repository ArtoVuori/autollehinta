/* Fontit ladataan style.css @importilla (DM Sans + Josefin Sans). */

// Alustetaan globaalit muuttujat
let devaluationData = {};
let fuelData = {};
let mileageFactors = {}; // Lisätään uusi globaali muuttuja kilometrikertoimille
let annualFuelCost = 0;
let annualElectricCost = 0;
let annualGasCost = 0;
let modelYear = new Date().getFullYear();
let comparisonContent = ""; // Muuttuja, joka sisältää muotoillun vertailusisällön
let carDetails = ""; // Globaali muuttuja auton tietojen tallentamiseen
let globalDepreciation = 0;
let globalTotalCosts = 0;
let globalTotalIncludingCosts = 0;
/** Viimeisin laskettu rivi CSV-exportille; liitetään korttiin addToComparison():ssa. */
let lastComparisonExport = null;

/** Vastaa devaluation.csv / devaluation_ev.csv iäkkäitä sarakkeita 1…N (horisontti "seuraavat N vuotta"). */
const DEVALUATION_PLANNING_YEARS_MAX = 20;

/**
 * Suomessa yleisimmät merkit (likimääräinen myynti-/rekisteröintijärjestys, top 10).
 * Näytetään valikossa ensin; loput merkit aakkosjärjestyksessä.
 * Nimet vastaavat devaluation.csv -rivejä.
 */
const FINLAND_TOP_BRANDS_ORDER = [
    'Toyota',
    'Volkswagen',
    'Volvo',
    'Skoda',
    'Mercedes-Benz',
    'BMW',
    'Kia',
    'Ford',
    'Nissan',
    'Hyundai',
];

function buildOrderedBrandList(regularBrands, evBrands) {
    const brandSet = new Set([
        ...Object.keys(regularBrands),
        ...Object.keys(evBrands),
    ]);
    const topFirst = FINLAND_TOP_BRANDS_ORDER.filter((b) => brandSet.has(b));
    const topSet = new Set(topFirst);
    const restAlpha = [...brandSet]
        .filter((b) => !topSet.has(b))
        .sort((a, b) => a.localeCompare(b, 'fi'));
    return { topFirst, restAlpha };
}

// Ladataan CSV-tiedostot ja käsitellään ne
async function loadCSV(filePath) {
    console.log(`Ladataan CSV-tiedostoa: ${filePath}`);
    const response = await fetch(filePath);
    const data = await response.text();
    const rows = data.split('\n').slice(1); // Poistetaan otsikkorivi
    const values = {};
    rows.forEach(row => {
        const cols = row.split(';').map(col => col.trim());
        if (cols.length === 2) {
            const fuelType = cols[0];
            const price = parseFloat(cols[1]);
            values[fuelType] = [price];
        } else if (cols.length > 2) {
            const brand = cols[0];
            const devaluationValues = cols.slice(1).map(Number);
            values[brand] = devaluationValues;
        }
    });
    console.log(`Ladattu CSV-tiedosto: ${filePath}`, values);
    return values;
}

// Täytetään auton iät valinnoiksi
async function fillAgeOptions() {
    console.log('Täytetään ikävalinnat.');
    const ageSelect = document.getElementById('age');
    ageSelect.innerHTML = ""; // Tyhjennetään vanhat valinnat ennen uusien lisäämistä
    for (let i = 1; i <= DEVALUATION_PLANNING_YEARS_MAX; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} vuotta`;
        ageSelect.appendChild(option);
    }
}

// Näytetään tai piilotetaan polttoainekentät ajoneuvotyypin perusteella
function toggleFuelInputs() {
    const fuelType = document.getElementById('fuelType').value;
    console.log(`Polttoainetyyppi valittu: ${fuelType}`);
    
    // Näytetään polttoainekenttä bensiinille, dieselille ja lataushybridille
    document.getElementById('fuelConsumption').style.display = 
        (fuelType === 'bensiini' || fuelType === 'diesel' || fuelType === 'lataushybridi') ? 'block' : 'none';
    
    // Näytetään sähkökenttä sähköautolle ja lataushybridille
    document.getElementById('electricConsumption').style.display = 
        (fuelType === 'sahko' || fuelType === 'lataushybridi') ? 'block' : 'none';
    
    // Näytetään kaasukenttä vain kaasukäyttöisille
    document.getElementById('gasConsumption').style.display = 
        (fuelType === 'kaasu') ? 'block' : 'none';
    
    // Tyhjennetään kentät
    document.getElementById('fuelPer100Km').value = '';
    document.getElementById('electricPer100Km').value = '';
    document.getElementById('gasPer100Km').value = '';
    
    // Avataan kulutustiedot-accordion uudelleen
    const kulutusAccordion = document.querySelector('.accordion');
    const kulutusContent = kulutusAccordion.nextElementSibling;
    kulutusAccordion.classList.add("active");
    kulutusContent.classList.add("show");
    kulutusContent.style.maxHeight = kulutusContent.scrollHeight + "px";
    
    clearResults();
}

// Tyhjennetään tulokset ja vuosittaiset kustannukset
function clearResults() {
    console.log('Tyhjennetään tulokset.');
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Valitse tiedot ja paina nappia nähdäksesi tulokset.';
    annualFuelCost = 0;
    annualElectricCost = 0;
    annualGasCost = 0;
    if (typeof window.clearMarketReference === 'function') {
        window.clearMarketReference();
    }
}

// Täytetään auton merkit valinnoiksi ajoneuvotyypin perusteella
async function updateBrandOptions() {
    const brandSelect = document.getElementById('brand');
    const selectedBrand = brandSelect.value;  // Tallenna käyttäjän valitsema merkki
    brandSelect.innerHTML = "";  // Tyhjennetään vanhat valinnat
    
    // Ladataan molemmat CSV-tiedostot
    const regularBrands = await loadCSV('devaluation.csv');
    const evBrands = await loadCSV('devaluation_ev.csv');
    
    const { topFirst, restAlpha } = buildOrderedBrandList(regularBrands, evBrands);
    const allBrands = [...topFirst, ...restAlpha];

    const appendOptions = (parent, brands) => {
        brands.forEach((brand) => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            parent.appendChild(option);
        });
    };

    if (topFirst.length > 0 && restAlpha.length > 0) {
        const ogTop = document.createElement('optgroup');
        ogTop.label = 'Yleisimmät Suomessa';
        appendOptions(ogTop, topFirst);
        brandSelect.appendChild(ogTop);
        const ogRest = document.createElement('optgroup');
        ogRest.label = 'Kaikki merkit (A–Ö)';
        appendOptions(ogRest, restAlpha);
        brandSelect.appendChild(ogRest);
    } else {
        appendOptions(brandSelect, allBrands);
    }

    // Jos tallennettu merkki löytyy uudesta listasta, aseta se valituksi
    if (selectedBrand && allBrands.includes(selectedBrand)) {
        brandSelect.value = selectedBrand;
    }

    // Päivitä käyttövoimavaihtoehdot valitun merkin perusteella
    await updateFuelTypeOptions();
    if (typeof window.populateMarketModelSelect === 'function') {
        await window.populateMarketModelSelect(brandSelect.value);
    }
}

// Päivitetään käyttövoimavaihtoehdot merkin perusteella
async function updateFuelTypeOptions() {
    const brandSelect = document.getElementById('brand');
    const fuelTypeSelect = document.getElementById('fuelType');
    const selectedBrand = brandSelect.value;
    const selectedFuelType = fuelTypeSelect.value; // Tallenna nykyinen valinta
    
    // Ladataan tiedot molemmista tiedostoista
    const regularBrands = await loadCSV('devaluation.csv');
    const evBrands = await loadCSV('devaluation_ev.csv');
    
    // Päivitä globaali devaluationData
    devaluationData = {
        ...regularBrands,
        ...evBrands
    };
    
    // Tyhjennä nykyiset vaihtoehdot
    fuelTypeSelect.innerHTML = "";
    
    // Tarkista, missä tiedostoissa merkki esiintyy
    const isInRegular = regularBrands[selectedBrand];
    const isInEV = evBrands[selectedBrand];
    
    // Lisää käyttövoimavaihtoehdot sen mukaan, missä tiedostoissa merkki esiintyy
    if (isInRegular) {
        addFuelOption(fuelTypeSelect, 'bensiini', 'Bensiini');
        addFuelOption(fuelTypeSelect, 'bensiini', 'Hybridi, bensiini');
        addFuelOption(fuelTypeSelect, 'lataushybridi', 'Lataushybridi, bensiini');
        addFuelOption(fuelTypeSelect, 'diesel', 'Diesel');
        addFuelOption(fuelTypeSelect, 'kaasu', 'Kaasu');
    }
    
    if (isInEV) {
        addFuelOption(fuelTypeSelect, 'sahko', 'Sähkö');
    }
    
    // Yritä palauttaa aiempi valinta, jos se on edelleen saatavilla
    if (selectedFuelType && fuelTypeSelect.querySelector(`option[value="${selectedFuelType}"]`)) {
        fuelTypeSelect.value = selectedFuelType;
    } else if (fuelTypeSelect.options.length > 0) {
        // Jos aiempaa valintaa ei löydy, valitse ensimmäinen vaihtoehto
        fuelTypeSelect.value = fuelTypeSelect.options[0].value;
    }
    
    // Päivitä kulutuskentät
    toggleFuelInputs();
}

// Apufunktio käyttövoimavaihtoehdon lisäämiseen
function addFuelOption(select, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
}

// Lisää tapahtumakuuntelija automerkin vaihtumiselle
document.getElementById('brand').addEventListener('change', async function () {
    await updateFuelTypeOptions();
    if (typeof window.populateMarketModelSelect === 'function') {
        await window.populateMarketModelSelect(document.getElementById('brand').value);
    }
});

// Ladataan polttoainehinnan tiedot
async function loadFuelData() {
    console.log('Ladataan polttoainetiedot.');
    fuelData = await loadCSV('fuel_data.csv');
    console.log('Polttoainetiedot ladattu:', fuelData);
}

// Ladataan kilometrikertoimet CSV-tiedostosta
async function loadMileageFactors() {
    console.log('Ladataan kilometrikertoimia...');
    try {
        const response = await fetch('mileage_factors.csv');
        const data = await response.text();
        const rows = data.split('\n').slice(1); // Poistetaan otsikkorivi
        
        rows.forEach(row => {
            if (!row.trim()) return; // Ohitetaan tyhjät rivit
            const cols = row.split(';').map(col => col.trim());
            const brand = cols[0];
            const factors = {
                '50000': parseFloat(cols[1]),
                '100000': parseFloat(cols[2]),
                '150000': parseFloat(cols[3]),
                '200000': parseFloat(cols[4]),
                '250000': parseFloat(cols[5]),
                '300000': parseFloat(cols[6]),
                'yli300000': parseFloat(cols[7])
            };
            mileageFactors[brand] = factors;
        });
        
        console.log('Kilometrikertoimet ladattu:', mileageFactors);
    } catch (error) {
        console.error('Virhe kilometrikertoimien latauksessa:', error);
        // Asetetaan oletuskertoimet jos lataus epäonnistuu
        mileageFactors = {
            'default': {
                '50000': 1.0,
                '100000': 1.10,
                '150000': 1.20,
                '200000': 1.30,
                '250000': 1.40,
                '300000': 1.50,
                'yli300000': 1.60
            }
        };
    }
}

// Haetaan kilometrikerroin
function getMileageFactor(brand, kilometers, fuelType, age) {
    // Lisätään _ev pääte sähköautoille
    const brandKey = fuelType === 'sahko' ? `${brand}_ev` : brand;
    
    // Haetaan merkin kertoimet tai oletuskertoimet
    const factors = mileageFactors[brandKey] || mileageFactors['default'];
    
    // Valitaan oikea kerroin kilometrien ja iän perusteella
    let baseKerroin;
    if (kilometers <= 50000) baseKerroin = factors['50000'];
    else if (kilometers <= 100000) baseKerroin = factors['100000'];
    else if (kilometers <= 150000) baseKerroin = factors['150000'];
    else if (kilometers <= 200000) baseKerroin = factors['200000'];
    else if (kilometers <= 250000) baseKerroin = factors['250000'];
    else if (kilometers <= 300000) baseKerroin = factors['300000'];
    else baseKerroin = factors['yli300000'];
    
    // Varmistetaan että peruskerroin on järkevä
    if (isNaN(baseKerroin) || baseKerroin <= 0) {
        console.warn(`Virheellinen peruskerroin: ${baseKerroin}, käytetään oletusarvoa 1.0`);
        baseKerroin = 1.0;
    }
    
    // Sovelletaan ikäkorjausta
    let ageFactor = 1.0;
    if (age <= 2) ageFactor = 1.0;
    else if (age <= 5) ageFactor = 0.95;
    else if (age <= 8) ageFactor = 0.9;
    else ageFactor = 0.85;
    
    // Lasketaan lopullinen kerroin
    const finalKerroin = baseKerroin * ageFactor;
    
    // Varmistetaan että lopullinen kerroin on järkevä
    if (isNaN(finalKerroin) || finalKerroin <= 0) {
        console.warn(`Virheellinen lopullinen kerroin: ${finalKerroin}, käytetään oletusarvoa 1.0`);
        return 1.0;
    }
    
    return finalKerroin;
}

// Lasketaan arvonalenema, käyttämällä sopivaa kerrointa
function calculateDepreciation(age, depreciationArray, brand, kilometers, fuelType) {
    console.log(`Lasketaan arvonalenema iälle: ${age}, kilometrit: ${kilometers}`);

    // Ikä taulukon ulkopuolella: enimmäisalenema (CSV:ssä sarakkeet 0…MAX vastaavat vuosia)
    if (age < 0 || age >= depreciationArray.length) {
        console.warn(`Ikä ${age} ei osu taulukkoon (pituus ${depreciationArray.length}), käytetään 0.95`);
        return 0.95;
    }
    
    // Hae arvonalenema CSV-tiedostosta
    let depreciationFactor = parseFloat(depreciationArray[age]);
    
    // Varmistetaan että arvonalenema on järkevä
    if (isNaN(depreciationFactor) || depreciationFactor < 0) {
        console.warn(`Virheellinen arvonalenema: ${depreciationFactor}, käytetään oletusarvoa 0.95`);
        depreciationFactor = 0.95;
    }
    
    // Hae kilometrikerroin jos kilometrit on annettu
    if (kilometers > 0) {
        const mileageFactor = getMileageFactor(brand, kilometers, fuelType, age);
        console.log(`Kilometrikerroin: ${mileageFactor} (${kilometers} km)`);
        
        // Varmistetaan että kilometrikerroin on järkevä
        if (isNaN(mileageFactor) || mileageFactor <= 0) {
            console.warn(`Virheellinen kilometrikerroin: ${mileageFactor}, käytetään oletusarvoa 1.0`);
            return depreciationFactor;
        }
        
        // Sovelletaan kilometrikerrointa - suurempi kerroin tarkoittaa suurempaa alenemaa
        const remainingValue = 1 - depreciationFactor;
        const additionalDepreciation = remainingValue * (mileageFactor - 1);
        depreciationFactor = depreciationFactor + additionalDepreciation;
    }
    
    // Varmista ettei alenema ylitä 95% tai ole negatiivinen
    depreciationFactor = Math.min(Math.max(depreciationFactor, 0), 0.95);
    
    console.log(`Käytetty kokonaiskerroin: ${depreciationFactor}`);
    return depreciationFactor;
}

// Käsitellään tapahtumat DOM:n latautumisen jälkeen
document.addEventListener("DOMContentLoaded", function () {
    console.log('DOM ladattu, lisätään tapahtumakuuntelijat.');

    // Alustetaan "Tyhjennä"-nappula
    const clearButton = document.getElementById('clearButton');
    const calculateButton = document.getElementById('calculateButton');  // Määritellään Laske-nappula

    calculateButton.addEventListener('click', async function() {
        console.log("Laske-nappia painettu");

        if (checkFormValidity()) {
            console.log("Lomake on voimassa, jatketaan.");
            await calculate();
            smoothScrollToResult();

            // Piilotetaan "Tyhjennä"-nappula Laske-painalluksen jälkeen, jos se on määritelty
            clearButton.style.display = 'none';
        } else {
            console.warn("Lomakkeessa on virheitä, tarkista syötteet.");
        }
    });

    // Lisää tapahtumakuuntelija Tyhjennä-napille
    clearButton.addEventListener('click', function() {
        clearSavedResults(); // Tyhjennä tallennetut tulokset
        this.style.display = 'none'; // Piilota Tyhjennä-nappula
    });

    const exportCsvBtn = document.getElementById('exportCompareCsv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function () {
            exportComparisonToCsv();
        });
    }
    updateCompareExportButtonVisibility();

    // Lisää tapahtumakuuntelija Lisää vertailuun -napille
    document.getElementById('addToCompareButton').addEventListener('click', function() {
        addToComparison(); // Lisää kortti vertailuun

        // Piilota "Lisää vertailuun" -nappula, kun kortti on lisätty vertailuun
        this.style.display = 'none';

        // Näytetään "Tyhjennä"-nappula kun "Lisää vertailuun" -nappulaa on painettu
        clearButton.style.display = 'inline-block';
    });

    // Täytetään auton iät ja merkit
    fillAgeOptions();
    loadFuelData();
    void updateBrandOptions(); // Tämä on ainoa paikka, jossa automerkit päivitetään (async; mallivalikko täyttyy perästä)

    // Accordion-ominaisuus
    const accordions = document.querySelectorAll(".accordion");

    // Oletuksena avataan vain "Kulutustiedot"-accordion ja suljetaan muut
    accordions.forEach((acc, index) => {
        const content = acc.nextElementSibling;
        if (index === 0) { // Avaa ensimmäinen accordion ("Kulutustiedot")
            acc.classList.add("active");
            content.classList.add("show");
            content.style.maxHeight = content.scrollHeight + "px"; // Avaa sisältö
        } else {
            content.classList.remove("show");
            content.style.maxHeight = null; // Sulje muut accordionit
        }

        // Klikkaustapahtuma accordionille
        acc.addEventListener("click", function () {
            // Togglaa aktiivisuusluokka
            this.classList.toggle("active");

            // Togglaa accordion-sisällön näkyvyys
            if (content.classList.contains("show")) {
                content.classList.remove("show");
                content.style.maxHeight = null;
            } else {
                content.classList.add("show");
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });

    });

    // Lisää tapahtumakuuntelija "Vertaa tästä" -painikkeelle
    document.getElementById('mainButton').addEventListener('click', function() {
        // Avaa myös lomake
        document.getElementById('showNewVsOld').style.display = 'block';

        // Avaa "Kulutustiedot"-accordion automaattisesti
        const kulutusAccordion = document.querySelector('.accordion');
        const kulutusContent = kulutusAccordion.nextElementSibling;
        kulutusAccordion.classList.add("active");
        kulutusContent.classList.add("show");
        kulutusContent.style.maxHeight = kulutusContent.scrollHeight + "px"; // Varmista, että sisältö pysyy auki
    });

    // Skrollaa sivun alareunaan
    function smoothScrollToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    // Funktio tarkistamaan onko lomake täytetty oikein
    function checkFormValidity() {
        const brand = document.getElementById('brand').value;
        const fuelType = document.getElementById('fuelType').value;
        const age = document.getElementById('age').value;
        const price = document.getElementById('price').value;
        const kilometers = document.getElementById('kilometers').value;
        const insurance = document.getElementById('insurance').value;
        const tax = document.getElementById('tax').value;

        return brand && fuelType && age && price && kilometers && insurance && tax; // Palauttaa true, jos kaikki kentät on täytetty
    }

	// Smooth scroll tuloksiin
	function smoothScrollToResult() {
		const resultDiv = document.getElementById('result');
		resultDiv.scrollIntoView({ behavior: 'smooth' });
	}
});

// Lasketaan auton arvonalenema ja kustannukset
async function calculate() {
    console.log('Aloitetaan laskenta.');
    lastComparisonExport = null;
    if (typeof window.clearMarketReference === 'function') {
        window.clearMarketReference();
    }

    // Varmistetaan että kilometrikertoimet on ladattu
    if (Object.keys(mileageFactors).length === 0) {
        await loadMileageFactors();
    }

    // Haetaan syötteet
    const fuelType = document.getElementById('fuelType').value;
    const selectedBrand = document.getElementById('brand').value;
    const selectedAge = parseInt(document.getElementById('age').value);
    const price = parseFloat(document.getElementById(isUsed ? 'priceUsed' : 'price').value);
    const modelYear = isUsed ? parseInt(document.getElementById('modelYear').value) : new Date().getFullYear();
    const kilometers = isUsed ? parseFloat(document.getElementById('drivenKilometers').value) || 0 : 0;
    const annualKilometers = parseFloat(document.getElementById('kilometers').value) || 0;
    const annualInsuranceCost = parseFloat(document.getElementById('insurance').value) || 0;
    const annualTaxCost = parseFloat(document.getElementById('tax').value) || 0;
    const maintenance = parseFloat(document.getElementById('maintenance').value) || 0;
    const tires = parseFloat(document.getElementById('tires').value) || 0;
    const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;

	// Täytä carDetails
    carDetails = `${selectedBrand} ${isUsed ? "(käytetty)" : ""} (${fuelType}),<br> Hankintahinta: ${price} €`;


    // Muut laskennat...
    console.log(`carDetails päivitetty: ${carDetails}`);

    // Lokita syötteet
    console.log(`isUsed: ${isUsed}, price: ${price}, modelYear: ${modelYear}`);
	
	document.getElementById('addToCompareButton').style.display = 'inline-block';

    // Tarkista pakolliset tiedot
    if (!selectedBrand || isNaN(price) || isNaN(selectedAge) || (isUsed && isNaN(modelYear))) {
        document.getElementById('result').innerHTML = 'Syötä kaikki tiedot ja arvot.';
        console.warn('Tietoja puuttuu.');
        if (typeof window.clearMarketReference === 'function') {
            window.clearMarketReference();
        }
        return;
    }

    let currentAge = isUsed ? new Date().getFullYear() - modelYear : 0;
    let combinedAge = currentAge + selectedAge;
    let depreciation = 0;
    let futureValue = 0;

    // Varmista, että devaluationData on päivitetty
    if (!devaluationData[selectedBrand]) {
        // Jos dataa ei löydy, päivitä se
        const regularBrands = await loadCSV('devaluation.csv');
        const evBrands = await loadCSV('devaluation_ev.csv');
        devaluationData = {
            ...regularBrands,
            ...evBrands
        };
    }

    // Laske arvonalenema
    if (devaluationData[selectedBrand]) {
        const depreciationArray = devaluationData[selectedBrand];
        let depreciationFactorCurrentAge = calculateDepreciation(currentAge, depreciationArray, selectedBrand, kilometers, fuelType);
        let depreciationFactorCombinedAge = calculateDepreciation(combinedAge, depreciationArray, selectedBrand, kilometers + (annualKilometers * selectedAge), fuelType);

        if (isUsed) {
            // Palautetaan alkuperäinen logiikka käytetylle autolle
            // Tämä käyttää nykyistä hintaa ja soveltaa siihen tulevaa arvonalenemaa
            futureValue = price * (1 - (depreciationFactorCombinedAge - depreciationFactorCurrentAge));
        } else {
            futureValue = price * (1 - depreciationFactorCombinedAge);
        }
        depreciation = Math.abs((price - futureValue).toFixed(2));

        futureValue = Math.max(0, futureValue);
    } else {
        document.getElementById('result').innerHTML = `Tietoa ei löydy merkille ${selectedBrand}.`;
        console.warn(`Tietoa ei löydy merkille ${selectedBrand}`);
        if (typeof window.clearMarketReference === 'function') {
            window.clearMarketReference();
        }
        return;
    }

    console.log(`Arvonalenema: ${depreciation} €, Tuleva arvo: ${futureValue} €`);

    // Store global depreciation value
    globalDepreciation = parseFloat(depreciation);

    // Calculate annual costs
    let annualFuelCost = calculateFuelCosts(fuelType, annualKilometers);
    
    // Calculate annual maintenance costs
    const annualMaintenance = maintenance / selectedAge;
    const annualTires = tires / selectedAge;
    const annualOtherCosts = otherCosts / selectedAge;
    
    globalTotalCosts = annualFuelCost + annualInsuranceCost + annualTaxCost + annualMaintenance + annualTires + annualOtherCosts;

    // Calculate total cost including depreciation
    const totalCostWithoutDepreciation = globalTotalCosts * selectedAge;
    globalTotalIncludingCosts = parseFloat((totalCostWithoutDepreciation + globalDepreciation).toFixed(2));

    console.log("globalTotalIncludingCosts set to:", globalTotalIncludingCosts);

    const totalMonths = selectedAge * 12;
    const monthlyCost = (globalTotalIncludingCosts / totalMonths).toFixed(2);
    const monthlyCostWithoutDepreciation = (totalCostWithoutDepreciation / totalMonths).toFixed(2);

    const fuelSelect = document.getElementById('fuelType');
    const fuelLabel =
        fuelSelect && fuelSelect.options[fuelSelect.selectedIndex]
            ? fuelSelect.options[fuelSelect.selectedIndex].textContent.trim()
            : fuelType;

    // Display the result in HTML — aikajänne kalenterivuosina (pito alkaa kuluvasta vuodesta), ei vuosimallista
    const currentCalendarYear = new Date().getFullYear();
    const startYear = currentCalendarYear;
    const endYear = currentCalendarYear + selectedAge;
    const currentMileage = isUsed ? parseFloat(document.getElementById('drivenKilometers').value) || 0 : 0;
    const futureMileage = currentMileage + (annualKilometers * selectedAge);
    
	document.getElementById('result').innerHTML = `
		<div class="fin-result-box">
			<h2>Arvioitu arvo — ${selectedAge} vuotta</h2>
			<p class="fin-result-lead">Auton arvioitu arvo noin ${selectedAge} vuoden kuluttua on ${futureValue.toFixed(0)} € (vuosi ${endYear})</p>
			<ul class="calc-result-list">
				<li>Arvon alenema seuraavan ${selectedAge} vuoden aikana on ${depreciation} €.</li>
				${annualFuelCost > 0 ? `<li>Vuosittaiset polttoainekustannukset ovat ${annualFuelCost.toFixed(2)} €.</li>` : ''}
				${annualInsuranceCost > 0 ? `<li>Vuosittaiset vakuutuskustannukset ovat ${annualInsuranceCost} €.</li>` : ''}
				${annualTaxCost > 0 ? `<li>Vuosittaiset verokustannukset ovat ${annualTaxCost} €.</li>` : ''}
			</ul>
		</div>
		<div class="fin-result-box">
			<h2>Kokonaiskustannukset — ${selectedAge} vuotta</h2>
			<p class="fin-result-lead">Kokonaiskustannukset ${selectedAge} vuodelta ${globalTotalIncludingCosts} € (${startYear}–${endYear}).</p>
			<ul class="calc-result-list">
				<li>Kuukausikustannukset ${monthlyCost} €.</li>
				<li>Arvon alenema kuukaudessa ${(monthlyCost - monthlyCostWithoutDepreciation).toFixed(2)} €.</li>
				<li>Kuukausikustannukset ilman arvonalenemaa ${monthlyCostWithoutDepreciation} €.</li>
				<li>Auton mittarilukema ${futureMileage.toFixed(0)} km.</li>
			</ul>
		</div>
	`;


    // Prepare content for comparison card (tyylit: .compare-spec-table, rahoitusvertailun infolaatikko)
    comparisonContent = `
        <table class="compare-spec-table">
            <tr>
                <td>Hankintahinta</td>
                <td>${price.toFixed(0)} €</td>
            </tr>
            <tr>
                <td>Pitoaika</td>
                <td>${selectedAge} vuotta</td>
            </tr>
            <tr>
                <td>Ajomäärä vuodessa</td>
                <td>${annualKilometers} km</td>
            </tr>
            <tr class="compare-spec-section">
                <td colspan="2"><span class="compare-section-label">Kuukausikustannukset</span></td>
            </tr>
            <tr>
                <td>Arvon alenema</td>
                <td>${(monthlyCost - monthlyCostWithoutDepreciation).toFixed(2)} €</td>
            </tr>
            <tr>
                <td>Kulut</td>
                <td>${monthlyCostWithoutDepreciation} €</td>
            </tr>
            <tr class="compare-spec-total">
                <td>Yhteensä</td>
                <td>${monthlyCost} €</td>
            </tr>
        </table>
    `;

    const monthlyDepreciation = (monthlyCost - monthlyCostWithoutDepreciation).toFixed(2);
    lastComparisonExport = {
        auto: `${selectedBrand}${isUsed ? ' (käytetty)' : ''} (${fuelLabel})`,
        hankintahinta: price.toFixed(0),
        pitoaikaVuotta: String(selectedAge),
        ajomaaraVuodessa: String(annualKilometers),
        kuukausiArvonAlenema: monthlyDepreciation,
        kuukausiKulut: String(monthlyCostWithoutDepreciation),
        kuukausiYhteensa: String(monthlyCost),
    };

    const marketModelEl = document.getElementById('marketModel');
    const modelInput = marketModelEl ? marketModelEl.value : '';
    if (isUsed && typeof window.updateMarketReference === 'function') {
        window.updateMarketReference({
            brand: selectedBrand,
            modelInput,
            year: modelYear,
            userPrice: price,
            fuelLabel,
        });
    } else if (typeof window.clearMarketReference === 'function') {
        window.clearMarketReference();
    }
}



// Lasketaan polttoainekustannukset tyypin ja käytön perusteella
function calculateFuelCosts(fuelType, kilometers) {
    console.log(`Lasketaan polttoainekustannukset polttoainetyypille: ${fuelType}, ajomäärä: ${kilometers} km`);
    let totalCost = 0;

    if (fuelType === 'lataushybridi') {
        // Lataushybridille lasketaan sekä polttoaine- että sähkökustannukset
        const fuelConsumption = parseFloat(document.getElementById('fuelPer100Km').value) || 0;
        const electricConsumption = parseFloat(document.getElementById('electricPer100Km').value) || 0;
        const fuelPrice = parseFloat(fuelData['bensiini'][0]) || 0;
        const electricPrice = calculateElectricityPrice();

        // Lasketaan sähköllä ajettava osuus auton sähköisen toimintamatkan perusteella
        const electricRange = 50; // Keskimääräinen sähköinen toimintamatka km
        const dailyKm = kilometers / 365; // Keskimääräinen päivittäinen ajomatka
        
        // Jos päivittäinen ajomatka on alle sähköisen toimintamatkan, käytetään enemmän sähköä
        let electricShare = Math.min(0.8, electricRange / dailyKm);
        electricShare = Math.max(0.2, electricShare); // Vähintään 20% sähköllä
        
        const electricKm = kilometers * electricShare;
        const fuelKm = kilometers * (1 - electricShare);

        const fuelCost = (fuelKm * fuelConsumption / 100 * fuelPrice);
        const electricCost = (electricKm * electricConsumption / 100 * electricPrice);
        
        totalCost = fuelCost + electricCost;
        
        console.log(`Lataushybridin jako: ${(electricShare*100).toFixed(1)}% sähköllä, ${((1-electricShare)*100).toFixed(1)}% polttoaineella`);
    } else if (fuelType === 'sahko') {
        // Sähköautolle käytetään painotettua sähkön hintaa
        const electricConsumption = parseFloat(document.getElementById('electricPer100Km').value) || 0;
        const electricPrice = calculateElectricityPrice();
        totalCost = (kilometers * electricConsumption / 100 * electricPrice);
    } else {
        // Muille käyttövoimille lasketaan vain yhden energialähteen kustannukset
        const consumption = parseFloat(document.getElementById(fuelType === 'kaasu' ? 'gasPer100Km' : 'fuelPer100Km').value) || 0;
        const price = parseFloat(fuelData[fuelType][0]) || 0;
        totalCost = (kilometers * consumption / 100 * price);
    }

    console.log(`Lasketut polttoainekustannukset: ${totalCost} €`);
    return totalCost;
}

function calculateElectricityPrice() {
    // Haetaan lataushinnat
    const homePrice = parseFloat(document.getElementById('electricPrice').value) || 0;
    const commercialPrice = parseFloat(document.getElementById('electricCommercialPrice').value) || 0;
    const ccsPrice = parseFloat(document.getElementById('electricCCSPrice').value) || 0;

    // Haetaan latausosuudet
    let homeShare = parseFloat(document.getElementById('electricPriceShare').value) || 0;
    let commercialShare = parseFloat(document.getElementById('electricCommercialShare').value) || 0;
    let ccsShare = parseFloat(document.getElementById('electricCCSShare').value) || 0;

    // Normalisoidaan osuudet summautumaan 100%
    const totalShare = homeShare + commercialShare + ccsShare;
    if (totalShare > 0) {
        homeShare = (homeShare / totalShare) * 100;
        commercialShare = (commercialShare / totalShare) * 100;
        ccsShare = (ccsShare / totalShare) * 100;
    } else {
        // Jos kaikki osuudet ovat 0, käytetään oletusjakaumaa
        homeShare = 90;
        commercialShare = 5;
        ccsShare = 5;
    }

    // Lasketaan painotettu keskihinta
    const weightedPrice = (
        (homePrice * (homeShare / 100)) +
        (commercialPrice * (commercialShare / 100)) +
        (ccsPrice * (ccsShare / 100))
    );

    console.log(`Painotettu sähkön hinta: ${weightedPrice.toFixed(3)} €/kWh (Koti: ${homeShare.toFixed(1)}%, Asiointi: ${commercialShare.toFixed(1)}%, Pika: ${ccsShare.toFixed(1)}%)`);
    return weightedPrice;
}

// Funktio poistamaan kortti fade-animaation kanssa
function removeCard(cardElement) {
    // Lisää "removing"-luokka, joka käynnistää fade-out-animaation
    cardElement.classList.add('removing');
    
    // Odota animaation loppumista ennen kuin kortti poistetaan DOM:sta
    setTimeout(function() {
        cardElement.remove();
        updateCompareExportButtonVisibility();
    }, 500); // 500 ms vastaa animaation kestoa
}

// Funktio tallentamaan ja näyttämään tulos korttina
function addToComparison() {
    console.log('Lisätään tulos vertailuun.');
    const savedResultsDiv = document.getElementById('savedResults');
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Luo poistoruksi ja lisää sen korttiin
    const removeButton = document.createElement('span');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = '&times;';
    removeButton.onclick = function () {
        removeCard(card); // Käynnistetään poisto animaation kanssa
    };
    
    card.innerHTML = `
        <div class="card-content">
            <div class="compare-card-lead">${carDetails}</div>
            ${comparisonContent}
        </div>
    `;
    
    card.appendChild(removeButton); // Lisää poistoruksi korttiin
    if (lastComparisonExport) {
        card._comparisonExport = lastComparisonExport;
    }
    savedResultsDiv.appendChild(card);
    lastComparisonExport = null;

    // Viivästys, jotta kortti tulee näkyviin sulavasti
    setTimeout(() => {
        card.style.opacity = 1; // Aseta näkyväksi smoothisti
    }, 10); // Viivästys, jotta DOM päivitetään ensin

    // Tyhjennetään tulokset päänäytöstä ja nollataan comparisonContent
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Valitse tiedot ja paina nappia nähdäksesi tulokset.';
    comparisonContent = ""; // Tyhjennetään sisältö tulevaa käyttöä varten
    if (typeof window.clearMarketReference === 'function') {
        window.clearMarketReference();
    }

    updateCompareExportButtonVisibility();
}



function updateCompareExportButtonVisibility() {
    const wrap = document.querySelector('.saved-results-export');
    if (!wrap) return;
    const n = document.querySelectorAll('#savedResults .result-card').length;
    wrap.classList.toggle('is-visible', n > 0);
}

function clearSavedResults() {
    console.log('Tyhjennetään tallennetut kortit.');
    const savedResultsDiv = document.getElementById('savedResults');
    savedResultsDiv.innerHTML = ''; // Clears all saved cards
    updateCompareExportButtonVisibility();
}

function escapeCsvField(value) {
    const str = value == null ? '' : String(value);
    if (/[;"'\n\r]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function exportComparisonToCsv() {
    const cards = document.querySelectorAll('#savedResults .result-card');
    if (!cards.length) {
        alert(
            'Ei vertailukortteja. Laske ensin ja lisää kortti painikkeella "Lisää vertailuun".'
        );
        return;
    }
    const header = [
        'Auto',
        'Hankintahinta (€)',
        'Pitoaika (vuotta)',
        'Ajomäärä vuodessa (km)',
        'Kuukausi arvon alenema (€)',
        'Kuukausi kulut (€)',
        'Kuukausi yhteensä (€)',
    ];
    const lines = [header.map(escapeCsvField).join(';')];
    cards.forEach(function (card) {
        const d = card._comparisonExport;
        if (!d) return;
        lines.push(
            [
                escapeCsvField(d.auto),
                escapeCsvField(d.hankintahinta),
                escapeCsvField(d.pitoaikaVuotta),
                escapeCsvField(d.ajomaaraVuodessa),
                escapeCsvField(d.kuukausiArvonAlenema),
                escapeCsvField(d.kuukausiKulut),
                escapeCsvField(d.kuukausiYhteensa),
            ].join(';')
        );
    });
    if (lines.length < 2) {
        alert(
            'Korteissa ei ole tallennettuja tietoja CSV:lle. Lisää uudet kortit laskennan jälkeen.'
        );
        return;
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ymd = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'autollehinta-vertailu-' + ymd + '.csv';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Sivun latautuessa täytetään ikävalinnat ja päivitetään auton merkit
window.onload = async function() {
    console.log('Sivu ladattu, täytetään valinnat ja päivitetään merkit.');
    await fillAgeOptions();
    await loadFuelData();
    await updateBrandOptions();
    toggleFuelInputs(); // Piilotetaan lisäkentät aluksi
    // toggleModelYear(); // Tarkistetaan käytetyn auton valinta vasta DOM:n latauksen jälkeen
};



// Lisätään tapahtumakuuntelijat valintaruutuihin
/* document.getElementById('used').addEventListener('change', toggleModelYear);document.getElementById('used').addEventListener('change', toggleModelYear); */


/* const iframe = document.getElementById('myIframe'); // Replace with your iframe's ID
const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

// Now you can access the HTML
const htmlContent = iframeDocument.documentElement.innerHTML;
console.log(htmlContent); // This will log the HTML content of the iframe */


document.addEventListener("DOMContentLoaded", function () {
    // Function to scroll smoothly to the form container
    function smoothScroll(target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }

    // Get the reset element (the div wrapping the h2 titles)
    const pageReset = document.getElementById('pageReset');
    
    // Add a click event listener to reset the page
    if (pageReset) {
        pageReset.style.cursor = "pointer"; // Change cursor to pointer for better UX
        pageReset.addEventListener('click', function (e) {
            // Jos klikattiin linkkiä, annetaan linkin toimia normaalisti
            if (e.target.tagName === 'A' || e.target.parentElement.tagName === 'A') {
                return;
            }
            // Muussa tapauksessa suoritetaan sivun nollaus
            window.location.href = 'index.html';
        });
    } else {
        console.error('Page reset element is missing.');
    }

    // Existing logic for the main button and form toggle
    const mainButton = document.getElementById('mainButton');
    const introContainer = document.getElementById('introContainer');
    const formContainer = document.getElementById('showNewVsOld'); // This is the element you're toggling

    // Check if the mainButton, introContainer, and formContainer exist before adding the event listener
    if (mainButton && introContainer && formContainer) {
        mainButton.addEventListener('click', function () {
            // Smoothly hide the entire div that contains the intro text and the button
            introContainer.style.opacity = '0';
            /* introContainer.style.transition = 'opacity 0.6s ease'; */

            // Wait for the fade-out transition to complete before setting display to "none"
            setTimeout(function () {
                introContainer.style.display = "none";

                // Smoothly show the form by setting display and adding the 'show' class (defined in CSS)
                formContainer.style.display = 'block';  // Explicitly set display to block
                formContainer.classList.add('show');

                // Smooth scroll to the form
                smoothScroll(formContainer);
            }, 600); // Wait for the transition duration to match (600ms)
        });
    } else {
        console.error('Main button, intro container, or form container is missing.');
    }
});

document.getElementById('mainButton').addEventListener('click', function() {
    const footer = document.querySelector('.footer');
    footer.classList.add('hidden-footer');
});

let isUsed = false; // Oletusarvoisesti uusi auto

function switchTab(tab) {
    // Poistetaan aktiivinen luokka kaikista tabeista
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tabElement => tabElement.classList.remove('active'));

    // Piilotetaan kaikki tabin sisältöalueet
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    // Asetetaan valittu tab aktiiviseksi ja näytetään sen sisältö
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`${tab}Content`).style.display = 'block';

    // Päivitetään isUsed-arvo tabin perusteella
    isUsed = (tab === 'used');
    console.log(`isUsed päivitetty: ${isUsed}`);
    if (tab === 'new' && typeof window.clearMarketReference === 'function') {
        window.clearMarketReference();
    }
}

(async function checkVersion() {
  try {
    // Hakee version.json-tiedoston palvelimelta
    const response = await fetch('/version.json', { cache: 'no-store' });
    const data = await response.json();
    const currentVersion = localStorage.getItem('appVersion');

    // Jos versio ei täsmää, ilmoitetaan käyttäjälle ja päivitetään selain
    if (currentVersion !== data.version) {
      /* alert('Uusi versio saatavilla. Sivua päivitetään...'); */
      localStorage.setItem('appVersion', data.version);
      location.reload(true); // Pakota sivun uudelleenlataus
    }
  } catch (error) {
    console.error('Error checking version:', error);
  }
})();

// Fuel Settings Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('fuelSettingsModal');
    const settingsIcon = document.getElementById('fuelSettingsIcon');
    const closeBtn = document.querySelector('.close');
    const saveBtn = document.getElementById('saveFuelSettings');
    const resetBtn = document.getElementById('resetFuelSettings');

    // Load saved fuel prices or defaults
    function loadFuelPrices() {
        const savedPrices = JSON.parse(localStorage.getItem('fuelPrices')) || {};
        document.getElementById('electricPrice').value = savedPrices.electric || 0.20;
        document.getElementById('electricCommercialPrice').value = savedPrices.electricCommercial || 0.22;
        document.getElementById('electricCCSPrice').value = savedPrices.electricCCS || 0.36;
        document.getElementById('gasolinePrice').value = savedPrices.gasoline || 1.85;
        document.getElementById('dieselPrice').value = savedPrices.diesel || 1.45;
        document.getElementById('gasPrice').value = savedPrices.gas || 1.10;
    }

    // Save fuel prices to localStorage
    function saveFuelPrices() {
        const prices = {
            electric: parseFloat(document.getElementById('electricPrice').value),
            electricCommercial: parseFloat(document.getElementById('electricCommercialPrice').value),
            electricCCS: parseFloat(document.getElementById('electricCCSPrice').value),
            gasoline: parseFloat(document.getElementById('gasolinePrice').value),
            diesel: parseFloat(document.getElementById('dieselPrice').value),
            gas: parseFloat(document.getElementById('gasPrice').value)
        };
        localStorage.setItem('fuelPrices', JSON.stringify(prices));
        updateFuelData(prices);
    }

    // Update the global fuelData object
    function updateFuelData(prices) {
        fuelData = {
            sahko: [prices.electric],
            sahkoCommercial: [prices.electricCommercial],
            sahkoCCS: [prices.electricCCS],
            bensiini: [prices.gasoline],
            diesel: [prices.diesel],
            kaasu: [prices.gas],
            lataushybridi: [prices.gasoline] // Lisätään lataushybridille bensiinin hinta
        };
    }

    // Reset to default values
    function resetFuelPrices() {
        document.getElementById('electricPrice').value = 0.20;
        document.getElementById('electricCommercialPrice').value = 0.22;
        document.getElementById('electricCCSPrice').value = 0.36;
        document.getElementById('gasolinePrice').value = 1.85;
        document.getElementById('dieselPrice').value = 1.45;
        document.getElementById('gasPrice').value = 1.10;
        saveFuelPrices();
    }

    // Event listeners
    settingsIcon.addEventListener('click', function() {
        modal.classList.add('show');
        loadFuelPrices();
    });

    closeBtn.addEventListener('click', function() {
        modal.classList.remove('show');
    });

    saveBtn.addEventListener('click', function() {
        saveFuelPrices();
        modal.classList.remove('show');
    });

    resetBtn.addEventListener('click', resetFuelPrices);

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Load initial fuel prices
    loadFuelPrices();
});

