import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  getDocs,
};
export type { User };
