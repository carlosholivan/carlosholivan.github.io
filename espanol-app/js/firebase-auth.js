import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import firebaseConfig from './firebase-config.js';

let app = null;
let auth = null;
let db = null;
let currentUser = null;

export function isConfigured() {
  return !!firebaseConfig.apiKey;
}

export function initFirebase() {
  if (!isConfigured()) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function onAuthChange(callback) {
  if (!auth) return;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function registerUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendVerification(cred.user);
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
  currentUser = null;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function sendVerification(user = currentUser) {
  if (!user) return;
  auth.languageCode = document.documentElement.lang || 'es';
  await sendEmailVerification(user, { url: location.origin + location.pathname });
}

// Reloads the user from Firebase; returns true once the email link has been clicked.
export async function refreshVerified() {
  if (!currentUser) return false;
  await reload(currentUser);
  if (currentUser.emailVerified) await currentUser.getIdToken(true);
  return currentUser.emailVerified;
}

export function isVerified(user = currentUser) {
  return !!user && (user.emailVerified || !user.providerData.some(p => p.providerId === 'password'));
}

export function getUser() {
  return currentUser;
}

export async function saveStateToCloud(state) {
  if (!db || !isVerified()) return;
  const ref = doc(db, 'users', currentUser.uid);
  const { settings, uid, ...rest } = state;
  const data = {
    ...rest,
    settings: settings || { sound: true, haptics: true },
    updatedAt: Date.now()
  };
  // mergeFields replaces each top-level field whole (so resets/deletions sync) without touching other apps' fields.
  await setDoc(ref, data, { mergeFields: Object.keys(data) });
}

export async function loadStateFromCloud() {
  if (!db || !isVerified()) return null;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}
