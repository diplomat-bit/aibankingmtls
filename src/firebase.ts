import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDsI4n7p17gD3kXDU10wSN5bv6DQHZEF2g",
  authDomain: "operationsavetheworld.firebaseapp.com",
  projectId: "operationsavetheworld",
  storageBucket: "operationsavetheworld.firebasestorage.app",
  messagingSenderId: "170469613791",
  appId: "1:170469613791:web:073cc15c34bbfb620d896a",
  measurementId: "G-G8577154CE"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
