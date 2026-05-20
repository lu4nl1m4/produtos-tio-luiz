# Produtos Tio Luiz

Site institucional da **Distribuidora Tio Luiz**, apresentando o portfólio de produtos alimentícios, linha pet food, pontos de venda e canais de contato.

> *"Qualidade e tradição em alimentos para sua família feliz."*

---

## Sobre o projeto

Site estático multi-página construído com HTML, CSS e JavaScript puro, sem dependências externas nem etapa de build. Cobre as seguintes seções:

- **Home** — apresentação institucional e destaques
- **Sobre nós** — história e valores da empresa
- **Produtos** — catálogo completo (grãos, milho e derivados, chás, molhos, etc.)
- **Linha Pet Food** — produtos para animais
- **Onde encontrar** — pontos de venda e formulário para revendedores
- **Contato** — formulário com validação e canais diretos (WhatsApp, telefone, email)

---

## Stack

- HTML5 semântico
- CSS3 com variáveis customizadas, padrão BEM e abordagem mobile-first
- JavaScript vanilla (ES6+)
- Formulários integrados via Google Apps Script

Sem frameworks, sem build, sem `node_modules`.

---

## Estrutura do projeto

```
.
├── index.html              # Home
├── sobre.html              # Sobre a empresa
├── produtos.html           # Catálogo de produtos
├── pet-food.html           # Linha pet food
├── onde-encontrar.html     # Pontos de venda + revendedores
├── contato.html            # Formulário e canais de contato
│
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos globais
│   ├── js/
│   │   └── script.js       # Comportamentos globais
│   └── images/             # Imagens do site
│
├── .gitignore
├── .gitattributes
└── README.md
```

---

## Como rodar localmente

Como é um site estático puro, basta abrir o `index.html` no navegador.

Porém, **alguns recursos exigem um servidor HTTP local** (envio do formulário de contato, comportamento correto de caminhos relativos, etc). Recomenda-se:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx http-server .

# PHP
php -S localhost:8000
```

Depois, acesse `http://localhost:8000` no navegador.

---

## Deploy

O site é hospedado no **Vercel/Netlify** (a configurar), com deploy automático a cada push na branch `main`.

---

## Roadmap

Próximas evoluções planejadas:

- [x] **Reorganização de pastas** — migrado `src/` para `assets/` com separação em `css/`, `js/`, `images/`
- [ ] **Painel administrativo** — área `/admin` com login (Firebase Auth) para gerenciar produtos do catálogo
- [ ] **Banco de dados** — produtos passam a ser carregados dinamicamente do Firestore
- [ ] **Upload de imagens** — gerenciamento de imagens via Firebase Storage
- [ ] **SEO** — Open Graph, sitemap, canonical, favicon
- [ ] **Performance** — lazy loading de imagens, preload de fontes
- [ ] **Acessibilidade** — substituir handlers inline por CSS, melhorar contraste e labels

---

## Contato

**Distribuidora Tio Luiz**
- 📧 sac@distribuidoratioluiz.com.br
- 📞 (79) 3431-0068
- 📱 (79) 99898-5386
- ⏰ Seg-Sex: 8h às 12h | 14h às 18h

---

© Produtos Tio Luiz. Todos os direitos reservados.
