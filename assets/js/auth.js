// Helpers de autenticação para o painel admin.
// Importa o SDK de Auth aqui (e não em firebase-config.js) pra que páginas
// públicas, que só importam `db`, não baixem o Auth bundle (~80 KB).

import { app } from "./firebase-config.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const auth = getAuth(app);

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// Resolve com o usuário atual (ou null) UMA vez, assim que o estado for conhecido.
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// Bloqueia a página até confirmar auth. Se não autenticado, redireciona.
export async function requireAuth(loginPath = "index.html") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace(loginPath);
    return null;
  }
  return user;
}

// Observa mudanças contínuas no estado de auth (ex: logout em outra aba).
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
