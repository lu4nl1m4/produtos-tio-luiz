// ===================================
// PRODUTOS — seletor de cards que troca a imagem do destaque
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const productCards = document.querySelectorAll('.product-card');
    const fallbackImage = 'assets/images/todos_os_produtos.webp';

    productCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            const imagePath = this.dataset.image;

            document.querySelectorAll(`[data-category="${category}"]`).forEach(c => {
                c.classList.remove('active');
            });
            this.classList.add('active');

            const imageElement = document.getElementById(`${category}-image`);
            if (!imageElement) return;

            imageElement.style.opacity = '0';
            setTimeout(() => {
                const img = new Image();
                img.onload = function() {
                    imageElement.src = imagePath;
                    imageElement.alt = card.querySelector('.card__title').textContent;
                    imageElement.style.opacity = '1';
                };
                img.onerror = function() {
                    imageElement.src = fallbackImage;
                    imageElement.alt = card.querySelector('.card__title').textContent;
                    imageElement.style.opacity = '1';
                };
                img.src = imagePath;
            }, 300);
        });
    });
});
