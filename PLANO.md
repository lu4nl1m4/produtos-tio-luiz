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
  nome:           string  "Feijão Carioca Especial"
  nome_curto:     string  "Calopsita e Agapornis"  (opcional — usado em pet-cards como badge)
  categoria:      string  "feijoes" | "arroz" | "milho" | "temperos" | "chas" | "outros" | "pet-aves" | "pet-caes"
  descricao:      string  "Grãos selecionados premium"
  embalagem:      string  "1 Kg" | "500 g" | "100 ml"
  imagem_url:     string  "https://firebasestorage..." ou caminho relativo enquanto Storage não está ativo
  ativo:          boolean true   (false = oculto, sem deletar)
  destaque:       boolean false  (true = aparece em destaque na home)
  ordem:          number  1      (controla ordem de exibição dentro da categoria)
  criado_em:      timestamp
  atualizado_em:  timestamp
```

Categorias e tipos ficam em `data/categorias.json` (estáticos, raramente mudam).

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

### 🔜 Fase 4 — Painel admin (CRUD)

**Objetivo:** interface gráfica para gerenciar produtos sem mexer no Firestore manualmente.

**Passos:**
1. Criar `admin/index.html` com formulário de login (email + senha).
2. Criar `admin/painel.html` protegido por auth (redireciona pra login se não autenticado).
3. Criar `assets/js/auth.js` (login, logout, verificação de sessão).
4. Criar `assets/js/admin-painel.js`:
   - Listar todos os produtos em tabela
   - Botão "Adicionar produto" com formulário
   - Botão "Editar" em cada linha
   - Botão "Remover" com confirmação
   - Toggle "ativo/inativo" e "destaque/normal"
5. Criar `assets/css/admin.css` (visual diferente do site público, mais "dashboard").

**Critério de pronto:**
- Login funciona e bloqueia acesso sem credenciais.
- Adicionar/editar/remover produto no painel reflete nas páginas públicas em segundos.

---

### 🔜 Fase 5 — Upload de imagens (Firebase Storage)

**Objetivo:** subir imagens de produtos pelo painel admin, sem mexer no Git.

**Passos:**
1. Adicionar `<input type="file">` no formulário de produto.
2. Comprimir imagem no front-end antes de subir (canvas API) — limite 500KB.
3. Subir via Firebase Storage, salvar URL pública no campo `imagem_url`.
4. Mostrar preview da imagem atual ao editar.
5. Criar `storage.rules`:
   - Leitura pública.
   - Escrita só para autenticado.

**Critério de pronto:**
- Subir uma imagem nova pelo painel atualiza o produto e mostra no site público.

---

### 🔜 Fase 6 — Polimento (SEO + acessibilidade + performance)

Pendências técnicas levantadas na análise inicial — tratar quando o core estiver pronto:

- [ ] Adicionar `favicon.ico`
- [ ] Open Graph tags (preview no WhatsApp/Facebook)
- [ ] `loading="lazy"` em todas as imagens abaixo da dobra
- [ ] Preload da fonte do Google em vez de `@import` no CSS
- [ ] Substituir URLs placeholder das redes sociais (instagram.com, facebook.com) pelas reais
- [ ] Remover handlers `onmouseover`/`onmouseout` inline em [contato.html:332-348](contato.html#L332-L348) — usar `:hover` no CSS
- [ ] Adicionar `required` e remover `novalidate` dos formulários
- [ ] `sitemap.xml` e `robots.txt`
- [ ] Imagens quebradas em `assets/images/produtos/` — vão sumir naturalmente quando a Fase 3 ficar pronta

---

### 🔜 Fase 7 — Deploy

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
