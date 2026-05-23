// Pagina de detalhe de produto.
// Abre com cache/snapshot e atualiza o produto especifico via Firestore REST.

import {
  carregarColecaoFirestore,
  carregarDocumentoFirestore,
  carregarJsonPublico,
  lerCachePublico,
  ordenarPorOrdem,
  removerCachePublico,
  salvarCachePublico
} from "./public-data.js";

const STATIC_CATEGORIAS = "data/categorias-publico.json";
const STATIC_PRODUTOS = "data/produtos-publico.json";
const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function mostrarErro(msg) {
  $("produto-status").textContent = msg;
  $("produto-status").style.color = "#d32f2f";
}

function preencherSecaoTexto(secaoId, conteudoId, valor) {
  const secao = $(secaoId);
  const conteudo = $(conteudoId);
  if (!secao || !conteudo) return;
  if (!valor || !String(valor).trim()) {
    secao.hidden = true;
    conteudo.textContent = "";
    return;
  }
  conteudo.textContent = valor;
  secao.hidden = false;
}

function preencherNutricional(info) {
  const secao = $("sec-nutricional");
  if (!secao) return;

  const temValores = info?.valores && info.valores.length > 0;
  const temPorcao = info?.porcao || info?.medida_caseira || info?.porcoes_por_embalagem;
  if (!temValores && !temPorcao) {
    secao.hidden = true;
    return;
  }

  const partes = [];
  if (info.porcao) {
    let p = `Porcao: <strong>${escapeHtml(info.porcao)}</strong>`;
    if (info.medida_caseira) p += ` (${escapeHtml(info.medida_caseira)})`;
    partes.push(p);
  }
  if (info.porcoes_por_embalagem) {
    partes.push(`Porcoes por embalagem: <strong>${escapeHtml(info.porcoes_por_embalagem)}</strong>`);
  }
  $("produto-porcao-info").innerHTML = partes.join(" &nbsp;|&nbsp; ");

  if (info.porcao) {
    $("th-porcao").innerHTML = `por porcao<br><span style="font-weight:400;font-size:0.8em;">(${escapeHtml(info.porcao)})</span>`;
  }

  $("produto-nutri-body").innerHTML = (info.valores || []).map((v) => {
    const per100 = v.per100 ?? "";
    const porPocao = v.por_porcao ?? v.quantidade ?? "";
    return `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 0.5rem 0.75rem; font-weight: 500;">${escapeHtml(v.nome)}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(per100) || "-"}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(porPocao) || "-"}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(v.vd) || "-"}</td>
      </tr>
    `;
  }).join("");

  secao.hidden = false;
}

function categoriaDaLista(categorias, id) {
  return (categorias || []).find((c) => c.id === id) || null;
}

function renderizarProduto(p, categorias) {
  if (!p || p.ativo === false) {
    $("produto-conteudo").hidden = true;
    $("produto-status").style.display = "";
    mostrarErro("Este produto esta indisponivel no momento.");
    return true;
  }

  const cat = categoriaDaLista(categorias, p.categoria);
  const catNome = cat?.nome || p.categoria || "-";
  const isPet = cat?.tipo === "pet" || (p.categoria || "").startsWith("pet-");
  const catUrl = isPet ? "pet-food.html" : `produtos.html#${p.categoria || ""}`;

  document.title = `${p.nome} - Produtos Tio Luiz`;
  $("bc-nome").textContent = p.nome || "(sem nome)";

  const catLink = $("bc-categoria-link");
  catLink.textContent = catNome;
  catLink.href = catUrl;

  $("produto-imagem").src = p.imagem_url || FALLBACK_IMAGE;
  $("produto-imagem").alt = p.nome || "";
  $("produto-imagem").onerror = function () { this.src = FALLBACK_IMAGE; };

  $("produto-badge-categoria").textContent = catNome;
  document.body.classList.toggle("theme-pet", isPet);

  $("produto-nome").textContent = p.nome || "";
  $("produto-embalagem").textContent = p.embalagem ? `Embalagem: ${p.embalagem}` : "";
  $("produto-descricao-curta").textContent = p.descricao || "";

  preencherSecaoTexto("sec-descricao", "produto-descricao-longa", p.descricao_longa);
  preencherSecaoTexto("sec-ingredientes", "produto-ingredientes", p.ingredientes);
  preencherSecaoTexto("sec-alergenos", "produto-alergenos", p.alergenos);
  preencherSecaoTexto("sec-validade", "produto-validade", p.validade);
  preencherSecaoTexto("sec-modo-preparo", "produto-modo-preparo", p.modo_preparo);
  preencherNutricional(p.info_nutricional);

  $("link-categoria").href = catUrl;
  $("link-categoria").textContent = `<- Ver mais produtos de ${catNome}`;

  $("produto-status").style.display = "none";
  $("produto-conteudo").hidden = false;
  return true;
}

async function carregarSnapshotEstatico() {
  const [categorias, produtos] = await Promise.all([
    carregarJsonPublico(STATIC_CATEGORIAS),
    carregarJsonPublico(STATIC_PRODUTOS)
  ]);
  return {
    categorias: ordenarPorOrdem(categorias),
    produtos: ordenarPorOrdem(produtos)
  };
}

async function carregarCategoriasDinamicas() {
  return ordenarPorOrdem(await carregarColecaoFirestore("categorias"));
}

async function init() {
  const id = getIdFromUrl();
  if (!id) {
    mostrarErro("Produto nao especificado. Use produto.html?id=XXX.");
    return;
  }

  let renderizou = false;
  let categoriasRapidas = [];
  const produtoCache = lerCachePublico(`produto:${id}`);
  const snapshotCache = lerCachePublico("produtos:snapshot");

  if (snapshotCache?.categorias) categoriasRapidas = snapshotCache.categorias;

  if (produtoCache) {
    renderizou = renderizarProduto(produtoCache, categoriasRapidas);
  } else if (snapshotCache?.produtos) {
    const produto = snapshotCache.produtos.find((p) => p.id === id);
    if (produto) renderizou = renderizarProduto(produto, categoriasRapidas);
  }

  if (!renderizou) {
    try {
      const snapshot = await carregarSnapshotEstatico();
      categoriasRapidas = snapshot.categorias;
      const produto = snapshot.produtos.find((p) => p.id === id);
      if (produto) renderizou = renderizarProduto(produto, categoriasRapidas);
    } catch (e) {
      console.warn("Falha ao carregar snapshot de produto:", e);
    }
  }

  try {
    const [produto, categorias] = await Promise.all([
      carregarDocumentoFirestore(`produtos/${id}`),
      carregarCategoriasDinamicas()
    ]);

    if (!produto) {
      removerCachePublico(`produto:${id}`);
      $("produto-conteudo").hidden = true;
      $("produto-status").style.display = "";
      mostrarErro("Produto nao encontrado.");
      return;
    }

    salvarCachePublico(`produto:${id}`, produto);
    renderizou = renderizarProduto(produto, categorias) || renderizou;
  } catch (e) {
    if (!renderizou) {
      console.error(e);
      mostrarErro("Erro ao carregar o produto. Tente recarregar.");
    } else {
      console.warn("Falha ao atualizar produto em segundo plano:", e);
    }
  }
}

init();
