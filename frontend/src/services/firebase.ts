import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
  CONVIDADOS_PRE_AUTORIZADOS_META,
  DOMINIOS_RECOMENDADOS_DOCENTE,
  EMAIL_PROFESSOR_TITULAR,
  EMAILS_CONVIDADOS_PRE_AUTORIZADOS,
  isDocenteComAcessoLiberado,
  isEmailFormatoValido,
  isEmailPreAutorizadoConvidado,
  isUsuarioProfessorTitular,
  normalizarEmailDocente,
  resolverStatusAcessoDocente,
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

// Provedor Google sem trava de domínio (aceita @gmail.com, @docente.senai.br e demais contas Google)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Autenticação via Google Popup.
 * Novos e-mails entram autenticados e ficam em tela de espera até liberação pelo Titular.
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

/**
 * Autenticação com E-mail e Senha para docentes cadastrados no Firebase Auth.
 */
export async function loginComEmailSenha(email: string, senha: string): Promise<User> {
  const emailLimpo = normalizarEmailDocente(email);
  if (!isEmailFormatoValido(emailLimpo)) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, emailLimpo, senha);
    return cred.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found'
    ) {
      throw new Error('E-mail ou senha inválidos. Verifique os dados ou crie uma conta primeiro.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Formato de e-mail inválido.');
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.');
    }
    throw new Error(error.message || 'Não foi possível entrar com e-mail e senha.');
  }
}

/**
 * Cadastro de novo docente com E-mail e Senha no Firebase Auth (fica pendente até o Titular aprovar).
 */
export async function cadastrarComEmailSenha(
  nome: string,
  email: string,
  senha: string,
): Promise<User> {
  const emailLimpo = normalizarEmailDocente(email);
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    throw new Error('Informe o nome completo do professor.');
  }
  if (!isEmailFormatoValido(emailLimpo)) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
    await updateProfile(cred.user, { displayName: nomeLimpo });
    return cred.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já possui cadastro. Use a aba "Entrar" para acessar.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Formato de e-mail inválido.');
    }
    throw new Error(error.message || 'Erro ao cadastrar conta de docente.');
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
  CONVIDADOS_PRE_AUTORIZADOS_META,
  DOMINIOS_RECOMENDADOS_DOCENTE,
  EMAIL_PROFESSOR_TITULAR,
  EMAILS_CONVIDADOS_PRE_AUTORIZADOS,
  isDocenteComAcessoLiberado,
  isEmailFormatoValido,
  isEmailPreAutorizadoConvidado,
  isUsuarioProfessorTitular,
  normalizarEmailDocente,
  resolverStatusAcessoDocente,
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
