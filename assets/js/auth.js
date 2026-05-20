// Helpers de autenticação para o painel admin.

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
