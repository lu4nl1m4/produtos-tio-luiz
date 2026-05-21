// Página de detalhe — lê ?id=XXX, busca o produto no Firestore e renderiza.

import { db } from "./firebase-config.js";
import { cached } from "./cache.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const TTL_CATEGORIAS = 10 * 60 * 1000;

const FALLBACK_IMAGE = "assets/images/todos_os_produtos.webp";

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function carregarCategoria(id) {
  // Cacheia toda a coleção (idem outras páginas — tende a estar quente).
  // Se a coleção estiver vazia/falhar, cai para data/categorias.json.
  try {
    const lista = await cached("categorias", TTL_CATEGORIAS, async () => {
      const snap = await getDocs(collection(db, "categorias"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
    const hit = lista.find((c) => c.id === id);
    if (hit) return hit;
  } catch (e) {
    console.warn("Falha ao ler categorias do Firestore:", e);
  }
  try {
    const res = await fetch("data/categorias.json");
    if (!res.ok) return null;
    const lista = await res.json();
    return lista.find((c) => c.id === id) || null;
  } catch {
    return null;
  }
}

function mostrarErro(msg) {
  $("produto-status").textContent = msg;
  $("produto-status").style.color = "#d32f2f";
}

function preencherSecaoTexto(secaoId, conteudoId, valor) {
  if (!valor || !String(valor).trim()) return;
  $(conteudoId).textContent = valor;
  $(secaoId).hidden = false;
}

function preencherNutricional(info) {
  if (!info) return;
  const temValores = info.valores && info.valores.length > 0;
  const temPorcao = info.porcao || info.medida_caseira || info.porcoes_por_embalagem;
  if (!temValores && !temPorcao) return;

  // Cabeçalho da porção (formato ANVISA: "Porção: 50 g (1 xícara) — 20 porções por embalagem")
  const partes = [];
  if (info.porcao) {
    let p = `Porção: <strong>${escapeHtml(info.porcao)}</strong>`;
    if (info.medida_caseira) p += ` (${escapeHtml(info.medida_caseira)})`;
    partes.push(p);
  }
  if (info.porcoes_por_embalagem) {
    partes.push(`Porções por embalagem: <strong>${info.porcoes_por_embalagem}</strong>`);
  }
  $("produto-porcao-info").innerHTML = partes.join(" &nbsp;·&nbsp; ");

  // Atualiza o cabeçalho da coluna "por porção" pra incluir a porção (padrão ANVISA)
  if (info.porcao) {
    $("th-porcao").innerHTML = `por porção<br><span style="font-weight:400;font-size:0.8em;">(${escapeHtml(info.porcao)})</span>`;
  }

  $("produto-nutri-body").innerHTML = (info.valores || []).map((v) => {
    // Backward compat: se tiver só "quantidade" (formato antigo), usa como por_porcao.
    const per100     = v.per100 ?? "";
    const por_porcao = v.por_porcao ?? v.quantidade ?? "";
    return `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 0.5rem 0.75rem; font-weight: 500;">${escapeHtml(v.nome)}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(per100) || "—"}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(por_porcao) || "—"}</td>
        <td style="padding: 0.5rem; text-align: center;">${escapeHtml(v.vd) || "—"}</td>
      </tr>
    `;
  }).join("");

  $("sec-nutricional").hidden = false;
}

async function init() {
  const id = getIdFromUrl();
  if (!id) {
    mostrarErro("Produto não especificado. Use produto.html?id=XXX.");
    return;
  }

  let snap;
  try {
    snap = await getDoc(doc(db, "produtos", id));
  } catch (e) {
    console.error(e);
    mostrarErro("Erro ao carregar o produto. Tente recarregar.");
    return;
  }

  if (!snap.exists()) {
    mostrarErro("Produto não encontrado.");
    return;
  }

  const p = snap.data();

  if (p.ativo === false) {
    mostrarErro("Este produto está indisponível no momento.");
    return;
  }

  // Categoria (para breadcrumb e link de volta)
  const cat = await carregarCategoria(p.categoria);
  const catNome = cat?.nome || p.categoria || "—";
  const isPet = cat?.tipo === "pet" || (p.categoria || "").startsWith("pet-");
  const catUrl = isPet ? "pet-food.html" : `produtos.html#${p.categoria || ""}`;

  // Title + meta
  document.title = `${p.nome} - Produtos Tio Luiz`;

  // Breadcrumb
  $("bc-nome").textContent = p.nome || "(sem nome)";
  const catLink = $("bc-categoria-link");
  catLink.textContent = catNome;
  catLink.href = catUrl;

  // Hero
  $("produto-imagem").src = p.imagem_url || FALLBACK_IMAGE;
  $("produto-imagem").alt = p.nome || "";
  $("produto-imagem").onerror = function () { this.src = FALLBACK_IMAGE; };

  $("produto-badge-categoria").textContent = catNome;
  if (isPet) {
    $("produto-badge-categoria").style.background = "var(--color-accent, #ff6f00)";
  }

  $("produto-nome").textContent = p.nome || "";
  $("produto-embalagem").textContent = p.embalagem ? `Embalagem: ${p.embalagem}` : "";
  $("produto-descricao-curta").textContent = p.descricao || "";

  // Seções opcionais
  preencherSecaoTexto("sec-descricao", "produto-descricao-longa", p.descricao_longa);
  preencherSecaoTexto("sec-ingredientes", "produto-ingredientes", p.ingredientes);
  preencherSecaoTexto("sec-alergenos", "produto-alergenos", p.alergenos);
  preencherSecaoTexto("sec-validade", "produto-validade", p.validade);
  preencherSecaoTexto("sec-modo-preparo", "produto-modo-preparo", p.modo_preparo);
  preencherNutricional(p.info_nutricional);

  // Link voltar
  $("link-categoria").href = catUrl;
  $("link-categoria").textContent = `← Ver mais produtos de ${catNome}`;

  // Mostra conteúdo, esconde status
  $("produto-status").style.display = "none";
  $("produto-conteudo").hidden = false;
}

init();
