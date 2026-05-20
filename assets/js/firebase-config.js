// Firebase Web SDK v10.14.1 — modular, via CDN (sem build step)
// Docs: https://firebase.google.com/docs/web/setup
//
// IMPORTANTE: substitua os valores abaixo pela config real do seu projeto.
// Onde achar: Firebase Console → Configurações do projeto → Seus apps → Web → Config.
//
// Esses valores são públicos por design — a segurança vem das regras
// (firestore.rules / storage.rules) e do Firebase Auth, não de esconder a chave.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0lJrlsHERnH2ZArBRbiOD-bk32hsxECs",
  authDomain: "site-produtos-tio-luiz.firebaseapp.com",
  projectId: "site-produtos-tio-luiz",
  storageBucket: "site-produtos-tio-luiz.firebasestorage.app",
  messagingSenderId: "262060739818",
  appId: "1:262060739818:web:17964fe932ad32c4a9db93",
  measurementId: "G-595QVPRHVM"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
