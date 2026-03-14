/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp, 
  orderBy, 
  limit,
  setDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Account, Transaction, ChatMessage, Investment, Card, UserConnection, Ledger } from './types';
import { getFinancialAdvice, categorizeTransaction } from './services/geminiService';
import { connectionService } from './services/connectionService';
import { modelNames } from './modelNames';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare, 
  LogOut, 
  Plus, 
  TrendingUp, 
  Wallet,
  Search,
  ChevronRight,
  Bot,
  Send,
  X,
  PieChart,
  Shield,
  Activity,
  Globe,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ModelsView } from './components/ModelsView';
import { ApisView } from './components/ApisView';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all group",
        active ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {active && <ChevronRight className="ml-auto w-4 h-4" />}
    </button>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  negative?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon, negative = false }) => {
  return (
    <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-lg",
          negative ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-zinc-500 text-sm mb-1">{label}</p>
      <h4 className="text-2xl font-bold tracking-tight">{value}</h4>
    </div>
  );
}

interface TransactionItemProps {
  tx: Transaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ tx }) => {
  const isExpense = tx.amount < 0;
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 transition-all group cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          isExpense ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {isExpense ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
        <div>
          <h5 className="font-semibold text-sm">{tx.description}</h5>
          <p className="text-xs text-zinc-500">{tx.category} • {format(new Date(tx.date), 'MMM dd, HH:mm')}</p>
        </div>
      </div>
      <span className={cn(
        "font-bold",
        isExpense ? "text-white" : "text-emerald-500"
      )}>
        {isExpense ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
      </span>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => {
  return (
    <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
      <div className="text-emerald-500">{icon}</div>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', description: '', type: 'expense' });
  const [currentView, setCurrentView] = useState<'dashboard' | 'accounts' | 'investments' | 'cards' | 'advisor' | 'connections' | 'models' | 'ledgers' | 'apis'>('dashboard');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { service, userId, accessToken, refreshToken, externalAccountId } = event.data;
        if (user && user.uid === userId) {
          await connectionService.saveConnection({
            userId,
            service,
            accessToken,
            refreshToken,
            externalAccountId,
            connectedAt: new Date().toISOString()
          });
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [user]);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clear previous listeners if any
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      if (firebaseUser) {
        // Ensure user profile exists
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
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
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }

        // Initialize default account if none exists
        const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', firebaseUser.uid));
        const unsubAccounts = onSnapshot(accountsQuery, async (snapshot) => {
          if (snapshot.empty) {
            try {
              await addDoc(collection(db, 'accounts'), {
                userId: firebaseUser.uid,
                type: 'checking',
                balance: 5000,
                currency: 'USD',
                accountNumber: '**** 4242',
                id: Math.random().toString(36).substr(2, 9)
              });
            } catch (error) {
              console.error("Error creating default account:", error);
            }
          } else {
            setAccounts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account)));
          }
        }, (error) => console.error("Accounts listener error:", error));
        unsubscribes.push(unsubAccounts);

        // Listen for transactions
        const txQuery = query(
          collection(db, 'transactions'), 
          where('userId', '==', firebaseUser.uid),
          orderBy('date', 'desc'),
          limit(20)
        );
        const unsubTx = onSnapshot(txQuery, (snapshot) => {
          setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
        }, (error) => console.error("Transactions listener error:", error));
        unsubscribes.push(unsubTx);

        // Listen for chat messages
        const chatQuery = query(
          collection(db, 'chats'),
          where('userId', '==', firebaseUser.uid),
          orderBy('timestamp', 'asc')
        );
        const unsubChats = onSnapshot(chatQuery, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChatMessage)));
        }, (error) => console.error("Chats listener error:", error));
        unsubscribes.push(unsubChats);

        // Listen for investments
        const investQuery = query(collection(db, 'investments'), where('userId', '==', firebaseUser.uid));
        const unsubInvest = onSnapshot(investQuery, async (snapshot) => {
          if (snapshot.empty) {
            // Seed some initial investments for demo
            const seedInvestments = [
              { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, costBasis: 150, currentPrice: 185, type: 'stock' },
              { symbol: 'BTC', name: 'Bitcoin', quantity: 0.5, costBasis: 30000, currentPrice: 65000, type: 'crypto' },
              { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', quantity: 25, costBasis: 380, currentPrice: 450, type: 'etf' }
            ];
            for (const inv of seedInvestments) {
              try {
                await addDoc(collection(db, 'investments'), { ...inv, userId: firebaseUser.uid, id: Math.random().toString(36).substr(2, 9) });
              } catch (error) {
                console.error("Error creating seed investment:", error);
              }
            }
          } else {
            setInvestments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Investment)));
          }
        }, (error) => console.error("Investments listener error:", error));
        unsubscribes.push(unsubInvest);

        // Listen for cards
        const cardQuery = query(collection(db, 'cards'), where('userId', '==', firebaseUser.uid));
        const unsubCards = onSnapshot(cardQuery, async (snapshot) => {
          if (snapshot.empty) {
            // Seed some initial cards for demo
            const seedCards = [
              { type: 'debit', brand: 'Visa', last4: '4242', expiryDate: '12/26', status: 'active' },
              { type: 'credit', brand: 'Mastercard', last4: '8888', expiryDate: '08/25', status: 'active', limit: 10000, spent: 1240 }
            ];
            for (const card of seedCards) {
              try {
                await addDoc(collection(db, 'cards'), { ...card, userId: firebaseUser.uid, id: Math.random().toString(36).substr(2, 9) });
              } catch (error) {
                console.error("Error creating seed card:", error);
              }
            }
          } else {
            setCards(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Card)));
          }
        }, (error) => console.error("Cards listener error:", error));
        unsubscribes.push(unsubCards);

        // Listen for connections
        const unsubConnections = connectionService.subscribeToConnections(firebaseUser.uid, (data) => {
          setConnections(data);
        });
        unsubscribes.push(unsubConnections);

        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (currentView === 'ledgers') {
      const fetchLedgers = async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch('/api/modern_treasury/ledgers', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          setLedgers(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchLedgers();
    }
  }, [currentView]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleConnectService = (service: 'stripe' | 'modern_treasury' | 'aibanking') => {
    if (!user) return;
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const url = `/api/auth/login?service=${service}&userId=${user.uid}`;
    
    window.open(
      url,
      'oauth_popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTx.amount || !newTx.description) return;

    const amount = parseFloat(newTx.amount) * (newTx.type === 'expense' ? -1 : 1);
    const category = await categorizeTransaction(newTx.description);

    const txData = {
      userId: user.uid,
      accountId: accounts[0]?.id || 'default',
      amount,
      description: newTx.description,
      category,
      date: new Date().toISOString(),
    };

    await addDoc(collection(db, 'transactions'), txData);
    
    // Update balance (simple optimistic update logic would be better, but we rely on snapshot)
    if (accounts[0]) {
      const accountRef = doc(db, 'accounts', accounts[0].id);
      await setDoc(accountRef, { ...accounts[0], balance: accounts[0].balance + amount }, { merge: true });
    }

    setNewTx({ amount: '', description: '', type: 'expense' });
    setIsAddingTransaction(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: user.uid,
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, 'chats'), userMsg);
    setChatInput('');

    const advice = await getFinancialAdvice(chatInput, transactions, accounts);
    
    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      userId: user.uid,
      role: 'model',
      content: advice,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, 'chats'), modelMsg);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20">
              <Wallet className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">Aura AI Bank</h1>
            <p className="text-zinc-400">Experience the future of personal finance with intelligent insights and seamless management.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const chartData = transactions.slice().reverse().map(tx => ({
    date: format(new Date(tx.date), 'MMM dd'),
    amount: tx.amount
  }));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-[#0D0D0D] hidden lg:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">Aura</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
          />
          <NavItem 
            icon={<CreditCard className="w-5 h-5" />} 
            label="Accounts" 
            active={currentView === 'accounts'} 
            onClick={() => setCurrentView('accounts')}
          />
          <NavItem 
            icon={<CreditCard className="w-5 h-5" />} 
            label="Cards" 
            active={currentView === 'cards'} 
            onClick={() => setCurrentView('cards')}
          />
          <NavItem 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Investments" 
            active={currentView === 'investments'} 
            onClick={() => setCurrentView('investments')}
          />
          <NavItem 
            icon={<MessageSquare className="w-5 h-5" />} 
            label="AI Advisor" 
            active={currentView === 'advisor'} 
            onClick={() => setCurrentView('advisor')}
          />
          <NavItem 
            icon={<LinkIcon className="w-5 h-5" />} 
            label="Connections" 
            active={currentView === 'connections'} 
            onClick={() => setCurrentView('connections')}
          />
          <NavItem 
            icon={<Wallet className="w-5 h-5" />} 
            label="Ledgers" 
            active={currentView === 'ledgers'} 
            onClick={() => setCurrentView('ledgers')}
          />
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Models" 
            active={currentView === 'models'} 
            onClick={() => setCurrentView('models')}
          />
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="APIs" 
            active={currentView === 'apis'} 
            onClick={() => setCurrentView('apis')}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors w-full px-4 py-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {currentView === 'dashboard' && `Welcome back, ${profile?.displayName?.split(' ')[0]}`}
              {currentView === 'accounts' && 'Your Accounts'}
              {currentView === 'cards' && 'Your Cards'}
              {currentView === 'investments' && 'Investment Portfolio'}
              {currentView === 'advisor' && 'AI Financial Advisor'}
              {currentView === 'connections' && 'Service Connections'}
              {currentView === 'models' && 'API Models'}
              {currentView === 'apis' && 'API Endpoints'}
            </h2>
            <p className="text-zinc-500">
              {currentView === 'dashboard' && "Here's what's happening with your finances today."}
              {currentView === 'accounts' && "Manage your bank accounts and balances."}
              {currentView === 'cards' && "Manage your credit and debit cards."}
              {currentView === 'investments' && "Track your assets and market performance."}
              {currentView === 'advisor' && "Get intelligent insights and personalized advice."}
              {currentView === 'connections' && "Connect third-party services like Stripe and Modern Treasury."}
              {currentView === 'models' && "View all 2000+ available API models."}
              {currentView === 'apis' && "View all available API endpoints."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-emerald-500/50 transition-colors w-64"
              />
            </div>
            <button 
              onClick={() => setIsAddingTransaction(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Transaction
            </button>
          </div>
        </header>

        {currentView === 'dashboard' && (
          <Dashboard />
        )}
        
        {currentView === 'models' && (
          <ModelsView />
        )}

        {currentView === 'apis' && (
          <ApisView />
        )}

        {currentView === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard 
                label="Total Balance" 
                value={`$${totalBalance.toLocaleString()}`} 
                trend="+2.4%" 
                icon={<Wallet className="w-6 h-6 text-emerald-500" />}
              />
              <StatCard 
                label="Monthly Spending" 
                value="$1,240.00" 
                trend="-12%" 
                negative 
                icon={<ArrowDownLeft className="w-6 h-6 text-rose-500" />}
              />
              <StatCard 
                label="Savings Goal" 
                value="84%" 
                trend="+5%" 
                icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
              />
            </div>

            {/* Charts & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-semibold">Spending Overview</h3>
                    <select className="bg-transparent text-sm text-zinc-500 focus:outline-none">
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Recent Transactions</h3>
                    <button className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">View all</button>
                  </div>
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <TransactionItem key={tx.id} tx={tx} />
                    ))}
                    {transactions.length === 0 && (
                      <div className="text-center py-12 text-zinc-500">No transactions yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-emerald-500 rounded-3xl p-6 text-black relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-1">Aura Premium</h3>
                    <p className="text-black/70 text-sm mb-6">Unlock advanced AI insights and zero-fee international transfers.</p>
                    <button className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-900 transition-colors">
                      Upgrade Now
                    </button>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
                </div>

                <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
                  <h3 className="text-lg font-semibold mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <ActionButton icon={<ArrowUpRight className="w-5 h-5" />} label="Send" />
                    <ActionButton icon={<ArrowDownLeft className="w-5 h-5" />} label="Request" />
                    <ActionButton icon={<CreditCard className="w-5 h-5" />} label="Cards" />
                    <ActionButton icon={<TrendingUp className="w-5 h-5" />} label="Invest" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <div key={account.id} className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{account.type}</span>
                  </div>
                  <p className="text-zinc-500 text-sm mb-1">Available Balance</p>
                  <h3 className="text-3xl font-bold mb-8">${account.balance.toLocaleString()}</h3>
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>{account.accountNumber}</span>
                    <span className="font-mono">{account.currency}</span>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
              </div>
            ))}
            <button className="border-2 border-dashed border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-zinc-500 hover:text-white hover:border-white/10 transition-all">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold">Add New Account</span>
            </button>
          </div>
        )}

        {currentView === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cards.map(card => (
              <div key={card.id} className={cn(
                "aspect-[1.586/1] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group transition-all hover:scale-[1.02]",
                card.type === 'credit' ? "bg-zinc-900 border border-white/10" : "bg-emerald-600 text-black"
              )}>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", card.type === 'credit' ? "text-zinc-500" : "text-black/60")}>
                      {card.brand} {card.type}
                    </p>
                    <div className="w-12 h-8 bg-white/10 rounded-md flex items-center justify-center">
                      <div className="w-8 h-6 bg-yellow-500/20 rounded-sm border border-yellow-500/30" />
                    </div>
                  </div>
                  <Shield className={cn("w-6 h-6", card.type === 'credit' ? "text-emerald-500" : "text-black")} />
                </div>

                <div className="relative z-10">
                  <h3 className={cn("text-2xl font-mono tracking-[0.2em] mb-4", card.type === 'credit' ? "text-white" : "text-black")}>
                    •••• •••• •••• {card.last4}
                  </h3>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={cn("text-[10px] uppercase font-bold mb-1", card.type === 'credit' ? "text-zinc-500" : "text-black/60")}>Card Holder</p>
                      <p className="font-semibold text-sm">{profile?.displayName?.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[10px] uppercase font-bold mb-1", card.type === 'credit' ? "text-zinc-500" : "text-black/60")}>Expires</p>
                      <p className="font-semibold text-sm">{card.expiryDate}</p>
                    </div>
                  </div>
                </div>

                {/* Card Background Patterns */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-24 -mb-24" />
              </div>
            ))}
            <button className="aspect-[1.586/1] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-zinc-500 hover:text-white hover:border-white/10 transition-all">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold">Add New Card</span>
            </button>
          </div>
        )}

        {currentView === 'investments' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Portfolio Value" value={`$${investments.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0).toLocaleString()}`} trend="+8.2%" icon={<TrendingUp className="w-6 h-6 text-emerald-500" />} />
              <StatCard label="Total Gain" value="+$4,230.00" trend="+15.4%" icon={<Activity className="w-6 h-6 text-emerald-500" />} />
              <StatCard label="Crypto Assets" value="32%" trend="+2.1%" icon={<Globe className="w-6 h-6 text-orange-500" />} />
              <StatCard label="Dividends" value="$124.50" trend="+0.5%" icon={<PieChart className="w-6 h-6 text-blue-500" />} />
            </div>

            <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Asset</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Holdings</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Price</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Value</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map(inv => {
                    const totalValue = inv.quantity * inv.currentPrice;
                    const gain = totalValue - (inv.quantity * inv.costBasis);
                    const gainPercent = (gain / (inv.quantity * inv.costBasis)) * 100;
                    return (
                      <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs">
                              {inv.symbol}
                            </div>
                            <div>
                              <div className="font-semibold">{inv.name}</div>
                              <div className="text-xs text-zinc-500 uppercase">{inv.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="font-medium">{inv.quantity} units</div>
                          <div className="text-xs text-zinc-500">Avg. cost ${inv.costBasis}</div>
                        </td>
                        <td className="px-6 py-6 font-medium">${inv.currentPrice}</td>
                        <td className="px-6 py-6 font-bold">${totalValue.toLocaleString()}</td>
                        <td className="px-6 py-6">
                          <span className={cn(
                            "text-sm font-bold",
                            gain >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'advisor' && (
          <div className="max-w-4xl mx-auto h-[70vh] bg-[#0D0D0D] border border-white/5 rounded-3xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                <Bot className="w-7 h-7 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Aura AI Advisor</h3>
                <p className="text-zinc-500 text-sm">Personalized financial strategy and insights.</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">Start a conversation</h4>
                    <p className="text-zinc-500 max-w-xs">Ask about your spending habits, investment advice, or how to save more.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-8">
                    {["Analyze my spending", "Investment tips", "How to save $1k?", "Debt strategy"].map(q => (
                      <button 
                        key={q}
                        onClick={() => {
                          setChatInput(q);
                          // We can't trigger submit easily here without a ref or moving logic
                        }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-emerald-500 text-black ml-auto rounded-tr-none" 
                      : "bg-white/5 text-white mr-auto rounded-tl-none border border-white/5"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-[#141414] border-t border-white/5 flex gap-4">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Aura anything about your finances..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              <button 
                type="submit"
                className="bg-emerald-500 text-black px-8 rounded-2xl font-bold hover:bg-emerald-400 transition-all flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {currentView === 'connections' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Stripe Connection */}
              <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-[#635BFF]/10 rounded-2xl flex items-center justify-center text-[#635BFF]">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Stripe</h3>
                      <p className="text-zinc-500 text-sm">Payment processing & financial data</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Connect your Stripe account to sync transactions, payouts, and customer data directly into your Aura dashboard.
                  </p>
                </div>
                
                {connections.find(c => c.service === 'stripe') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-500 font-semibold text-sm">Connected</span>
                      </div>
                      <button 
                        onClick={() => connectionService.removeConnection('stripe')}
                        className="text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sync Data
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConnectService('stripe')}
                    className="w-full py-4 bg-[#635BFF] text-white font-bold rounded-2xl hover:bg-[#635BFF]/90 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect Stripe
                  </button>
                )}
              </div>

              {/* Modern Treasury Connection */}
              <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Modern Treasury</h3>
                      <p className="text-zinc-500 text-sm">Payment operations & treasury management</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Integrate Modern Treasury to automate your money movement and gain real-time visibility into your bank accounts.
                  </p>
                </div>

                {connections.find(c => c.service === 'modern_treasury') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-500 font-semibold text-sm">Connected</span>
                      </div>
                      <button 
                        onClick={() => connectionService.removeConnection('modern_treasury')}
                        className="text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sync Data
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConnectService('modern_treasury')}
                    className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-500/90 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect Modern Treasury
                  </button>
                )}
              </div>

              {/* AI Banking Connection */}
              <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">AI Banking</h3>
                      <p className="text-zinc-500 text-sm">Unified banking & AI insights</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Connect to the AI Banking infrastructure to enable advanced automated banking features and unified financial reporting.
                  </p>
                </div>

                {connections.find(c => c.service === 'aibanking') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-emerald-500 font-semibold text-sm">Connected</span>
                      </div>
                      <button 
                        onClick={() => connectionService.removeConnection('aibanking')}
                        className="text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sync Data
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConnectService('aibanking')}
                    className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Connect AI Banking
                  </button>
                )}
              </div>
            </div>

            {/* Connection History */}
            <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Connection History</h3>
              <div className="space-y-4">
                {connections.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">
                    No active connections found.
                  </div>
                ) : (
                  connections.map(conn => (
                    <div key={conn.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          conn.service === 'stripe' ? "bg-[#635BFF]/10 text-[#635BFF]" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {conn.service === 'stripe' ? <Globe className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold capitalize">{conn.service.replace('_', ' ')}</h4>
                          <p className="text-xs text-zinc-500">Connected on {format(new Date(conn.connectedAt), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'ledgers' && (
          <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Ledgers</h3>
            <div className="space-y-4">
              {ledgers.map((ledger: Ledger) => (
                <div key={ledger.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <h4 className="font-semibold">{ledger.name}</h4>
                    <p className="text-xs text-zinc-500">{ledger.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono">{ledger.currency}</span>
                  </div>
                </div>
              ))}
              {ledgers.length === 0 && (
                <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">
                  No ledgers found.
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'models' && (
          <div className="space-y-6">
            <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">All Models ({modelNames.length})</h3>
              </div>
              <div className="space-y-12">
                {Object.entries(
                  modelNames.reduce((acc, name) => {
                    const firstLetter = name.charAt(0).toUpperCase();
                    if (!acc[firstLetter]) acc[firstLetter] = [];
                    acc[firstLetter].push(name);
                    return acc;
                  }, {} as Record<string, string[]>)
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([letter, models]) => (
                  <div key={letter} className="space-y-4">
                    <h4 className="text-2xl font-bold text-emerald-500 border-b border-white/10 pb-2">{letter}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {models.map((modelName, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 hover:bg-white/10 transition-colors">
                          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 mb-2">
                            <LayoutDashboard className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-sm truncate" title={modelName}>{modelName}</h4>
                          <p className="text-xs text-zinc-500">API Model</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Chat Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[400px] h-[500px] bg-[#141414] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-bottom border-white/5 bg-[#1A1A1A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Aura Assistant</h4>
                    <p className="text-[10px] text-emerald-500">Online & Ready</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm",
                      msg.role === 'user' 
                        ? "bg-emerald-500 text-black ml-auto rounded-tr-none" 
                        : "bg-white/5 text-white mr-auto rounded-tl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-[#1A1A1A] flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Aura anything..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <button 
                  type="submit"
                  className="bg-emerald-500 text-black p-2 rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-emerald-500 text-black rounded-2xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        >
          <Bot className="w-7 h-7" />
        </button>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingTransaction(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">New Transaction</h3>
              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={newTx.amount}
                      onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-2xl font-bold focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Description</label>
                  <input 
                    type="text" 
                    required
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="e.g. Starbucks Coffee"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-semibold transition-all",
                      newTx.type === 'expense' ? "bg-rose-500 text-white" : "bg-white/5 text-zinc-500"
                    )}
                  >
                    Expense
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'income' })}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-semibold transition-all",
                      newTx.type === 'income' ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-500"
                    )}
                  >
                    Income
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors mt-4"
                >
                  Add Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
