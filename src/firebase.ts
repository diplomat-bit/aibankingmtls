import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import firebaseConfig from "../firebase-applet-config.json";

console.log('Firebase: Initializing app...');
const app = initializeApp(firebaseConfig as any);
console.log('Firebase: Initialized successfully');
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics could not be initialized:", e);
}

export { analytics, signInWithCustomToken };
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
