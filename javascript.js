// Alustetaan globaalit muuttujat
let devaluationData = {};
let fuelData = {};
let annualFuelCost = 0;
let annualElectricCost = 0;
let annualGasCost = 0;
let modelYear = 2024;
let comparisonContent = ""; // Muuttuja, joka sisältää muotoillun vertailusisällön
let carDetails = ""; // Globaali muuttuja auton tietojen tallentamiseen

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
    for (let i = 1; i <= 10; i++) {
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
    document.getElementById('fuelConsumption').style.display = (fuelType === 'bensiini' || fuelType === 'diesel') ? 'block' : 'none';
    document.getElementById('electricConsumption').style.display = (fuelType === 'sahko' || fuelType === 'bensiini') ? 'block' : 'none';
    document.getElementById('gasConsumption').style.display = (fuelType === 'kaasu') ? 'block' : 'none';
    document.getElementById('fuelPer100Km').value = '';
    document.getElementById('electricPer100Km').value = '';
    document.getElementById('gasPer100Km').value = '';
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
}

// Täytetään auton merkit valinnoiksi ajoneuvotyypin perusteella
async function updateBrandOptions() {
    const fuelType = document.getElementById('fuelType').value;
    console.log(`Päivitetään merkkivalinnat polttoainetyypille: ${fuelType}`);
    const brandSelect = document.getElementById('brand');
    brandSelect.innerHTML = ""; // Tyhjennetään vanhat valinnat
    const devaluationFile = fuelType === 'sahko' ? 'devaluation_ev.csv' : 'devaluation.csv';
    devaluationData = await loadCSV(devaluationFile);
    Object.keys(devaluationData).forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });
}

// Ladataan polttoainehinnan tiedot
async function loadFuelData() {
    console.log('Ladataan polttoainetiedot.');
    fuelData = await loadCSV('fuel_data.csv');
    console.log('Polttoainetiedot ladattu:', fuelData);
}

// Lasketaan arvonalenema, käyttämällä sopivaa kerrointa
function calculateDepreciation(age, depreciationArray) {
    console.log(`Lasketaan arvonalenema iälle: ${age}`);
    
    // Jos ikä ylittää 10 vuotta, käytetään jäännösarvoa
    if (age >= 10) {  
        console.warn(`Ikä ${age} ylittää 10 vuotta. Käytetään 10 % jäännösarvoa.`);
        return 0.9; // 90 % alenema eli 10 % jäännösarvo
    }
    
    // Hae oikea kerroin iälle
    let depreciationFactor = parseFloat(depreciationArray[age - 1]); // Haetaan oikea kerroin iälle
    console.log(`Käytetty kerroin iälle ${age} on: ${depreciationFactor}`);
    return depreciationFactor;
}




// Käsitellään tapahtumat DOM:n latautumisen jälkeen
document.addEventListener("DOMContentLoaded", function () {
    console.log('DOM ladattu, lisätään tapahtumakuuntelijat.');

    // Lisää tapahtumakuuntelijat painikkeille
    document.getElementById('calculateButton').addEventListener('click', calculate);
    document.getElementById('addToCompareButton').addEventListener('click', addToComparison);

    // Täytetään auton iät ja merkit
    fillAgeOptions();
    loadFuelData();
    updateBrandOptions();

    // Accordion-ominaisuus
    const accordions = document.querySelectorAll(".accordion");

    accordions.forEach(acc => {
        acc.addEventListener("click", function () {
            // Vaihda aktiivisuusluokka
            this.classList.toggle("active");

            // Etsi seuraava sisällön div ja näytä/piilota se
            const content = this.nextElementSibling;
            if (content.classList.contains("show")) {
                content.classList.remove("show");
            } else {
                content.classList.add("show");
            }
        });
    });
});


// Näytetään tai piilotetaan mallivuosikenttä valintaruudun perusteella
function toggleModelYear() {
    console.log('Tarkistetaan käytetty auto -valinta.');
    const usedCheckbox = document.getElementById('used');
    const modelYearRow = document.getElementById('modelYearRow');
    const priceLabel = document.getElementById('priceLabel');

    if (!priceLabel) {
        console.error('priceLabel-elementtiä ei löytynyt!');
        return; // Lopeta suoritus, jos elementtiä ei ole löydetty
    }

    // Näytetään tai piilotetaan mallivuosikenttä
    modelYearRow.style.display = usedCheckbox.checked ? 'block' : 'none';

    // Muutetaan otsikko "Auton hankintahinta" tarpeen mukaan
    if (usedCheckbox.checked) {
        priceLabel.textContent = "Auton hankintahinta (käytettynä):";
    } else {
        priceLabel.textContent = "Auton hankintahinta:";
    }
}


// Lasketaan auton arvonalenema ja kustannukset
async function calculate() {
    console.log('Aloitetaan laskenta.');
    const fuelType = document.getElementById('fuelType').value;
    const selectedBrand = document.getElementById('brand').value;
    const selectedAge = parseInt(document.getElementById('age').value);
    const price = parseFloat(document.getElementById('price').value);
    const isUsed = document.getElementById('used').checked;
    const modelYear = isUsed ? parseInt(document.getElementById('modelYear').value) : new Date().getFullYear();
    const kilometers = parseFloat(document.getElementById('kilometers').value) || 0;
    const annualInsuranceCost = parseFloat(document.getElementById('insurance').value) || 0;
    const annualTaxCost = parseFloat(document.getElementById('tax').value) || 0;
    const resultDiv = document.getElementById('result');
    const addToCompareButton = document.getElementById('addToCompareButton');

    carDetails = `${selectedBrand} (${fuelType}) ${modelYear}`; // Päivitetään auton tiedot
    if (isUsed) {
        carDetails += `<br> (käytetty)`;
    }

    addToCompareButton.style.display = 'inline-block';
	clearButton.style.display = 'inline-block';

    if (!selectedBrand || isNaN(price) || isNaN(selectedAge) || (isUsed && isNaN(modelYear))) {
        resultDiv.innerHTML = 'Syötä kaikki tiedot ja arvot.';
        console.warn('Tietoja puuttuu.');
        return;
    }

    let currentAge = isUsed ? new Date().getFullYear() - modelYear : 0;
    let combinedAge = currentAge + selectedAge;
    let depreciation = 0;
    let futureValue = 0;

    if (devaluationData[selectedBrand]) {
        const depreciationArray = devaluationData[selectedBrand];
        let depreciationFactorCurrentAge = calculateDepreciation(currentAge, depreciationArray);
        let depreciationFactorCombinedAge = calculateDepreciation(combinedAge, depreciationArray);

        if (combinedAge > 10) {
            // Jos combinedAge ylittää 10 vuotta, käytetään 10 % alenemaa per vuosi
            futureValue = price;
            for (let i = 0; i < selectedAge; i++) {
                futureValue *= 0.9; // -10 % per vuosi
            }
            depreciation = (price - futureValue).toFixed(2);
        } else {
            // Käytetään tavallista arvonalenemaa
            if (isUsed) {
                let initialPrice = price / (1 - depreciationFactorCurrentAge);
                futureValue = initialPrice * (1 - depreciationFactorCombinedAge);
            } else {
                futureValue = price * (1 - depreciationFactorCombinedAge);
            }
            depreciation = (price - futureValue).toFixed(2);
            if (depreciation < 0) {
                depreciation = Math.abs(depreciation);
            }
        }

        futureValue = Math.max(0, futureValue);
    } else {
        resultDiv.innerHTML = `Tietoa ei löydy merkille ${selectedBrand}.`;
        console.warn(`Tietoa ei löydy merkille ${selectedBrand}`);
        return;
    }

    console.log(`Arvonalenema: ${depreciation} €, Tuleva arvo: ${futureValue} €`);

    // Lasketaan polttoainekustannukset
    let annualFuelCost = calculateFuelCosts(fuelType, kilometers);
    const totalAnnualCosts = annualFuelCost + annualInsuranceCost + annualTaxCost;
    const totalCostWithoutDepreciation = totalAnnualCosts * selectedAge;
    const totalCost = (totalCostWithoutDepreciation + parseFloat(depreciation)).toFixed(2);
    const totalMonths = selectedAge * 12;
    const monthlyCost = (totalCost / totalMonths).toFixed(2);
    const monthlyCostWithoutDeprecation = (totalCostWithoutDepreciation / totalMonths).toFixed(2);

    resultDiv.innerHTML = `
        <p>Auton arvo ${combinedAge} vuoden jälkeen on ${futureValue.toFixed(2)} €</p>
        <ul style="font-size: smaller;">
            <li>Arvon alenema seuraavan ${selectedAge} vuoden aikana on ${depreciation} €.</li>
            ${annualFuelCost > 0 ? `<li>Vuosittaiset polttoainekustannukset ovat ${annualFuelCost.toFixed(2)} €.</li>` : ''}
            ${annualInsuranceCost > 0 ? `<li>Vuosittaiset vakuutuskustannukset ovat ${annualInsuranceCost} €.</li>` : ''}
            ${annualTaxCost > 0 ? `<li>Vuosittaiset verokustannukset ovat ${annualTaxCost} €.</li>` : ''}
        </ul>
        <p>Kokonaiskustannukset ${selectedAge} vuodelta ${totalCost} €.</p>
        <ul style="font-size: smaller;">
            <li>Kuukausikustannukset ${monthlyCost} €.</li>
            <li>Arvon alenema kuukaudessa ${(monthlyCost - monthlyCostWithoutDeprecation).toFixed(2)} €.</li>
            <li>Kuukausikustannukset ilman arvonalenemaa ${monthlyCostWithoutDeprecation} €.</li>
        </ul>
    `;

    // Päivitetään comparisonContent vertailukorttia varten
    comparisonContent = `
        <table style="width: 100%;">
            <tr>
                <td style="width: 60%;">Hankintahinta:</td>
                <td style="width: 40%;">${price.toFixed(2)} €</td>
            </tr>
            <tr>
                <td style="width: 60%;">Pitoaika:</td>
                <td style="width: 40%;">${selectedAge} vuotta</td>
            </tr>
            <tr>
                <td style="width: 60%;">Ajomäärä vuodessa:</td>
                <td style="width: 40%;">${kilometers} km</td>
            </tr>
            <tr>
                <td style="width: 60%;"><br><b>Kuukausikustannukset</b></td>
                <td style="width: 40%;"></td>
            </tr>
            <tr>
                <td style="width: 60%;">- Arvon alenema:</td>
                <td style="width: 40%;">${(monthlyCost - monthlyCostWithoutDeprecation).toFixed(2)} €</td>
            </tr>
            <tr>
                <td style="width: 60%;">- Kulut:</td>
                <td style="width: 40%;">${monthlyCostWithoutDeprecation} €</td>
            </tr>
            <tr>
                <td style="width: 60%;">- Yhteensä:</td>
                <td style="width: 40%;">${monthlyCost} €</td>
            </tr>
        </table>
    `;
}


// Lasketaan polttoainekustannukset tyypin ja käytön perusteella
function calculateFuelCosts(fuelType, kilometers) {
    console.log(`Lasketaan polttoainekustannukset polttoainetyypille: ${fuelType}, ajomäärä: ${kilometers} km`);
    let fuelCost = 0;
    const fuelConsumption = parseFloat(document.getElementById(fuelType === 'sahko' ? 'electricPer100Km' : fuelType === 'kaasu' ? 'gasPer100Km' : 'fuelPer100Km').value) || 0;
    const fuelPrice = parseFloat(fuelData[fuelType][0]) || 0;
    fuelCost = (kilometers * fuelConsumption / 100 * fuelPrice);
    console.log(`Lasketut polttoainekustannukset: ${fuelCost} €`);
    return fuelCost;
}

// Funktio tallentamaan ja näyttämään tulos korttina
function addToComparison() {
    console.log('Lisätään tulos vertailuun.');
    const savedResultsDiv = document.getElementById('savedResults');
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `<div class="card-content">
                    <h4>${carDetails}</h4>
                    ${comparisonContent}
                  </div>`;
    savedResultsDiv.appendChild(card);

    // Tyhjennetään tulokset päänäytöstä ja nollataan comparisonContent
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Valitse tiedot ja paina nappia nähdäksesi tulokset.';
    comparisonContent = ""; // Tyhjennetään sisältö tulevaa käyttöä varten
}

function clearSavedResults() {
    console.log('Tyhjennetään tallennetut kortit.');
    const savedResultsDiv = document.getElementById('savedResults');
    savedResultsDiv.innerHTML = ''; // Clears all saved cards
}

function setRandomBackground() {
    const maxImages = 7; // Update this number as you add more background images
    const randomNumber = Math.floor(Math.random() * maxImages) + 1;
    const imageName = `back_${String(randomNumber).padStart(2, '0')}.jpg`;
    document.body.style.backgroundImage = `url('${imageName}')`;
}


// Sivun latautuessa täytetään ikävalinnat ja päivitetään auton merkit
window.onload = async function() {
    console.log('Sivu ladattu, täytetään valinnat ja päivitetään merkit.');
    await fillAgeOptions();
    await loadFuelData();
    updateBrandOptions();
    toggleFuelInputs(); // Piilotetaan lisäkentät aluksi
    toggleModelYear(); // Tarkistetaan käytetyn auton valinta vasta DOM:n latauksen jälkeen
    setRandomBackground(); // Invoke the background function
};



// Lisätään tapahtumakuuntelijat valintaruutuihin
document.getElementById('used').addEventListener('change', toggleModelYear);

