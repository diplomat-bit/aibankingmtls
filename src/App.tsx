import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Globe, 
  LayoutDashboard, 
  Wallet, 
  LineChart, 
  Shield, 
  LogOut,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Zap,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { ConnectionsView } from './components/ConnectionsView';

interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'debit' | 'credit';
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'web3' | 'advisor' | 'connections'>('dashboard');

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          let userProfile: UserProfile;
          if (!userSnap.exists()) {
            userProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, userProfile);
          } else {
            userProfile = userSnap.data() as UserProfile;
          }
          setProfile(userProfile);

          // Listen for accounts
          const qAccounts = query(collection(db, 'accounts'), where('userId', '==', firebaseUser.uid));
          const unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
            setAccounts(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Account)));
          });

          // Listen for transactions
          const qTx = query(
            collection(db, 'transactions'), 
            where('userId', '==', firebaseUser.uid), 
            orderBy('date', 'desc'), 
            limit(10)
          );
          const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
            setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)));
          });

          return () => {
            unsubscribeAccounts();
            unsubscribeTx();
          };
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || "Failed to initialize Aura");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in error details:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked. Please allow popups for this site.");
      } else if (err.message.includes('invalid client secret')) {
        setError("Configuration Error: The Google OAuth Client Secret is invalid. Please check your Firebase Console and Google Cloud Credentials.");
      } else {
        setError(err.message || "An error occurred during sign-in.");
      }
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.service === 'citi') {
        console.log("Citibank authentication successful:", event.data.tokens);
        // In a real app, we would save these tokens to Firestore
        // For the demo, we'll just show success
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSignOut = () => auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full mb-4"
        />
        <p className="text-zinc-500 font-medium tracking-widest text-xs uppercase">Initializing Aura</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10 max-w-sm"
        >
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-white/10">
            <Zap className="w-10 h-10 text-black fill-black" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Aura AI Bank</h1>
          <p className="text-zinc-400 mb-10 leading-relaxed text-sm">
            Experience the future of finance with autonomous intelligence and multi-chain liquidity.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={handleSignIn}
            className="w-full bg-white text-black h-14 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
          >
            <Globe className="w-5 h-5" />
            Connect with Google
          </button>

          <p className="mt-8 text-zinc-600 text-[10px] uppercase tracking-widest font-semibold">
            Institutional Grade Security &bull; End-to-End Encryption
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">Aura</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'web3', label: 'Crypto Hub', icon: Wallet },
            { id: 'advisor', label: 'AI Advisor', icon: LineChart },
            { id: 'connections', label: 'Connections', icon: LinkIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                currentView === item.id 
                  ? "bg-white/10 text-white" 
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 mb-6 px-2">
            <img 
              src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aura'} 
              className="w-8 h-8 rounded-full border border-white/10"
              alt="Avatar"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight uppercase">
              {currentView === 'connections' ? 'Connections' : currentView === 'web3' ? 'Web3' : currentView === 'advisor' ? 'Insights' : 'Dashboard'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {currentView === 'connections' ? 'Institutional Partner APIs' : 'Welcome back to your financial command center.'}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 text-sm font-bold tracking-tight">Verified Secure</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {currentView === 'dashboard' && (
              <div className="grid grid-cols-12 gap-8">
                {/* Card: Net Worth */}
                <section className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 p-8 rounded-[32px] relative overflow-hidden group">
                      <div className="z-10 relative">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Balance</p>
                        <h3 className="text-4xl font-bold mb-6">{formattedBalance}</h3>
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <TrendingUp className="w-4 h-4" />
                          <span>+12.5% this month</span>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="w-24 h-24 rotate-12" />
                      </div>
                    </div>
                    
                    <div className="bg-zinc-900 border border-white/5 p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Globe className="w-24 h-24 rotate-12" />
                      </div>
                      <div className="z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Partner Banking</p>
                            <h4 className="text-lg font-bold">Connect Citibank</h4>
                          </div>
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md font-bold uppercase tracking-tighter">Sandbox</span>
                        </div>
                        <p className="text-zinc-500 text-xs mb-6 leading-relaxed">
                          Link your Citi institutional accounts to enable real-time liquidity monitoring and automated global payments.
                        </p>
                        <button 
                          onClick={async () => {
                            try {
                              setError(null);
                              const res = await fetch('/api/auth/citi/url');
                              if (!res.ok) throw new Error("Failed to get Citi auth URL");
                              const { url } = await res.json();
                              window.open(url, 'citi_auth', 'width=600,height=700');
                            } catch (e: any) {
                              setError(e.message || "Failed to start Citibank connection");
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                          <Zap className="w-4 h-4 fill-white" />
                          Link Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-xl font-bold">Recent Activity</h4>
                      <button className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1 font-bold">
                        View All <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {transactions.length > 0 ? (
                        transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                                <Zap className={clsx("w-5 h-5", tx.type === 'credit' ? "text-emerald-500" : "text-white")} />
                              </div>
                              <div>
                                <p className="text-sm font-bold">{tx.description}</p>
                                <p className="text-xs text-zinc-500">{tx.category} &bull; {new Date(tx.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className={clsx("font-mono font-bold", tx.type === 'credit' ? "text-emerald-400" : "text-white")}>
                              {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <p className="text-zinc-600 text-sm">Your financial history starts here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Card: Side Info */}
                <section className="col-span-12 lg:col-span-4 space-y-8">
                  <div className="bg-white text-black p-8 rounded-[32px] shadow-2xl shadow-white/10">
                    <Zap className="w-8 h-8 mb-6 fill-black" />
                    <h4 className="text-2xl font-bold mb-4 tracking-tight leading-8">Aura Insight Engine</h4>
                    <p className="text-black/60 text-sm mb-8 leading-relaxed font-medium">
                      "Based on your current spending, you could save $450/mo by consolidating your SaaS subscriptions."
                    </p>
                    <button className="w-full bg-black text-white h-12 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                      Apply Insight
                    </button>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 p-8 rounded-[32px]">
                    <h4 className="text-lg font-bold mb-6">Security Score</h4>
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                      <div className="absolute top-0 left-0 h-full w-[94%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                      <span>94/100 (Optimal)</span>
                      <span className="text-emerald-500">Enhanced Privacy Active</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {currentView === 'connections' && <ConnectionsView />}
            
            {currentView === 'web3' && (
              <div className="p-20 text-center border border-dashed border-white/10 rounded-[40px]">
                <Wallet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Crypto Hub Coming Soon</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">We're building the first high-yield multi-chain liquidity bridge for premium accounts.</p>
              </div>
            )}

            {currentView === 'advisor' && (
              <div className="p-20 text-center border border-dashed border-white/10 rounded-[40px]">
                <LineChart className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">AI Insights Engine</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">Predictive analysis of your cash flow and personalized investment strategies.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
