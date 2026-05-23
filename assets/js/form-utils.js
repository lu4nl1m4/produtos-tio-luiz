// FORM UTILS — funções compartilhadas entre formulários (módulo ES)
// Usado por contato.js e onde-encontrar.js.
// Sinks: Firestore /mensagens (único — Apps Script foi removido em 2026-05-21).


function sanitizeInput(input) {
  const temp = document.createElement("div");
  temp.textContent = input;
  return temp.innerHTML;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  const numbers = phone.replace(/\D/g, "");
  return numbers.length === 10 || numbers.length === 11;
}

export function showToast(type, title, message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === "success" ? "✓" : "✕"}</div>
    <div class="toast-content">
      <div class="toast-title">${sanitizeInput(title)}</div>
      <div class="toast-message">${sanitizeInput(message)}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

export function addShakeAnimation(el) {
  el.classList.add("error-shake");
  setTimeout(() => el.classList.remove("error-shake"), 500);
}

export function applyPhoneMask(input) {
  input.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 10)      value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    else if (value.length > 6)  value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    else if (value.length > 2)  value = value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    else if (value.length > 0)  value = value.replace(/(\d*)/, "($1");
    e.target.value = value;
  });
}

// Converte FormData → objeto com nomes normalizados pra Firestore.
// (O Apps Script continua recebendo a FormData original — não muda.)
function dadosParaFirestore(formData) {
  const dados = Object.fromEntries(formData);
  // Normalização de nomes do form de revendedor
  if (dados.emailReseller)        { dados.email = dados.emailReseller;             delete dados.emailReseller; }
  if (dados.telefoneReseller)     { dados.telefone = dados.telefoneReseller;       delete dados.telefoneReseller; }
  if (dados.tipoEstabelecimento)  { dados.tipo_estabelecimento = dados.tipoEstabelecimento; delete dados.tipoEstabelecimento; }
  return dados;
}

let _isSubmitting = false;
let _firestorePromise = null;

async function carregarFirestore() {
  if (!_firestorePromise) {
    _firestorePromise = Promise.all([
      import("./firebase-config.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
    ]).then(([config, firestore]) => ({
      db: config.db,
      collection: firestore.collection,
      addDoc: firestore.addDoc,
      serverTimestamp: firestore.serverTimestamp
    }));
  }
  return _firestorePromise;
}

// Salva o submit em /mensagens no Firestore (fonte única).
// O nome da função foi mantido por compatibilidade com chamadores existentes (contato.js, onde-encontrar.js),
// mas o sink Apps Script foi removido — não há mais email automático nem backup em planilha.
export async function submitFormToScript({ formElement, submitBtnElement, validator, onSuccessMessage, onSuccessExtra, tipo }) {
  if (_isSubmitting) {
    showToast("error", "Aguarde", "Já estamos processando seu envio...");
    return;
  }

  const formData = new FormData(formElement);
  if (!validator(formData)) return;

  _isSubmitting = true;
  submitBtnElement.disabled = true;
  submitBtnElement.classList.add("btn--loading");
  const originalText = submitBtnElement.textContent;
  submitBtnElement.textContent = "";

  try {
    const { db, collection, addDoc, serverTimestamp } = await carregarFirestore();
    await addDoc(collection(db, "mensagens"), {
      tipo: tipo || "contato",
      ...dadosParaFirestore(formData),
      lida: false,
      respondida: false,
      criado_em: serverTimestamp()
    });
    showToast("success", onSuccessMessage.title, onSuccessMessage.message);
    formElement.reset();
    if (onSuccessExtra) onSuccessExtra();
  } catch (error) {
    console.error("[mensagem] Erro ao salvar no Firestore:", error);
    showToast("error", "Erro ao Enviar", "Tente novamente ou entre em contato pelo WhatsApp.");
  } finally {
    _isSubmitting = false;
    submitBtnElement.disabled = false;
    submitBtnElement.classList.remove("btn--loading");
    submitBtnElement.textContent = originalText;
  }
}
