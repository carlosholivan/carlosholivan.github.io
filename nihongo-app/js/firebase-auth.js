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
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import firebaseConfig from './firebase-config.js?v=202611140200';

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
  if (!db || !currentUser) return;
  if (!isVerified()) throw new Error('email-not-verified');
  const ref = doc(db, 'users', currentUser.uid);
  // Same Firebase project as the Spanish app; this app's progress lives in its own field,
  // replaced whole (mergeFields) so resets sync without touching the Spanish data.
  // The big per-word maps travel gzipped in one string: as plain maps they could exceed Firestore's
  // per-document limits (1 MiB and 40,000 index entries, shared with the other apps of the account).
  const { settings, uid, cards, hcards, vocab, ...rest } = state;
  const pack = await packJSON({ cards, hcards, vocab });
  // JSON round trip: Firestore rejects undefined values (invalid-argument).
  const body = JSON.parse(JSON.stringify({ ...rest, pack, settings: settings || { sound: true }, updatedAt: Date.now() }));
  try {
    await setDoc(ref, { nihongo: body }, { mergeFields: ['nihongo'] });
  } catch (e) {
    e.detail = `${Math.round(JSON.stringify(body).length / 1024)} KB`;
    throw e;
  }
}

export async function loadStateFromCloud() {
  if (!db || !isVerified()) return null;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data().nihongo || null;
  if (data && data.pack) { Object.assign(data, await unpackJSON(data.pack)); delete data.pack; }
  return data;
  return null;
}

// Public leaderboard: one small doc per user (name + points), readable by every verified user.
const RANK = 'ranking_nihongo';
export async function publishRank(entry) {
  if (!db || !currentUser || !isVerified()) return false;
  await setDoc(doc(db, RANK, currentUser.uid), { ...entry, t: Date.now() });
  return true;
}
export async function loadRanking(n = 50) {
  const snap = await getDocs(query(collection(db, RANK), orderBy('score', 'desc'), limit(n)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}
export async function rankPosition(score) {
  const c = await getCountFromServer(query(collection(db, RANK), where('score', '>', score)));
  return c.data().count + 1;
}

// gzip + base64 (CompressionStream); falls back to plain JSON where it is not available.
async function packJSON(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream === 'undefined') return 'j:' + json;
  const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let bin = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return 'z:' + btoa(bin);
}
async function unpackJSON(s) {
  if (s.startsWith('j:')) return JSON.parse(s.slice(2));
  const u = Uint8Array.from(atob(s.slice(2)), c => c.charCodeAt(0));
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}
