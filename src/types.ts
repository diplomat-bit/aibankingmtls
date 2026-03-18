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
  service: 'stripe' | 'modern_treasury' | 'aibanking' | 'citi';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: string;
  externalAccountId?: string;
}

// FDX Money Movement Types
export interface FdxPayee {
  payeeId: string;
  merchant: {
    displayName: string;
    name: {
      company: string;
    };
    address?: {
      line1: string;
      city: string;
      region: string;
      postalCode: string;
    };
    phone?: {
      type: string;
      country: string;
      number: string;
    };
  };
  merchantAccountIds: string[];
  status: 'ACTIVE' | 'DELETED' | 'PENDING' | 'REJECTED';
  expiresTimestamp?: string;
}

export interface FdxPayment {
  paymentId: string;
  recurringPaymentId?: string;
  fromAccountId: string;
  toPayeeId: string;
  amount: number;
  merchantAccountId?: string;
  dueDate: string;
  processedTimestamp?: string;
  startedProcessingTimestamp?: string;
  status: 'CANCELLED' | 'FAILED' | 'NOFUNDS' | 'PROCESSED' | 'PROCESSING' | 'SCHEDULED';
}

export interface FdxRecurringPayment {
  recurringPaymentId: string;
  fromAccountId: string;
  toPayeeId: string;
  amount: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'TWICEMONTHLY' | 'MONTHLY' | 'FOURWEEKS' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';
  duration: {
    type: 'NOEND' | 'NUMBEROFTIMES';
    numberOfTimes?: number;
  };
  merchantAccountId?: string;
  dueDate: string;
  cancelledTimestamp?: string;
  status: 'CANCELLED' | 'FAILED' | 'PROCESSED' | 'SCHEDULED';
}

export interface Ledger {
  id: string;
  name: string;
  description: string;
  currency: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': any;
    }
  }
}
