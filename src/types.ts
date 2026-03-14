export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  type: 'checking' | 'savings';
  balance: number;
  currency: string;
  accountNumber: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  merchant?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Investment {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  quantity: number;
  costBasis: number;
  currentPrice: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond';
}

export interface Card {
  id: string;
  userId: string;
  type: 'debit' | 'credit';
  brand: string;
  last4: string;
  expiryDate: string;
  status: 'active' | 'blocked' | 'expired';
  limit?: number;
  spent?: number;
}

export interface UserConnection {
  id?: string;
  userId: string;
  service: 'stripe' | 'modern_treasury' | 'aibanking';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: string;
  externalAccountId?: string;
}

export interface Ledger {
  id: string;
  name: string;
  description: string;
  currency: string;
}
