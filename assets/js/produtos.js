// Seletor visual: clicar num product-card troca a imagem do destaque da categoria.
// Usa delegação no document porque os cards são renderizados async por produtos-publico.js.

const FALLBACK_IMAGE = 'assets/images/todos_os_produtos.webp';

document.addEventListener('click', function (event) {
    // Permite navegação dos links internos do card (ex: "+ Detalhes") sem disparar o swap.
    if (event.target.closest('[data-no-card-action]')) return;

    const card = event.target.closest('.product-card');
    if (!card) return;

    const category = card.dataset.category;
    const imagePath = card.dataset.image;
    if (!category || !imagePath) return;

    document.querySelectorAll(`.product-card[data-category="${category}"]`).forEach(c => {
        c.classList.remove('active');
    });
    card.classList.add('active');

    const imageElement = document.getElementById(`${category}-image`);
    if (!imageElement) return;

    const titleEl = card.querySelector('.card__title');
    const alt = titleEl ? titleEl.textContent : '';

    imageElement.style.opacity = '0';
    setTimeout(() => {
        const img = new Image();
        img.onload = function () {
            imageElement.src = imagePath;
            imageElement.alt = alt;
            imageElement.style.opacity = '1';
        };
        img.onerror = function () {
            imageElement.src = FALLBACK_IMAGE;
            imageElement.alt = alt;
            imageElement.style.opacity = '1';
        };
        img.src = imagePath;
    }, 300);
});
