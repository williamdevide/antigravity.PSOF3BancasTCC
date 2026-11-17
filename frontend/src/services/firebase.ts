import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
} from 'firebase/firestore';

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

// Provedor Google configurado para prompt de seleção de conta
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Realiza autenticação via Popup com conta Google.
 */
export async function loginComGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
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
    throw new Error(error.message || 'Erro ao realizar login com o Google.');
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
};
export type { User };
