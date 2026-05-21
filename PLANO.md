# Plano de Desenvolvimento — Site Produtos Tio Luiz

Documento operacional para guiar a evolução do site da fase atual (estático) até o painel admin (Firebase).
A cada fase concluída, marcar `[x]` e atualizar a data.

---

## Stack

| Camada | Tecnologia | Status | Observações |
|--------|-----------|--------|-------------|
| **HTML/CSS/JS** | Vanilla (sem framework) | ✅ Em uso | BEM, mobile-first, variáveis CSS |
| **Banco de dados** | Firebase Firestore | 🔜 Fase 2 | Free tier: 50k leituras / 20k escritas por dia |
| **Autenticação** | Firebase Auth | 🔜 Fase 2 | Email/senha — apenas 1 usuário admin |
| **Storage de imagens** | Firebase Storage | 🔜 Fase 5 | Free tier: 1GB armazenamento |
| **Formulários (contato/revendedor)** | Google Apps Script | ✅ Em uso | Mantém — funciona bem para casos simples |
| **Hospedagem** | Vercel ou Netlify | 🔜 Fase 7 | Deploy automático via Git push |
| **Repositório** | GitHub | ✅ Em uso | github.com/lu4nl1m4/produtos-tio-luiz |

**Decisões arquiteturais:**
- Sem etapa de build (nada de Webpack/Vite). Simplicidade > otimização.
- Firebase SDK importado via CDN (sem npm).
- Painel admin é uma página separada em `/admin`, protegida por login Firebase Auth.
- Páginas públicas carregam produtos via JavaScript a partir do Firestore.

---

## Estrutura de pastas (alvo final)

```
.
├── index.html, sobre.html, produtos.html, pet-food.html,
│   onde-encontrar.html, contato.html
│
├── admin/
│   ├── index.html              # Tela de login
│   └── painel.html             # CRUD de produtos
│
├── assets/
│   ├── css/
│   │   ├── styles.css          # Site público (existe)
│   │   └── admin.css           # Visual do painel admin (Fase 4)
│   ├── js/
│   │   ├── script.js                # Global do site (existe)
│   │   ├── form-utils.js            # Toast/validators compartilhados (existe)
│   │   ├── contato.js               # (existe)
│   │   ├── onde-encontrar.js        # (existe)
│   │   ├── produtos.js              # Seletor visual (existe)
│   │   ├── firebase-config.js       # Init Firebase (Fase 2)
│   │   ├── produtos-publico.js      # Renderiza catálogo do Firestore (Fase 3)
│   │   ├── auth.js                  # Login/logout admin (Fase 4)
│   │   └── admin-painel.js          # CRUD do painel (Fase 4)
│   └── images/
│       ├── ui/                 # Logo, hero, ícones (estáticos)
│       └── produtos/           # Imagens de produtos (geridas via Firebase Storage)
│
├── data/
│   └── categorias.json         # Dados estáticos (Fase 3)
│
├── firestore.rules             # Regras do banco (Fase 2)
├── storage.rules               # Regras das imagens (Fase 5)
├── .firebaserc                 # Config do projeto Firebase (Fase 2)
├── PLANO.md                    # Este arquivo
└── README.md
```

---

## Modelo de dados Firestore

Coleção: **`produtos`**

```
documento (id gerado automaticamente):
  nome:                       string   "Feijão Carioca Especial"
  nome_curto:                 string   "Calopsita e Agapornis"  (opcional — badge em pet-cards)
  categoria:                  string   "feijoes" | "arroz" | "milho" | "temperos" | "chas" | "outros" | "pet-aves" | "pet-caes"
  descricao:                  string   "Grãos selecionados premium" (texto curto do card)
  embalagem:                  string   "1 Kg" | "500 g" | "100 ml"
  imagem_url:                 string   "https://firebasestorage..." ou caminho relativo enquanto Storage não está ativo
  ativo:                      boolean  true (false = oculto, sem deletar)
  destaque:                   boolean  false (true = aparece em destaque na home)
  ordem:                      number   1 (controla ordem de exibição dentro da categoria)

  // Campos da página de detalhe (Fase 5) — todos opcionais
  descricao_longa:            string   texto livre/markdown leve, descrição detalhada
  ingredientes:               string   "Trigo enriquecido com ferro, fermento químico..."
  alergenos:                  string   "Contém glúten. Pode conter traços de soja."
  validade:                   string   "12 meses a partir da data de fabricação"
  modo_preparo:               string   texto livre, para produtos que aplicam (chás, lámen, tapioca)
  info_nutricional: {
    // Formato compatível com ANVISA RDC 429/2020 (rótulo nutricional)
    porcao:                   string   "50 g"
    medida_caseira:           string   "1 xícara"  (opcional)
    porcoes_por_embalagem:    number   20
    valores: [
      // Nutrientes obrigatórios na ordem ANVISA, com nome + unidade entre parênteses
      { nome: "Valor energético (kcal)", per100: "360", por_porcao: "180", vd: "9" },
      { nome: "Carboidratos totais (g)", per100: "76",  por_porcao: "38",  vd: "13" },
      { nome: "Açúcares totais (g)",     per100: "5",   por_porcao: "2.5", vd: "-"  },
      { nome: "Açúcares adicionados (g)",per100: "0",   por_porcao: "0",   vd: "0"  },
      { nome: "Proteínas (g)",           per100: "12",  por_porcao: "6",   vd: "12" },
      { nome: "Gorduras totais (g)",     per100: "2",   por_porcao: "1",   vd: "2"  },
      { nome: "Gorduras saturadas (g)",  per100: "0.5", por_porcao: "0.25",vd: "1"  },
      { nome: "Gorduras trans (g)",      per100: "0",   por_porcao: "0",   vd: "**" },
      { nome: "Fibra alimentar (g)",     per100: "4",   por_porcao: "2",   vd: "8"  },
      { nome: "Sódio (mg)",              per100: "5",   por_porcao: "2.5", vd: "0"  }
    ]
  }

  criado_em:                  timestamp
  atualizado_em:              timestamp
```

Categorias vivem na coleção Firestore **`categorias`**:

```
documento (id = slug, ex: "feijoes"):
  nome:              string   "Feijões"
  tipo:              "regular" | "pet"
  ordem:             number   1 (controla a ordem das seções no site público)
  subtitulo:         string   "Variedade e qualidade em cada grão" (regular)
  frase_destaque:    string   "Tradição na Mesa Brasileira" (h3 da seção, regular)
  imagem_secao:      string   caminho/URL da imagem grande da seção (regular)
  criado_em:         timestamp
  atualizado_em:     timestamp
```

`data/categorias.json` permanece no repo como seed inicial e referência de valores padrão — quando a coleção está vazia, o painel admin oferece importação automática.

---

## Fases

### ✅ Fase 0 — Setup do repositório
**Concluída em 2026-05-19**

- [x] `README.md` com documentação do projeto
- [x] `.gitignore` cobrindo SO, editores, `.env`, Firebase futuro
- [x] `.gitattributes` forçando UTF-8 e LF (evita mojibake)
- [x] Push inicial para GitHub

---

### ✅ Fase 1 — Reorganização da estrutura
**Concluída em 2026-05-19**

- [x] `src/` renomeado para `assets/{css,js,images}/`
- [x] `milho e derivados.webp` → `milho-e-derivados.webp` (sem espaços)
- [x] 69 referências atualizadas nos 6 HTMLs
- [x] README refletindo nova estrutura

---

### ✅ Fase 1.5 — Refatoração (consolidar duplicações)
**Concluída em 2026-05-19**

- [x] Toast CSS+JS extraído para `styles.css` e `assets/js/form-utils.js`
- [x] JS inline movido para `contato.js`, `onde-encontrar.js`, `produtos.js`
- [x] Classes utilitárias (`u-text-center`, `hero--compact`, etc) criadas
- [x] Hack de `!important` removido do CSS
- [x] Saldo: -554 linhas líquidas

---

### ✅ Fase 2 — Setup Firebase
**Concluída em 2026-05-19**

- [x] Projeto `site-produtos-tio-luiz` criado no Firebase Console (Plano Spark).
- [x] App Web registrado, config copiada para [`assets/js/firebase-config.js`](assets/js/firebase-config.js).
- [x] Authentication habilitado (Email/Password) e usuário admin criado.
- [x] Firestore Database habilitado (modo produção, região `southamerica-east1`).
- [x] `firestore.rules` publicado no Console — leitura pública em `produtos`, escrita só autenticado, deny default.
- [x] SDK Firebase v10.14.1 (CDN, modular) adicionado em [`index.html`](index.html), [`produtos.html`](produtos.html), [`pet-food.html`](pet-food.html) via `<script type="module">`.
- [x] Páginas estáticas (sobre/contato/onde-encontrar) não carregam Firebase — não precisam.
- [x] Validado localmente via `python -m http.server` — sem erros no console.

**Adiado para Fase 5:** habilitar Storage (exige plano Blaze). Alternativas serão avaliadas: Blaze (free tier 5GB/30k downloads), Cloudinary, ou sem upload.

---

### ✅ Fase 3 — Migração de produtos do HTML para Firestore
**Concluída em 2026-05-19**

- [x] Modelo de dados definido (ver "Modelo de dados" acima — incluído `nome_curto` para pet-cards).
- [x] `data/produtos-seed.json` criado com os 30 produtos extraídos do HTML (8 categorias).
- [x] `data/categorias.json` criado com metadados de categorias (id, nome, tipo, ordem).
- [x] Página one-shot `admin/seed.html` populou o Firestore via batch write (deletada após uso).
- [x] [`assets/js/produtos-publico.js`](assets/js/produtos-publico.js): fetch único da coleção `produtos`, filtra/ordena no client, popula containers por `data-category`. Evita queries compostas (sem necessidade de índice no Firestore).
- [x] [`produtos.html`](produtos.html): 6 blocos hardcoded substituídos por `<div class="grid grid--2 product-cards" data-category="...">` vazios.
- [x] [`pet-food.html`](pet-food.html): 2 blocos hardcoded substituídos por `<div class="grid grid--3 pet-cards" data-category="...">` vazios.
- [x] [`assets/js/produtos.js`](assets/js/produtos.js) refatorado para event delegation no document — funciona com cards renderizados async.
- [x] [`index.html`](index.html): tag do firebase-config removida (home não tem produtos dinâmicos no MVP — pode receber seção "destaques" futuramente usando o campo `destaque`).
- [x] Validado localmente: cards renderizam, seletor visual troca imagem de destaque, sem erros no console.

**Pendência técnica conhecida:** algumas imagens em `assets/images/produtos/*.webp` referenciadas no seed ainda podem não existir (anotado no PLANO original) — produtos-publico.js cai para `todos_os_produtos.webp` via `onerror`. Resolver na Fase 5 (Storage) ou copiando os arquivos manualmente.

---

### ✅ Fase 4 — Painel admin (CRUD)
**Concluída em 2026-05-20**

- [x] [`admin/index.html`](admin/index.html): tela de login Bootstrap 5 (CDN), valida via Firebase Auth com mensagens de erro claras (e-mail/senha inválidos).
- [x] [`admin/painel.html`](admin/painel.html): dashboard com tabela responsiva, filtro por categoria + busca por nome, modal de edição.
- [x] [`assets/js/auth.js`](assets/js/auth.js): `login`, `logout`, `getCurrentUser`, `requireAuth` (redireciona se não autenticado), `watchAuth` (detecta logout em outra aba).
- [x] [`assets/js/admin-painel.js`](assets/js/admin-painel.js): listar/adicionar/editar/remover produtos; toggles inline em "ativo" e "destaque" com persistência imediata; toasts de feedback.
- [x] [`assets/css/admin.css`](assets/css/admin.css): tweaks sobre Bootstrap mantendo identidade do site (verde Tio Luiz, laranja Pet Food).
- [x] Validado: mudanças no painel refletem instantaneamente em produtos.html / pet-food.html.

---

### ✅ Fase 5 — Páginas de detalhe + categorias dinâmicas + ANVISA
**Concluída em 2026-05-20**

Fase ampla que cobriu três frentes interligadas:

**1. Páginas de detalhe do produto** (inspirado em [marata.com.br](https://marata.com.br/produto/farinha-de-trigo-com-fermento-marata-1-kg/)):
- [x] Modelo Firestore estendido: `descricao_longa`, `ingredientes`, `alergenos`, `validade`, `modo_preparo`, `info_nutricional`.
- [x] Modal do painel admin com tabs (Básico / Detalhes / Nutricional).
- [x] Página [`produto.html`](produto.html) + [`produto-detalhe.js`](assets/js/produto-detalhe.js): lê `?id=XXX`, busca doc no Firestore, renderiza com seções condicionais (esconde o que está vazio).
- [x] Botão "+ Detalhes" nos cards (regular + pet) apontando para `produto.html?id={docId}`.

**2. Tabela nutricional ANVISA (RDC 429/2020):**
- [x] Estrutura `info_nutricional`: `{ porcao, medida_caseira, porcoes_por_embalagem, valores: [{ nome, per100, por_porcao, vd }] }`.
- [x] Tabela com 4 colunas no formato ANVISA (Nutriente | por 100g/mL | por porção | %VD).
- [x] Botão **⚡ Preencher nutrientes ANVISA** preenche as 10 linhas obrigatórias na ordem correta.
- [x] Render no `produto.html` segue layout oficial (header preto, rodapé com asteriscos explicativos).
- [x] Backward compat: dados no formato antigo (`{ nome, quantidade, vd }`) continuam funcionando.

**3. Categorias dinâmicas (coleção Firestore + UI admin):**
- [x] Nova coleção `categorias` no Firestore (regras publicadas).
- [x] Nova página [`admin/categorias.html`](admin/categorias.html) + [`admin-categorias.js`](assets/js/admin-categorias.js) com CRUD completo.
- [x] Sub-nav no admin: Produtos | Categorias.
- [x] Auto-importação inicial de `data/categorias.json` quando a coleção está vazia.
- [x] Botão **⚡ Completar campos padrões** preenche subtitulo/frase_destaque/imagem_secao nas 8 categorias originais sem sobrescrever customizações.
- [x] Modelo estendido: `{ id, nome, tipo, ordem, subtitulo, frase_destaque, imagem_secao, criado_em, atualizado_em }`.

**4. Seções totalmente dinâmicas no site público:**
- [x] [`produtos.html`](produtos.html) e [`pet-food.html`](pet-food.html) viraram shells com `<main id="secoes-container" data-tipo="regular|pet">`.
- [x] [`produtos-publico.js`](assets/js/produtos-publico.js) renderiza seções inteiras na ordem do `ordem` da categoria, alternando esquerda/direita da imagem e fundo claro/branco.
- [x] Criar categoria nova no painel → aparece automaticamente no site público (sem editar HTML).
- [x] Alterar ordem no painel → seções reordenam no site público.
- [x] Workaround para IntersectionObserver: força `.visible` em elementos `.fade-in` inseridos dinamicamente.

**5. Badge "★ DESTAQUE":**
- [x] Cards (regular + pet) com `destaque=true` mostram selo dourado no canto superior direito.

**6. UX drag-and-drop (SortableJS via CDN):**
- [x] Categorias: drag pelo handle `⋮⋮` reordena. Separadas em duas tabelas (regular | pet) — ordens independentes entre tipos.
- [x] Produtos: layout agrupado por categoria em mini-tabelas (Categorias Regulares → cada categoria com seus produtos → Categorias Pet → idem). Drag dentro de cada mini-tabela reordena produtos na categoria.
- [x] Campo "ordem" sumiu dos modais — ordem é só pelo drag. Ao criar, vai pro fim do grupo/categoria automaticamente.
- [x] Filtro por categoria mostra só a seção correspondente; busca filtra produtos dentro das mini-tabelas visíveis.

**Critério de pronto atendido:**
- CRUD de produtos e categorias 100% via painel admin.
- Mudanças refletem instantaneamente no site público sem editar HTML.
- Página de detalhe renderiza informação completa por produto, incluindo tabela ANVISA.
- Reordenação por drag funciona para categorias e produtos.

---

### ✅ Fase 6 — Upload de imagens (Cloudinary)
**Concluída em 2026-05-20**

Optamos pelo **Cloudinary free tier** em vez do Firebase Storage (que exige plano Blaze). Free tier: 25 GB armazenamento + 25 GB tráfego/mês + transformações de imagem na URL, sem cartão.

- [x] Conta Cloudinary criada (cloud_name: `dwy3jzhyz`).
- [x] Upload preset `tio-luiz-produtos` (unsigned, restrito a jpg/png/webp + 2 MB + pasta `produtos-tio-luiz`).
- [x] [`assets/js/cloudinary-upload.js`](assets/js/cloudinary-upload.js): helper compartilhado com upload via `XMLHttpRequest` (suporta progresso) + validação de formato e tamanho no client.
- [x] Modal de produto ([`admin/painel.html`](admin/painel.html) + [`admin-painel.js`](assets/js/admin-painel.js)): file input + thumb preview 80×80 + status do upload + URL preenchida automaticamente. Campo URL ainda aceita paste manual para URLs externas.
- [x] Modal de categoria ([`admin/categorias.html`](admin/categorias.html) + [`admin-categorias.js`](assets/js/admin-categorias.js)): mesma UX pro campo `imagem_secao`.
- [x] Imagens novas servidas direto do CDN Cloudinary (`https://res.cloudinary.com/dwy3jzhyz/...`).
- [x] `storage.rules` permanece no repo para referência futura caso a gente migre pro Firebase Storage.

- [x] `f_auto,q_auto` injetado automaticamente pelo `cloudinary-upload.js` em toda URL retornada (`/image/upload/f_auto,q_auto/...`) — formato e qualidade otimizados sob demanda pelo CDN, sem mexer no preset.
- [x] Migração one-shot das imagens locais para Cloudinary (via `admin/migrate-imagens.html`, depois deletada): 19 produtos+categorias migrados, 16 produtos sem arquivo local (subpasta `assets/images/produtos/` que nunca existiu) ficaram com `imagem_url=""` e precisam de upload manual conforme as fotos reais chegarem.
- [x] Fix em `produtos.js`: produtos sem `imagem_url` ainda respondem ao clique no card (highlight + swap pra imagem fallback).

**Adiado / não feito:**
- Compressão extra no front-end (canvas API) — desnecessária porque `f_auto,q_auto` já cuida disso.

---

### ✅ Fase 6.5 — Cards da home dinâmicos
**Concluída em 2026-05-20**

A seção "Nossos Produtos" da [`index.html`](index.html) era estática (6 cards hardcoded com links inconsistentes — `produtos.html#graos` quando a section é `#feijoes`, `arroz` faltava da listagem). Tornamos totalmente dinâmica, gerenciada pelo admin.

- [x] Nova coleção Firestore `home_cards` com modelo `{ titulo, texto, imagem_url, link, tipo: "normal"|"cta", ativo, ordem, criado_em, atualizado_em }`.
- [x] [`firestore.rules`](firestore.rules): regras para `/home_cards` (leitura pública, escrita só autenticado).
- [x] Nova página [`admin/home.html`](admin/home.html) + [`admin-home.js`](assets/js/admin-home.js) com CRUD completo, drag-and-drop pra reordenar, upload de imagem via Cloudinary.
- [x] Tipo `cta` renderiza como card gradiente "Ver Todos →" — usuário controla quais cards CTA existem e onde.
- [x] Sub-nav admin reordenada e estendida: **Home | Categorias | Produtos**.
- [x] Botão "Importar das categorias" gera os cards iniciais a partir das 6 categorias regulares + 1 CTA (one-shot, depois CRUD livre).
- [x] [`home-categorias.js`](assets/js/home-categorias.js) lê `home_cards` ativos e ordenados; **fallback** automático pras categorias regulares se a coleção estiver vazia (site nunca fica em branco).
- [x] Fix em `produtos-publico.js`: após renderizar seções, faz scroll suave pro hash da URL (resolve race condition de navegação tipo `produtos.html#feijoes` vinda da home).

---

### ✅ Fase 7 — Performance + Polimento
**Concluída em 2026-05-20**

Auditoria de performance + correções aplicadas. Antes do trabalho, a home pet-food carregava 16 MB de GIF + index/sobre carregavam ~2 MB de PNGs não otimizados; Google Fonts via `@import` bloqueava render; cada navegação refazia fetch Firestore.

**Imagens (maior ganho):**
- [x] `pet_foot_aves.gif` (16 MB), `hero_banner_*.png` (748 KB), `mesa.png` (964 KB), `tradicao.png` (934 KB) movidos pro Cloudinary com `f_auto,q_auto` — o GIF agora é servido como animated WebP/AVIF quando suportado (~1 MB). Arquivos locais deletados (~18 MB recuperados).
- [x] `loading="lazy" decoding="async"` em imagens abaixo da dobra (3 estáticas + cards renderizados dinamicamente em produtos.html/pet-food.html/index.html via produtos-publico.js / home-categorias.js).
- [x] `fetchpriority="high"` nas 3 imagens hero LCP (index, pet-food, sobre).

**Bundle / network:**
- [x] `@import` Google Fonts removido do CSS → `<link rel="stylesheet">` no `<head>` (não bloqueia mais o render do CSS).
- [x] `<link rel="preconnect">` para `fonts.googleapis.com`, `fonts.gstatic.com`, `firestore.googleapis.com`, `res.cloudinary.com`.
- [x] [`firebase-config.js`](assets/js/firebase-config.js) público slim: só importa Firestore. Auth e Storage SDKs (~80 KB) não baixam mais nas páginas públicas — [`auth.js`](assets/js/auth.js) cria sua própria instância usando `app` exportado.

**Cache:**
- [x] Novo [`assets/js/cache.js`](assets/js/cache.js): helper `cached(key, ttl, factory)` em sessionStorage. Aplicado em produtos-publico, home-categorias, produto-detalhe. TTLs: categorias/home_cards 10 min, produtos 5 min. Navegação interna (home → produtos → produto) deixa de refazer fetches.

**JS:**
- [x] `script.js`: scroll listeners passaram a usar `requestAnimationFrame` throttle (`rafThrottle`) + `{ passive: true }`. Antes disparavam ~60×/segundo forçando reflow.
- [x] `console.log` de boot removido.

**Meta / SEO:**
- [x] Open Graph + Twitter Card meta tags em todas as 7 páginas públicas (preview no WhatsApp/Facebook).
- [x] `<link rel="icon">` apontando pra `logo.webp` em todas (favicon placeholder até ter um `.ico` dedicado).

**Pendências da auditoria adiadas / não-bloqueantes:**
- `width`/`height` anti-CLS nas imagens — CSS já dimensiona; revisitar se Lighthouse acusar score CLS ruim em produção.
- Extração dos SVGs sociais duplicados pra sprite externo — ganho real ~5 KB após gzip, esforço alto, baixa prioridade.
- Substituir URLs placeholder das redes sociais (`instagram.com`, `facebook.com`) pelas reais — depende do usuário ter os perfis.
- Remover handlers `onmouseover`/`onmouseout` inline em [contato.html](contato.html) — refactor pequeno, pendente.
- `sitemap.xml` + `robots.txt` — fará mais sentido após o deploy (Fase 8) com a URL final.

---

### ✅ Fase 7.5 — Features pós-perf
**Concluídas em 2026-05-21**

Várias frentes adicionadas após a auditoria de perf, antes do deploy.

**Mobile polish (5 ajustes):**
- [x] Ícones sociais do footer: 40px → 44px (touch target adequado)
- [x] Drag handles do admin (`⋮⋮`): min 44×44px + verde em mobile + `touch-action: none`
- [x] Tabela nutricional ANVISA: font + padding reduzidos em <480px (cabe sem scroll)
- [x] Hero `.hero` em mobile: 500px → 380px (`.hero--compact` → 280px)
- [x] Inputs já estavam em 16px → sem iOS auto-zoom

**Receitas (nova coleção + páginas + admin):**
- [x] Coleção Firestore `receitas` com modelo `{ titulo, descricao_curta, tempo, porcoes, dificuldade, ingredientes, modo_preparo, imagem_url, ativa, destaque, ordem }`.
- [x] `firestore.rules`: regras `/receitas` (publicadas no Console).
- [x] [`admin/receitas.html`](admin/receitas.html) + [`admin-receitas.js`](assets/js/admin-receitas.js): CRUD completo (drag-and-drop, busca, modal com 2 tabs Básico/Preparo, upload Cloudinary).
- [x] Botão "Importar 3 exemplos" pré-popula receitas didáticas (Feijão Carioca, Cuscuz Nordestino, Tapioca de Queijo).
- [x] [`receitas.html`](receitas.html) (listagem) + [`receita.html`](receita.html) (detalhe `?id=XXX`) + JS módulos correspondentes.
- [x] Detalhe usa ícones SVG outline (estilo Feather/Lucide) pra meta (tempo/porções/dificuldade) em verde.
- [x] Nav público (7 páginas) e sub-nav admin (4 páginas) atualizados com link "Receitas".

**Tema laranja na linha pet (produto.html):**
- [x] CSS var `--detail-accent` (verde por default, laranja `#ff6f00` quando `body.theme-pet`).
- [x] [`produto-detalhe.js`](assets/js/produto-detalhe.js) aplica `theme-pet` no body se a categoria for tipo "pet". Título h1, h2 das seções, breadcrumb, botão outline ficam laranja em produtos pet — verde nos demais.

**Banners das páginas (admin/banners + dinâmico no público):**
- [x] Coleção `banners` (doc id = slug da página: home, sobre, produtos, pet-food, receitas, onde-encontrar, contato).
- [x] `firestore.rules`: `/banners`.
- [x] [`admin/banners.html`](admin/banners.html) + [`admin-banners.js`](assets/js/admin-banners.js): tabela com 7 banners fixos (não permite criar/deletar — apenas editar), modal com upload Cloudinary.
- [x] Botão "Importar dos defaults" semeia com os valores atuais do HTML estático.
- [x] [`banners-publico.js`](assets/js/banners-publico.js) procura `[data-page-banner]` no hero da página atual, busca o doc Firestore correspondente e substitui `.hero__background`, `.hero__title`, `.hero__subtitle`. **Fallback** automático pro conteúdo estático se o banner não estiver configurado.
- [x] Todas as 7 páginas com hero ganharam `data-page-banner="slug"` + tag `<script type="module">` pro banners-publico.js.

**Nav cleanup (corrigido após adicionar "Receitas"):**
- [x] `.nav__list` gap reduzido (2rem → 1.25rem) e `.nav__link` com `white-space: nowrap` + padding menor.
- [x] Breakpoint mobile do menu hamburger subiu de 768px → **1024px** (acomoda 7 itens + botão Pet Food sem estourar em laptops pequenos / tablets).

---

### 🔜 Fase 8 — Deploy

**Objetivo:** site no ar com URL pública e deploy automático.

**Passos:**
1. Conectar repositório GitHub à Vercel (ou Netlify) — interface gráfica, 2 minutos.
2. Configurar variáveis de ambiente (se houver) — Firebase config não é segredo, mas vale conferir.
3. Testar a URL `.vercel.app` / `.netlify.app`.
4. (Opcional) Configurar domínio próprio (ex: `tioluiz.com.br`).
5. Atualizar README com a URL final.

**Critério de pronto:**
- Push na `main` faz deploy automático.
- Site acessível pela URL pública.

---

## Pendências técnicas conhecidas (não-bloqueantes)

Detectadas na análise inicial. Não impedem progresso das fases, mas ficam aqui pra não esquecer:

- `pet_foot_aves.gif` tem typo no nome (deveria ser `food`) — renomear quando atualizar a referência.
- Arquivo `produtos.html` referencia subpasta `assets/images/produtos/*.webp` que não existe — será resolvido na Fase 3 (produtos virão do Firestore).
- CSS tem `--color-secondary-dark` idêntico a `--color-primary` (linha 18 do styles.css) — possível redundância.

---

## Regras de trabalho

- Cada fase tem um commit (ou poucos commits) próprio, com mensagem descritiva.
- Testar visualmente no navegador antes de fechar a fase.
- Atualizar este `PLANO.md` ao fim de cada fase (marcar `[x]` e adicionar data).
- Não pular para a fase seguinte sem o "critério de pronto" da atual atendido.
- Mudanças destrutivas (deletar branches, force push, alterar regras do Firebase) sempre confirmar antes.
