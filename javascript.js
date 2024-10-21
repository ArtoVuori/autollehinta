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
    const brandSelect = document.getElementById('brand');
    const selectedBrand = brandSelect.value;  // Tallenna käyttäjän valitsema merkki
    brandSelect.innerHTML = "";  // Tyhjennetään vanhat valinnat
    const devaluationFile = fuelType === 'sahko' ? 'devaluation_ev.csv' : 'devaluation.csv';
    devaluationData = await loadCSV(devaluationFile);
    
    Object.keys(devaluationData).forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });

    // Jos tallennettu merkki löytyy uudesta listasta, aseta se valituksi
    if (selectedBrand && Object.keys(devaluationData).includes(selectedBrand)) {
        brandSelect.value = selectedBrand;
    }
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


    // Lisää tapahtumakuuntelija Laske-napille
    document.getElementById('calculateButton').addEventListener('click', function() {
        if (checkFormValidity()) {
            calculate(); // Suorita laskenta, jos kentät ovat kunnossa
            smoothScrollToResult(); // Scrollataan tuloksiin

            // Piilotetaan "Tyhjennä"-nappula Laske-painalluksen jälkeen
            clearButton.style.display = 'none';
        }
    });
	


    // Lisää tapahtumakuuntelija Lisää vertailuun -napille
    document.getElementById('addToCompareButton').addEventListener('click', function() {
        addToComparison(); // Lisää kortti vertailuun

        // Piilota "Lisää vertailuun" -nappula, kun kortti on lisätty vertailuun
        this.style.display = 'none';

        // Näytetään "Tyhjennä"-nappula kun "Lisää vertailuun" -nappulaa on painettu
        clearButton.style.display = 'inline-block';
    });

    // Lisää tapahtumakuuntelija Tyhjennä-napille
    clearButton.addEventListener('click', function() {
        clearSavedResults(); // Tyhjennä tallennetut tulokset

        // Piilota "Tyhjennä"-nappula kun sitä on painettu
        this.style.display = 'none';
    });


    // Täytetään auton iät ja merkit
    fillAgeOptions();
    loadFuelData();
    updateBrandOptions();

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
	const maintenance = parseFloat(document.getElementById('maintenance').value) || 0;
	const tires = parseFloat(document.getElementById('tires').value) || 0;
	const otherCosts = parseFloat(document.getElementById('otherCosts').value) || 0;

    carDetails = `${selectedBrand} (${fuelType}) <br>${modelYear}`; // Päivitetään auton tiedot
    if (isUsed) {
        carDetails += ` (käytetty)`;
    }

    addToCompareButton.style.display = 'inline-block';

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
    const totalAnnualCosts = annualFuelCost + annualInsuranceCost + annualTaxCost +tires +maintenance +otherCosts;
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
                <td style="width: 40%;">${price.toFixed(0)} €</td>
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

// Funktio poistamaan kortti fade-animaation kanssa
function removeCard(cardElement) {
    // Lisää "removing"-luokka, joka käynnistää fade-out-animaation
    cardElement.classList.add('removing');
    
    // Odota animaation loppumista ennen kuin kortti poistetaan DOM:sta
    setTimeout(function() {
        cardElement.remove();
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
    
    // Kortin sisältö
    card.innerHTML = `
        <div class="card-content">
            <h4>${carDetails}</h4>
            ${comparisonContent}
        </div>
    `;
    
    card.appendChild(removeButton); // Lisää poistoruksi korttiin
    savedResultsDiv.appendChild(card);

    // Viivästys, jotta kortti tulee näkyviin sulavasti
    setTimeout(() => {
        card.style.opacity = 1; // Aseta näkyväksi smoothisti
    }, 10); // Viivästys, jotta DOM päivitetään ensin

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
            e.preventDefault(); // Prevent any default behavior (if inside a form)
            location.reload(); // Reloads the current page, effectively resetting it
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

