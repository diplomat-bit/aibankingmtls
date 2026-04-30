import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Simple check for Firestore connectivity
async function checkConnectivity() {
  try {
    // Only run on the client
    if (typeof window === 'undefined') return;
    
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore initialized and connected.");
  } catch (error: any) {
    if (error?.message?.includes('offline')) {
      console.warn("Firestore is offline. Check your network or Firebase config.");
    } else {
      console.error("Firestore test error (expected if collection empty):", error.message);
    }
  }
}

checkConnectivity();
