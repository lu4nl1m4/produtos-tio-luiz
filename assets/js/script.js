// ===================================
// PRODUTOS TIO LUIZ - JAVASCRIPT
// ===================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // ===== MOBILE MENU TOGGLE =====
    const navToggle = document.getElementById('navToggle');
    const navList = document.getElementById('navList');

    if (navToggle && navList) {
        navToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
            
            // Animate toggle bars
            const bars = this.querySelectorAll('.nav__toggle-bar');
            bars[0].style.transform = navList.classList.contains('active')
                ? 'rotate(-45deg) translate(-5px, 6px)'
                : '';
            bars[1].style.opacity = navList.classList.contains('active') ? '0' : '1';
            bars[2].style.transform = navList.classList.contains('active')
                ? 'rotate(45deg) translate(-5px, -6px)'
                : '';
        });

        // Close menu when clicking on a link
        const navLinks = navList.querySelectorAll('.nav__link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navList.classList.remove('active');
                const bars = navToggle.querySelectorAll('.nav__toggle-bar');
                bars[0].style.transform = '';
                bars[1].style.opacity = '1';
                bars[2].style.transform = '';
            });
        });
    }

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Only prevent default if it's a valid ID selector
            if (href && href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ===== ACTIVE NAVIGATION HIGHLIGHTING =====
    // Destaque automático do link ativo com base na página atual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinksAll = document.querySelectorAll('.nav__link');

    navLinksAll.forEach(link => {
        const href = link.getAttribute('href');
        // Remove qualquer active existente
        link.classList.remove('nav__link--active');
        // Compara o href do link com a página atual
        if (href === currentPage || 
            (currentPage === '' && href === 'index.html') ||
            (currentPage === '/' && href === 'index.html')) {
            link.classList.add('nav__link--active');
        }
    });

    // ===== INTERNAL PAGE PREFETCH =====
    // Como o site e multi-pagina, cada menu abre outro HTML. Prefetch deixa os
    // documentos principais quentes no cache e diminui o flash entre cliques.
    const prefetchedPages = new Set();

    function getPrefetchHref(rawHref) {
        if (!rawHref) return null;

        let url;
        try {
            url = new URL(rawHref, window.location.href);
        } catch {
            return null;
        }

        if (url.origin !== window.location.origin) return null;
        if (url.search) return null;
        if (url.hash && url.pathname === window.location.pathname) return null;
        if (!url.pathname.endsWith('.html') && url.pathname !== '/') return null;

        url.hash = '';
        return url.href;
    }

    function prefetchPage(rawHref) {
        const href = getPrefetchHref(rawHref);
        if (!href || prefetchedPages.has(href)) return;

        prefetchedPages.add(href);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'document';
        link.href = href;
        document.head.appendChild(link);
    }

    const schedulePrefetch = window.requestIdleCallback || function(callback) {
        return window.setTimeout(callback, 600);
    };

    schedulePrefetch(() => {
        document.querySelectorAll('.nav__link[href], .footer__link[href], .hero__cta a[href], .btn-group--centered a[href]')
            .forEach(link => prefetchPage(link.getAttribute('href')));
    });

    document.addEventListener('pointerover', (event) => {
        const link = event.target.closest && event.target.closest('a[href]');
        if (link) prefetchPage(link.getAttribute('href'));
    }, { passive: true });

    document.addEventListener('touchstart', (event) => {
        const link = event.target.closest && event.target.closest('a[href]');
        if (link) prefetchPage(link.getAttribute('href'));
    }, { passive: true });

    // Highlight por scroll (para páginas com âncoras/seções)
    const sections = document.querySelectorAll('section[id]');
function highlightNavigation() {
    const scrollY = window.pageYOffset;
    let foundSection = false;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinksAll.forEach(link => {
                if (link.getAttribute('href') === `#${sectionId}`) {
                    foundSection = true;
                }
            });
        }
    });

    // Só altera os destaques se alguma âncora do menu foi encontrada
    if (foundSection) {
        navLinksAll.forEach(link => {
            link.classList.remove('nav__link--active');
        });

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinksAll.forEach(link => {
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('nav__link--active');
                    }
                });
            }
        });
    }
    // Se nenhuma seção com âncora no menu foi encontrada, mantém o destaque original da página
}

    // Throttle helper via requestAnimationFrame — coalesce scroll events em no máximo 1/frame.
    function rafThrottle(fn) {
        let pending = false;
        return function () {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                fn();
            });
        };
    }

    if (sections.length > 0) {
        window.addEventListener('scroll', rafThrottle(highlightNavigation), { passive: true });
    }

    // ===== HEADER SCROLL EFFECT =====
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', rafThrottle(() => {
            header.style.boxShadow = window.pageYOffset > 100 ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '';
        }), { passive: true });
    }

    // ===== FADE IN ON SCROLL - DISABLED FOR PERFORMANCE TEST =====
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        element.classList.add('visible');
    });

    // ===== FORM VALIDATION - REMOVIDA =====
    // A validação do formulário agora está no HTML inline com toasts personalizados
    // Código antigo com alert() foi removido para evitar conflito

    // ===== PRODUCT FILTER (if on products page) =====
    const filterButtons = document.querySelectorAll('[data-filter]');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');

                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Filter products
                const products = document.querySelectorAll('[data-category]');
                products.forEach(product => {
                    if (filter === 'all' || product.getAttribute('data-category') === filter) {
                        product.style.display = 'block';
                        setTimeout(() => {
                            product.style.opacity = '1';
                            product.style.transform = 'scale(1)';
                        }, 10);
                    } else {
                        product.style.opacity = '0';
                        product.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            product.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // === CURRENT YEAR ===
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

});
