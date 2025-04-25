// Lisää footer kaikille sivuille
document.addEventListener('DOMContentLoaded', function() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
        <div class="footer-links">
            <a href="./blog_01.html">Kannattaako auto päivittää uudempaan?</a>
            <span class="separator">|</span>
            <a href="./blog_02.html">Yksityisleasingin kannattavuus vs. auton omistaminen</a>
            <span class="separator">|</span>
            <a href="./audi.html">Audi</a>
            <span class="separator">|</span>
            <a href="./byd.html">BYD</a>
            <span class="separator">|</span>
            <a href="./bmw.html">BMW</a>
            <span class="separator">|</span>
            <a href="./chevrolet.html">Chevrolet</a>
            <span class="separator">|</span>
            <a href="./cupra.html">Cupra</a>
            <span class="separator">|</span>
            <a href="./ford.html">Ford</a>
            <span class="separator">|</span>
            <a href="./hyundai.html">Hyundai</a>
            <span class="separator">|</span>
            <a href="./jaguar.html">Jaguar</a>
            <span class="separator">|</span>
            <a href="./kia.html">Kia</a>
            <span class="separator">|</span>
            <a href="./mercedes.html">Mercedes-Benz</a>
            <span class="separator">|</span>
            <a href="./nissan.html">Nissan</a>
            <span class="separator">|</span>
            <a href="./porsche.html">Porsche</a>
            <span class="separator">|</span>
            <a href="./renault.html">Renault</a>
            <span class="separator">|</span>
            <a href="./smart.html">Smart</a>
            <span class="separator">|</span>
            <a href="./tesla.html">Tesla</a>
            <span class="separator">|</span>
            <a href="./toyota.html">Toyota</a>
            <span class="separator">|</span>
            <a href="./vw.html">Volkswagen</a>
            <span class="separator">|</span>
            <a href="./volvo.html">Volvo</a>
            <span class="separator">|</span>
            <a href="./terms_explanations.html">Termit</a>
            <span class="separator">|</span>
            <a href="./terms.html">Käyttöehdot</a>
            <span class="separator">|</span>
            <a href="mailto:admin@autollehinta.fi">Ota yhteyttä</a>
        </div>
    `;
    document.body.appendChild(footer);
}); 