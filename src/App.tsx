import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  limit,
  setDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Account, Transaction, ChatMessage } from './types';
import { 
  LayoutDashboard, 
  CreditCard, 
  MessageSquare, 
  LogOut, 
  Plus, 
  Globe,
  Wallet
} from 'lucide-react';
import { Dashboard } from './views/Dashboard';
import Web3View from './views/Web3View';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'web3' | 'advisor'>('dashboard');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userSnap.data() as UserProfile);
        }

        // Listen for accounts
        const qAccounts = query(collection(db, 'accounts'), where('userId', '==', firebaseUser.uid));
        onSnapshot(qAccounts, (snapshot) => {
          setAccounts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Account)));
        });

        // Listen for transactions
        const qTx = query(collection(db, 'transactions'), where('userId', '==', firebaseUser.uid), orderBy('date', 'desc'), limit(10));
        onSnapshot(qTx, (snapshot) => {
          setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
        });
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-8">Aura AI Bank</h1>
        <button 
          onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
          className="bg-white text-black px-8 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <Globe className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0D0D0D] p-6 space-y-8">
        <div className="flex items-center gap-3">
          <Wallet className="text-emerald-500" />
          <span className="text-xl font-bold">Aura</span>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setCurrentView('dashboard')} className={`flex items-center gap-3 w-full p-3 rounded-xl ${currentView === 'dashboard' ? 'bg-emerald-500 text-black' : 'text-zinc-400'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setCurrentView('web3')} className={`flex items-center gap-3 w-full p-3 rounded-xl ${currentView === 'web3' ? 'bg-emerald-500 text-black' : 'text-zinc-400'}`}>
            <Globe size={20} /> Web3
          </button>
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-zinc-500 mt-auto pt-8">
          <LogOut size={20} /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8">
        <header className="mb-12">
          <h2 className="text-3xl font-bold uppercase tracking-widest">{currentView}</h2>
        </header>

        {currentView === 'dashboard' && <Dashboard accounts={accounts} transactions={transactions} />}
        {currentView === 'web3' && <Web3View />}
      </main>
    </div>
  );
}
