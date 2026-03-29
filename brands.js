// Random background function
function setRandomBackground() {
    try {
        const maxImages = 10;
        const randomNumber = Math.floor(Math.random() * maxImages) + 1;
        const imageName = `/back_${String(randomNumber).padStart(2, '0')}.jpg`;
        document.body.style.backgroundImage = `url('${imageName}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
        
        // Lisätään debug-tulostus konsoliin
        console.log('Taustakuva asetettu:', imageName);
    } catch (error) {
        console.error('Virhe taustakuvan asettamisessa:', error);
    }
}

// Kutsu setRandomBackground-funktiota sivun latautuessa
document.addEventListener('DOMContentLoaded', setRandomBackground);

/** Merkkisivun oikean reunan toast (Vertaa tästä). false = ei näytetä automaattisesti. */
const SHOW_BRAND_COMPARISON_TOAST = false;

document.addEventListener("DOMContentLoaded", () => {
    if (SHOW_BRAND_COMPARISON_TOAST) {
        setTimeout(() => {
            const layer = document.getElementById("comparisonLayer");
            if (layer) {
                layer.classList.remove("hidden");
                layer.classList.add("slide-in");
            }
        }, 3000);
    }

    // Nappulan toiminnallisuus
    const compareButton = document.getElementById("compareButton");
    if (compareButton) {
        compareButton.addEventListener("click", () => {
            window.location.href = "/";
        });
    }

    // Poistoruksi toiminnallisuus
    const closeLayer = document.getElementById("closeLayer");
    if (closeLayer) {
        closeLayer.addEventListener("click", () => {
            const layer = document.getElementById("comparisonLayer");
            if (layer) {
                // Poista näkyvä luokka ja lisää hidden-luokka
                layer.classList.remove("slide-in");
                layer.classList.add("hidden");
            }
        });
    }
});