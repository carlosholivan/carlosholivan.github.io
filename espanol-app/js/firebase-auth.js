import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
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

export function getUser() {
  return currentUser;
}

export async function saveStateToCloud(state) {
  if (!db || !currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  const { settings, ...rest } = state;
  await setDoc(ref, {
    ...rest,
    settings: settings || { sound: true, haptics: true },
    updatedAt: Date.now()
  }, { merge: true });
}

export async function loadStateFromCloud() {
  if (!db || !currentUser) return null;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}
