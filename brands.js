
// Random background function
function setRandomBackground() {
    const maxImages = 10; // Päivitä tämä vastaamaan taustakuvien määrää
    const randomNumber = Math.floor(Math.random() * maxImages) + 1;
    const imageName = `back_${String(randomNumber).padStart(2, '0')}.jpg`;
    document.body.style.backgroundImage = `url('${imageName}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
}

document.addEventListener("DOMContentLoaded", () => {
    // Näytä layer 3 sekunnin jälkeen
    setTimeout(() => {
        const layer = document.getElementById("comparisonLayer");
        if (layer) {
            layer.classList.remove("hidden");
            layer.classList.add("slide-in");
        }
    }, 3000);

    // Nappulan toiminnallisuus
    const compareButton = document.getElementById("compareButton");
    if (compareButton) {
        compareButton.addEventListener("click", () => {
            window.location.href = "index.html";
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