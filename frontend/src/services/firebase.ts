import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  getDocs,
  deleteDoc,
  where,
  arrayUnion,
} from 'firebase/firestore';
import {
  DOMINIO_DOCENTE_AUTORIZADO,
  EMAIL_PROFESSOR_TITULAR,
  normalizarEmailDocente,
  isEmailDocenteSenai,
  isUsuarioDocenteAutorizado,
  isUsuarioProfessorTitular,
} from './authPolicy';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCV6RIWOXhJTfTD_SnagjDNM6xSunYmxOY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'antigravitypsof3bancastcc.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'antigravitypsof3bancastcc',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'antigravitypsof3bancastcc.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '571990644734',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:571990644734:web:569df105e135d9862612af',
};

// Inicialização segura
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provedor Google institucional restrito ao domínio @docente.senai.br
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'docente.senai.br',
});

/**
 * Realiza autenticação via Popup exigindo estritamente conta Google Institucional @docente.senai.br verificada.
 */
export async function loginComGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!isUsuarioDocenteAutorizado(result.user)) {
      const emailInformado = result.user.email || 'desconhecido';
      await signOut(auth);
      throw new Error(
        `Acesso negado para "${emailInformado}". Entre exclusivamente com uma conta Google Institucional verificada (${DOMINIO_DOCENTE_AUTORIZADO}).`,
      );
    }
    return result.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de autenticação do Google foi fechada antes de concluir o login.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou a abertura do popup do Google. Permita popups para este site.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Este domínio ainda não foi autorizado no Firebase Console. Adicione este host em Authentication > Settings > Authorized domains.',
      );
    }
    throw new Error(error.message || 'Erro ao realizar login com conta Google @docente.senai.br.');
  }
}

/**
 * Retorna o Firebase ID Token atualizado do docente logado para autenticar chamadas ao backend FastAPI.
 */
export async function obterTokenIdUsuarioAtual(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export {
  DOMINIO_DOCENTE_AUTORIZADO,
  EMAIL_PROFESSOR_TITULAR,
  normalizarEmailDocente,
  isEmailDocenteSenai,
  isUsuarioDocenteAutorizado,
  isUsuarioProfessorTitular,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  getDocs,
  deleteDoc,
  where,
  arrayUnion,
};
export type { User };
