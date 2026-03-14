import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserConnection } from '../types';

const COLLECTION_NAME = 'user_connections';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const connectionService = {
  async saveConnection(connection: Omit<UserConnection, 'id'>) {
    if (!auth.currentUser) throw new Error('User must be authenticated');
    
    const connectionId = `${auth.currentUser.uid}_${connection.service}`;
    const docRef = doc(db, COLLECTION_NAME, connectionId);
    
    try {
      await setDoc(docRef, {
        ...connection,
        userId: auth.currentUser.uid,
        connectedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${connectionId}`);
    }
  },

  async getConnections(userId: string): Promise<UserConnection[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserConnection));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  subscribeToConnections(userId: string, callback: (connections: UserConnection[]) => void) {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const connections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserConnection));
      callback(connections);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  },

  async removeConnection(service: string) {
    if (!auth.currentUser) throw new Error('User must be authenticated');
    const connectionId = `${auth.currentUser.uid}_${service}`;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, connectionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${connectionId}`);
    }
  },

  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }
};
