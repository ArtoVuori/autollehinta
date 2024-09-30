<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auton Arvon Alenema ja Polttoainekustannukset</title>
    <!-- Google Fonts - Josefin Sans -->
    <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Linkki ulkoiseen tyylitiedostoon -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
    <h2>Autollehinta.fi - Kannattaako vaihtaa uudempaan?</h2>
    <table class="form-table">
        <tr>
            <td>
                <label for="brand">Automerkki:</label>
                <select id="brand">
                    <!-- Automerkit täytetään JavaScriptillä -->
                </select>
            </td>
            <td>
                <label for="fuelType">Ajoneuvon tyyppi:</label>
                <select id="fuelType" onchange="updateBrandOptions(); toggleFuelInputs();">
                    <option value="bensiini">Bensiini</option>
                    <option value="bensiini">Hybridi, bensiini</option>
                    <option value="bensiini">Lataushybridi, bensiini</option>
                    <option value="diesel">Diesel</option>
                    <option value="kaasu">Kaasu</option>
                    <option value="sahko">Sähkö</option>
                </select>
            </td>
        </tr>
        <tr>
            <td>
                <label for="age">Auton pitoaika:</label>
                <select id="age">
                    <!-- Auton iät täytetään myöhemmin JavaScriptillä -->
                </select>
            </td>
            <td>
                <label for="kilometers">Vuosittainen ajokilometrimäärä:</label>
                <input type="number" id="kilometers" placeholder="km per vuosi">
            </td>
        </tr>
        <tr>
            <td>
                <label for="price">Auton hankintahinta:</label><br>
                <div style="display: flex; align-items: center;">  <!-- Flexbox-rivi -->
                    <input type="number" id="price" placeholder="Hankintahinta €" style="margin-left: 10px;">
                    <div style="margin-right: 20px;">
                        <input type="checkbox" id="used" name="carCondition" value="used">
                        <label for="used">käytetty</label>
                    </div>
                    <div id="modelYearRow" style="display: none;">
                        <label for="modelYear">Vuosimalli:</label>
                        <input type="number" id="modelYear" placeholder="Vuosimalli">
                    </div>
                </div>
            </td>
            <td>
                <label>Kulutustiedot</label>
                <div class="grid-item fuel-inputs" id="fuelConsumption">
                    <br>
                    <label for="fuelConsumption">Polttoaine (l/100km):</label>
                    <input type="number" step="0.1" id="fuelPer100Km" placeholder="Polttoaineen kulutus (l/100 km)">
                </div>
                <div class="grid-item fuel-inputs" id="electricConsumption">
                    <label for="electricConsumption">Sähkö (kWh/100km):</label>
                    <input type="number" step="0.1" id="electricPer100Km" placeholder="Sähkön kulutus (kWh/100 km)">
                </div>
                <div class="grid-item fuel-inputs" id="gasConsumption">
                    <label for="gasConsumption">Kaasu (kg/100km):</label>
                    <input type="number" step="0.1" id="gasPer100Km" placeholder="Kaasun kulutus (kg/100 km)">
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <label for="insurance">Vuosittainen vakuutusmaksu (€):</label>
                <input type="number" id="insurance" placeholder="Vakuutusmaksu €">
                <label for="tax">Vuosittainen ajoneuvovero (€):</label>
                <input type="number" id="tax" placeholder="Ajoneuvovero €">
            </td>
        </tr>
    </table>

    <div style="display: flex; gap: 10px;">
        <button id="calculateButton" onclick="calculate()">Laske</button>
        <button id="addToCompareButton">Lisää vertailuun</button>
    </div>

    <!-- Result section -->
    <div class="result" id="result">Valitse tiedot ja paina nappia nähdäksesi tulokset.</div>

    <!-- New section for displaying saved results -->
    <div class="saved-results" id="savedResults"></div> 
</div>

<!-- Linkki ulkoiseen JavaScript-tiedostoon -->
<script src="javascript.js"></script>
</body>
</html>