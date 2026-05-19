import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check for Firestore
if (typeof window !== 'undefined') {
  const checkConnectivity = async () => {
    try {
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log("Firestore connected");
    } catch (error: any) {
      if (error.message.includes('offline')) {
        console.warn("Firestore is offline");
      }
    }
  };
  checkConnectivity();
}
