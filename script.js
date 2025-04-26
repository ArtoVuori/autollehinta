function validateChargingPercentages() {
    const homeCharging = parseFloat(document.getElementById('homeCharging').value) || 0;
    const publicCharging = parseFloat(document.getElementById('publicCharging').value) || 0;
    const fastCharging = parseFloat(document.getElementById('fastCharging').value) || 0;
    
    const total = homeCharging + publicCharging + fastCharging;
    
    if (total !== 100) {
        alert('Latausprosenttien summan tulee olla 100%');
        return false;
    }
    
    return true;
}

document.getElementById('homeCharging').addEventListener('change', validateChargingPercentages);
document.getElementById('publicCharging').addEventListener('change', validateChargingPercentages);
document.getElementById('fastCharging').addEventListener('change', validateChargingPercentages); 